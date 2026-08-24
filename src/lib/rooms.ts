import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// The v2 learning loop.
//
// Rooms are permanent places with fixed identities — the library is always
// about reading words, the café is always about everyday talk. A theme
// swaps the video and word list inside a room; it never rearranges what the
// rooms are for. Two things follow from that, and both were the point:
//
//  - A child can walk into any room in any order. Nothing is a prerequisite
//    for anything else.
//  - One room can be updated without producing a whole set, so the business
//    can open with three rooms filled instead of all eight.

/** Fragments needed for one MEE card. Four reads as "visit four places". */
export const FRAGMENTS_PER_CARD = 4;

export interface Room {
  id: string;
  nameZh: string;
  blurb: string;
  art: string;
  sortOrder: number;
}

export interface LessonWord {
  word: string;
  reading?: string;
  meaning?: string;
}

export interface Lesson {
  id: string;
  roomId: string;
  theme: string;
  /**
   * Which of the 36 themes this lesson belongs to, when it belongs to one.
   * Null on the placeholder lessons that predate the theme catalogue — those
   * still play, they just play the plain word game rather than the theme's
   * configured one.
   */
  themeId: string | null;
  title: string;
  videoPath: string | null;
  words: LessonWord[];
}

export interface RoomWithLesson extends Room {
  lesson: Lesson | null;
  /** True once this child has earned the fragment for the current lesson. */
  earned: boolean;
}

function toRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    nameZh: row.name_zh as string,
    blurb: (row.blurb as string) ?? "",
    art: row.art as string,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

function toLesson(row: Record<string, unknown>): Lesson {
  const raw = row.words;
  const words: LessonWord[] = Array.isArray(raw)
    ? raw.filter(item => item && typeof item === "object").map(item => item as LessonWord)
    : [];
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    theme: (row.theme as string) ?? "",
    themeId: (row.theme_id as string) ?? null,
    title: (row.title as string) ?? "",
    videoPath: (row.video_path as string) ?? null,
    words,
  };
}

export function useRooms(kidCardId: string | null): {
  rooms: RoomWithLesson[];
  fragments: number;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [rooms, setRooms] = useState<RoomWithLesson[]>([]);
  const [fragments, setFragments] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);

    const [roomResult, lessonResult, fragmentResult] = await Promise.all([
      supabase.from("rooms").select("id, name_zh, blurb, art, sort_order")
        .eq("active", true).order("sort_order", { ascending: true }),
      supabase.from("room_lessons").select("id, room_id, theme, theme_id, title, video_path, words")
        .eq("current", true),
      kidCardId
        ? supabase.from("lesson_fragments").select("room_id, lesson_id, spent")
            .eq("kid_card_id", kidCardId)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const lessons = new Map<string, Lesson>();
    for (const row of lessonResult.data ?? []) {
      const lesson = toLesson(row as Record<string, unknown>);
      lessons.set(lesson.roomId, lesson);
    }

    const earnedLessons = new Set(
      (fragmentResult.data ?? []).map(row => (row as Record<string, unknown>).lesson_id as string),
    );

    setRooms((roomResult.data ?? []).map(row => {
      const room = toRoom(row as Record<string, unknown>);
      const lesson = lessons.get(room.id) ?? null;
      return { ...room, lesson, earned: Boolean(lesson && earnedLessons.has(lesson.id)) };
    }));

    setFragments((fragmentResult.data ?? []).filter(
      row => !(row as Record<string, unknown>).spent).length);
    setLoading(false);
  }, [kidCardId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { rooms, fragments, loading, refresh };
}

// Awards the fragment for finishing a room's current lesson. The unique
// constraint on (card, room, lesson) makes this idempotent, so replaying
// the same lesson never mints a second fragment — the child has to visit a
// different room, or wait for new content, to earn the next one.
export async function awardFragment(kidCardId: string, roomId: string, lessonId: string | null) {
  if (!supabase) return { ok: false as const, error: "Supabase is not configured" };
  const { error } = await supabase.from("lesson_fragments").upsert(
    { kid_card_id: kidCardId, room_id: roomId, lesson_id: lessonId },
    { onConflict: "kid_card_id,room_id,lesson_id", ignoreDuplicates: true },
  );
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

// Videos live in a private bucket and are never given a permanent public
// URL (ops doc section 10). The signed URL is minted at play time and
// expires, so unpublishing content or ending a subscription actually takes
// the video away rather than leaving a working link in the wild.
//
// A `video_path` that is already a URL is played as it stands. That is not a
// loophole in the rule above, it is the second half of it: Em can put a film
// on the CDN while she is building — cheap, instant, nothing to upload
// through — and move it into the bucket by changing one column, with no code
// change either way. What a public path costs is real and is hers to weigh:
// the film is then downloadable by anyone who has the link, forever, whether
// or not they ever paid.
export async function signedLessonVideo(videoPath: string): Promise<string | null> {
  if (!videoPath) return null;
  if (videoPath.startsWith("/") || videoPath.startsWith("http")) return videoPath;
  if (!supabase) return null;
  const { data } = await supabase.storage.from("room-videos").createSignedUrl(videoPath, 3600);
  return data?.signedUrl ?? null;
}
