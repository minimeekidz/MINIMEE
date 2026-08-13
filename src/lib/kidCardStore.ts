import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  findExampleCard, STARTER_TASKS,
  type Collectible, type KidCard, type KidTask, type MeeCard,
} from "./kidCard";

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

// ---------------------------------------------------------------------------
// Parent-side editing
// ---------------------------------------------------------------------------

export interface EditableCard {
  id: string;
  childId: string;
  slug: string;
  displayName: string;
  ageGroup: KidCard["ageGroup"] | null;
  tagline: string;
  about: string;
  likes: string[];
  dreamJob: string;
  scene: string | null;
  avatarUrl: string | null;
  introVideoUrl: string | null;
  published: boolean;
  lostModeEnabled: boolean;
  lostModeToken: string | null;
  lostModeMessage: string;
}

const EDITABLE_COLUMNS =
  "id, child_id, slug, display_name, age_group, tagline, about, likes, dream_job, scene, avatar_url, intro_video_url, published, lost_mode_enabled, lost_mode_token, lost_mode_message";

function toEditable(row: Record<string, unknown>): EditableCard {
  return {
    id: row.id as string,
    childId: row.child_id as string,
    slug: row.slug as string,
    displayName: (row.display_name as string) ?? "",
    ageGroup: (row.age_group as KidCard["ageGroup"]) ?? null,
    tagline: (row.tagline as string) ?? "",
    about: (row.about as string) ?? "",
    likes: (row.likes as string[]) ?? [],
    dreamJob: (row.dream_job as string) ?? "",
    scene: (row.scene as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    introVideoUrl: (row.intro_video_url as string) ?? null,
    published: Boolean(row.published),
    lostModeEnabled: Boolean(row.lost_mode_enabled),
    lostModeToken: (row.lost_mode_token as string) ?? null,
    lostModeMessage: (row.lost_mode_message as string) ?? "",
  };
}

// Lost-mode tokens are the product's only anonymous surface, so guessing one
// has to be infeasible: 160 bits from the platform CSPRNG, never derived
// from the child's name or anything else an attacker could narrow down.
export function mintLostToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

// Slugs are public, so they carry a random suffix as well as a readable
// stem — otherwise a card's URL could be guessed from the child's name, and
// the set of published cards would be enumerable.
export function mintSlug(nickname: string): string {
  const stem = nickname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, byte => byte.toString(36)).join("").slice(0, 6);
  return `${stem || "mee"}-${suffix}`;
}

export async function loadEditableCard(childId: string): Promise<EditableCard | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("kid_cards")
    .select(EDITABLE_COLUMNS)
    .eq("child_id", childId)
    .maybeSingle();
  return data ? toEditable(data as Record<string, unknown>) : null;
}

export async function createCard(params: {
  childId: string;
  parentId: string;
  nickname: string;
  ageGroup: KidCard["ageGroup"] | null;
}): Promise<{ ok: true; card: EditableCard } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" };
  const { data, error } = await supabase
    .from("kid_cards")
    .insert({
      child_id: params.childId,
      parent_id: params.parentId,
      slug: mintSlug(params.nickname),
      display_name: params.nickname,
      age_group: params.ageGroup,
      // A new card is never public. The parent has to read it over and
      // press publish before anyone outside the family can open it.
      published: false,
    })
    .select(EDITABLE_COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "未能建立卡片" };
  return { ok: true, card: toEditable(data as Record<string, unknown>) };
}

export async function saveCard(card: EditableCard): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" };
  const { error } = await supabase
    .from("kid_cards")
    .update({
      display_name: card.displayName,
      age_group: card.ageGroup,
      tagline: card.tagline || null,
      about: card.about || null,
      likes: card.likes,
      dream_job: card.dreamJob || null,
      scene: card.scene,
      lost_mode_enabled: card.lostModeEnabled,
      // Minted on first enable and kept afterwards, so a sticker already
      // printed keeps working when the parent toggles lost mode off and on.
      lost_mode_token: card.lostModeEnabled ? (card.lostModeToken ?? mintLostToken()) : card.lostModeToken,
      lost_mode_message: card.lostModeMessage || null,
    })
    .eq("id", card.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setPublished(cardId: string, published: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" };
  const { error } = await supabase
    .from("kid_cards")
    .update({ published, published_at: published ? new Date().toISOString() : null })
    .eq("id", cardId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Collection and tasks
// ---------------------------------------------------------------------------


export async function seedStarterTasks(kidCardId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("kid_tasks").insert(
    STARTER_TASKS.map((task, index) => ({
      kid_card_id: kidCardId,
      title: task.title,
      detail: task.detail,
      sort_order: index,
    })),
  );
}

export async function loadCollectedCodes(kidCardId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("mee_cards").select("code").eq("kid_card_id", kidCardId);
  return (data ?? []).map(row => row.code as string);
}

// Awards a MEE card. The (kid_card_id, code) unique constraint plus
// ignoreDuplicates make this idempotent, so walking back over a pickup — or
// a double-fire from the game loop — can never mint the same card twice or
// overwrite the rarity it was originally earned at.
export async function awardCollectible(
  kidCardId: string,
  collectible: Collectible,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" };
  const { error } = await supabase
    .from("mee_cards")
    .upsert({
      kid_card_id: kidCardId,
      code: collectible.code,
      name: collectible.name,
      rarity: collectible.rarity,
      art: collectible.art,
      earned_for: "喺 MEE 小鎮執到",
    }, { onConflict: "kid_card_id,code", ignoreDuplicates: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface OpenTask {
  id: string;
  title: string;
  detail: string;
  done: boolean;
}

export async function loadTasks(kidCardId: string): Promise<OpenTask[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("kid_tasks")
    .select("id, title, detail, done")
    .eq("kid_card_id", kidCardId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map(row => ({
    id: row.id as string,
    title: row.title as string,
    detail: (row.detail as string) ?? "",
    done: Boolean(row.done),
  }));
}

export async function completeTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" };
  const { error } = await supabase
    .from("kid_tasks")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("id", taskId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

