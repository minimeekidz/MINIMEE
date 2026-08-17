// Records which theme posters are actually on disk.
//
// The cinema leaves a frame empty when a poster is missing, which is the right
// thing on screen and invisible in review. This index is what the test checks
// against, so a poster that never made it out of the zip fails a build rather
// than quietly showing an empty frame all month.
//
//   node scripts/index-posters.mjs
//
// Run it after adding or renaming anything in public/assets/posters/.

import { readdir, writeFile } from "node:fs/promises";

const DIR = "public/assets/posters";
const OUT = "src/data/posterIndex.json";

const themeIds = (await readdir(DIR))
  .filter(name => name.endsWith(".webp"))
  .map(name => name.replace(/\.webp$/, ""))
  .sort();

await writeFile(OUT, `${JSON.stringify({
  note: "Written by scripts/index-posters.mjs from public/assets/posters. The test asserts every theme has one, which is the check an empty poster frame would otherwise hide.",
  themeIds,
}, null, 2)}\n`);

console.log(`${OUT}: ${themeIds.length} posters`);
