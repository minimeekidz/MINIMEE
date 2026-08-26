// Records which NPC poses are actually on disk.
//
// Every portrait in the game hides itself when its file is missing, which is
// the right thing on screen and invisible in review. This index is what the
// test checks against, so a character who never made it out of the zip fails a
// build rather than quietly leaving an empty counter all month.
//
//   node scripts/index-npc-art.mjs
//
// Run it after adding, renaming or redrawing anything in
// public/assets/uploads/NPC/.

import { readdir, writeFile } from "node:fs/promises";

const DIR = "public/assets/uploads/NPC";
const OUT = "src/data/npcArtIndex.json";

const webp = async where =>
  (await readdir(where).catch(() => []))
    .filter(name => name.endsWith(".webp"))
    .map(name => name.replace(/\.webp$/, ""))
    .sort();

const names = (await readdir(DIR, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

const folders = {};
for (const name of names) {
  folders[name] = {
    turnaround: await webp(`${DIR}/${name}/runtime/turnaround`),
    emotions: await webp(`${DIR}/${name}/runtime/emotions`),
  };
}

await writeFile(OUT, `${JSON.stringify({
  note: "Written by scripts/index-npc-art.mjs from public/assets/uploads/NPC. The test asserts every character in NPC_FOLDERS has a front view and all twelve faces, which is the check a hidden portrait would otherwise swallow.",
  folders,
}, null, 2)}\n`);
