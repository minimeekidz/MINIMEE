// Copies the scene art Em uploads into stable, ASCII-named files the code
// can reference.
//
// Em uploads into public/assets/uploads/場景-*/ with Chinese names, which is
// the right thing for her — she can see what she is dropping in. The app
// cannot depend on those names: a rename, a re-export, or a filename with a
// brace in it (戲院_{?}號廳) would break a URL. So this maps each upload to a
// slug once, here, where the mapping can be read and reviewed.
//
//   node scripts/import-scenes.mjs
//
// Re-run it whenever Em uploads new art. Missing files are reported and
// skipped rather than failing the run, so a partial upload still imports.

import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const MAPS = "public/assets/uploads/場景-地圖";
const INDOOR = "public/assets/uploads/場景-室內";
const OUT = "public/assets/world";

// slug → source file. Outdoor scenes carry a variant suffix; interiors do not
// have day and night at all (the ops doc: a room is a page, not a time of day).
const SCENES = {
  "town-centre-day": `${MAPS}/小鎮中心_日.webp`,
  "town-centre-night": `${MAPS}/小鎮中心_夜.webp`,
  "town-square-day": `${MAPS}/小鎮廣場_日.webp`,
  "town-square-night": `${MAPS}/小鎮廣場_夜.webp`,
  "seaside-park-day": `${MAPS}/散步公園_日.webp`,
  "seaside-park-night": `${MAPS}/散步公園_夜.webp`,
  "village-gate-day": `${MAPS}/小屋區入口_日.webp`,
  "village-gate-night": `${MAPS}/小屋區入口_夜.webp`,
  "village-gate-dawn": `${MAPS}/小屋區入口_清晨.webp`,
  "wharf-market-day": `${MAPS}/碼頭市集_日.webp`,
  "wharf-market-night": `${MAPS}/碼頭市集_夜.webp`,

  "my-home": `${MAPS}/我的小屋.webp`,
  "album-hall": `${INDOOR}/MEE 珍藏館.webp`,
  "album-books": `${INDOOR}/MEE珍藏卡冊.webp`,
  "fragment-room": `${INDOOR}/MEE碎片收集.webp`,
  "library": `${INDOOR}/MEE圖書館.webp`,
  "studio": `${INDOOR}/Hero Studio.webp`,
  "cafe": `${INDOOR}/Buddy Cafe.webp`,
  "cinema-lobby": `${INDOOR}/戲院大堂.webp`,
  "cinema-hall": `${INDOOR}/戲院_{?}號廳.webp`,
};

await mkdir(OUT, { recursive: true });

let copied = 0;
const missing = [];
for (const [slug, source] of Object.entries(SCENES)) {
  try {
    await access(source);
  } catch {
    missing.push(`${slug} ← ${path.basename(source)}`);
    continue;
  }
  await copyFile(source, `${OUT}/${slug}.webp`);
  copied += 1;
}

console.log(`imported ${copied} scenes into ${OUT}`);
if (missing.length) {
  console.log(`\nnot uploaded yet (${missing.length}):`);
  for (const entry of missing) console.log(`  ${entry}`);
}
