// 亂語 — how everyone who is not the narrator talks.
//
// Em's direction: 「其餘嘅對話聲音對白例如係所有小寵物及職員的，都會好像是
// 動物森友會、Minion 這些感覺一樣，即一些完全不知道是什麼語言，只會用語氣
// 音調語速快慢等等去演繹出來…唔使好長，可能每一句講嘢嘅時候都剩係得幾聲
// 語氣嘅聲音」.
//
// The subtitles stay real Cantonese. Underneath, Web Audio draws a handful of
// tiny electronic animal syllables from oscillators. There are no recordings,
// downloads, API calls or per-line fees, and no child's voice is collected.
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
  /** Stable character pitch. 1 is the centre of the kit's range. */
  pitch: number;
  /** Which synthetic syllable to play, in order, one per blip. */
  blips: number[];
  /** Milliseconds between blips. */
  gap: number;
  /** True when the line ends in a question, so the last blip rises. */
  rising: boolean;
}

/** Synthetic syllables per kit. Kept at six so existing character melodies stay stable. */
export const SYLLABLES_PER_KIT = 6;

/**
 * Optional casting table for named staff and story characters.
 *
 * The fallback is still deterministic, so every unnamed pet keeps one voice.
 * Add an id here only when art/story has confirmed how that character should
 * sound; this avoids guessing gender from an animal species or costume.
 */
export const VOICE_KIT_OVERRIDES: Readonly<Record<string, VoiceKit>> = Object.freeze({
  "usher-day": "bright",
  "usher-night": "low",
  "librarian-day": "soft",
  "librarian-night": "warm",
  "studio-game-day": "warm",
  "studio-game-night": "bright",
  "studio-words-day": "soft",
  "studio-words-night": "low",
  "cafe-day": "warm",
  "cafe-night": "soft",
  "stall-card-day": "bright",
  "stall-card-night": "soft",
  "stall-child-day": "warm",
  "stall-child-night": "bright",
  "stall-pay-day": "soft",
  "stall-pay-night": "low",
  "stall-lost-day": "warm",
  "stall-lost-night": "soft",
  "stall-security-day": "low",
  "stall-security-night": "warm",
});

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

/** Stable number in [0, 1), so the same pet always sounds like itself. */
function hash(id: string): number {
  let value = 2166136261;
  for (let index = 0; index < id.length; index++) {
    value ^= id.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 1000) / 1000;
}

/** Which kit a character speaks with. Named casting wins; everyone else hashes evenly. */
export function kitFor(id: string): VoiceKit {
  const cast = VOICE_KIT_OVERRIDES[id];
  if (cast) return cast;
  const kits: VoiceKit[] = ["bright", "warm", "low", "soft"];
  return kits[Math.floor(hash(id) * kits.length) % kits.length];
}

/**
 * Shape one line for one character.
 *
 * The pitch spread is deliberately narrow (0.85–1.18). Wider sounds like a
 * broken tape rather than a different animal. Syllables walk from a stable
 * per-character offset, creating a recognisable little melody instead of
 * random noise.
 */
export function babbleFor(id: string, line: string): Babble {
  const seed = hash(id);
  const count = blipCount(line);
  const excited = /[！!]$/.test(line.trim());
  const rising = /[？?]$/.test(line.trim());
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

/**
 * Legacy asset path helper retained for older call sites and saved content.
 * Playback no longer fetches these files; voices are synthesised locally.
 */
export function clipUrl(kit: VoiceKit, index: number): string {
  return `/assets/vo/babble/${kit}-${index + 1}.mp3`;
}

// ---------------------------------------------------------------------------
// Free local playback

export interface VoicePreset {
  wave: OscillatorType;
  overtone: OscillatorType;
  baseHz: number;
  duration: number;
  cutoffHz: number;
  overtoneMix: number;
  level: number;
}

export const VOICE_PRESETS: Readonly<Record<VoiceKit, VoicePreset>> = Object.freeze({
  // Sparkly and alert — good for excitable, tiny or energetic characters.
  bright: { wave: "square", overtone: "sine", baseHz: 560, duration: 0.072, cutoffHz: 3300, overtoneMix: 0.22, level: 0.075 },
  // Rounded and friendly — the most conversational shop/studio voice.
  warm: { wave: "triangle", overtone: "sine", baseHz: 390, duration: 0.090, cutoffHz: 2400, overtoneMix: 0.18, level: 0.095 },
  // Small but grounded — useful for guards and calm adult-coded characters.
  low: { wave: "sawtooth", overtone: "triangle", baseHz: 245, duration: 0.105, cutoffHz: 1650, overtoneMix: 0.13, level: 0.060 },
  // Breathier bell-like chirps for gentle and shy characters.
  soft: { wave: "sine", overtone: "triangle", baseHz: 455, duration: 0.098, cutoffHz: 2100, overtoneMix: 0.16, level: 0.090 },
});

export const SYLLABLE_SHAPES = Object.freeze([
  { pitch: 1.00, end: 0.94, colour: 1.00 },
  { pitch: 1.13, end: 1.02, colour: 1.15 },
  { pitch: 0.91, end: 0.98, colour: 0.82 },
  { pitch: 1.24, end: 0.90, colour: 1.24 },
  { pitch: 1.05, end: 1.09, colour: 0.94 },
  { pitch: 0.82, end: 0.92, colour: 0.76 },
]);

let context: AudioContext | null = null;
let speechGeneration = 0;
const activeOscillators = new Set<OscillatorNode>();
const MUTE_KEY = "minimee.babble.muted";

/** 靜音, remembered. */
export function babbleMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setBabbleMuted(value: boolean) {
  try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* private mode */ }
  if (value) stopActiveSpeech();
}

function stopActiveSpeech() {
  speechGeneration += 1;
  for (const oscillator of activeOscillators) {
    try { oscillator.stop(); } catch { /* it may already have ended */ }
  }
  activeOscillators.clear();
}

function register(oscillator: OscillatorNode) {
  activeOscillators.add(oscillator);
  oscillator.addEventListener("ended", () => activeOscillators.delete(oscillator), { once: true });
}

/** Draw one tiny, non-linguistic electronic animal syllable. */
function scheduleBlip(
  audio: AudioContext,
  shape: Babble,
  syllableIndex: number,
  when: number,
  questionLift: boolean,
) {
  const preset = VOICE_PRESETS[shape.kit];
  const syllable = SYLLABLE_SHAPES[syllableIndex % SYLLABLE_SHAPES.length];
  const duration = preset.duration;
  const base = preset.baseHz * shape.pitch * syllable.pitch;
  const end = base * (questionLift ? 1.24 : syllable.end);

  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, when);
  master.gain.exponentialRampToValueAtTime(preset.level, when + 0.008);
  master.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(preset.cutoffHz * syllable.colour, when);
  filter.Q.setValueAtTime(0.8, when);
  filter.connect(master).connect(audio.destination);

  const voice = audio.createOscillator();
  voice.type = preset.wave;
  voice.frequency.setValueAtTime(base * 1.06, when);
  voice.frequency.exponentialRampToValueAtTime(end, when + duration);
  voice.connect(filter);

  // A quiet, detuned overtone gives each blip a toy-like animated sparkle
  // without turning it into a recognisable spoken vowel.
  const overtoneGain = audio.createGain();
  overtoneGain.gain.setValueAtTime(preset.overtoneMix, when);
  const overtone = audio.createOscillator();
  overtone.type = preset.overtone;
  overtone.detune.setValueAtTime(7 + syllableIndex * 2, when);
  overtone.frequency.setValueAtTime(base * 2.01, when);
  overtone.frequency.exponentialRampToValueAtTime(end * 1.94, when + duration);
  overtone.connect(overtoneGain).connect(filter);

  register(voice);
  register(overtone);
  voice.start(when);
  overtone.start(when);
  voice.stop(when + duration + 0.012);
  overtone.stop(when + duration + 0.012);
}

/**
 * Say a line out loud as locally synthesised nonsense.
 *
 * The newest bubble interrupts the previous one, so rapid taps never create a
 * wall of voices. Browsers that have not received a user gesture simply stay
 * quiet; subtitles and interaction continue normally.
 */
export async function speak(id: string, line: string): Promise<void> {
  if (!line || babbleMuted()) return;
  if (typeof window === "undefined" || !("AudioContext" in window)) return;

  context ??= new AudioContext();
  if (context.state === "suspended") await context.resume().catch(() => {});
  if (context.state !== "running") return;

  stopActiveSpeech();
  const generation = speechGeneration;
  const shape = babbleFor(id, line);
  const start = context.currentTime + 0.018;

  shape.blips.forEach((syllableIndex, step) => {
    if (generation !== speechGeneration) return;
    const last = step === shape.blips.length - 1;
    scheduleBlip(
      context!,
      shape,
      syllableIndex,
      start + (step * shape.gap) / 1000,
      last && shape.rising,
    );
  });
}

// ---------------------------------------------------------------------------
// NPC portraits

/**
 * The staffed posts, by the id used in filenames. Each has a 早更 and a 晚更.
 *
 * Hero Studio is two posts rather than one, which is a reading of Em's own
 * icons rather than an invention: the first pair she drew sits under a
 * joystick (the game table) and the second under an "Aa" flashcard (the
 * teaching board). The room has exactly those two functions, so it gets
 * exactly those two desks.
 */
export const NPC_POSTS = [
  "usher", "librarian", "studio-game", "studio-words", "cafe",
  "stall-card", "stall-child", "stall-pay", "stall-lost", "stall-security",
] as const;
export type NpcPost = (typeof NPC_POSTS)[number];

/**
 * 閒人 — the ones who are not working.
 *
 * No shift and no counter: they stand where Em put them, they babble when
 * tapped, and that is all they do. A town where every single character wants
 * something from you is a menu with fur on it.
 */
export const AMBIENT_NPCS: Array<{
  id: string; nameZh: string; zone: string; x: number; y: number;
}> = [
  { id: "deer", nameZh: "梅花鹿", zone: "town-square", x: 0.215, y: 0.560 },
  { id: "koala", nameZh: "樹熊", zone: "town-square", x: 0.790, y: 0.505 },
  { id: "frog", nameZh: "青蛙", zone: "town-square", x: 0.430, y: 0.720 },
  { id: "ferret", nameZh: "雪貂", zone: "town-square", x: 0.560, y: 0.640 },
  { id: "hamster", nameZh: "倉鼠", zone: "village-gate", x: 0.430, y: 0.600 },
  { id: "guinea-pig", nameZh: "天竺鼠", zone: "village-gate", x: 0.585, y: 0.560 },
];

/** Where an idler's sprite lives. One file each — they do not change shift. */
export function ambientPortrait(id: string): string {
  return `/assets/uploads/NPC/idle-${id}.webp`;
}

/** A short nothing to say, picked from the id so it stays the same per idler. */
export const IDLE_LINES = [
  "今日天氣幾好喎。",
  "你張卡儲到幾多張喇？",
  "我啱啱睇完戲院嗰條新片。",
  "呢度坐下幾舒服。",
  "聽講廣場今晚有嘢玩。",
  "嘿，你又嚟啦！",
];

/** Which portrait is on duty. */
export function npcPortrait(post: NpcPost | string, daytime: boolean): string {
  return `/assets/uploads/NPC/${post}-${daytime ? "day" : "night"}.webp`;
}
