import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// The month's content, and the one switch that changes it for everybody.
//
// Em's requirement: 「第時我按每個月去更新更換嘅時候，就咁喺後台度撳個掣就
// 可以全網一致同一所有小朋友都係更新維護新主題」. So the active themes are a
// handful of rows, not a deploy — nothing here is baked into the build, and
// switching a tray is an update to `theme_releases`.
//
// A child's progress is not touched by a switch. Fragments belong to a theme,
// so a theme that leaves the wall keeps its fragments and picks up where it
// left off if it comes back. That is the whole reason a release row carries
// the tray rather than the theme owning one.

export interface Theme {
  id: string;
  themeNo: number;
  nameZh: string;
  words: string[];
  question: string;
  answerPattern: string;
}

export interface CatalogCard {
  code: string;
  cardNumber: number;
  bookNo: number;
  slotNo: number;
  positionZh: string;
  normalAsset: string;
  flashAsset: string | null;
}

export interface Release {
  id: string;
  themeId: string;
  themeName: string;
  targetCardCode: string;
  traySlot: number | null;
  displayOrder: number;
  status: "current" | "carryover" | "retired";
  activeFrom: string | null;
  activeTo: string | null;
}

export function useThemeCatalogue() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const [themeRows, cardRows, releaseRows] = await Promise.all([
      supabase.from("themes").select("id, theme_no, name_zh, words, question, answer_pattern").order("theme_no"),
      supabase.from("card_catalog").select("code, card_number, book_no, slot_no, position_zh, normal_asset, flash_asset").order("card_number"),
      supabase.from("theme_releases").select("id, theme_id, target_card_code, tray_slot, display_order, status, active_from, active_to, themes(name_zh)").order("display_order"),
    ]);

    setThemes((themeRows.data ?? []).map(row => ({
      id: row.id as string,
      themeNo: (row.theme_no as number) ?? 0,
      nameZh: (row.name_zh as string) ?? "",
      words: Array.isArray(row.words) ? (row.words as string[]) : [],
      question: (row.question as string) ?? "",
      answerPattern: (row.answer_pattern as string) ?? "",
    })));

    setCards((cardRows.data ?? []).map(row => ({
      code: row.code as string,
      cardNumber: (row.card_number as number) ?? 0,
      bookNo: (row.book_no as number) ?? 0,
      slotNo: (row.slot_no as number) ?? 0,
      positionZh: (row.position_zh as string) ?? "",
      normalAsset: (row.normal_asset as string) ?? "",
      flashAsset: (row.flash_asset as string) ?? null,
    })));

    setReleases((releaseRows.data ?? []).map(row => {
      const theme = (row as { themes?: { name_zh?: string } | Array<{ name_zh?: string }> }).themes;
      return {
        id: row.id as string,
        themeId: (row.theme_id as string) ?? "",
        themeName: (Array.isArray(theme) ? theme[0]?.name_zh : theme?.name_zh) ?? "",
        targetCardCode: (row.target_card_code as string) ?? "",
        traySlot: (row.tray_slot as number) ?? null,
        displayOrder: (row.display_order as number) ?? 0,
        status: (row.status as Release["status"]) ?? "current",
        activeFrom: (row.active_from as string) ?? null,
        activeTo: (row.active_to as string) ?? null,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { themes, cards, releases, loading, refresh };
}

/**
 * Put a theme on the wall, or take it off.
 *
 * Taking a theme off sets `status = 'retired'` rather than deleting the row:
 * a child mid-way through it keeps their fragments, and the album still knows
 * which card that release paid out.
 */
export async function setTrayStatus(
  releaseId: string,
  status: Release["status"],
): Promise<boolean> {
  if (!supabase) return false;
  const patch: Record<string, unknown> = { status };
  // A retired theme leaves its tray, or the unique index would keep the slot
  // occupied by something nobody can see.
  if (status === "retired") patch.tray_slot = null;
  const { error } = await supabase.from("theme_releases").update(patch).eq("id", releaseId);
  return !error;
}

/** Move a release to a tray slot, or off the wall (null). */
export async function setTraySlot(releaseId: string, traySlot: number | null): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("theme_releases")
    .update({ tray_slot: traySlot }).eq("id", releaseId);
  return !error;
}

/** Add next month's theme: a new release row, never an edit to an old one. */
export async function addRelease(params: {
  id: string;
  themeId: string;
  targetCardCode: string;
  traySlot: number | null;
  displayOrder: number;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "冇連到資料庫" };
  const { error } = await supabase.from("theme_releases").insert({
    id: params.id,
    theme_id: params.themeId,
    target_card_code: params.targetCardCode,
    tray_slot: params.traySlot,
    display_order: params.displayOrder,
    status: "current",
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
