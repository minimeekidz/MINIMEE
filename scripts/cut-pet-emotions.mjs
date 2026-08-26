// Cut the 24 emotions out of each pet's two vision boards.
//
//   node scripts/cut-pet-emotions.mjs
//
// Em asked whether the pets had emotion art and could not find any. They do
// not — the walk sheets were cut on 2026-08-24 and the emotions were never
// touched, because her spec (§5.1) says the boards are for approval and get
// sliced into 288 stickers *after* approval, and nobody did the slicing:
//
//   「批准後才切成 24 張透明 512×512 貼紙／表情圖。」
//
// So this is that step, not a request for new art. Each board is 12 cells,
// four across and three down, on the same #FF00FF ground as the walk sheets.
//
// The grid is found rather than assumed: unlike the walk sheets the boards
// have no stated cell size, and the twelve animals are not the same width, so
// the cut lines are taken from the middle of the empty gaps between columns.
// Each cell is then keyed, trimmed to the animal, and dropped onto a square
// canvas bottom-aligned — feet on the floor line, so a pet swapping from
// 開心 to 眼瞓 does not jump.

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "/tmp/pets";
const OUT = "public/assets/pets";
const SIZE = 256;

const PETS = {
  "1": "sunshine-sheep", "2": "bao-hamster", "3": "milk-cat",
  "4": "watermelon-shiba", "5": "wave-penguin", "6": "aviator-chick",
  "7": "yarn-granny-mouse", "8": "heart-bunny", "9": "cowboy-pup",
  "10": "super-pig", "11": "spin-hedgehog", "12": "kimono-calico",
};

/** Reading order, left to right and top to bottom. Spec §5.2 and §5.3. */
const BOARDS = [
  ["A_core12", [
    "neutral", "gentle_smile", "happy", "big_laugh",
    "excited", "love", "kiss_affection", "shy",
    "sad", "worried", "pout", "surprised",
  ]],
  ["B_extended12", [
    "shocked", "confused", "dizzy", "determined",
    "angry", "frustrated", "exhausted", "sleepy",
    "crying", "grateful", "encouragement", "secretive",
  ]],
];

/**
 * What counts as background on this particular board.
 *
 * Half the boards came back on #FF00FF like the walk sheets and half on white,
 * and several of these animals are white — a cream bunny keyed by colour comes
 * out as a pink dress with a hole where the rabbit was. So the background is
 * whatever the corners are, and it is removed by flooding in from the edge
 * rather than by matching colour anywhere: an enclosed white belly is never
 * reached, because the artwork's dark outline stops the flood.
 */
function backgroundTest(data, info) {
  const at = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [
    at(0, 0), at(info.width - 1, 0), at(0, info.height - 1), at(info.width - 1, info.height - 1),
  ];
  const bg = [0, 1, 2].map(c => Math.round(corners.reduce((sum, p) => sum + p[c], 0) / 4));
  const magenta = bg[0] > 150 && bg[2] > 140 && bg[1] < 120;
  // Magenta is nothing like any pet, so it can be matched loosely. White needs
  // a tight tolerance or it starts eating cream fur at the edges.
  const tol = magenta ? 90 : 22;
  const isBg = (r, g, b) =>
    Math.abs(r - bg[0]) <= tol && Math.abs(g - bg[1]) <= tol && Math.abs(b - bg[2]) <= tol;
  return { isBg, magenta };
}

/** Where the empty lanes are, so the cuts land between animals not through one. */
function cutLines(data, info, axis, want, isBg) {
  const span = axis === "x" ? info.width : info.height;
  const other = axis === "x" ? info.height : info.width;
  const empty = [];
  for (let a = 0; a < span; a += 1) {
    let all = true;
    for (let b = 0; b < other; b += 2) {
      const x = axis === "x" ? a : b;
      const y = axis === "x" ? b : a;
      const i = (y * info.width + x) * info.channels;
      if (!isBg(data[i], data[i + 1], data[i + 2])) { all = false; break; }
    }
    empty.push(all);
  }
  // The blank lanes, and then the widest `want - 1` of the ones that are not
  // the margins. Counting content bands instead was too brittle: a heart
  // floating over a pet's head is its own band, and one 心動 cell was enough
  // to make a whole board look like four rows.
  const gaps = [];
  let start = null;
  empty.forEach((blank, i) => {
    if (blank && start === null) start = i;
    if (!blank && start !== null) { gaps.push([start, i - 1]); start = null; }
  });
  if (start !== null) gaps.push([start, empty.length - 1]);

  const inner = gaps.filter(([a, b]) => a > 0 && b < span - 1);
  if (inner.length < want - 1) {
    throw new Error(`${axis}: need ${want - 1} lanes, found ${inner.length}`);
  }
  const cuts = inner
    .sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))
    .slice(0, want - 1)
    .map(([a, b]) => Math.round((a + b) / 2))
    .sort((p, q) => p - q);

  return [0, ...cuts, span];
}

/**
 * Background out, by flooding in from the border.
 *
 * Anything the flood cannot reach is part of the animal — including the white
 * of its belly and the gap inside the loop of a bow, which a colour match
 * would have punched straight through.
 */
function key(data, info, isBg, magenta) {
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  const outside = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (outside[p]) return;
    const i = p * channels;
    if (!isBg(data[i], data[i + 1], data[i + 2])) return;
    outside[p] = 1;
    stack[top++] = p;
  };

  for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y += 1) { push(0, y); push(width - 1, y); }
  while (top > 0) {
    const p = stack[--top];
    const x = p % width, y = (p - x) / width;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }

  for (let p = 0, i = 0, o = 0; p < width * height; p += 1, i += channels, o += 4) {
    if (outside[p]) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Only the magenta boards leave a pink halo worth pulling back.
    const fringe = magenta ? Math.min(r, b) - g : 0;
    const lift = fringe > 40 ? Math.min(fringe - 40, 60) : 0;
    out[o] = r - lift; out[o + 1] = g; out[o + 2] = b - lift; out[o + 3] = 255;
  }
  return out;
}

let written = 0;
for (const [folder, id] of Object.entries(PETS)) {
  const dir = path.join(SRC, folder);
  const files = await readdir(dir);
  await mkdir(path.join(OUT, id, "faces"), { recursive: true });

  for (const [board, tokens] of BOARDS) {
    const file = files.find(f => f.includes(`_emotion_board_${board}_`));
    if (!file) throw new Error(`${id}: no ${board} board`);
    const src = path.join(dir, file);

    const { data, info } = await sharp(src).removeAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const { isBg, magenta } = backgroundTest(data, info);
    const cols = cutLines(data, info, "x", 4, isBg);
    const rows = cutLines(data, info, "y", 3, isBg);

    for (let cell = 0; cell < 12; cell += 1) {
      const cx = cell % 4, cy = Math.floor(cell / 4);
      const left = cols[cx], top = rows[cy];
      const width = cols[cx + 1] - left, height = rows[cy + 1] - top;

      const cut = await sharp(src)
        .extract({ left, top, width, height })
        .removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const rgba = key(cut.data, cut.info, isBg, magenta);

      // Trim to the animal, then stand it on the bottom of a square canvas so
      // every face shares one floor line.
      const trimmed = await sharp(rgba, {
        raw: { width: cut.info.width, height: cut.info.height, channels: 4 },
      }).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });

      const scale = Math.min(SIZE / trimmed.info.width, SIZE / trimmed.info.height);
      const w = Math.max(1, Math.round(trimmed.info.width * scale));
      const h = Math.max(1, Math.round(trimmed.info.height * scale));
      const art = await sharp(trimmed.data, {
        raw: { width: trimmed.info.width, height: trimmed.info.height, channels: 4 },
      }).resize(w, h, { kernel: "nearest" }).png().toBuffer();

      await sharp({
        create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([{ input: art, left: Math.round((SIZE - w) / 2), top: SIZE - h }])
        .webp({ quality: 92, alphaQuality: 100 })
        .toFile(path.join(OUT, id, "faces", `${tokens[cell]}.webp`));
      written += 1;
    }
  }
  console.log(`${id}: 24 faces`);
}

const faces = BOARDS.flatMap(([, tokens]) => tokens);
await writeFile("src/data/petFaces.json", `${JSON.stringify({
  note: "Written by scripts/cut-pet-emotions.mjs from Em's two vision boards per pet. Re-run after adding or recutting a pet.",
  pets: Object.values(PETS),
  faces,
}, null, 2)}\n`);

console.log(`\n${written} faces written to ${OUT}/<pet>/faces/<emotion>.webp`);
