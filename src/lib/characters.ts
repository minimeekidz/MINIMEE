// The cast: six heroes the child plays as, twelve pets that live in the town.
//
// Both use the real illustrated art rather than the code-drawn fallback,
// which matches the brand book's "精緻復古像素藝術" and its explicit ban on
// smooth 3D and plastic skin. The 3D plush version of the pet sheet was
// rejected for exactly that reason.
//
// Each is a single front-facing pose, so movement animates with a bob and a
// horizontal flip rather than a per-direction frame. When multi-angle sheets
// arrive, `scripts/extract-grid.mjs` produces them and only the lookup here
// changes.

export interface Hero {
  id: string;
  nameZh: string;
  art: string;
}

export const HEROES: Hero[] = [
  { id: "girl-a", nameZh: "粉紅英雄", art: "/assets/heroes/hero-girl-a.webp" },
  { id: "boy-a", nameZh: "藍披風英雄", art: "/assets/heroes/hero-boy-a.webp" },
  { id: "girl-b", nameZh: "金髮公主", art: "/assets/heroes/hero-girl-b.webp" },
  { id: "boy-b", nameZh: "飛行探險家", art: "/assets/heroes/hero-boy-b.webp" },
  { id: "boy-c", nameZh: "星章英雄", art: "/assets/heroes/hero-boy-c.webp" },
  { id: "girl-c", nameZh: "森林守護者", art: "/assets/heroes/hero-girl-c.webp" },
];

export function findHero(id: string | null | undefined): Hero {
  return HEROES.find(hero => hero.id === id) ?? HEROES[0];
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
