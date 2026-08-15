import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { FRAGMENTS_PER_CARD } from "./rooms";

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
  rarity: "normal" | "flash";
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
    })));
    setLoading(false);
  }, [kidCardId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { cards, trays, loading, refresh };
}

/**
 * The four books in 卡冊珍藏館, six cards each — the structure the album art
 * is drawn for and the one the ops doc's BOOK 1–4 already names.
 */
export const BOOKS: Array<{ no: number; name: string }> = [
  { no: 1, name: "城市出發" },
  { no: 2, name: "海洋與夜行" },
  // Books 3 and 4 have no name yet. The product has always said 尚待正式底圖
  // for them, and inventing one here would put a made-up name on a shelf
  // that a child reads as real.
  { no: 3, name: "BOOK 3" },
  { no: 4, name: "BOOK 4" },
];

export interface Book {
  no: number;
  name: string;
  slots: Array<CollectedCard | null>;
}

/**
 * A book is always six slots wide and the gaps stay visible: the empty slot
 * is the point, it is what tells a child there is another card to find.
 */
export function booksFrom(cards: CollectedCard[]): Book[] {
  // Keyed by the card's own book and slot, which are fixed product metadata
  // (Em: 卡號／Book／Slot 為固定). Never by unlock time, and never by
  // re-deriving the position from the card number — when the numbering is
  // re-sequenced, only the catalog changes.
  const at = new Map<string, CollectedCard>();
  for (const card of cards) {
    if (card.bookNo && card.slotNo) at.set(`${card.bookNo}:${card.slotNo}`, card);
  }
  return BOOKS.map(book => ({
    no: book.no,
    name: book.name,
    slots: Array.from({ length: CARDS_PER_BOOK },
      (_, index) => at.get(`${book.no}:${index + 1}`) ?? null),
  }));
}

/** Cards with no album position — a pet's gift, a task reward. */
export function looseCards(cards: CollectedCard[]): CollectedCard[] {
  return cards.filter(card => !card.bookNo || !card.slotNo);
}

/**
 * Turn four fragments into the card this theme is configured to pay. The
 * database decides which card that is; nothing here may substitute one.
 */
export async function forgeCard(kidCardId: string, themeId: string) {
  if (!supabase) return null;
  const { data } = await supabase.rpc("forge_theme_card", {
    p_kid_card_id: kidCardId, p_theme_id: themeId,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    { code: string; name: string; rarity: string; art: string } | undefined;
  return row ?? null;
}
