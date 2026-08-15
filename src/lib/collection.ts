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
  /** Which of the four books it belongs in (card_catalog.book_no). */
  bookNo: number | null;
}

export interface ThemeTray {
  theme: string;
  /** Fragments earned toward the next card in this theme, 0..FRAGMENTS_PER_CARD. */
  earned: number;
  /** Cards already completed in this theme. */
  cards: CollectedCard[];
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

    const [cardRows, fragmentRows] = await Promise.all([
      supabase.from("mee_cards")
        .select("id, code, name, rarity, art, earned_for, earned_at, theme, book_no")
        .eq("kid_card_id", kidCardId)
        .order("earned_at", { ascending: false }),
      // Fragments carry the lesson they came from, and a lesson carries its
      // theme — so the tray a fragment belongs in is the lesson's theme
      // rather than anything stored twice.
      supabase.from("lesson_fragments")
        .select("id, lesson_id, spent, room_lessons(theme)")
        .eq("kid_card_id", kidCardId)
        .eq("spent", false),
    ]);

    const collected: CollectedCard[] = (cardRows.data ?? []).map(row => ({
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      rarity: (row.rarity as CollectedCard["rarity"]) ?? "normal",
      art: row.art as string,
      earnedFor: (row.earned_for as string) ?? "",
      earnedAt: (row.earned_at as string) ?? null,
      theme: (row.theme as string) ?? null,
      bookNo: (row.book_no as number) ?? null,
    }));

    const perTheme = new Map<string, number>();
    for (const row of fragmentRows.data ?? []) {
      const lesson = (row as { room_lessons?: { theme?: string } | Array<{ theme?: string }> }).room_lessons;
      const theme = Array.isArray(lesson) ? lesson[0]?.theme : lesson?.theme;
      if (!theme) continue;
      perTheme.set(theme, (perTheme.get(theme) ?? 0) + 1);
    }

    const themes = new Set<string>([...perTheme.keys()]);
    for (const card of collected) if (card.theme) themes.add(card.theme);

    setCards(collected);
    setTrays([...themes].sort().map(theme => {
      const cardsHere = collected.filter(card => card.theme === theme);
      const fragments = perTheme.get(theme) ?? 0;
      // `spent` is set by forge_theme_card when it mints a card, so a tray
      // empties itself and starts filling again rather than looking
      // permanently full once a theme is finished.
      return { theme, earned: fragments, cards: cardsHere };
    }));
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
  { no: 3, name: "森林與天空" },
  { no: 4, name: "節日與慶典" },
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
  const byCode = new Map(cards.map(card => [card.code, card]));
  return BOOKS.map(book => ({
    no: book.no,
    name: book.name,
    slots: Array.from({ length: CARDS_PER_BOOK }, (_, index) => {
      const number = (book.no - 1) * CARDS_PER_BOOK + index + 1;
      return byCode.get(`MEE-${String(number).padStart(3, "0")}`) ?? null;
    }),
  }));
}

/** Cards outside the printed set — a pet's gift, a task reward. */
export function looseCards(cards: CollectedCard[]): CollectedCard[] {
  return cards.filter(card => !/^MEE-0(0[1-9]|1[0-9]|2[0-4])$/.test(card.code));
}

/** Ask the database to turn four fragments into the next card in the set. */
export async function forgeCard(kidCardId: string, theme: string) {
  if (!supabase) return null;
  const { data } = await supabase.rpc("forge_theme_card", {
    p_kid_card_id: kidCardId, p_theme: theme,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    { code: string; name: string; rarity: string; art: string } | undefined;
  return row ?? null;
}
