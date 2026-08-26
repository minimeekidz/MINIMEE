// Records which hero frames are actually on disk.
//
//   node scripts/index-hero-art.mjs
//
// Same job as scripts/index-npc-art.mjs, for the six heroes: a hero whose
// folder never made it out of the zip should fail a build, not turn up as a
// gap in the town on a Saturday morning.
//
// Run it after adding, renaming or redrawing anything in
// public/assets/heroes/ — after scripts/cut-hero-sprites.mjs, if that is what
// put the files there.

import { readdir, writeFile } from "node:fs/promises";

const DIR = "public/assets/heroes";
const OUT = "src/data/heroArtIndex.json";

/** Frame names with the hero's own prefix stripped back off. */
const framesIn = async (where, hero) =>
  (await readdir(where).catch(() => []))
    .filter(name => name.endsWith(".webp"))
    .map(name => name.replace(/\.webp$/, "").replace(new RegExp(`^${hero}_`), ""))
    .sort();

const names = (await readdir(DIR, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

const folders = {};
for (const hero of names) {
  folders[hero] = {
    motion: await framesIn(`${DIR}/${hero}/runtime/motion`, hero),
    expressions: await framesIn(`${DIR}/${hero}/runtime/expressions`, hero),
  };
}

await writeFile(OUT, `${JSON.stringify({
  note: "Written by scripts/index-hero-art.mjs from public/assets/heroes. The test asserts every hero in HERO_FOLDERS has all sixteen motion frames and all twelve faces.",
  folders,
}, null, 2)}\n`);
