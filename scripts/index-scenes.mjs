// Records which scene files are actually in public/assets/world.
//
// Em's filename is the index now (src/lib/scenes.ts), so a scene that never
// made it out of a batch shows up as a missing background rather than an
// error — right on screen, invisible in review. This is what the test checks
// against, so the gap fails a build instead.
//
//   node scripts/index-scenes.mjs
//
// Run it after adding, renaming or replacing anything in the folder.

import { readdir, writeFile } from "node:fs/promises";

const DIR = "public/assets/world";
const OUT = "src/data/sceneIndex.json";

const files = (await readdir(DIR))
  .filter(name => name.endsWith(".webp"))
  .sort();

await writeFile(OUT, `${JSON.stringify({
  note: "Written by scripts/index-scenes.mjs from public/assets/world. The filename is the index — see src/lib/scenes.ts.",
  files,
}, null, 2)}\n`);

console.log(`${files.length} scene files indexed`);
