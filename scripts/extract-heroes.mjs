// Cuts the heroes out of their white backgrounds.
//
// A colour key is wrong here: the characters themselves contain white —
// boot highlights, cape trim, the whites of their eyes. Keying every white
// pixel would punch holes through the art. A flood fill from the border
// only removes background that is actually connected to the edge, so
// enclosed white stays put.

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/** How far from pure white still counts as background. */
const TOLERANCE = 34;

export async function cutHeroes(src, outDir, names, { pad = 0.1 } = {}) {
  const { data, info } = await sharp(src).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const isPale = (x, y) => {
    const i = (y * W + x) * C;
    return data[i] > 255 - TOLERANCE && data[i + 1] > 255 - TOLERANCE && data[i + 2] > 255 - TOLERANCE;
  };

  // Flood from every border pixel inward.
  const background = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, x + (H - 1) * W); }
  for (let y = 0; y < H; y++) { stack.push(y * W, W - 1 + y * W); }
  while (stack.length) {
    const p = stack.pop();
    if (background[p]) continue;
    const x = p % W, y = (p - x) / W;
    if (!isPale(x, y)) continue;
    background[p] = 1;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  const out = Buffer.alloc(W * H * 4);
  for (let p = 0, i = 0, o = 0; p < W * H; p++, i += C, o += 4) {
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2];
    out[o + 3] = background[p] ? 0 : 255;
  }

  const opaque = (x, y) => out[(y * W + x) * 4 + 3] > 24;
  const emptyCol = [];
  for (let x = 0; x < W; x++) {
    let blank = true;
    for (let y = 0; y < H; y++) if (opaque(x, y)) { blank = false; break; }
    emptyCol.push(blank);
  }
  const spans = [];
  let start = -1;
  for (let x = 0; x <= W; x++) {
    if (x < W && !emptyCol[x]) { if (start === -1) start = x; }
    else if (start !== -1) { if (x - start > W * 0.05) spans.push([start, x - 1]); start = -1; }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (let i = 0; i < spans.length; i++) {
    const [x0, x1] = spans[i];
    let y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = x0; x <= x1; x++) if (opaque(x, y)) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
    }
    if (y1 < 0) continue;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const side = Math.max(w, h);
    const margin = Math.round(side * pad);
    const squared = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: x0, top: y0, width: w, height: h })
      .extend({
        top: margin + Math.floor((side - h) / 2), bottom: margin + Math.ceil((side - h) / 2),
        left: margin + Math.floor((side - w) / 2), right: margin + Math.ceil((side - w) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }).png().toBuffer();
    const dest = path.join(outDir, `${names[i] ?? `hero-${i + 1}`}.webp`);
    await sharp(squared).resize(400, 400, { fit: "fill", kernel: "nearest" })
      .webp({ quality: 92, alphaQuality: 100 }).toFile(dest);
    written.push(dest);
  }
  return written;
}
