// Install Em's scene art under the names the game uses.
//
// She ships one file per scene per aspect, named in Chinese —
// 小鎮中心_日_9x16.webp — and the game asks for /assets/world/<slug>-day.webp
// with a -wide sibling for landscape. This is the only place those two
// naming schemes meet, so it is written down rather than done by hand: a
// rename done by hand is a rename that silently skips one.
import fs from "node:fs";
import path from "node:path";

const DEST = "public/assets/world";

// Where Em drops a batch. She has used both, so both are looked at rather
// than one being declared correct after the fact.
const DROPS = [DEST, "public/assets/uploads/場景-地圖"];

/** Em's name (without the aspect suffix) → the slug the game asks for. */
const MAP = {
  "小鎮中心_日": "town-centre-day",
  "小鎮中心_夜": "town-centre-night",
  "小鎮廣場_日": "town-square-day",
  "小鎮廣場_夜": "town-square-night",
  "散步公園_日": "seaside-park-day",
  "散步公園_夜": "seaside-park-night",
  "碼頭市集_日": "wharf-market-day",
  "碼頭市集_夜": "wharf-market-night",
  "小屋區入口_日": "village-gate-day",
  "小屋區入口_夜": "village-gate-night",
  "我的小屋_日": "my-home",
  "我的小屋_夜": "my-home-night",
  "Buddy_Cafe_日": "cafe",
  "Buddy_Cafe_夜": "cafe-night",
  "Hero_Studio_日": "studio",
  "Hero_Studio_夜": "studio-night",
  "戲院大堂": "cinema-lobby",
  "戲院1號廳": "cinema-hall",
  "戲院2號廳": "cinema-hall-2",
  "MEE珍藏館": "album-hall",
  "MEE卡冊展示室": "album-books",
  "MEE碎片收集室": "fragment-room",
};

const apply = process.argv.includes("--apply");
const rows = [];

for (const [zh, slug] of Object.entries(MAP)) {
  for (const [aspect, suffix] of [["9x16", ""], ["16x9", "-wide"]]) {
    const src = DROPS
      .map(dir => path.join(dir, `${zh}_${aspect}.webp`))
      .find(candidate => fs.existsSync(candidate));
    const dest = path.join(DEST, `${slug}${suffix}.webp`);
    // A scene Em has not sent yet is reported, not fatal — this runs every
    // time a batch lands, and half a batch is normal. An installed scene with
    // no source left in a drop folder is the same case: already done.
    if (!src) {
      rows.push([`${zh}_${aspect}`, `${slug}${suffix}`,
        fs.existsSync(dest) ? "installed" : "NOT SENT YET"]);
      continue;
    }
    const had = fs.existsSync(dest);
    const same = had && fs.readFileSync(src).equals(fs.readFileSync(dest));
    rows.push([`${zh}_${aspect}`, `${slug}${suffix}`, same ? "same" : had ? "REPLACED" : "new"]);
    if (apply && !same) fs.copyFileSync(src, dest);
  }
}

for (const [from, to, note] of rows) console.log(`${from.padEnd(22)} -> ${to.padEnd(24)} ${note}`);
console.log(apply ? "\nwritten" : "\ndry run — pass --apply to write");
