// Turns the magenta-背景 sprite sheets into individual transparent frames.
//
// Magenta (#FF00FF) is the classic chroma-key colour: it appears nowhere in
// the art, so anything close to it is background. Two things make a naive
// key look bad, and both are handled here:
//
//  - Antialiased edges blend art with magenta, leaving a pink halo. Pixels
//    near the key colour get partial alpha, and the magenta spill is pulled
//    out of what survives.
//  - Frames are found by scanning for fully-background columns, so a sheet
//    can hold any number of poses at any spacing without being told.

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const KEY = { r: 249, g: 3, b: 247 };
/** Below this distance from the key colour a pixel is pure background. */
const CUT = 60;
/** Above this it is pure art. Between the two, alpha ramps — that is the edge. */
const KEEP = 130;

function distance(r, g, b) {
  return Math.hypot(r - KEY.r, g - KEY.g, b - KEY.b);
}

export async function extractSheet(src, outDir, baseName, { pad = 0.08 } = {}) {
  const { data, info } = await sharp(src).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const out = Buffer.alloc(W * H * 4);
  for (let i = 0, o = 0; i < data.length; i += C, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = distance(r, g, b);
    let alpha = d <= CUT ? 0 : d >= KEEP ? 255 : Math.round(((d - CUT) / (KEEP - CUT)) * 255);
    // De-spill: magenta bleeding into an edge shows up as r and b both
    // sitting well above g. Pull them back toward g so the halo goes grey
    // instead of pink.
    let nr = r, nb = b;
    if (alpha > 0 && alpha < 255 && r > g && b > g) {
      const cap = g + (Math.max(r, b) - g) * 0.35;
      nr = Math.min(r, cap);
      nb = Math.min(b, cap);
    }
    out[o] = nr; out[o + 1] = g; out[o + 2] = nb; out[o + 3] = alpha;
  }

  const opaqueAt = (x, y) => out[(y * W + x) * 4 + 3] > 24;

  // Split on runs of fully-transparent columns.
  const emptyCol = [];
  for (let x = 0; x < W; x++) {
    let empty = true;
    for (let y = 0; y < H; y++) if (opaqueAt(x, y)) { empty = false; break; }
    emptyCol.push(empty);
  }
  const spans = [];
  let start = -1;
  for (let x = 0; x <= W; x++) {
    if (x < W && !emptyCol[x]) { if (start === -1) start = x; }
    else if (start !== -1) { spans.push([start, x - 1]); start = -1; }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (let i = 0; i < spans.length; i++) {
    const [x0, x1] = spans[i];
    let y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = x0; x <= x1; x++) {
        if (opaqueAt(x, y)) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
      }
    }
    if (y1 < 0) continue;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    // Square canvas with real breathing room, so no ear ever touches an
    // edge — the exact failure in the previous batch.
    //
    // Done in two passes on purpose: sharp runs resize BEFORE extend within
    // one pipeline, so padding computed from the pre-resize size comes out
    // wrong and the frame stops being square. Extend to a square first,
    // then resize that buffer.
    const side = Math.max(w, h);
    const margin = Math.round(side * pad);
    const name = spans.length === 1 ? `${baseName}.webp` : `${baseName}-${i + 1}.webp`;
    const dest = path.join(outDir, name);

    const squared = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: x0, top: y0, width: w, height: h })
      .extend({
        top: margin + Math.floor((side - h) / 2),
        bottom: margin + Math.ceil((side - h) / 2),
        left: margin + Math.floor((side - w) / 2),
        right: margin + Math.ceil((side - w) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await sharp(squared)
      .resize(400, 400, { fit: "fill", kernel: "nearest" })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(dest);
    written.push(dest);
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, outDir, baseName] = process.argv.slice(2);
  const files = await extractSheet(src, outDir, baseName);
  console.log(files.map(f => path.basename(f)).join("  "));
}
