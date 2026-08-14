import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { stickerFor } from "./stickers";
import { PET_ACTIONS, QUIZ_POINTS, today, type PetActionId } from "./petFriends";

// Reading and writing 好感度. Everything that changes a number goes through
// award_pet_points, which records the interaction and adds the points in one
// step — split in two, a failure between them either burns the child's daily
// go for nothing or pays them twice, and a child who has been counting will
// notice either.

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
 * Do one thing with a pet. Returns the new total, or null when the daily cap
 * has already been used — the caller shows "聽日再嚟" rather than an error,
 * because running out of goes is a normal part of the day, not a fault.
 */
export async function doPetAction(
  cardId: string,
  petId: string,
  actionId: PetActionId,
  seq: number,
): Promise<number | null> {
  const action = PET_ACTIONS.find(candidate => candidate.id === actionId);
  if (!supabase || !action) return null;
  const { data, error } = await supabase.rpc("award_pet_points", {
    p_card: cardId, p_pet: petId, p_action: actionId,
    p_day: today(), p_seq: seq, p_points: action.points,
  });
  if (error) return null;
  return (data as number | null) ?? null;
}

export async function awardQuizPoints(
  cardId: string,
  petId: string,
  usedHint: boolean,
): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("award_pet_points", {
    p_card: cardId, p_pet: petId, p_action: "quiz",
    p_day: today(), p_seq: 1,
    p_points: usedHint ? QUIZ_POINTS.afterHint : QUIZ_POINTS.correct,
  });
  if (error) return null;
  return (data as number | null) ?? null;
}

export interface PetQuiz {
  /** The word being asked about. */
  answer: string;
  sticker: string | null;
  options: string[];
}

/**
 * A question drawn from what this child has actually learnt — only lessons
 * they hold a fragment for. Asking about a word they have never met would be
 * a test rather than a chat, which is the opposite of the point.
 *
 * The prompt is the word's sticker, not its text, so a child who cannot yet
 * read four Chinese words still has a real question to answer.
 */
export async function petQuizFor(cardId: string): Promise<PetQuiz | null> {
  if (!supabase) return null;
  const { data: fragments } = await supabase
    .from("lesson_fragments").select("lesson_id").eq("kid_card_id", cardId);
  const lessonIds = [...new Set((fragments ?? []).map(row => row.lesson_id as string).filter(Boolean))];
  if (lessonIds.length === 0) return null;

  const { data: lessons } = await supabase
    .from("room_lessons").select("words").in("id", lessonIds);
  const words = (lessons ?? []).flatMap(row => (row.words as { word: string }[]) ?? [])
    .map(entry => entry.word).filter(Boolean);
  if (words.length < 2) return null;

  // Prefer a word with a sticker, since that is the whole readability trick;
  // fall back to text so an incomplete sticker pack still lets pets ask.
  const drawable = words.filter(word => stickerFor(word));
  const pool = drawable.length > 0 ? drawable : words;
  const answer = pool[Math.floor(Math.random() * pool.length)];

  const distractors = [...new Set(words.filter(word => word !== answer))]
    .sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...distractors, answer].sort(() => Math.random() - 0.5);

  return { answer, sticker: stickerFor(answer)?.src ?? null, options };
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
