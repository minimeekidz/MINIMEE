import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { publicStickerWall, type WallSticker } from "./stickerStore";
import { stickerFor } from "./stickers";
import type { DerivedAge } from "./age";
import { findExampleCard, type MeeCard } from "./kidCard";

// The public scrapbook profile.
//
// Everything sensitive goes through `kid_card_public`, a SECURITY DEFINER
// function that applies the per-field switches. The raw columns behind them —
// `children.dob`, `kid_cards.school` — are **not granted to anon at all**, so
// a visitor cannot reach them even by querying the table directly. The
// function decides what to derive; the grants make sure there is nothing to
// derive it from otherwise.
//
// Age is computed in that function rather than stored, so it is right on the
// day after a birthday without anything having to run.

export interface PublicProfile {
  /** Present only on the bundled demo cards, which carry a clickable token. */
  lostModeToken: string;
  isExample: boolean;
  id: string;
  slug: string;
  nickname: string;
  tagline: string;
  about: string | null;
  avatar: string;
  scene: string | null;
  heroId: string | null;
  dreamJob: string | null;
  age: DerivedAge | null;
  school: string | null;
  favourites: { animal: string | null; food: string | null; colour: string | null; place: string | null };
  quote: string | null;
  introVideoUrl: string | null;
  introVideoPoster: string | null;
  lostModeEnabled: boolean;
  lostModeMessage: string | null;
}

const FALLBACK_AVATAR = "/assets/hero-3-5.webp";

export type ProfileLookup =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "found"; profile: PublicProfile; stickers: WallSticker[]; cards: MeeCard[] };

/**
 * The bundled demo cards are the marketing site's examples and are reachable
 * by slug without existing in the database — the home page links straight at
 * /kid/mimi. They also stand in when Supabase is not configured at all, so a
 * fresh checkout can open the page and see what it is.
 */
function exampleLookup(slug: string): ProfileLookup {
  const example = findExampleCard(slug);
  // A missing card and an unpublished one look identical on purpose:
  // otherwise a slug could be probed to confirm a card exists.
  if (!example) return { state: "missing" };

  const wall = (labels: string[], category: WallSticker["category"], offset: number) =>
    labels.map((label, index) => ({
      id: `example-${category}-${index}`,
      category,
      label,
      size: (category === "interest" && index === 0 ? "xl" : "m") as WallSticker["size"],
      sortOrder: offset + index,
      note: null, photoPath: null, photoPublic: false,
      art: stickerFor(label)?.src ?? null,
    }));

  return {
    state: "found",
    profile: {
      id: example.id, slug: example.slug, nickname: example.nickname,
      tagline: example.tagline, about: example.about,
      avatar: example.avatar, scene: example.scene, heroId: null,
      dreamJob: example.dreamJob,
      age: { years: example.age ?? (Number(example.ageGroup.split("-")[0]) || 7), approximate: false },
      school: null,
      favourites: example.favourites ?? { animal: null, food: null, colour: null, place: null },
      quote: example.quote ?? null,
      introVideoUrl: example.introVideoUrl,
      introVideoPoster: example.introVideoPoster,
      lostModeEnabled: Boolean(example.lostMode),
      lostModeMessage: example.lostMode?.message ?? null,
      lostModeToken: example.lostMode?.token ?? "",
      isExample: true,
    },
    stickers: [
      ...wall(example.likes, "interest", 0),
      ...wall(example.daily ?? [], "activity", example.likes.length),
    ],
    cards: example.cards,
  };
}

export function usePublicProfile(slug: string | undefined): ProfileLookup {
  const [lookup, setLookup] = useState<ProfileLookup>({ state: "loading" });

  useEffect(() => {
    if (!slug) { setLookup({ state: "missing" }); return; }
    // No backend configured (a fresh checkout, or the marketing build): the
    // demo cards are the only cards there are.
    if (!supabase) { setLookup(exampleLookup(slug)); return; }
    let live = true;

    void (async () => {
      const { data, error } = await supabase.rpc("kid_card_public", { p_slug: slug });
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;

      if (error || !row) {
        if (!live) return;
        setLookup(exampleLookup(slug));
        return;
      }

      const [stickers, cardRows] = await Promise.all([
        publicStickerWall(slug),
        supabase.from("mee_cards")
          .select("id, code, name, rarity, art, earned_for, earned_at")
          .eq("kid_card_id", row.id as string)
          .order("earned_at", { ascending: false }),
      ]);

      const cards: MeeCard[] = (cardRows.data ?? []).map(card => ({
        id: card.id as string,
        code: card.code as string,
        name: card.name as string,
        rarity: (card.rarity as MeeCard["rarity"]) ?? "normal",
        art: card.art as string,
        earnedFor: (card.earned_for as string) ?? "",
        earnedAt: (card.earned_at as string) ?? null,
      }));

      const years = row.age as number | null;
      if (!live) return;
      setLookup({
        state: "found",
        profile: {
          id: row.id as string,
          slug: row.slug as string,
          nickname: (row.display_name as string) ?? "",
          tagline: (row.tagline as string) ?? "",
          about: (row.about as string) ?? null,
          avatar: (row.avatar_url as string) ?? FALLBACK_AVATAR,
          scene: (row.scene as string) ?? null,
          heroId: (row.hero_id as string) ?? null,
          dreamJob: (row.dream_job as string) ?? null,
          age: years === null || years === undefined
            ? null
            : { years, approximate: Boolean(row.age_is_approximate) },
          school: (row.school as string) ?? null,
          favourites: {
            animal: (row.favourite_animal as string) ?? null,
            food: (row.favourite_food as string) ?? null,
            colour: (row.favourite_colour as string) ?? null,
            place: (row.favourite_place as string) ?? null,
          },
          quote: (row.quote as string) ?? null,
          introVideoUrl: (row.intro_video_url as string) ?? null,
          introVideoPoster: (row.intro_video_poster as string) ?? null,
          lostModeEnabled: Boolean(row.lost_mode_enabled),
          lostModeMessage: (row.lost_mode_message as string) ?? null,
          // A real card never ships its token to the browser; the finder
          // reaches the parent by scanning the QR sticker on the item.
          lostModeToken: "",
          isExample: false,
        },
        stickers,
        cards,
      });
    })();

    return () => { live = false; };
  }, [slug]);

  return lookup;
}

// ---------------------------------------------------------------------------
// Owner-side profile fields
// ---------------------------------------------------------------------------

export interface ProfileFields {
  school: string;
  favouriteAnimal: string;
  favouriteFood: string;
  favouriteColour: string;
  favouritePlace: string;
  quote: string;
  showAge: boolean;
  showSchool: boolean;
  showAbout: boolean;
  showFavourites: boolean;
  showDream: boolean;
  showQuote: boolean;
}

export const EMPTY_FIELDS: ProfileFields = {
  school: "", favouriteAnimal: "", favouriteFood: "", favouriteColour: "",
  favouritePlace: "", quote: "",
  // Defaults follow the schema: anything identifying starts private, and the
  // parent has to turn it on deliberately.
  showAge: false, showSchool: false,
  showAbout: true, showFavourites: true, showDream: true, showQuote: true,
};

export async function loadProfileFields(cardId: string): Promise<ProfileFields | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("kid_cards")
    .select("school, favourite_animal, favourite_food, favourite_colour, favourite_place, quote, show_age, show_school, show_about, show_favourites, show_dream, show_quote")
    .eq("id", cardId).maybeSingle();
  if (!data) return null;
  return {
    school: (data.school as string) ?? "",
    favouriteAnimal: (data.favourite_animal as string) ?? "",
    favouriteFood: (data.favourite_food as string) ?? "",
    favouriteColour: (data.favourite_colour as string) ?? "",
    favouritePlace: (data.favourite_place as string) ?? "",
    quote: (data.quote as string) ?? "",
    showAge: Boolean(data.show_age),
    showSchool: Boolean(data.show_school),
    showAbout: Boolean(data.show_about),
    showFavourites: Boolean(data.show_favourites),
    showDream: Boolean(data.show_dream),
    showQuote: Boolean(data.show_quote),
  };
}

/** Saved on Confirm, per the spec's parent flow — not autosaved. */
export async function saveProfileFields(cardId: string, fields: ProfileFields): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("kid_cards").update({
    school: fields.school || null,
    favourite_animal: fields.favouriteAnimal || null,
    favourite_food: fields.favouriteFood || null,
    favourite_colour: fields.favouriteColour || null,
    favourite_place: fields.favouritePlace || null,
    quote: fields.quote || null,
    show_age: fields.showAge,
    show_school: fields.showSchool,
    show_about: fields.showAbout,
    show_favourites: fields.showFavourites,
    show_dream: fields.showDream,
    show_quote: fields.showQuote,
  }).eq("id", cardId);
  return !error;
}

/** The child's date of birth, which age is derived from. Parent-managed. */
export async function saveChildDob(childId: string, dob: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("children").update({ dob: dob || null }).eq("id", childId);
  return !error;
}

export async function loadChildDob(childId: string): Promise<string> {
  if (!supabase) return "";
  const { data } = await supabase.from("children").select("dob").eq("id", childId).maybeSingle();
  return (data?.dob as string) ?? "";
}
