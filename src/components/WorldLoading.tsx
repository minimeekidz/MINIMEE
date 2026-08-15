import { useEffect, useState } from "react";
import { TOWN_PETS } from "../lib/characters";

// The screen between places.
//
// Em asked for the loading to look like an online game's: a pet walking
// along the waiting bar rather than a spinner. It is doing real work — the
// next scene's art is a full-size webp and the world looked broken when it
// popped in half-drawn — but the bar is honest about it: the walker stops at
// the far end and stays there until the image has actually decoded.

const LINES = [
  "小寵物幫緊你搵路…",
  "行緊過去…",
  "整理緊小鎮…",
  "諗緊今日有咩玩…",
];

export interface WorldLoadingProps {
  /** Art to wait for. The bar finishes when this has decoded. */
  src: string;
  onReady: () => void;
  /** Which pet walks. Defaults to one picked from the destination's name. */
  petId?: string;
  label?: string;
}

export function WorldLoading({ src, onReady, petId, label }: WorldLoadingProps) {
  const [progress, setProgress] = useState(0);
  const pet = TOWN_PETS.find(candidate => candidate.id === petId)
    ?? TOWN_PETS[src.length % TOWN_PETS.length];
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)]);

  useEffect(() => {
    let live = true;
    // Creep toward the end rather than claiming a percentage we do not know:
    // the bar approaches 90% and waits there, which is true.
    const timer = window.setInterval(() => {
      setProgress(current => (current >= 90 ? current : current + Math.max(1, (90 - current) * 0.12)));
    }, 90);

    const image = new Image();
    image.src = src;
    const finish = () => {
      if (!live) return;
      setProgress(100);
      // Let the walker reach the end before the scene replaces it, or the
      // bar reads as having been decorative.
      window.setTimeout(() => { if (live) onReady(); }, 260);
    };
    if (image.complete) finish();
    else { image.onload = finish; image.onerror = finish; }

    return () => { live = false; window.clearInterval(timer); };
  }, [src, onReady]);

  return (
    <div className="world-loading" role="status" aria-live="polite">
      <h2>{label ?? line}</h2>
      <div className="loading-track">
        <span className="loading-fill" style={{ width: `${progress}%` }} />
        <img
          className="loading-walker"
          src={pet.art}
          alt=""
          style={{ left: `${progress}%` }}
        />
      </div>
      <p className="loading-hint">{Math.round(progress)}%</p>
    </div>
  );
}
