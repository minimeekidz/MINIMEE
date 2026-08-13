// Extracts a grid of characters from a chroma-keyed sheet.
//
// The magenta extractor handles a single row; this one handles a 2D grid and
// takes the key colour as a parameter, because the pet sheets arrived on
// green while the hamster sheets were on magenta. Rows are found the same
// way columns are: by scanning for lines that are entirely background.

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const CUT = 70;
const KEEP = 150;

export async function extractGrid(src, outDir, names, key, { pad = 0.1 } = {}) {
  const { data, info } = await sharp(src).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const out = Buffer.alloc(W * H * 4);
  for (let i = 0, o = 0; i < data.length; i += C, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.hypot(r - key.r, g - key.g, b - key.b);
    const alpha = d <= CUT ? 0 : d >= KEEP ? 255 : Math.round(((d - CUT) / (KEEP - CUT)) * 255);
    // De-spill: pull the key channel back toward its neighbours so the
    // antialiased rim goes neutral instead of glowing green or pink.
    let nr = r, ng = g, nb = b;
    if (alpha > 0 && alpha < 255) {
      if (key.g > key.r && key.g > key.b) ng = Math.min(g, Math.max(r, b) + 12);
      else { const cap = g + 12; nr = Math.min(r, cap); nb = Math.min(b, cap); }
    }
    out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = alpha;
  }

  const opaque = (x, y) => out[(y * W + x) * 4 + 3] > 24;

  const bands = (length, otherLength, isOpaque) => {
    const empty = [];
    for (let a = 0; a < length; a++) {
      let blank = true;
      for (let b = 0; b < otherLength; b++) if (isOpaque(a, b)) { blank = false; break; }
      empty.push(blank);
    }
    const spans = [];
    let start = -1;
    for (let a = 0; a <= length; a++) {
      if (a < length && !empty[a]) { if (start === -1) start = a; }
      else if (start !== -1) { spans.push([start, a - 1]); start = -1; }
    }
    return spans;
  };

  const rows = bands(H, W, (y, x) => opaque(x, y));
  fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  let index = 0;
  for (const [y0, y1] of rows) {
    const cols = bands(W, y1 - y0 + 1, (x, dy) => opaque(x, y0 + dy));
    for (const [x0, x1] of cols) {
      const name = names[index] ?? `frame-${index + 1}`;
      index += 1;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const side = Math.max(w, h);
      const margin = Math.round(side * pad);
      const squared = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
        .extract({ left: x0, top: y0, width: w, height: h })
        .extend({
          top: margin + Math.floor((side - h) / 2),
          bottom: margin + Math.ceil((side - h) / 2),
          left: margin + Math.floor((side - w) / 2),
          right: margin + Math.ceil((side - w) / 2),
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png().toBuffer();
      const dest = path.join(outDir, `${name}.webp`);
      await sharp(squared).resize(400, 400, { fit: "fill", kernel: "nearest" })
        .webp({ quality: 92, alphaQuality: 100 }).toFile(dest);
      written.push(dest);
    }
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, outDir, keyName, ...names] = process.argv.slice(2);
  const key = keyName === "green" ? { r: 40, g: 220, b: 40 } : { r: 249, g: 3, b: 247 };
  const files = await extractGrid(src, outDir, names, key);
  console.log(files.map(f => path.basename(f)).join("  "));
}
