// Derives a walkability mask for each world background straight from the art.
//
// The alternative was hand-typing coordinates for every path, which is slow,
// wrong the moment the art is redrawn, and impossible to review. The paths in
// this art are all warm pale stone and everything else — foliage, water,
// roofs, sky — is either dark, green or blue, so one colour rule separates
// them, and the mask is regenerated whenever a background changes.
//
//   node scripts/build-walkmask.mjs          # writes src/lib/walkmask.ts
//   node scripts/build-walkmask.mjs --debug  # also writes preview PNGs
//
// Output is one base64 bit per cell on a GRID_W-wide grid, which is a few
// hundred bytes per scene and costs nothing to test at runtime.

import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ASSETS = "public/assets";
const OUT = "src/lib/walkmask.ts";
const GRID_W = 96;
const DEBUG = process.argv.includes("--debug");

// The four top-down maps the world walks on. Night shares the day mask
// because the night art is graded from the day art (scripts/make-night.mjs),
// so the two are the same place under different light. Interiors are not in
// here — a room is a page, not somewhere you walk around.
const SCENES = ["town-morning-v2", "dock-town-dusk", "amusement-park", "mushroom-city-morning"];

/**
 * Stone paths in this art are pale and warm: bright, red >= green >= blue,
 * and never strongly coloured. Foliage fails it on green dominance, water on
 * blue, roofs and sky on saturation, night grass on brightness.
 */
function isPath(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  // Thresholds were read off the art rather than guessed: sampled stone sits
  // around (135,113,107)–(179,135,102), foliage around (78,65,20), water is
  // blue-dominant and roofs are dark.
  return max > 95 && saturation < 0.60 && r >= g - 2 && g >= b - 4;
}

async function maskFor(file) {
  const meta = await sharp(file).metadata();
  const gridH = Math.round(GRID_W * (meta.height / meta.width));
  const { data } = await sharp(file)
    .resize(GRID_W, gridH, { fit: "fill", kernel: "cubic" })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const cells = new Uint8Array(GRID_W * gridH);
  for (let i = 0; i < cells.length; i++) {
    const p = i * 3;
    cells[i] = isPath(data[p], data[p + 1], data[p + 2]) ? 1 : 0;
  }

  // A single pale roof tile or a lamp-lit step is not somewhere to stand.
  // Requiring most of a cell's neighbours to agree drops those specks and
  // closes pinholes in the middle of a real path.
  const smoothed = new Uint8Array(cells.length);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let hits = 0, seen = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= gridH) continue;
          seen++;
          hits += cells[ny * GRID_W + nx];
        }
      }
      smoothed[y * GRID_W + x] = hits * 2 >= seen ? 1 : 0;
    }
  }

  // Keep only the largest connected region. Otherwise a bright courtyard the
  // child can never reach still reads as walkable, and tap-to-walk would
  // happily strand them in it.
  const label = new Int32Array(smoothed.length).fill(-1);
  let best = -1, bestSize = 0;
  for (let start = 0; start < smoothed.length; start++) {
    if (!smoothed[start] || label[start] !== -1) continue;
    const id = start;
    const queue = [start];
    label[start] = id;
    let size = 0;
    while (queue.length) {
      const cell = queue.pop();
      size++;
      const cx = cell % GRID_W, cy = (cell / GRID_W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= gridH) continue;
        const next = ny * GRID_W + nx;
        if (!smoothed[next] || label[next] !== -1) continue;
        label[next] = id;
        queue.push(next);
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
  }

  const final = new Uint8Array(smoothed.length);
  for (let i = 0; i < final.length; i++) final[i] = label[i] === best ? 1 : 0;

  if (DEBUG) {
    const overlay = Buffer.alloc(GRID_W * gridH * 3);
    for (let i = 0; i < final.length; i++) {
      const p = i * 3;
      const on = final[i];
      const raw = smoothed[i];
      // Magenta = kept, dim teal = passed the colour rule but was cut off
      // from the main region, dim art = not walkable at all.
      overlay[p] = on ? 255 : raw ? 40 : data[p] >> 1;
      overlay[p + 1] = on ? 60 : raw ? 220 : data[p + 1] >> 1;
      overlay[p + 2] = on ? 210 : raw ? 200 : data[p + 2] >> 1;
    }
    await sharp(overlay, { raw: { width: GRID_W, height: gridH, channels: 3 } })
      .resize(GRID_W * 5, gridH * 5, { kernel: "nearest" })
      .png().toFile(`/tmp/walkmask-${path.parse(file).name}.png`);
  }

  const bytes = Buffer.alloc(Math.ceil(final.length / 8));
  for (let i = 0; i < final.length; i++) {
    if (final[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  return {
    width: GRID_W, height: gridH,
    imageWidth: meta.width, imageHeight: meta.height,
    bits: bytes.toString("base64"),
    coverage: bestSize / final.length,
  };
}

const available = new Set(await readdir(ASSETS));
const out = {};
for (const scene of SCENES) {
  const file = path.join(ASSETS, `${scene}.webp`);
  if (!available.has(`${scene}.webp`)) { console.warn(`skip ${scene}: no art`); continue; }
  const mask = await maskFor(file);
  out[scene] = mask;
  console.log(`${scene}: ${mask.width}x${mask.height} walkable ${(mask.coverage * 100).toFixed(1)}%`);
}

const body = Object.entries(out).map(([key, m]) =>
  `  "${key}": {\n` +
  `    width: ${m.width}, height: ${m.height},\n` +
  `    imageWidth: ${m.imageWidth}, imageHeight: ${m.imageHeight},\n` +
  `    bits: "${m.bits}",\n  },`
).join("\n");

await writeFile(OUT, `// Generated by scripts/build-walkmask.mjs — do not edit by hand.
// Regenerate after changing any world background.

export interface WalkMask {
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  /** One bit per cell, row-major, LSB first. */
  bits: string;
}

export const WALK_MASKS: Record<string, WalkMask> = {
${body}
};
`);
console.log(`wrote ${OUT}`);
