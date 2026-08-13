// MEE 世界：幾個互相連住嘅場景，唔係一個細框。
//
// The previous version put one cramped viewport inside a page. This is the
// shape actually wanted: the background IS the screen, the child walks
// around inside it, and walking to the edge of a zone crosses into the next
// one with a fade. Doors lead indoors, where the lesson video plays.
//
// Positions are normalised 0-1 against the background, so the same layout
// works on a phone held portrait and on a desktop window, and nothing has
// to be re-tuned when the art is replaced.

export type HotspotKind = "door" | "gate";

export interface Hotspot {
  id: string;
  kind: HotspotKind;
  label: string;
  /** Normalised position of the doorway or the path out. */
  x: number;
  y: number;
  /** A room id for a door, a zone id for a gate. */
  target: string;
}

export interface Zone {
  id: string;
  name: string;
  /** Backgrounds for the two halves of the day. */
  day: string;
  night: string;
  /**
   * The band of the screen the child can walk on, normalised. Keeps them
   * out of the sky and off the rooftops without needing per-pixel collision
   * against a painted background.
   */
  walk: { top: number; bottom: number };
  hotspots: Hotspot[];
}

export const ZONES: Record<string, Zone> = {
  town: {
    id: "town",
    name: "MEE 小鎮",
    day: "/assets/town-morning-v2.webp",
    night: "/assets/town-night.webp",
    walk: { top: 0.52, bottom: 0.94 },
    hotspots: [
      { id: "d-library", kind: "door", label: "MEE 圖書館", x: 0.20, y: 0.58, target: "library" },
      { id: "d-cinema", kind: "door", label: "MEE 戲院", x: 0.52, y: 0.56, target: "cinema" },
      { id: "d-cafe", kind: "door", label: "Paw Café", x: 0.80, y: 0.60, target: "cafe" },
      { id: "g-dock", kind: "gate", label: "去碼頭", x: 0.94, y: 0.88, target: "dock" },
      { id: "g-park", kind: "gate", label: "去遊樂場", x: 0.06, y: 0.88, target: "park" },
    ],
  },
  dock: {
    id: "dock",
    name: "碼頭",
    day: "/assets/dock-town-dusk.webp",
    night: "/assets/dock-town-night.webp",
    walk: { top: 0.55, bottom: 0.95 },
    hotspots: [
      { id: "d-market", kind: "door", label: "碼頭市集", x: 0.30, y: 0.62, target: "market" },
      { id: "d-studio", kind: "door", label: "Hero Studio", x: 0.66, y: 0.60, target: "studio" },
      { id: "g-town", kind: "gate", label: "返小鎮", x: 0.06, y: 0.90, target: "town" },
      { id: "g-square", kind: "gate", label: "去廣場", x: 0.94, y: 0.90, target: "square" },
    ],
  },
  park: {
    id: "park",
    name: "遊樂場",
    day: "/assets/amusement-park.webp",
    night: "/assets/amusement-park.webp",
    walk: { top: 0.58, bottom: 0.95 },
    hotspots: [
      { id: "d-theater", kind: "door", label: "劇院", x: 0.28, y: 0.64, target: "theater" },
      { id: "d-petroom", kind: "door", label: "寵物房", x: 0.72, y: 0.64, target: "petroom" },
      { id: "g-town", kind: "gate", label: "返小鎮", x: 0.94, y: 0.90, target: "town" },
    ],
  },
  square: {
    id: "square",
    name: "蘑菇廣場",
    day: "/assets/mushroom-city-morning.webp",
    night: "/assets/announcement-square-night.webp",
    walk: { top: 0.56, bottom: 0.94 },
    hotspots: [
      { id: "d-album", kind: "door", label: "MEE 收藏館", x: 0.50, y: 0.60, target: "album" },
      { id: "g-dock", kind: "gate", label: "返碼頭", x: 0.06, y: 0.90, target: "dock" },
    ],
  },
};

export const START_ZONE = "town";

/** Interior backgrounds, used by the room a door leads into. */
export const ROOM_ART: Record<string, string> = {
  library: "/assets/mee-library.webp",
  cinema: "/assets/mee-cinema.webp",
  cafe: "/assets/paw-cafe.webp",
  market: "/assets/wharf-market-morning.webp",
  studio: "/assets/hero-studio.webp",
  theater: "/assets/theater.webp",
  petroom: "/assets/pet-room.webp",
  album: "/assets/mee-album-house.webp",
};

/**
 * Which half of the day it is. The world changes with the child's own clock
 * rather than a setting, so evening play looks like evening.
 */
export function isDaytime(now: Date = new Date()): boolean {
  const hour = now.getHours();
  return hour >= 6 && hour < 18;
}

export function zoneBackground(zone: Zone, now?: Date): string {
  return isDaytime(now) ? zone.day : zone.night;
}

/** Close enough to a hotspot for its prompt to appear. */
export const REACH = 0.075;

export function hotspotNear(zone: Zone, x: number, y: number): Hotspot | null {
  let best: Hotspot | null = null;
  let bestDistance = REACH;
  for (const spot of zone.hotspots) {
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (distance < bestDistance) { best = spot; bestDistance = distance; }
  }
  return best;
}
