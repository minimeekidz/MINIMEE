// Where and when each pet turns up — sheet 08_出沒地點規則.
//
// Until now the twelve pets were dealt out evenly across the four zones by
// index, which made where a pet lived arbitrary. The sheet assigns each one a
// home ground, a second haunt and the hours it keeps, and the note on that
// sheet asks for weighting rather than a fixed daily coordinate: 小朋友要
// 『大概知道去哪裡找』但仍有探索感.
//
// So this returns a weight, not a yes/no. A pet is most likely to be at its
// main spot during its own hours, still possible at its second spot, and
// unlikely but not impossible elsewhere — which is what leaves room to be
// pleasantly surprised.
//
// Weather is accepted but not yet supplied: the app has no weather source, so
// callers pass "clear" and the drizzle/storm columns stay unused. When a feed
// exists, only `currentWeather` needs to change. The safety ordering is
// written here already because it is the one rule that must never lose —
// 安全天氣限制 > 生日 > 活動 > 季節.

import { SPAWN_RULES, spawnFor } from "./petBible";

export type Weather = "clear" | "drizzle" | "storm";

/**
 * The sheet writes locations as prose — 「嘉年華中央廣場／海港步道」 — with the
 * pet's main haunt named first. So the match has to respect the *string's*
 * order, not the pattern list's: taking the first pattern that hits anywhere
 * put the shiba at the harbour, because 海港 appeared in its rule at all.
 */
const ZONE_HINTS: Array<[RegExp, string]> = [
  [/碼頭|海港|海邊|燈塔|Hero Station/gi, "dock"],
  [/嘉年華/g, "fair"],
  [/蘑菇|Album House|我的小屋/gi, "village"],
  [/小鎮|中央|Buddy Café|Hero Studio|MEE Library|Cinema|花圃|廣場|主路|分岔路/gi, "town"],
];

function zoneOf(place: string): string | null {
  let best: string | null = null;
  let bestIndex = Infinity;
  for (const [pattern, zone] of ZONE_HINTS) {
    const match = new RegExp(pattern.source, "i").exec(place);
    if (match && match.index < bestIndex) { bestIndex = match.index; best = zone; }
  }
  return best;
}

/** Hour ranges from 「07:30–11:00、16:00–19:00」. */
function parseHours(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const match of text.matchAll(/(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/g)) {
    const from = Number(match[1]) + Number(match[2]) / 60;
    const to = Number(match[3]) + Number(match[4]) / 60;
    ranges.push([from, to]);
  }
  return ranges;
}

function inHours(ranges: Array<[number, number]>, hour: number): boolean {
  return ranges.some(([from, to]) => (from <= to ? hour >= from && hour < to : hour >= from || hour < to));
}

export interface SpawnContext {
  zoneId: string;
  now?: Date;
  weather?: Weather;
}

/**
 * How likely this pet is to be in this zone right now. Zero means never —
 * everything else is relative weight.
 */
export function spawnWeight(gameId: string, { zoneId, now = new Date(), weather = "clear" }: SpawnContext): number {
  const rule = spawnFor(gameId);
  if (!rule) return 1;

  const hour = now.getHours() + now.getMinutes() / 60;
  const isNight = hour >= 19 || hour < 6;

  // Safety first, always. In a storm every pet is indoors at its shelter, and
  // no amount of birthday or festival weighting may pull it back outside.
  if (weather === "storm") {
    return zoneOf(rule.storm) === zoneId ? 10 : 0;
  }
  if (weather === "drizzle" && rule.drizzle) {
    const shelter = zoneOf(rule.drizzle);
    if (shelter) return shelter === zoneId ? 8 : 0.5;
  }
  if (isNight && rule.night) {
    const nightZone = zoneOf(rule.night);
    if (nightZone) return nightZone === zoneId ? 8 : 0.5;
  }

  const main = zoneOf(rule.primary);
  const second = zoneOf(rule.secondary);
  const onDuty = inHours(parseHours(rule.hours), hour);

  if (main === zoneId) return onDuty ? 10 : 3;
  if (second === zoneId) return onDuty ? 4 : 2;
  // Never zero outside its hours: a town where every pet vanishes on a
  // schedule reads as switched off rather than as somewhere people live.
  return 0.5;
}

/**
 * The pets to place in a zone right now, most likely first. Deterministic for
 * a given day and hour so a child who walks out of a room and back does not
 * find a different set of animals waiting.
 */
export function petsForZone(context: SpawnContext, limit = 3): string[] {
  const now = context.now ?? new Date();
  // Same seed for the whole hour: pets should drift, not teleport.
  const seed = now.getFullYear() * 1e6 + (now.getMonth() + 1) * 1e4 + now.getDate() * 100 + now.getHours();
  return SPAWN_RULES
    .map(rule => {
      const weight = spawnWeight(rule.gameId, { ...context, now });
      // A stable per-pet jitter, so equal weights do not always order the same.
      const hash = [...rule.gameId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const jitter = ((seed + hash) % 97) / 97;
      return { gameId: rule.gameId, score: weight + jitter };
    })
    .filter(entry => entry.score > 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(entry => entry.gameId);
}

/** Whether the sheet gives this pet somewhere to be in this zone at all. */
export function livesIn(gameId: string, zoneId: string): boolean {
  const rule = spawnFor(gameId);
  if (!rule) return false;
  return zoneOf(rule.primary) === zoneId || zoneOf(rule.secondary) === zoneId;
}
