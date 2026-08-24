// Throwaway: draws every declared frame box over the art so a mis-measured
// rectangle is visible instead of inferred.
import sharp from "sharp";
import { INTERIORS } from "../src/lib/interiors";

const id = process.argv[2];
const it = INTERIORS[id];
const src = `public${it.art}`;
const m = await sharp(src).metadata();
const W = 760, H = Math.round(W * m.height! / m.width!);
const boxes = (it.frames ?? []).map(f =>
  `<rect x="${f.x * W}" y="${f.y * H}" width="${f.w * W}" height="${f.h * H}" fill="none" stroke="#0f0" stroke-width="2"/>`
  + `<text x="${f.x * W + 3}" y="${f.y * H - 4}" font-size="13" fill="#0f0" stroke="#000" stroke-width="3" paint-order="stroke">${f.id}</text>`).join("");
await sharp(src).resize(W, H).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${boxes}</svg>`) }])
  .png().toFile("/tmp/frames.png");
console.log(id, (it.frames ?? []).length, "frames");
