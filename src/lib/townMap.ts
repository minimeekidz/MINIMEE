import type { TownBuilding, TownPickup } from "../components/PixelTown";
import { COLLECTIBLES } from "./kidCard";

// The places in MEE 小鎮. Each one is a real illustrated scene from the
// bundled asset set, so walking up to a door and going inside lands the
// child somewhere that looks like the building they just saw.
export const TOWN_BUILDINGS: TownBuilding[] = [
  { id: "library", label: "MEE 圖書館", art: "/assets/mee-library.webp", x: 180, y: 180, w: 300, h: 220, to: "/child/library" },
  { id: "cinema", label: "MEE 戲院", art: "/assets/mee-cinema.webp", x: 620, y: 150, w: 300, h: 220, to: "/child/theatre" },
  { id: "album", label: "MEE 收藏館", art: "/assets/album-house-interior.webp", x: 1080, y: 200, w: 300, h: 220, to: "/child/albums" },
  { id: "cafe", label: "Paw Café", art: "/assets/buddy-cafe-interior.webp", x: 300, y: 620, w: 300, h: 220, to: "/child/buddy" },
  { id: "studio", label: "Hero Studio", art: "/assets/hero-studio-interior.webp", x: 800, y: 640, w: 300, h: 220, to: "/child/hero-studio" },
  { id: "market", label: "碼頭市集", art: "/assets/harbor-market.webp", x: 1250, y: 700, w: 300, h: 220, to: "/child/harbor-market" },
  { id: "home", label: "我的小屋", art: "/assets/my-home.webp", x: 700, y: 1020, w: 280, h: 200, to: "/child/room" },
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
