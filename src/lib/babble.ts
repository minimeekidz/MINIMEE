// 亂語 — how everyone who is not the narrator talks.
//
// Em's direction: 「其餘嘅對話聲音對白例如係所有小寵物及職員的，都會好像是
// 動物森友會、Minion 這些感覺一樣，即一些完全不知道是什麼語言，只會用語氣
// 音調語速快慢等等去演繹出來…唔使好長，可能每一句講嘢嘅時候都剩係得幾聲
// 語氣嘅聲音」.
//
// So a line is not recorded. It is drawn: the text on screen stays real
// Cantonese, and underneath it a handful of nonsense syllables play, shaped by
// how long the line is and what punctuation it ends with. That is the Animal
// Crossing trick, and it is why 34 characters can each sound like themselves
// off about two dozen clips instead of two thousand.
//
// Two things stay in real Cantonese and are deliberately excluded here: the
// theme narration in the learning films, and the four vocabulary words. Em:
// 「除咗學習影片之外，詞彙會做必須要講得清楚」. A child is here to learn those
// words; a joke voice reading them would be the one place the joke costs
// something.

/** The handful of voices every character is cast from. */
export type VoiceKit = "bright" | "warm" | "low" | "soft";

export interface Babble {
  kit: VoiceKit;
  /** Playback rate applied to the kit's clips. 1 is the recorded pitch. */
  pitch: number;
  /** Which syllable of the kit to play, in order, one per blip. */
  blips: number[];
  /** Milliseconds between blips. */
  gap: number;
  /** True when the line ends in a question, so the last blip rises. */
  rising: boolean;
}

/** Clips per kit. Em records this many nonsense syllables for each voice. */
export const SYLLABLES_PER_KIT = 6;

/**
 * How many blips a line is worth.
 *
 * Roughly one per two characters, clamped: below three it does not read as
 * speech at all, and above ten a child is waiting for a cartoon to stop
 * babbling before they can tap anything. Punctuation is not spoken.
 */
export function blipCount(line: string): number {
  const spoken = line.replace(/[\s。，！？、…—「」．.,!?"']/g, "").length;
  return Math.max(3, Math.min(10, Math.round(spoken / 2)));
}

/**
 * A stable number in [0, 1) for a character id, so the same pet always sounds
 * like the same pet without anybody assigning pitches by hand.
 */
function hash(id: string): number {
  let value = 2166136261;
  for (let index = 0; index < id.length; index++) {
    value ^= id.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 1000) / 1000;
}

/** Which kit a character speaks with, spread evenly across the four. */
export function kitFor(id: string): VoiceKit {
  const kits: VoiceKit[] = ["bright", "warm", "low", "soft"];
  return kits[Math.floor(hash(id) * kits.length) % kits.length];
}

/**
 * Shape one line for one character.
 *
 * The pitch spread is deliberately narrow (0.85–1.18). Wider sounds like a
 * broken tape rather than a different animal, and the point is that a child
 * recognises the shopkeeper before reading the name.
 */
export function babbleFor(id: string, line: string): Babble {
  const seed = hash(id);
  const count = blipCount(line);
  const excited = /[！!]$/.test(line.trim());
  const rising = /[？?]$/.test(line.trim());

  // Syllables walk forward from a per-character offset rather than being
  // random, so a voice has a recognisable little melody instead of noise.
  const start = Math.floor(seed * SYLLABLES_PER_KIT);
  const blips = Array.from({ length: count },
    (_, step) => (start + step) % SYLLABLES_PER_KIT);

  return {
    kit: kitFor(id),
    pitch: 0.85 + seed * 0.33,
    blips,
    gap: excited ? 90 : 125,
    rising,
  };
}

/** Where a kit's syllables live. Missing files simply make no sound. */
export function clipUrl(kit: VoiceKit, index: number): string {
  return `/assets/vo/babble/${kit}-${index + 1}.mp3`;
}

// ---------------------------------------------------------------------------
// Playback
//
// Kept apart from the shaping above so the interesting half is testable
// without an audio context, and so a browser that blocks audio until the
// child has tapped something degrades to "no sound" rather than to an error.

let context: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer | null>();

const MUTE_KEY = "minimee.babble.muted";

/**
 * 靜音, remembered.
 *
 * A parent on a bus turns this off once and means it — asking again next time
 * is the kind of small rudeness that gets an app closed. Read at play time so
 * the toggle takes effect on the very next line.
 */
export function babbleMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setBabbleMuted(value: boolean) {
  try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* private mode */ }
}

async function bufferFor(url: string): Promise<AudioBuffer | null> {
  if (buffers.has(url)) return buffers.get(url) ?? null;
  buffers.set(url, null);
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const decoded = await context!.decodeAudioData(await response.arrayBuffer());
    buffers.set(url, decoded);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Say a line out loud, as nonsense.
 *
 * Safe to call before Em has recorded anything: every clip resolves to null
 * and the room stays quiet. Safe to call on every bubble too — a second call
 * does not stack, because each blip is scheduled rather than fired.
 */
export async function speak(id: string, line: string): Promise<void> {
  if (!line || babbleMuted()) return;
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  context ??= new AudioContext();
  // Browsers hold the context suspended until a gesture. Resuming inside a
  // tap — which is where every line in this app comes from — is allowed.
  if (context.state === "suspended") await context.resume().catch(() => {});

  const shape = babbleFor(id, line);
  const clips = await Promise.all(shape.blips.map(
    index => bufferFor(clipUrl(shape.kit, index))));

  const start = context.currentTime + 0.02;
  clips.forEach((buffer, step) => {
    if (!buffer) return;
    const source = context!.createBufferSource();
    source.buffer = buffer;
    // The last blip of a question lifts, which is the whole of "asking" in a
    // language nobody speaks.
    const last = step === clips.length - 1;
    source.playbackRate.value = shape.pitch * (last && shape.rising ? 1.18 : 1);
    const gain = context!.createGain();
    gain.gain.value = 0.55;
    source.connect(gain).connect(context!.destination);
    source.start(start + (step * shape.gap) / 1000);
  });
}

// ---------------------------------------------------------------------------
// NPC portraits
//
// Em's blueprint pairs every post with a 早更 and a 晚更 character — a red
// panda on the cinema desk by day, a black cat by night, and so on for all
// eight posts. The world already knows which half of the day it is, so the
// shift change costs nothing and is the cheapest "this place is alive" in the
// whole app: come back after dinner and somebody else is on.

/** The eight staffed posts, by the id used in filenames. */
export const NPC_POSTS = [
  "usher", "librarian", "studio", "stall-card",
  "stall-child", "stall-pay", "stall-lost", "stall-security",
] as const;
export type NpcPost = (typeof NPC_POSTS)[number];

/**
 * Which portrait is on duty.
 *
 * Missing files hide themselves at the call site rather than showing a broken
 * image, so this can name a shift that has not been drawn yet.
 */
export function npcPortrait(post: NpcPost | string, daytime: boolean): string {
  return `/assets/uploads/NPC/${post}-${daytime ? "day" : "night"}.webp`;
}
