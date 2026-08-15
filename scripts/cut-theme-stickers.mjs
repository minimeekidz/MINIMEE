// Cuts Em's nine sticker sheets into 144 individual theme-word stickers.
//
//   node scripts/cut-theme-stickers.mjs <folder-of-9-sheets>
//
// Each sheet is a 4x4 grid of stickers on a cream page: four themes to a
// sheet, one theme per row, that theme's four words across the columns in the
// workbook's order.
//
// The sheets are NOT in theme order, and the "(1)…(9)" in the filenames is a
// download suffix rather than a sequence. Cutting them in filename order gave
// 小魚 a dog with a megaphone. SHEETS below is the real mapping, read off the
// first cell of each sheet by eye and verified against the workbook.
//
// Two things the cut has to get right:
//
//  • The caption plate stays. Em drew these as 「小圖片連文字嘅 Sticker，
//    可以用來選擇答案嘅時候用」 — the word is part of the sticker, which is
//    exactly what makes them usable as answer buttons for a child who is
//    still learning to read. An earlier pass cut the plates off and was
//    solving a problem nobody had.
//  • The cream page has to become transparency, or the stickers sit on beige
//    rectangles everywhere they are placed. Flood-filling from the border
//    rather than keying the colour globally is what keeps the cream *inside*
//    a sticker (a sheep, a page, a bun) opaque.

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import themeBook from "../src/data/themeBook.json" with { type: "json" };

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("usage: node scripts/cut-theme-stickers.mjs <folder-of-9-sheets>");
  process.exit(1);
}
const OUT = "src/assets/stickers/theme";

const COLS = 4;
const ROWS = 4;
/** Colour distance at which a pixel still counts as page rather than sticker. */
const TOLERANCE = 34;

/**
 * Which theme each sheet starts at, keyed by the "(N)" in its filename.
 *
 * Identified from the first cell of each sheet: (1) 港鐵 is theme 1,
 * (2) 霸王龍 is theme 13, (3) 風力 is theme 33, and so on. Together they
 * cover 1, 5, 9, 13, 17, 21, 25, 29, 33 — all nine blocks of four, no gaps
 * and no repeats, which the check below enforces.
 */
const SHEETS = { 1: 1, 2: 13, 3: 33, 4: 9, 5: 5, 6: 29, 7: 25, 8: 21, 9: 17 };

const sheets = readdirSync(SOURCE)
  .filter(name => name.toLowerCase().endsWith(".png") && !name.startsWith("."))
  .map(name => {
    const tag = Number(name.match(/\((\d+)\)/)?.[1] ?? 0);
    const startTheme = SHEETS[tag];
    if (!startTheme) throw new Error(`no sheet mapping for "${name}"`);
    return { name, startTheme };
  })
  .sort((a, b) => a.startTheme - b.startTheme);

if (sheets.length !== 9) {
  throw new Error(`expected 9 sheets, found ${sheets.length}`);
}
const starts = new Set(sheets.map(sheet => sheet.startTheme));
for (let theme = 1; theme <= 33; theme += 4) {
  if (!starts.has(theme)) throw new Error(`no sheet starts at theme ${theme}`);
}

const themes = themeBook.themes;
if (themes.length !== 36) throw new Error(`expected 36 themes, found ${themes.length}`);

/**
 * Make the page transparent by flooding inwards from the border.
 *
 * A global colour key would punch holes through anything cream inside the
 * drawing — a sheep's fleece, a steamed bun, a page of a book — so only pixels
 * reachable from the edge are cleared.
 */
function clearPage(data, width, height) {
  const at = (x, y) => (y * width + x) * 4;
  const page = [data[0], data[1], data[2]];
  const near = index =>
    Math.abs(data[index] - page[0]) + Math.abs(data[index + 1] - page[1])
      + Math.abs(data[index + 2] - page[2]) < TOLERANCE * 3;

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x += 1) { stack.push([x, 0], [x, height - 1]); }
  for (let y = 0; y < height; y += 1) { stack.push([0, y], [width - 1, y]); }

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const flat = y * width + x;
    if (seen[flat]) continue;
    const index = at(x, y);
    if (!near(index)) continue;
    seen[flat] = 1;
    data[index + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return data;
}

/** The tight box around everything still opaque, so no sticker carries margin. */
function contentBox(data, width, height) {
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 16) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

mkdirSync(OUT, { recursive: true });
const written = [];

for (const sheet of sheets) {
  const meta = await sharp(join(SOURCE, sheet.name)).metadata();
  const cellW = Math.floor(meta.width / COLS);
  const cellH = Math.floor(meta.height / ROWS);

  for (let row = 0; row < ROWS; row += 1) {
    const theme = themes[sheet.startTheme - 1 + row];
    if (!theme) throw new Error(`no theme at ${sheet.startTheme + row}`);

    for (let col = 0; col < COLS; col += 1) {
      const word = theme.words[col];
      if (!word) throw new Error(`${theme.nameZh} has no word ${col + 1}`);

      const { data, info } = await sharp(join(SOURCE, sheet.name))
        .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      clearPage(data, info.width, info.height);
      const box = contentBox(data, info.width, info.height);
      if (!box) throw new Error(`nothing left after trimming ${theme.nameZh}/${word}`);
      // A cell that boxes down to almost nothing means the grid slipped, and
      // a silently blank sticker is worse than a failed build.
      if (box.height < cellH * 0.5 || box.width < cellW * 0.4) {
        throw new Error(`${theme.nameZh}/${word} boxed to ${box.width}x${box.height} — check the grid`);
      }

      // Every sticker the same height keeps a row of them optically even; the
      // width is left to the drawing so a tram is wider than a bun.
      const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .extract(box)
        .resize({ height: 320, fit: "inside", withoutEnlargement: false })
        .webp({ quality: 92 })
        .toBuffer();

      writeFileSync(join(OUT, `${word}.webp`), out);
      written.push({ theme: theme.themeNo, word, bytes: out.length });
    }
  }
}

const words = new Set(written.map(item => item.word));
console.log(`cut ${written.length} stickers, ${words.size} distinct words -> ${OUT}`);
// Words repeat across themes (機器人 is in 12 and 28, 花朵 in 8 and 20), so the
// file count is legitimately lower than 144 — but a big shortfall means the
// grid slipped, and that is worth failing on rather than shipping quietly.
if (words.size < 130) throw new Error(`only ${words.size} distinct words — check the grid`);
