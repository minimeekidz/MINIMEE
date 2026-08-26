// Turn Em's hero drop into sprites the game can actually draw.
//
//   node scripts/cut-hero-sprites.mjs [source-dir]
//
// The 2026-08-26 drop (`A_BOY` … `C_GIRL`, 12 expressions + 16 motion frames
// each) arrived as 3-channel WebP on white, which is the same problem the pet
// sheets had: a hero on a white square is a white box walking across the town
// map. Two passes fix it, in this order for a reason:
//
//   1. De-key the white. Only white *connected to the border* is cleared, by
//      flood fill — a global colour key would punch holes in white boots, eyes
//      and cape linings.
//   2. Crop every frame of one set to the SAME box, the union of that set.
//      Cropping each frame to its own content would re-centre the character
//      between frames and make the walk cycle jitter; one box per set keeps
//      them in register and still throws the dead margin away. Expressions and
//      motion get a box each, because one is a head and the other is a body —
//      sharing a box would leave half the portrait empty.
//
// Idempotent: a file that already has an alpha channel is left alone, so
// running this twice does not eat the art.

import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2] ?? "public/assets/heroes";

/** Anything at or above this on all three channels counts as the backdrop. */
const WHITE = 248;
/** Kept, but faded, so de-keying does not leave a hard white halo. */
const HALO = 216;
/** Breathing room around the union box, in pixels. */
const PAD = 6;

const heroes = (await readdir(SRC, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

for (const hero of heroes) {
  for (const kind of ["expressions", "motion"]) {
    const dir = path.join(SRC, hero, "runtime", kind);
    const frames = (await readdir(dir).catch(() => []))
      .filter(name => name.endsWith(".webp")).sort()
      .map(name => path.join(dir, name));
    if (frames.length === 0) continue;

    // Pass 1 — de-key, and note where the ink actually is.
    const cut = [];
    let box = null;
    for (const file of frames) {
      const image = sharp(file);
      const meta = await image.metadata();
      if (meta.hasAlpha) { console.log(`skip (already cut) ${file}`); continue; }

      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      const { width, height, channels } = info;
      const rgba = Buffer.alloc(width * height * 4);
      for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
        rgba[j] = data[i];
        rgba[j + 1] = data[i + 1];
        rgba[j + 2] = data[i + 2];
        rgba[j + 3] = 255;
      }

      // Flood the backdrop inwards from all four edges.
      const seen = new Uint8Array(width * height);
      const queue = [];
      const backdrop = px => rgba[px * 4] >= WHITE && rgba[px * 4 + 1] >= WHITE && rgba[px * 4 + 2] >= WHITE;
      const push = px => { if (!seen[px] && backdrop(px)) { seen[px] = 1; queue.push(px); } };
      for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
      for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
      for (let head = 0; head < queue.length; head++) {
        const px = queue[head];
        const x = px % width, y = (px - x) / width;
        if (x > 0) push(px - 1);
        if (x < width - 1) push(px + 1);
        if (y > 0) push(px - width);
        if (y < height - 1) push(px + width);
      }

      // Clear it, and fade the halo just inside it so no white rim survives.
      for (let px = 0; px < width * height; px++) {
        if (seen[px]) { rgba[px * 4 + 3] = 0; continue; }
        const level = Math.min(rgba[px * 4], rgba[px * 4 + 1], rgba[px * 4 + 2]);
        if (level <= HALO) continue;
        const x = px % width, y = (px - x) / width;
        const touching = (x > 0 && seen[px - 1]) || (x < width - 1 && seen[px + 1])
          || (y > 0 && seen[px - width]) || (y < height - 1 && seen[px + width]);
        if (touching) {
          rgba[px * 4 + 3] = Math.round(255 * (1 - (level - HALO) / (WHITE - HALO)));
        }
      }

      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let px = 0; px < width * height; px++) {
        if (rgba[px * 4 + 3] < 16) continue;
        const x = px % width, y = (px - x) / width;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (maxX < 0) { console.log(`empty, left alone: ${file}`); continue; }

      box = box
        ? { minX: Math.min(box.minX, minX), minY: Math.min(box.minY, minY),
            maxX: Math.max(box.maxX, maxX), maxY: Math.max(box.maxY, maxY) }
        : { minX, minY, maxX, maxY };
      cut.push({ file, rgba, width, height });
    }
    if (cut.length === 0) continue;

    // Pass 2 — one box for the set, so its frames stay in register.
    const { width, height } = cut[0];
    const left = Math.max(0, box.minX - PAD);
    const top = Math.max(0, box.minY - PAD);
    const right = Math.min(width - 1, box.maxX + PAD);
    const bottom = Math.min(height - 1, box.maxY + PAD);

    for (const { file, rgba, width: w, height: h } of cut) {
      await writeFile(file, await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
        .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
        .webp({ quality: 92 })
        .toBuffer());
    }
    console.log(`${hero}/${kind}: ${cut.length} frames, cut to ${right - left + 1}x${bottom - top + 1}`);
  }
}
