import { audioContext, babbleMuted } from "./babble";

// The sound each thing makes.
//
// Em: 「每間房間裏面嘅互動，例如係食嘢會有食嘢嘅配音，每件事情會有每件事情亦
// 配音」. Every one of these is synthesised at the moment it plays, the same
// way the character voices are: no files to record, none to upload, none to
// download, HK$0 a play. A café with no sound when you bite a cake is a
// picture of a café.
//
// They are deliberately short and soft. These fire on ordinary taps, dozens
// of times a session, and anything with a tail becomes a nuisance by the
// third time you hear it.

export type Sfx =
  | "eat" | "drink" | "sit" | "stand"
  | "door" | "tap" | "panel" | "close"
  | "sparkle" | "card" | "wrong";

/** A single tone with an attack and a fall. */
function tone(
  audio: AudioContext, at: number,
  { wave = "sine" as OscillatorType, from, to = from, ms, level = 0.06, cutoff = 4000 }:
  { wave?: OscillatorType; from: number; to?: number; ms: number; level?: number; cutoff?: number },
) {
  const seconds = ms / 1000;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + Math.min(0.012, seconds * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, at);
  filter.connect(gain).connect(audio.destination);

  const osc = audio.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
  osc.connect(filter);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

/** Filtered noise — the crunch of a biscuit, the give of a cushion. */
function noise(
  audio: AudioContext, at: number,
  { ms, level = 0.05, cutoff = 1800, sweepTo = cutoff }:
  { ms: number; level?: number; cutoff?: number; sweepTo?: number },
) {
  const seconds = ms / 1000;
  const frames = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, at);
  if (sweepTo !== cutoff) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + seconds);
  filter.Q.setValueAtTime(0.7, at);
  filter.connect(gain).connect(audio.destination);

  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(filter);
  source.start(at);
}

const RECIPES: Record<Sfx, (audio: AudioContext, at: number) => void> = {
  // Two small crunches and a swallow. Chewing is rhythmic, which is what
  // makes one bite read as eating rather than as a click.
  eat: (a, t) => {
    noise(a, t, { ms: 70, level: 0.055, cutoff: 2600, sweepTo: 900 });
    noise(a, t + 0.13, { ms: 60, level: 0.045, cutoff: 2200, sweepTo: 800 });
    tone(a, t + 0.26, { wave: "sine", from: 320, to: 190, ms: 130, level: 0.045, cutoff: 900 });
  },
  // A rising gulp rather than a crunch.
  drink: (a, t) => {
    tone(a, t, { wave: "sine", from: 220, to: 380, ms: 110, level: 0.05, cutoff: 1200 });
    tone(a, t + 0.15, { wave: "sine", from: 260, to: 440, ms: 120, level: 0.045, cutoff: 1200 });
  },
  // Cushions give way: a soft thud with the brightness falling out of it.
  sit: (a, t) => {
    noise(a, t, { ms: 190, level: 0.05, cutoff: 900, sweepTo: 260 });
    tone(a, t + 0.02, { wave: "sine", from: 150, to: 92, ms: 200, level: 0.05, cutoff: 600 });
  },
  stand: (a, t) => {
    noise(a, t, { ms: 130, level: 0.035, cutoff: 500, sweepTo: 1400 });
  },
  // A latch, then the room. Short, because it plays on every doorway.
  door: (a, t) => {
    tone(a, t, { wave: "triangle", from: 620, to: 420, ms: 60, level: 0.05, cutoff: 2600 });
    noise(a, t + 0.07, { ms: 170, level: 0.03, cutoff: 700, sweepTo: 320 });
  },
  // The tap of a marker. The quietest thing here — it fires the most.
  tap: (a, t) => {
    tone(a, t, { wave: "sine", from: 880, to: 1180, ms: 55, level: 0.035, cutoff: 5200 });
  },
  panel: (a, t) => {
    tone(a, t, { wave: "sine", from: 520, to: 780, ms: 90, level: 0.04, cutoff: 4200 });
  },
  close: (a, t) => {
    tone(a, t, { wave: "sine", from: 700, to: 430, ms: 90, level: 0.035, cutoff: 3200 });
  },
  // Three notes up. This is a reward, so it is allowed to be heard.
  sparkle: (a, t) => {
    tone(a, t, { wave: "triangle", from: 880, ms: 90, level: 0.05, cutoff: 6000 });
    tone(a, t + 0.09, { wave: "triangle", from: 1174, ms: 90, level: 0.05, cutoff: 6000 });
    tone(a, t + 0.18, { wave: "triangle", from: 1568, ms: 170, level: 0.055, cutoff: 6000 });
  },
  // A card lands: paper, then a bright little chime.
  card: (a, t) => {
    noise(a, t, { ms: 90, level: 0.04, cutoff: 3200, sweepTo: 900 });
    tone(a, t + 0.10, { wave: "triangle", from: 1046, to: 1568, ms: 200, level: 0.05, cutoff: 6000 });
  },
  // Not a buzzer. A child who guessed wrong is trying, not failing.
  wrong: (a, t) => {
    tone(a, t, { wave: "sine", from: 420, to: 330, ms: 130, level: 0.04, cutoff: 1800 });
  },
};

/**
 * Play one.
 *
 * Shares the 🔊 mute switch with the character voices — one control for
 * "sound off", because a child who mutes the talking does not expect the
 * chewing to carry on.
 */
export function play(name: Sfx): void {
  if (babbleMuted()) return;
  const audio = audioContext();
  if (!audio || audio.state !== "running") return;
  RECIPES[name](audio, audio.currentTime + 0.01);
}

export const SFX_NAMES = Object.keys(RECIPES) as Sfx[];
