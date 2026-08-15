import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { FRAGMENTS_PER_CARD } from "./rooms";
import type { GameMode } from "./games";

// The collection, as the 珍藏館 shows it.
//
// Three views of the same data, because Em's building has three rooms:
//
//   • the hall  — every card the child owns, one tap, no navigation
//   • 卡冊      — the same cards bound into themed books of six, with the
//                 gaps left visible so a child can see what is missing
//   • 拼合室    — the fragments underneath: four to a card, one tray per
//                 theme, lighting up as they are earned
//
// The wall shows exactly six trays. The artwork is drawn as a 3x3 grid, but
// the artwork does not define the data model: the product rule is six active
// themes at a time, because a month normally introduces three and six leaves
// room for the ones a child has not finished yet. A tray keeps sitting there
// with two of its four pieces lit until they come back to it.

/**
 * Active theme trays on the 拼合室 wall. A hard maximum, not a minimum — six
 * is the rule even where the art has nine frames.
 */
export const TRAY_SLOTS = 6;
/** Cards to a book in the 卡冊 art. */
export const CARDS_PER_BOOK = 6;

export interface CollectedCard {
  id: string;
  code: string;
  name: string;
  rarity: "normal" | "flash" | "special";
  art: string;
  earnedFor: string;
  earnedAt: string | null;
  /** Which theme's fragments made it, when it came from a theme. */
  theme: string | null;
  /** Where it lives in the album — fixed metadata, not unlock order. */
  bookNo: number | null;
  slotNo: number | null;
}

export interface ThemeTray {
  traySlot: number;
  themeId: string;
  theme: string;
  words: string[];
  status: "current" | "carryover";
  /** Fragments earned toward this theme's configured card. */
  earned: number;
  /** The card this theme pays out — configured, never chosen at run time. */
  targetCode: string;
  bookNo: number;
  slotNo: number;
  /** True once that card has been forged. */
  owned: boolean;
  /**
   * The game this release is played with. It rides on the tray because the
   * words and the game that uses them must never disagree for a render —
   * one row, one source.
   */
  mode: GameMode;
  vo: string;
  question: string;
  answerPattern: string;
}

export interface Collection {
  cards: CollectedCard[];
  trays: ThemeTray[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCollection(kidCardId: string | null): Collection {
  const [cards, setCards] = useState<CollectedCard[]>([]);
  const [trays, setTrays] = useState<ThemeTray[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !kidCardId) { setLoading(false); return; }

    const [cardRows, trayRows] = await Promise.all([
      supabase.from("mee_cards")
        .select("id, code, name, rarity, art, earned_for, earned_at, theme, book_no, slot_no")
        .eq("kid_card_id", kidCardId),
      // The trays come from the configured releases, in their configured
      // order. Deriving them from whatever themes the child has fragments
      // for — and sorting those alphabetically — meant a tray moved position
      // the moment a new theme arrived.
      supabase.rpc("active_trays", { p_kid_card_id: kidCardId }),
    ]);

    setCards((cardRows.data ?? []).map(row => ({
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      rarity: (row.rarity as CollectedCard["rarity"]) ?? "normal",
      art: row.art as string,
      earnedFor: (row.earned_for as string) ?? "",
      earnedAt: (row.earned_at as string) ?? null,
      theme: (row.theme as string) ?? null,
      bookNo: (row.book_no as number) ?? null,
      slotNo: (row.slot_no as number) ?? null,
    })));

    setTrays(((trayRows.data ?? []) as Record<string, unknown>[]).map(row => ({
      traySlot: (row.tray_slot as number) ?? 0,
      themeId: (row.theme_id as string) ?? "",
      theme: (row.theme_name as string) ?? "",
      words: Array.isArray(row.words) ? (row.words as string[]) : [],
      status: (row.status as ThemeTray["status"]) ?? "current",
      earned: (row.earned as number) ?? 0,
      targetCode: (row.target_code as string) ?? "",
      bookNo: (row.book_no as number) ?? 0,
      slotNo: (row.slot_no as number) ?? 0,
      owned: Boolean(row.owned),
      mode: (row.game_mode as GameMode) ?? "sentence",
      vo: (row.vo as string) ?? "",
      question: (row.question as string) ?? "",
      answerPattern: (row.answer_pattern as string) ?? "",
    })));
    setLoading(false);
  }, [kidCardId]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Whatever today has earned — birthday, anniversary, first friend, pet
  // Lv12, the 18/36-theme achievements — handed out once per load. Every
  // grant underneath is idempotent, so a poll is the right shape and there
  // is no scheduled job to forget to run.
  useEffect(() => {
    if (!kidCardId) return;
    void (async () => {
      const given = await claimOccasions(kidCardId);
      if (given > 0) await refresh();
    })();
  }, [kidCardId, refresh]);

  return { cards, trays, loading, refresh };
}

/** Themes to a book. Three themes, each as a 普/閃 pair. */
export const THEMES_PER_BOOK = 3;
/** Books in the theme binder. 12 x 6 = 72, and one book per month. */
export const THEME_BOOKS = 12;
/** The 72 pockets a child can actually fill by learning. */
export const THEME_SLOTS = THEME_BOOKS * CARDS_PER_BOOK;

/**
 * The theme binder: 12 books of six, each book holding three themes as a
 * normal/flash pair side by side.
 *
 * Books have no names yet. 「第 N 本」 is deliberately plain rather than an
 * invented title — a made-up name on a shelf is one a child reads as real —
 * and it also happens to be the filename of the cover Em drew.
 */
export const BOOKS: Array<{ no: number; name: string; cover: string }> =
  Array.from({ length: THEME_BOOKS }, (_, index) => ({
    no: index + 1,
    name: `第 ${index + 1} 本`,
    cover: `/assets/uploads/卡牌冊/第${index + 1}冊.png`,
  }));

/** The special pages. Two drawn so far, and the count is meant to grow. */
export const SPECIAL_COVERS = [
  "/assets/uploads/卡牌冊/特別版第1冊.png",
  "/assets/uploads/卡牌冊/特別版第2冊.png",
];

export interface Book {
  no: number;
  name: string;
  /** The binder page Em drew for this book. */
  cover: string;
  slots: Array<CollectedCard | null>;
}

/**
 * A book is always six slots wide and the gaps stay visible: the empty slot
 * is the point, it is what tells a child there is another card to find.
 */
export function booksFrom(cards: CollectedCard[]): Book[] {
  // Keyed by the card's own book and slot, which are fixed product metadata.
  // Never by unlock time — a normal and its flash are two different cards in
  // two adjacent pockets, and which one arrives first is not the shelf order.
  const at = new Map<string, CollectedCard>();
  for (const card of cards) {
    if (card.bookNo && card.slotNo) at.set(`${card.bookNo}:${card.slotNo}`, card);
  }
  return BOOKS.map(book => ({
    no: book.no,
    name: book.name,
    cover: book.cover,
    slots: Array.from({ length: CARDS_PER_BOOK },
      (_, index) => at.get(`${book.no}:${index + 1}`) ?? null),
  }));
}

/**
 * 特別回憶 — the specials, and anything else with no pocket in the theme
 * binder.
 *
 * Em's rule: 「唔影響 72 張完成率」. These are counted, never divided:
 * new limited cards keep being added, so a denominator would grow forever
 * and a child would see themselves permanently incomplete. The UI says
 * 「已收藏 7 張特別回憶」, never 7 / 28.
 */
export function specialCards(cards: CollectedCard[]): CollectedCard[] {
  return cards.filter(card => !card.bookNo || !card.slotNo);
}

/** Kept as the old name for callers that have not moved yet. */
export const looseCards = specialCards;

/** Completion, counting only what a child can finish: the 72 theme pockets. */
export function themeProgress(cards: CollectedCard[]): { owned: number; total: number } {
  return {
    owned: cards.filter(card => card.bookNo && card.slotNo).length,
    total: THEME_SLOTS,
  };
}

export interface ForgedCard { code: string; name: string; rarity: string; art: string }

/**
 * Finish a theme.
 *
 * Returns every card it paid out, which is one or two: the normal always,
 * and the flash alongside it for an annual member — 「年繳會員：每個完成主題，
 * 保證獲得 Normal + Flash 雙版本」. The plural matters to the UI: two pockets
 * lighting together is the moment being sold, and showing one card and then
 * quietly adding another would throw it away.
 *
 * Which cards those are is the database's decision, never this file's.
 */
export async function forgeCard(kidCardId: string, themeId: string): Promise<ForgedCard[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc("forge_theme_card", {
    p_kid_card_id: kidCardId, p_theme_id: themeId,
  });
  return (Array.isArray(data) ? data : data ? [data] : []) as ForgedCard[];
}

/**
 * 「升級年費，即時點亮你已完成主題嘅閃耀收藏」.
 *
 * Call after an upgrade lands. Returns how many flash cards lit up, so the
 * screen can name a number instead of saying a vague well done. Safe to call
 * twice — every grant underneath is idempotent, and a second call returns 0.
 */
export async function backfillFlash(kidCardId: string): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("backfill_flash", { p_kid_card_id: kidCardId });
  return typeof data === "number" ? data : 0;
}

/**
 * Hand out whatever today has earned: birthday, festival, anniversary, first
 * friend, pet Lv12, and the 18/36-theme achievements.
 *
 * Safe to call on every load — every grant underneath is idempotent, which is
 * exactly what lets this be a poll rather than a job somebody has to run.
 * Only the festival comes from here, because only the browser has spoken to
 * the 天文台; everything else is read server-side so a page cannot ask itself
 * a card.
 */
export async function claimOccasions(
  kidCardId: string, festival?: "cny" | "midautumn" | null,
): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("claim_occasion_cards", {
    p_kid_card_id: kidCardId, p_festival: festival ?? null,
  });
  return typeof data === "number" ? data : 0;
}
