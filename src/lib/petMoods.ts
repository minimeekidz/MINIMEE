// What a pet is feeling, and the one sticker it is thinking about.
//
// Em: 「小寵物平常只會有一啲 Sticker 嘅想法 Bubbles，唔使長期都有句句子喺上
// 面，當同佢互動嘅時候先有嘢講都得；或者平常啲小寵物係會有唔同嘅情緒變化
// （當然要配合埋佢諗法 Bubbles 同埋聲音，好似 sims4 咁樣）」.
//
// Before this, all six pets in a zone carried a full sentence over their heads
// at all times and swapped it every fourteen seconds. Six speech bubbles is
// not a town, it is a wall of text with animals behind it — and a thought you
// can always see is not a thought, it is a label.
//
// So: a pet has a mood, the mood drifts on its own, and now and then *one*
// pet thinks a single sticker for a few seconds and then stops. Talking is
// what happens when the child talks to them.

import type { PetFace } from "./characters";

export type Mood = "happy" | "sleepy" | "hungry" | "curious" | "playful" | "shy";

export interface MoodSpec {
  id: Mood;
  nameZh: string;
  /**
   * The drawn face this mood wears when the pet is standing still.
   *
   * Em shipped 24 emotions per pet and the game has six moods, so this is a
   * choice rather than a mapping: the face a pet holds while it is *being*
   * this mood, not every face it could ever pull. The rest of the 24 are for
   * moments — a card won, a wrong answer, a friend arriving — which reach for
   * them by name.
   */
  face: PetFace;
  /** Stickers, not sentences. One at a time, over one pet, briefly. */
  thoughts: string[];
  /** What it says when the child actually talks to it. */
  lines: string[];
  /** Voice colouring, multiplied onto the pet's own pitch and pace. */
  pitch: number;
  pace: number;
  /** How likely this mood is to produce a thought at all. */
  chatter: number;
}

export const MOODS: Readonly<Record<Mood, MoodSpec>> = Object.freeze({
  happy: {
    id: "happy", nameZh: "好開心",
    face: "gentle_smile",
    thoughts: ["😊", "🌈", "☀️", "🎵", "💛"],
    lines: ["今日好靚天呀！", "見到你好開心！", "一齊行吓好唔好？"],
    pitch: 1.06, pace: 0.95, chatter: 0.5,
  },
  sleepy: {
    id: "sleepy", nameZh: "眼瞓",
    // A sleepy pet thinks less often and more slowly. The rate is the
    // characterisation as much as the picture is.
    face: "sleepy",
    thoughts: ["💤", "🌙", "🛏️", "🥱"],
    lines: ["好眼瞓…", "瞓多五分鐘…", "唔好嘈住我…"],
    pitch: 0.9, pace: 1.35, chatter: 0.22,
  },
  hungry: {
    id: "hungry", nameZh: "肚餓",
    face: "pout",
    thoughts: ["🍰", "🍜", "🍓", "🍪", "🥛"],
    lines: ["好肚餓呀…", "有冇嘢食？", "我想食蛋糕！"],
    pitch: 1.0, pace: 1.0, chatter: 0.55,
  },
  curious: {
    id: "curious", nameZh: "好奇",
    face: "confused",
    thoughts: ["❓", "🔍", "📚", "🗺️", "✨"],
    lines: ["嗰邊有咩呀？", "我諗緊一樣嘢…", "你知唔知點解？"],
    pitch: 1.03, pace: 1.0, chatter: 0.5,
  },
  playful: {
    id: "playful", nameZh: "想玩",
    face: "excited",
    thoughts: ["⚽", "🎈", "🪁", "🎪", "🤸"],
    lines: ["同我玩吖！", "捉我唔到！", "再玩多次！"],
    pitch: 1.12, pace: 0.82, chatter: 0.7,
  },
  shy: {
    id: "shy", nameZh: "怕醜",
    face: "shy",
    thoughts: ["🫣", "🌸", "💭"],
    lines: ["…你好。", "我有少少怕醜…", "可唔可以慢慢傾？"],
    pitch: 0.97, pace: 1.15, chatter: 0.25,
  },
});

export const MOOD_IDS = Object.keys(MOODS) as Mood[];

/** A mood to start in, stable per pet so the same friend is not random. */
export function startingMood(petId: string): Mood {
  let h = 0;
  for (const ch of petId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MOOD_IDS[h % MOOD_IDS.length];
}

/**
 * Where a mood goes next.
 *
 * Neighbours rather than anywhere: a pet that jumps from asleep to bouncing
 * and back inside a minute reads as broken, while sleepy → shy → curious
 * reads as an afternoon. Each mood lists who it can become.
 */
const DRIFT: Readonly<Record<Mood, Mood[]>> = Object.freeze({
  happy: ["playful", "curious", "hungry"],
  sleepy: ["shy", "happy"],
  hungry: ["happy", "curious"],
  curious: ["playful", "happy", "shy"],
  playful: ["happy", "hungry", "sleepy"],
  shy: ["curious", "happy", "sleepy"],
});

export function driftMood(from: Mood, roll = Math.random()): Mood {
  const next = DRIFT[from];
  return next[Math.floor(roll * next.length) % next.length];
}

/** How long one thought stays over a pet's head. */
export const THOUGHT_MS = 4200;
/** How often the town considers letting somebody think something. */
export const THINK_TICK_MS = 3400;
/** How often a pet's mood is allowed to move. */
export const MOOD_TICK_MS = 26000;

export function pickThought(mood: Mood, roll = Math.random()): string {
  const spec = MOODS[mood];
  return spec.thoughts[Math.floor(roll * spec.thoughts.length) % spec.thoughts.length];
}

export function pickMoodLine(mood: Mood, roll = Math.random()): string {
  const spec = MOODS[mood];
  return spec.lines[Math.floor(roll * spec.lines.length) % spec.lines.length];
}
