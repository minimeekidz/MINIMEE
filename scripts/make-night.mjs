// Grades a night version of each world map from its daytime art.
//
// The night art that came with the set is drawn from street level while the
// maps are top-down, so using it would move the ground the child walks on
// every evening — the doors, the paths and the walk mask would all have to
// exist twice and agree with each other. Grading the same map instead keeps
// one layout and still gives the real change of light Em asked for.
//
//   node scripts/make-night.mjs
//
// Nightfall in this art is mostly three things: less light, the light that
// remains going blue, and the warm windows staying warm. A flat darken kills
// the third, so the warm pixels are lifted back out and screened on top.

import sharp from "sharp";

const MAPS = ["town-morning-v2", "dock-town-dusk", "amusement-park", "mushroom-city-morning"];
const OUT = name => `public/assets/${name}-night.webp`;

for (const name of MAPS) {
  const src = `public/assets/${name}.webp`;
  const { data, info } = await sharp(src).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];

    // Moonlight: dim hard, and let blue survive best.
    let nr = r * 0.34 + 6;
    let ng = g * 0.38 + 10;
    let nb = b * 0.58 + 30;

    // Lamps and windows. Warmth is r over b, and only bright warm pixels are
    // actual light sources — a warm dark roof is not a lamp.
    const warmth = (r - b) / 255;
    const bright = Math.max(r, g, b) / 255;
    const glow = Math.max(0, warmth - 0.10) * Math.max(0, bright - 0.45) * 5.2;
    if (glow > 0) {
      nr += glow * 190;
      ng += glow * 132;
      nb += glow * 52;
    }

    out[i] = Math.min(255, nr);
    out[i + 1] = Math.min(255, ng);
    out[i + 2] = Math.min(255, nb);
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 88 })
    .toFile(OUT(name));
  console.log(`${OUT(name)}  ${info.width}x${info.height}`);
}
