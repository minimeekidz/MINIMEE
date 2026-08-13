import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { findExampleCard, type KidCard, type KidTask, type MeeCard } from "./kidCard";

// Row shapes as they come back from Supabase. The public read is a
// column-level grant (see the kid_cards migration), so `anon` never receives
// parent_id, child_id or lost_mode_token — the select lists below are
// exactly what an unauthenticated visitor is allowed to see.
const PUBLIC_CARD_COLUMNS =
  "id, slug, display_name, age_group, tagline, about, likes, dream_job, scene, avatar_url, intro_video_url, intro_video_poster, published, lost_mode_enabled, lost_mode_message";

interface CardRow {
  id: string;
  slug: string;
  display_name: string;
  age_group: KidCard["ageGroup"] | null;
  tagline: string | null;
  about: string | null;
  likes: string[] | null;
  dream_job: string | null;
  scene: string | null;
  avatar_url: string | null;
  intro_video_url: string | null;
  intro_video_poster: string | null;
  published: boolean;
  lost_mode_enabled: boolean;
  lost_mode_message: string | null;
}

const FALLBACK_SCENE = "/assets/town-morning.webp";
const FALLBACK_AVATAR = "/assets/hero-3-5.webp";

function toKidCard(row: CardRow, cards: MeeCard[], tasks: KidTask[]): KidCard {
  return {
    id: row.id,
    slug: row.slug,
    nickname: row.display_name,
    ageGroup: row.age_group ?? "6-8",
    tagline: row.tagline ?? "",
    about: row.about ?? "",
    likes: row.likes ?? [],
    dreamJob: row.dream_job ?? "",
    avatar: row.avatar_url ?? FALLBACK_AVATAR,
    scene: row.scene ?? FALLBACK_SCENE,
    introVideoUrl: row.intro_video_url,
    introVideoPoster: row.intro_video_poster ?? row.scene ?? FALLBACK_SCENE,
    cards,
    tasks,
    // The token is never sent to the browser. The public page only needs to
    // know whether to show the section; /lost/:token resolves the token
    // server-side through kid_card_for_lost_token.
    lostMode: row.lost_mode_enabled
      ? { enabled: true, token: "", message: row.lost_mode_message ?? "" }
      : null,
    isExample: false,
  };
}

export type CardLookup =
  | { state: "loading" }
  | { state: "found"; card: KidCard }
  | { state: "missing" };

// Resolves /kid/:slug. Real published cards win; the two bundled examples
// answer for their own slugs so the marketing links keep working even before
// any family has published one.
export function useKidCard(slug: string | undefined): CardLookup {
  const [lookup, setLookup] = useState<CardLookup>({ state: "loading" });

  const load = useCallback(async () => {
    if (!slug) {
      setLookup({ state: "missing" });
      return;
    }

    if (supabase) {
      const { data: row } = await supabase
        .from("kid_cards")
        .select(PUBLIC_CARD_COLUMNS)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (row) {
        const card = row as unknown as CardRow;
        const [meeResult, taskResult] = await Promise.all([
          supabase.from("mee_cards")
            .select("id, code, name, rarity, art, earned_for, earned_at")
            .eq("kid_card_id", card.id)
            .order("earned_at", { ascending: false }),
          supabase.from("kid_tasks")
            .select("id, title, detail, done, sort_order")
            .eq("kid_card_id", card.id)
            .eq("done", false)
            .order("sort_order", { ascending: true }),
        ]);

        const cards: MeeCard[] = (meeResult.data ?? []).map(mee => ({
          id: mee.id as string,
          code: mee.code as string,
          name: mee.name as string,
          rarity: mee.rarity as MeeCard["rarity"],
          art: mee.art as string,
          earnedFor: (mee.earned_for as string) ?? "",
          earnedAt: mee.earned_at as string,
        }));

        const tasks: KidTask[] = (taskResult.data ?? []).map(task => ({
          id: task.id as string,
          title: task.title as string,
          detail: (task.detail as string) ?? "",
          rewardCardId: "",
          done: task.done as boolean,
        }));

        setLookup({ state: "found", card: toKidCard(card, cards, tasks) });
        return;
      }
    }

    const example = findExampleCard(slug);
    setLookup(example ? { state: "found", card: example } : { state: "missing" });
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  return lookup;
}

export interface LostContact {
  slug: string;
  displayName: string;
  message: string;
}

// Resolves a lost-item token without the browser ever holding the token's
// owning row: kid_card_for_lost_token is SECURITY DEFINER and returns
// nothing once the parent switches lost mode off.
export async function resolveLostToken(token: string): Promise<LostContact | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("kid_card_for_lost_token", { p_token: token });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = (Array.isArray(data) ? data[0] : data) as {
    slug: string; display_name: string; lost_mode_message: string | null;
  };
  return { slug: row.slug, displayName: row.display_name, message: row.lost_mode_message ?? "" };
}
