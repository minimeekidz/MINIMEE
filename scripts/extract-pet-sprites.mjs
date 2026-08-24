// Cut Em's magenta walk sheets into the transparent frames the town walks on.
//
//   node scripts/extract-pet-sprites.mjs
//
// Her spec (uploads/寵物-多角度sprite/MINIMEE_12_PETS_SPRITE_EMOTION_CANONICAL
// _SPEC_v2.0.md §4.4) fixes the sheet exactly: 1084x552, a 20px magenta
// margin, two 512x512 cells with 20px between them, #FF00FF background, and
// nothing else in the picture. That is why the cut is arithmetic rather than
// a search for content — the geometry is a promise, and if a sheet ever
// breaks it, this fails loudly instead of shipping a frame with a magenta
// edge on it.
//
// The de-keyed `_f01/_f02` files in the same zip are not used: they came out
// as 3-channel WebP on white, and several of these animals are white. The
// magenta sheet is the one background no pet is wearing.

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "/tmp/pets";
const OUT = "public/assets/pets";

/** Em's numbering → the ids the game already uses. */
const PETS = {
  "1": "sunshine-sheep", "2": "bao-hamster", "3": "milk-cat",
  "4": "watermelon-shiba", "5": "wave-penguin", "6": "aviator-chick",
  "7": "yarn-granny-mouse", "8": "heart-bunny", "9": "cowboy-pup",
  "10": "super-pig", "11": "spin-hedgehog", "12": "kimono-calico",
};

/** Her direction token → the facing the walk code asks for. */
const FACING = {
  front: "down", back: "up", left_side: "left", right_side: "right",
};

const SHEET = { w: 1084, h: 552, cell: 512, margin: 20, gap: 20 };

/** Magenta out, everything else through — and no pink fringe left behind. */
function key(data, info) {
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // The key colour is the one hue with red and blue high and green absent.
    // A generous threshold is safe: no pet in the set is magenta, and the
    // compression on a WebP sheet moves the background a few points either
    // way (measured corners come back as 246,4,245 and 255,1,252).
    const isKey = r > 170 && b > 150 && g < 110 && r - g > 90 && b - g > 70;
    if (isKey) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
    // A half-keyed edge pixel has green well below both neighbours. Pull it
    // back towards grey rather than leaving a pink halo on a dark map.
    const fringe = Math.min(r, b) - g;
    if (fringe > 40) {
      const lift = Math.min(fringe - 40, 60);
      out[o] = r - lift; out[o + 1] = g; out[o + 2] = b - lift;
    } else {
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
    out[o + 3] = 255;
  }
  return out;
}

let written = 0;
for (const [folder, id] of Object.entries(PETS)) {
  const dir = path.join(SRC, folder);
  const files = await readdir(dir);
  await mkdir(path.join(OUT, id), { recursive: true });

  for (const [token, facing] of Object.entries(FACING)) {
    const sheet = files.find(f => f.includes(`_${token}_walk_sheet_`));
    if (!sheet) throw new Error(`${id}: no ${token} sheet`);

    const src = path.join(dir, sheet);
    const meta = await sharp(src).metadata();
    if (meta.width !== SHEET.w || meta.height !== SHEET.h) {
      throw new Error(`${id} ${token}: sheet is ${meta.width}x${meta.height}, spec says ${SHEET.w}x${SHEET.h}`);
    }

    for (const frame of [0, 1]) {
      const left = SHEET.margin + frame * (SHEET.cell + SHEET.gap);
      const { data, info } = await sharp(src)
        .extract({ left, top: SHEET.margin, width: SHEET.cell, height: SHEET.cell })
        .removeAlpha().raw().toBuffer({ resolveWithObject: true });

      const rgba = key(data, info);
      const dest = path.join(OUT, id, `${facing}-${frame + 1}.webp`);
      await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
        // 256 is twice what the town draws a pet at, so it stays crisp on a
        // retina phone without carrying four times the bytes of the 512 master.
        .resize(256, 256, { kernel: "nearest" })
        .webp({ quality: 92, alphaQuality: 100 })
        .toFile(dest);
      written += 1;
    }
  }
  console.log(`${id}: 8 frames`);
}
// Record what actually landed. The town falls back to a pet's still portrait
// when a frame is missing, which is right on screen and invisible in review —
// so the test checks this index instead, and a pet whose sheet never got cut
// fails a build rather than quietly standing still forever.
const index = [];
for (const id of Object.values(PETS)) {
  for (const facing of Object.values(FACING)) {
    for (const frame of [1, 2]) index.push(`/assets/pets/${id}/${facing}-${frame}.webp`);
  }
}
await writeFile("src/data/petFrames.json", `${JSON.stringify({
  note: "Written by scripts/extract-pet-sprites.mjs from Em's magenta walk sheets. Re-run it after adding or recutting a pet.",
  pets: Object.values(PETS),
  frames: index,
}, null, 2)}\n`);

console.log(`\n${written} frames written to ${OUT}/<pet>/<facing>-<1|2>.webp`);
console.log("index written to src/data/petFrames.json");
