import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// 好友冊 —— the client half.
//
// Everything here goes through the three functions in the friendships
// migration rather than touching the table, because a friendship row names
// two children from two different families and the "who may read this" answer
// lives in the database, once, instead of in every query written afterwards.

export type FriendStatus = "friends" | "waiting-them" | "waiting-me";

export interface Friend {
  friendshipId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  status: FriendStatus;
  since: string;
}

/** The link a card's QR code carries. */
export function cardLink(slug: string): string {
  const origin = typeof window === "undefined" ? "https://minimee.hk" : window.location.origin;
  return `${origin}/kid/${slug}`;
}

/**
 * The slug out of whatever the camera read.
 *
 * A scan can produce a full card link, a bare slug, or a link with a query
 * string on the end from something that rewrote it. All three should work —
 * a child holding a phone up to another phone has no idea which one they got.
 */
export function slugFromScan(raw: string): string | null {
  const text = raw.trim();
  const match = text.match(/\/kid\/([a-z0-9][a-z0-9-]{1,38}[a-z0-9])/i);
  if (match) return match[1].toLowerCase();
  if (/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/i.test(text)) return text.toLowerCase();
  return null;
}

export async function loadFriends(myCardId: string): Promise<Friend[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("my_friends", { p_my_card: myCardId });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(row => ({
    friendshipId: row.friendship_id as string,
    slug: row.slug as string,
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    status: row.status as FriendStatus,
    since: row.since as string,
  }));
}

/** What went wrong, in words a child can be shown. */
function friendlyError(message: string): string {
  if (message.includes("no such card")) return "搵唔到呢張卡。可能佢張卡仲未公開，或者 code 打錯咗。";
  if (message.includes("your own card")) return "呢張係你自己張卡呀！";
  if (message.includes("not your card")) return "呢張卡唔係你嘅。";
  return "加唔到，遲啲再試。";
}

export async function requestFriend(myCardId: string, theirSlug: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "而家連唔到伺服器。" };
  const { error } = await supabase.rpc("request_friend", {
    p_my_card: myCardId, p_their_slug: theirSlug,
  });
  return error ? { ok: false, error: friendlyError(error.message) } : { ok: true };
}

export async function respondFriend(myCardId: string, friendshipId: string, accept: boolean):
  Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const { error } = await supabase.rpc("respond_friend", {
    p_my_card: myCardId, p_friendship: friendshipId, p_accept: accept,
  });
  return { ok: !error };
}

/** The book, kept fresh after every change. */
export function useFriends(myCardId: string | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(Boolean(myCardId));

  const refresh = useCallback(async () => {
    if (!myCardId) { setFriends([]); setLoading(false); return; }
    setFriends(await loadFriends(myCardId));
    setLoading(false);
  }, [myCardId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { friends, loading, refresh };
}

// --- the camera ------------------------------------------------------------

/**
 * Whether this browser can read a QR code itself.
 *
 * `BarcodeDetector` is in Chrome and on Android and is not in Safari, which
 * is most of the iPads this will run on. So scanning is the shortcut and
 * typing the code is the path that always works — not the other way round.
 * A café that only works on half the devices in the room is worse than one
 * that asks six characters of anybody.
 */
export function canScan(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

type Detector = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };

/**
 * Open the camera and call back with the first QR code it reads.
 *
 * Returns a stop function. The caller must call it — a camera left running
 * behind a closed panel is a light that stays on next to a child's face.
 */
export async function scanOnce(
  video: HTMLVideoElement,
  onFound: (text: string) => void,
): Promise<() => void> {
  const Ctor = (window as unknown as {
    BarcodeDetector: new (init: { formats: string[] }) => Detector;
  }).BarcodeDetector;
  const detector = new Ctor({ formats: ["qr_code"] });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });
  video.srcObject = stream;
  await video.play();

  let stopped = false;
  const stop = () => {
    stopped = true;
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  };

  const tick = async () => {
    if (stopped) return;
    try {
      const found = await detector.detect(video);
      if (found.length > 0) { onFound(found[0].rawValue); stop(); return; }
    } catch {
      // A frame that fails to decode is the normal case, not an error.
    }
    if (!stopped) requestAnimationFrame(() => void tick());
  };
  void tick();

  return stop;
}
