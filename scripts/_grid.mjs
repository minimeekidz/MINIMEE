import sharp from "sharp";
const [name, y0, y1] = [process.argv[2], +(process.argv[3] ?? 0), +(process.argv[4] ?? 1)];
const src = `public/assets/world/${name}.webp`;
const m = await sharp(src).metadata();
const top = Math.round(m.height * y0), h = Math.round(m.height * (y1 - y0));
const W = 900, H = Math.round(W * h / m.width);
let svg = `<svg width="${W}" height="${H}">`;
for (let i = 1; i < 40; i += 2) {
  const x = (i / 40) * W;
  svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ff0" stroke-opacity=".55"/>`;
  svg += `<text x="${x + 2}" y="12" font-size="11" fill="#ff0" stroke="#000" stroke-width="3" paint-order="stroke">${(i / 40).toFixed(2)}</text>`;
}
const step = (y1 - y0) <= 0.35 ? 2.5 : 5;
for (let yy = Math.ceil(y0 * 100 / step) * step; yy < y1 * 100; yy += step) {
  const y = ((yy / 100 - y0) / (y1 - y0)) * H;
  svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#0ff" stroke-opacity=".55"/>`;
  svg += `<text x="3" y="${y - 3}" font-size="11" fill="#0ff" stroke="#000" stroke-width="3" paint-order="stroke">${(yy / 100).toFixed(3)}</text>`;
}
svg += `</svg>`;
await sharp(src).extract({ left: 0, top, width: m.width, height: h }).resize(W, H)
  .composite([{ input: Buffer.from(svg) }]).png().toFile(`/tmp/grid.png`);
console.log(`${name} ${m.width}x${m.height}`);
