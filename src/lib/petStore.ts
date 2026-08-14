import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { stickerFor } from "./stickers";
import { FRAGMENTS_FOR_MASTERY, today } from "./petFriends";

// Reading and writing 好感度.
//
// Every point is decided by a database function (award_pet_visit,
// record_pet_quiz), never by an argument from the browser, and each records
// its interaction and adds its point in one step. Split in two, a failure
// between them either burns the child's daily go for nothing or pays them
// twice, and a child who has been counting notices either.

export interface PetFriendship { petId: string; points: number }

/** Cards a pet has given, loaded from the folder at build time. */
const giftFiles = import.meta.glob<string>(
  "../assets/pet-cards/*/*.{webp,png}",
  { eager: true, query: "?url", import: "default" },
);

export interface PetGiftCard { code: string; rarity: "normal" | "flash"; art: string }

export const PET_GIFT_CARDS: PetGiftCard[] = Object.keys(giftFiles)
  .map(path => {
    const match = path.match(/pet-cards\/(normal|flash)\/([^/]+)\.(webp|png)$/);
    return match
      ? { code: match[2], rarity: match[1] as "normal" | "flash", art: giftFiles[path] }
      : null;
  })
  .filter((card): card is PetGiftCard => card !== null);

export function giftCardsOf(rarity: "normal" | "flash"): PetGiftCard[] {
  return PET_GIFT_CARDS.filter(card => card.rarity === rarity);
}

export function usePetFriends(cardId: string | null) {
  const [friends, setFriends] = useState<Record<string, number>>({});
  const [usedToday, setUsedToday] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !cardId) { setLoading(false); return; }
    const [friendResult, usedResult] = await Promise.all([
      supabase.from("pet_friendships").select("pet_id, points").eq("kid_card_id", cardId),
      supabase.from("pet_interactions").select("pet_id, action").eq("kid_card_id", cardId).eq("day", today()),
    ]);
    const points: Record<string, number> = {};
    for (const row of friendResult.data ?? []) points[row.pet_id as string] = (row.points as number) ?? 0;
    // Keyed pet+action so the panel knows which buttons are spent for today.
    const used: Record<string, number> = {};
    for (const row of usedResult.data ?? []) {
      const key = `${row.pet_id}:${row.action}`;
      used[key] = (used[key] ?? 0) + 1;
    }
    setFriends(points);
    setUsedToday(used);
    setLoading(false);
  }, [cardId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { friends, usedToday, loading, refresh };
}

/**
 * Turning up. One point a day per pet, whichever action the child happened to
 * tap — the server decides that, so the rule cannot be argued with from a
 * browser. Returns the pet's new total, or null when there is no card to save
 * against (the public demo).
 */
export async function visitPet(cardId: string, petId: string): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("award_pet_visit", {
    p_card: cardId, p_pet: petId, p_day: today(),
  });
  return error ? null : (data as number | null);
}

export interface QuizResult {
  /** Whether this answer actually paid, or the day's slots were already gone. */
  awarded: boolean;
  total: number;
  slotsUsed: number;
}

/**
 * Record an attempt at a pet's question. Only the first DAILY_QUIZ_SLOTS
 * correct answers in a day pay, across the whole town — with twelve pets and
 * two slots, the child has to choose who they are really befriending.
 *
 * A wrong answer records that this pet has been asked (no re-rolling the same
 * animal) but spends no slot, so they can go and find another friend.
 */
export async function recordQuiz(
  cardId: string,
  petId: string,
  correct: boolean,
): Promise<QuizResult | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("record_pet_quiz", {
    p_card: cardId, p_pet: petId, p_day: today(), p_correct: correct,
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    awarded: Boolean(row.awarded),
    total: (row.total as number) ?? 0,
    slotsUsed: (row.slots_used as number) ?? 0,
  };
}

export interface PetQuiz {
  /** The word being asked about. */
  answer: string;
  /** The lesson's title, for the pet's 「你已經掌握咗『{主題}』喇」 line. */
  topic: string;
  sticker: string | null;
  options: string[];
}

/**
 * A question drawn only from topics the child has **mastered** — all
 * FRAGMENTS_FOR_MASTERY unique fragments collected, i.e. a complete MEE card.
 *
 * The previous version asked about any lesson the child held a single
 * fragment of, which sheet 00 rules out explicitly (「不再用『只持有1塊碎片』
 * 作提問資格」). A pet quizzing a child on a topic they have barely started is
 * a test, and the pets are not meant to be testing anybody.
 *
 * Fragments are counted **distinct by room**, not by row: a duplicate row
 * would otherwise make one room look like four and let a barely-started topic
 * through, which is the failure mode QA11 exists to catch.
 */
export async function petQuizFor(cardId: string): Promise<PetQuiz | null> {
  if (!supabase) return null;
  const { data: fragments } = await supabase
    .from("lesson_fragments").select("lesson_id, room_id").eq("kid_card_id", cardId);

  const roomsByLesson = new Map<string, Set<string>>();
  for (const row of fragments ?? []) {
    const lesson = row.lesson_id as string | null;
    if (!lesson) continue;
    if (!roomsByLesson.has(lesson)) roomsByLesson.set(lesson, new Set());
    roomsByLesson.get(lesson)!.add((row.room_id as string) ?? "");
  }
  const mastered = [...roomsByLesson.entries()]
    .filter(([, rooms]) => rooms.size >= FRAGMENTS_FOR_MASTERY)
    .map(([lesson]) => lesson);
  if (mastered.length === 0) return null;

  const { data: lessons } = await supabase
    .from("room_lessons").select("title, words").in("id", mastered);
  const pool = (lessons ?? []).filter(row => ((row.words as unknown[]) ?? []).length >= 2);
  if (pool.length === 0) return null;

  const lesson = pool[Math.floor(Math.random() * pool.length)];
  const words = ((lesson.words as { word: string }[]) ?? []).map(entry => entry.word).filter(Boolean);
  if (words.length < 2) return null;

  // Prefer a word with a sticker — the picture is what makes the question
  // answerable by a child who cannot yet read four Chinese words.
  const drawable = words.filter(word => stickerFor(word));
  const answer = (drawable.length > 0 ? drawable : words)[
    Math.floor(Math.random() * (drawable.length > 0 ? drawable.length : words.length))
  ];

  const distractors = [...new Set(words.filter(word => word !== answer))]
    .sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...distractors, answer].sort(() => Math.random() - 0.5);

  return {
    answer,
    topic: (lesson.title as string) ?? "",
    sticker: stickerFor(answer)?.src ?? null,
    options,
  };
}

/** A pet hands over a card. Duplicates are allowed here on purpose — Em's
 *  rule is that a repeat may be passed on to a friend, which is only possible
 *  if a repeat can exist. */
export async function givePetCard(
  cardId: string,
  petId: string,
  rarity: "normal" | "flash",
): Promise<PetGiftCard | null> {
  const pool = giftCardsOf(rarity);
  if (!supabase || pool.length === 0) return null;
  const card = pool[Math.floor(Math.random() * pool.length)];
  const { error } = await supabase.from("kid_pet_cards").insert({
    kid_card_id: cardId, pet_id: petId, code: card.code,
    rarity, given_on: today(),
  });
  return error ? null : card;
}
