// The sticker packs, read straight off the folder at build time.
//
// Deliberately no manifest file and no generator script: Em drops a .webp into
// src/assets/stickers/<category>/ and it appears. Anything that needed a
// second step would drift the moment she added a sticker without me around,
// and a half-registered sticker pack is worse than none.
//
// The filename is the label — 畫畫.webp is the sticker for 畫畫 — so a sticker
// and the word it illustrates are matched by name rather than by a lookup
// table somebody has to keep in step. See the README in that folder.

export type StickerCategory = "interest" | "activity" | "job" | "mood" | "theme";

export interface Sticker {
  /** The word this sticker illustrates, taken from the filename. */
  label: string;
  category: StickerCategory;
  src: string;
}

export const CATEGORY_LABELS: Record<StickerCategory, string> = {
  interest: "興趣",
  activity: "活動",
  job: "職業",
  mood: "心情",
  // The 144 theme-vocabulary stickers, cut from Em's nine sheets by
  // scripts/cut-theme-stickers.mjs. They carry their own word — she drew them
  // that way so they can be the answer buttons in the games.
  theme: "主題詞彙",
};

const files = import.meta.glob<string>(
  "../assets/stickers/*/*.{webp,png,svg}",
  { eager: true, query: "?url", import: "default" },
);

function parse(path: string): Sticker | null {
  // ../assets/stickers/interest/畫畫.webp
  const match = path.match(/stickers\/([^/]+)\/([^/]+)\.(webp|png|svg)$/);
  if (!match) return null;
  const category = match[1] as StickerCategory;
  if (!(category in CATEGORY_LABELS)) return null;
  return { label: match[2], category, src: files[path] };
}

export const STICKERS: Sticker[] = Object.keys(files)
  .map(parse)
  .filter((sticker): sticker is Sticker => sticker !== null)
  .sort((a, b) => a.label.localeCompare(b.label, "zh-HK"));

export function stickersIn(category: StickerCategory): Sticker[] {
  return STICKERS.filter(sticker => sticker.category === category);
}

const byLabel = new Map(STICKERS.map(sticker => [sticker.label, sticker]));

/**
 * The sticker for a word, if one has been drawn. Everything that shows a word
 * — the card, the pets' questions — goes through here and simply shows text
 * when it returns nothing, so an incomplete pack degrades instead of breaking.
 */
export function stickerFor(label: string): Sticker | null {
  return byLabel.get(label.trim()) ?? null;
}

/** Whether any stickers exist at all, so the UI can hide an empty picker. */
export const HAS_STICKERS = STICKERS.length > 0;
