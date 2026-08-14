import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { stickerFor, type StickerCategory } from "./stickers";

// The child's sticker wall: reading, editing and the photo that may hang off
// one of them.
//
// Two rules from the spec shape everything here:
//
//   • **Sticker edits are the child's and need no parent approval**, so they
//     save as they happen rather than through a form. They are deliberately
//     low-risk — a wrong sticker is a wrong sticker.
//   • **A photo is private until a parent says otherwise, one photo at a
//     time.** Nothing here ever holds a durable URL: the path points into the
//     private child-photos bucket and a signed URL is minted at view time, so
//     turning the switch off takes the picture away immediately (ops doc §10).

export type StickerSize = "s" | "m" | "xl";

/** The wall's own categories. 'favourite' is a slot, not a sticker pack. */
export type WallCategory = StickerCategory | "favourite";

export interface WallSticker {
  id: string;
  category: WallCategory;
  label: string;
  size: StickerSize;
  sortOrder: number;
  note: string | null;
  photoPath: string | null;
  photoPublic: boolean;
  /** Resolved artwork, or null while the pack has no file of that name. */
  art: string | null;
}

function toSticker(row: Record<string, unknown>): WallSticker {
  const label = (row.label as string) ?? "";
  return {
    id: (row.id as string) ?? "",
    category: (row.category as WallCategory) ?? "interest",
    label,
    size: (row.size as StickerSize) ?? "m",
    sortOrder: (row.sort_order as number) ?? 0,
    note: (row.note as string) ?? null,
    photoPath: (row.photo_path as string) ?? null,
    photoPublic: Boolean(row.photo_public),
    art: stickerFor(label)?.src ?? null,
  };
}

/** The wall as its owner sees it — every field, including private photos. */
export function useStickerWall(cardId: string | null) {
  const [stickers, setStickers] = useState<WallSticker[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !cardId) { setLoading(false); return; }
    const { data } = await supabase
      .from("kid_card_stickers")
      .select("id, category, label, size, sort_order, note, photo_path, photo_public")
      .eq("kid_card_id", cardId)
      .order("sort_order");
    setStickers((data ?? []).map(toSticker));
    setLoading(false);
  }, [cardId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { stickers, loading, refresh, setStickers };
}

/**
 * The wall as a visitor sees it, through the public function — which withholds
 * a photo unless that one photo was switched on, and returns nothing at all
 * for an unpublished card.
 */
export async function publicStickerWall(slug: string): Promise<WallSticker[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("kid_card_public_stickers", { p_slug: slug });
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>, index: number) =>
    toSticker({ ...row, id: `${row.category}-${row.label}-${index}` }));
}

export async function addSticker(
  cardId: string,
  category: WallCategory,
  label: string,
  size: StickerSize = "m",
): Promise<boolean> {
  if (!supabase) return false;
  const { count } = await supabase
    .from("kid_card_stickers")
    .select("id", { count: "exact", head: true })
    .eq("kid_card_id", cardId).eq("category", category);
  const { error } = await supabase.from("kid_card_stickers").insert({
    kid_card_id: cardId, category, label, size, sort_order: count ?? 0,
  });
  return !error;
}

export async function removeSticker(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("kid_card_stickers").delete().eq("id", id);
  return !error;
}

export async function updateSticker(
  id: string,
  changes: Partial<Pick<WallSticker, "size" | "note" | "sortOrder" | "photoPublic">>,
): Promise<boolean> {
  if (!supabase) return false;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.size !== undefined) patch.size = changes.size;
  if (changes.note !== undefined) patch.note = changes.note || null;
  if (changes.sortOrder !== undefined) patch.sort_order = changes.sortOrder;
  if (changes.photoPublic !== undefined) patch.photo_public = changes.photoPublic;
  const { error } = await supabase.from("kid_card_stickers").update(patch).eq("id", id);
  return !error;
}

/**
 * Persist a new order. Written as one call per moved sticker rather than a
 * bulk upsert because an upsert without every column would blank the notes
 * and photos of the rows it touched.
 */
export async function reorderStickers(ordered: WallSticker[]): Promise<void> {
  const client = supabase;
  if (!client) return;
  await Promise.all(ordered.map((sticker, index) =>
    sticker.sortOrder === index
      ? Promise.resolve()
      : client.from("kid_card_stickers").update({ sort_order: index }).eq("id", sticker.id)));
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** How long a signed photo URL lives. Short: the page re-mints on each view. */
const PHOTO_URL_TTL = 60 * 10;

/**
 * Upload into the existing private bucket. The path is stored; the URL is
 * not, because a stored URL would outlive the parent switching the photo off.
 */
export async function uploadStickerPhoto(
  cardId: string,
  stickerId: string,
  file: File,
): Promise<string | null> {
  if (!supabase) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${cardId}/stickers/${stickerId}.${extension}`;
  const { error } = await supabase.storage
    .from("child-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  await supabase.from("kid_card_stickers").update({ photo_path: path }).eq("id", stickerId);
  return path;
}

export async function removeStickerPhoto(stickerId: string, path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from("child-photos").remove([path]);
  // photo_public goes back off with the file: a later upload must not inherit
  // permission granted for a picture that no longer exists.
  await supabase.from("kid_card_stickers")
    .update({ photo_path: null, photo_public: false }).eq("id", stickerId);
}

export async function signedPhoto(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data } = await supabase.storage.from("child-photos").createSignedUrl(path, PHOTO_URL_TTL);
  return data?.signedUrl ?? null;
}

/** Signed URLs for a set of stickers at once, keyed by sticker id. */
export async function signPhotos(stickers: WallSticker[]): Promise<Record<string, string>> {
  const withPhotos = stickers.filter(sticker => sticker.photoPath);
  const signed = await Promise.all(withPhotos.map(async sticker => {
    const url = await signedPhoto(sticker.photoPath);
    return [sticker.id, url] as const;
  }));
  return Object.fromEntries(signed.filter(([, url]) => url) as Array<[string, string]>);
}
