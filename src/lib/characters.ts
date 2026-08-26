// The cast: six heroes the child plays as, twelve pets that live in the town.
//
// Both use the real illustrated art rather than the code-drawn fallback,
// which matches the brand book's "精緻復古像素藝術" and its explicit ban on
// smooth 3D and plastic skin. The 3D plush version of the pet sheet was
// rejected for exactly that reason.
//
// The multi-angle sheets arrived on 2026-08-24. `scripts/extract-pet-sprites.
// mjs` cuts Em's magenta walk sheets into four facings x two frames per pet,
// and `petFrame` below is the lookup the town walks on. `TownPet.art` stays as
// the single front-facing portrait, which is still what a card, a panel or a
// friend list wants — a still picture of a pet, not one leg of a walk cycle.
//
// The heroes got the same treatment on 2026-08-26: 16 motion frames and 12
// faces each, one folder per hero. That drop arrived on white rather than on
// transparency, so `scripts/cut-hero-sprites.mjs` de-keys it — `Hero.art` is
// the standing `front_idle` frame, for the same reason `TownPet.art` is the
// front-facing portrait.

export interface Hero {
  id: string;
  nameZh: string;
  art: string;
}

/**
 * Where each hero's art lives, by the id the game already calls them.
 *
 * Em's folder names are kept exactly as they arrive in the drop, the same way
 * the NPC folders are (see `NPC_FOLDERS` in `babble.ts`), so a redraw can be
 * dropped in without renaming anything. Her letters are the pairs — A, B, C
 * — and the game's ids read the same pairs the other way round.
 */
export const HERO_FOLDERS: Record<string, string> = {
  "boy-a": "A_BOY", "girl-a": "A_GIRL",
  "boy-b": "B_BOY", "girl-b": "B_GIRL",
  "boy-c": "C_BOY", "girl-c": "C_GIRL",
};

/**
 * The sixteen motion frames every hero ships with.
 *
 * `front_idle` is the still one — a card, a panel and the town walker all want
 * a hero standing there, not one leg of a walk cycle. The `_a`/`_b` pairs are
 * the two steps of a walk, and `run`, `wave`, `sit_front`, `sit_side` are the
 * poses a room can put a child in.
 */
export const HERO_POSES = [
  "front_idle", "back_idle", "left_idle", "right_idle",
  "front_left_3q", "front_right_3q",
  "walk_front", "walk_back",
  "walk_left_a", "walk_left_b", "walk_right_a", "walk_right_b",
  "run", "wave", "sit_front", "sit_side",
] as const;
export type HeroPose = (typeof HERO_POSES)[number];

/** The twelve faces every hero ships with — the same twelve for all six. */
export const HERO_EXPRESSIONS = [
  "neutral", "laugh", "cheer", "proud", "shy", "surprised",
  "curious", "determined", "angry", "sad", "worried", "sleepy",
] as const;
export type HeroExpression = (typeof HERO_EXPRESSIONS)[number];

/**
 * One pose out of a hero's motion set.
 *
 * An id with no folder still returns a path rather than throwing: the call
 * sites draw it into an `<img>`, and a missing frame is better as a gap than
 * as a crash.
 */
export function heroPose(id: string, pose: HeroPose = "front_idle"): string {
  const folder = HERO_FOLDERS[id] ?? id;
  return `/assets/heroes/${folder}/runtime/motion/${folder}_${pose}.webp`;
}

/** The same hero, pulling one of the twelve faces. */
export function heroExpression(id: string, expression: HeroExpression): string {
  const folder = HERO_FOLDERS[id] ?? id;
  return `/assets/heroes/${folder}/runtime/expressions/${folder}_${expression}.webp`;
}

export const HEROES: Hero[] = [
  { id: "girl-a", nameZh: "粉紅英雄", art: heroPose("girl-a") },
  { id: "boy-a", nameZh: "藍披風英雄", art: heroPose("boy-a") },
  { id: "girl-b", nameZh: "金髮公主", art: heroPose("girl-b") },
  { id: "boy-b", nameZh: "飛行探險家", art: heroPose("boy-b") },
  { id: "boy-c", nameZh: "星章英雄", art: heroPose("boy-c") },
  { id: "girl-c", nameZh: "森林守護者", art: heroPose("girl-c") },
];

export function findHero(id: string | null | undefined): Hero {
  return HEROES.find(hero => hero.id === id) ?? HEROES[0];
}

/** Which way a pet is walking, in the words Em's sheets use. */
export type PetFacing = "down" | "up" | "left" | "right";

/**
 * One frame of a pet's walk.
 *
 * `right` is a drawn direction, not a mirrored `left` — Em's spec is explicit
 * about that (「必須獨立繪製 right_side，因為兔蝴蝶結、三花貓頭花／斑紋、
 * 牛奶盒細節等不可被鏡像到錯邊」), so nothing here flips a sprite.
 */
export function petFrame(id: string, facing: PetFacing, frame: 0 | 1): string {
  return `/assets/pets/${id}/${facing}-${frame + 1}.webp`;
}

export interface TownPet {
  id: string;
  nameZh: string;
  art: string;
  /** Where this pet likes to hang about, as a fraction of the world. */
  home: { x: number; y: number };
}

// Placed so the town feels inhabited everywhere rather than crowded in one
// corner — a pet near most doors, a few out in the open.
export const TOWN_PETS: TownPet[] = [
  { id: "sunshine-sheep", nameZh: "大太陽羊", art: "/assets/pets/sunshine-sheep.webp", home: { x: 380, y: 520 } },
  { id: "bao-hamster", nameZh: "包子倉鼠", art: "/assets/pets/bao-hamster.webp", home: { x: 760, y: 470 } },
  { id: "milk-cat", nameZh: "牛奶貓", art: "/assets/pets/milk-cat.webp", home: { x: 1220, y: 520 } },
  { id: "watermelon-shiba", nameZh: "西瓜柴犬", art: "/assets/pets/watermelon-shiba.webp", home: { x: 520, y: 930 } },
  { id: "wave-penguin", nameZh: "海浪企鵝", art: "/assets/pets/wave-penguin.webp", home: { x: 1450, y: 620 } },
  { id: "aviator-chick", nameZh: "飛行小雞", art: "/assets/pets/aviator-chick.webp", home: { x: 980, y: 500 } },
  { id: "yarn-granny-mouse", nameZh: "毛線鼠婆婆", art: "/assets/pets/yarn-granny-mouse.webp", home: { x: 180, y: 700 } },
  { id: "heart-bunny", nameZh: "愛心可愛兔", art: "/assets/pets/heart-bunny.webp", home: { x: 1600, y: 1000 } },
  { id: "cowboy-pup", nameZh: "牛仔小狗", art: "/assets/pets/cowboy-pup.webp", home: { x: 1000, y: 1250 } },
  { id: "super-pig", nameZh: "愛心超級豬", art: "/assets/pets/super-pig.webp", home: { x: 150, y: 1180 } },
  { id: "spin-hedgehog", nameZh: "旋轉刺蝟", art: "/assets/pets/spin-hedgehog.webp", home: { x: 1500, y: 1230 } },
  { id: "kimono-calico", nameZh: "和服三花貓", art: "/assets/pets/kimono-calico.webp", home: { x: 640, y: 700 } },
];
