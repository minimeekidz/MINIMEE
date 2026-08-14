// 好感度 — how a friendship with one town pet grows.
//
// **The authority for all of this is Em's workbook**
// (`docs/source/MINIMEE_寵物設定與VO規格_v1.xlsx`, sheets 00_玩法總規則 and
// 02_12級好感度), converted to `src/data/petBible.json`. Level titles,
// thresholds and what unlocks where are read from there rather than written
// out here, so the sheet and the game cannot drift apart.
//
// The scoring, from sheet 00:
//
//   • **One point a day per pet for interacting at all** — not per action.
//     Whichever button the child presses first that day scores; every later
//     one still has its own VO and animation and adds nothing. The sheet's
//     stated reason is 避免為刷分而重複按Action；Action回歸純粹互動與角色扮演.
//   • **One more for answering that pet's question — but only twice a day
//     across the whole town.** Not two per pet. This is what makes a child
//     choose who they are really befriending.
//   • **A wrong first answer must not reveal the answer.** One real retry.
//     A correct second answer still scores. Two wrong scores nothing and
//     **does not consume a bonus slot**, so the child can go to another pet.
//   • **Answering after the two slots are gone still counts as learning.**
//     It is recorded and praised; it just adds no 好感度.
//
// So a pet moves at most 2 points a day, a level is a flat 30, and Lv.12 is
// 330 — 165 days for a pet quizzed daily, 330 for one merely visited.
//
// Friendship is a relationship, not a report card. Answer quality is recorded
// separately (first try / second try / failed) and must never be represented
// by this number.

import { BIBLE_LEVELS } from "./petBible";

export type PetActionId =
  | "greet" | "walk-together" | "hug"
  | "favourite-activity" | "share-likes"
  | "secret-1" | "invite" | "share-feelings"
  | "secret-2" | "outing" | "memories" | "best-friend";

export interface PetAction {
  id: PetActionId;
  label: string;
  /** Emoji stand-in so an action reads before a child can read. */
  icon: string;
  /** Friendship level this becomes available at, per sheet 02. */
  level: number;
}

/**
 * The action ladder, matching 02_12級好感度's 新互動／關係變化 column level for
 * level. No action carries points or a daily cap of its own — the day's first
 * interaction is what scores, whichever one it happens to be.
 */
export const PET_ACTIONS: PetAction[] = [
  { id: "greet", label: "打招呼／傾偈", icon: "👋", level: 1 },
  { id: "walk-together", label: "一齊行兩步", icon: "🚶", level: 2 },
  { id: "hug", label: "攬一攬／摸摸頭", icon: "🤗", level: 3 },
  { id: "favourite-activity", label: "做佢鍾意嘅活動", icon: "🎏", level: 4 },
  { id: "share-likes", label: "分享喜好／送小禮物", icon: "🎁", level: 5 },
  { id: "secret-1", label: "聽小秘密", icon: "🤫", level: 6 },
  { id: "invite", label: "接受佢嘅邀請", icon: "✉️", level: 7 },
  { id: "share-feelings", label: "分享心情", icon: "🌈", level: 8 },
  { id: "secret-2", label: "聽更深嘅秘密", icon: "🔑", level: 9 },
  { id: "outing", label: "去秘密地點", icon: "🗺️", level: 10 },
  { id: "memories", label: "珍藏回憶對話", icon: "📸", level: 11 },
  { id: "best-friend", label: "最好朋友專屬互動", icon: "💖", level: 12 },
];

export interface FriendLevel {
  level: number;
  title: string;
  needed: number;
  /** Em's own description of what changes at this level. */
  unlocks: string;
  reward: string;
}

/** Read from the workbook, so a title change there needs no code change. */
export const FRIEND_LEVELS: FriendLevel[] = BIBLE_LEVELS.map(level => ({
  level: level.level,
  title: level.title,
  needed: level.needed,
  unlocks: level.unlocks,
  reward: level.reward,
}));

export const MAX_LEVEL = FRIEND_LEVELS[FRIEND_LEVELS.length - 1].level;
/** Points between levels. Flat, per sheet 00 (「固定30點」). */
export const LEVEL_STEP = 30;
/** Lv.12's threshold. Reaching it caps — there is no Lv.13. */
export const MAX_POINTS = FRIEND_LEVELS[FRIEND_LEVELS.length - 1].needed;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Earned once a day per pet, for interacting at all. */
export const VISIT_POINT = 1;
/** Earned for answering, within the day's global slots. */
export const QUIZ_POINT = 1;
/** Correct answers a day that can pay, across every pet. */
export const DAILY_QUIZ_SLOTS = 2;
/** Attempts at one pet's question before it ends for the day. */
export const QUIZ_TRIES = 2;
/** Unique fragments that make a topic 已掌握, and so eligible to be asked. */
export const FRAGMENTS_FOR_MASTERY = 4;

export function levelFor(points: number): FriendLevel {
  let current = FRIEND_LEVELS[0];
  for (const step of FRIEND_LEVELS) if (points >= step.needed) current = step;
  return current;
}

export function levelProgress(points: number): { level: FriendLevel; next: FriendLevel | null; toGo: number; fraction: number } {
  const capped = Math.min(points, MAX_POINTS);
  const level = levelFor(capped);
  const next = FRIEND_LEVELS.find(step => step.level === level.level + 1) ?? null;
  if (!next) return { level, next, toGo: 0, fraction: 1 };
  const span = next.needed - level.needed;
  return {
    level, next,
    toGo: next.needed - capped,
    fraction: span <= 0 ? 1 : Math.min(1, Math.max(0, (capped - level.needed) / span)),
  };
}

export function actionsAt(level: number): PetAction[] {
  return PET_ACTIONS.filter(action => action.level <= level);
}

export function nextUnlock(level: number): PetAction | null {
  return PET_ACTIONS.find(action => action.level > level) ?? null;
}

/**
 * What a pet is thinking about, shown over its head. Decoration, and the
 * cheapest thing on screen that makes the town look inhabited.
 */
export const PET_WISHES: string[] = [
  "🍰 好想食件蛋糕…", "☀️ 今日出太陽喇！", "💤 想瞓一陣…",
  "🎵 我諗緊首歌", "🌸 啲花好靚呀", "🐟 唔知有冇魚食呢？",
  "📚 想搵人講故事", "⚽ 邊個同我玩波？", "🎨 好想畫嘢",
  "🧦 我隻襪唔見咗…", "🌈 落完雨會唔會有彩虹？", "🎂 今日係咪有人生日？",
  "🚀 我想飛上天", "🍜 好肚餓呀…", "💌 想收信",
  "🫧 想去游水", "⭐ 今晚睇唔睇到星？", "🧸 我個公仔喺邊？",
];

export const WISH_MS = 14000;

export function pickLine(lines: string[], seed = Math.random()): string {
  if (lines.length === 0) return "";
  return lines[Math.floor(seed * lines.length) % lines.length];
}

/**
 * Local date key. Daily limits follow the child's own day — one that rolled
 * over at 8am Hong Kong time would be indefensible to a parent.
 */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
