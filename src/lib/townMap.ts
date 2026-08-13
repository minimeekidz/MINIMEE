import type { TownBuilding, TownPickup } from "../components/PixelTown";
import { COLLECTIBLES } from "./kidCard";

// The places in MEE 小鎮. Each one is a real illustrated scene from the
// bundled asset set, so walking up to a door and going inside lands the
// child somewhere that looks like the building they just saw.
// Building ids match rooms.id, so walking through a door lands on that
// room's current lesson. The album house is the one exception: it holds
// the collection rather than a lesson.
export const TOWN_BUILDINGS: TownBuilding[] = [
  { id: "library", label: "MEE 圖書館", art: "/assets/mee-library.webp", x: 180, y: 180, w: 300, h: 220 },
  { id: "cinema", label: "MEE 戲院", art: "/assets/mee-cinema.webp", x: 620, y: 150, w: 300, h: 220 },
  { id: "album", label: "MEE 收藏館", art: "/assets/mee-album-house.webp", x: 1080, y: 200, w: 300, h: 220 },
  { id: "cafe", label: "Paw Café", art: "/assets/paw-cafe.webp", x: 300, y: 620, w: 300, h: 220 },
  { id: "studio", label: "Hero Studio", art: "/assets/hero-studio.webp", x: 800, y: 640, w: 300, h: 220 },
  { id: "market", label: "碼頭市集", art: "/assets/wharf-market-morning.webp", x: 1250, y: 700, w: 300, h: 220 },
  { id: "park", label: "遊樂場", art: "/assets/amusement-park.webp", x: 250, y: 1020, w: 300, h: 220 },
  { id: "petroom", label: "寵物房", art: "/assets/pet-room.webp", x: 1150, y: 1030, w: 280, h: 200 },
  { id: "theater", label: "劇院", art: "/assets/theater.webp", x: 700, y: 1020, w: 280, h: 200 },
];

// MEE cards are scattered in the gaps between buildings, so finding them
// means actually walking the town rather than following a single line.
const SPOTS: [number, number][] = [
  [560, 470], [1010, 480], [220, 900], [1180, 980], [960, 900],
];

export const TOWN_PICKUPS: TownPickup[] = COLLECTIBLES.map((collectible, index) => ({
  id: collectible.code,
  label: collectible.name,
  art: collectible.art,
  x: SPOTS[index % SPOTS.length][0],
  y: SPOTS[index % SPOTS.length][1],
}));
