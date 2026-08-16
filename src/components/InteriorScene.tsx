import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import type { Interior, InteriorSpot } from "../lib/interiors";
import { isDaytime } from "../lib/world";

// A room, drawn as one picture with the things you came for marked on it.
//
// Interiors deliberately have no walk mask and no character to steer. Em's
// rule for every building is 原位入口原位出口 — step in, do the thing, step
// back out where you came from — so making the child walk across a café to
// reach a QR scanner would be ceremony, not play. The world outside is where
// walking happens.
//
// The art is portrait and taller than most screens, so the scene scrolls
// vertically and the markers ride with it rather than being pinned to the
// viewport.

export interface InteriorSceneProps {
  interior: Interior;
  onSpot: (spot: InteriorSpot) => void;
  onBack: () => void;
  backLabel: string;
  /** The open panel, drawn over the scene. */
  children?: ReactNode;
}

export function InteriorScene({ interior, onSpot, onBack, backLabel, children }: InteriorSceneProps) {
  // Markers fade in after the art so the room reads as a place first and a
  // menu second.
  const [ready, setReady] = useState(false);
  const art = useRef<HTMLImageElement>(null);

  // The loading screen already decoded this image, so it comes back from
  // cache and `load` can fire before React attaches its handler. Without
  // this check the markers never appear and the room is a dead end.
  useEffect(() => {
    if (art.current?.complete) setReady(true);
  }, [interior.id]);

  return (
    <main className="interior-scene">
      <div className="interior-art">
        {/* Indoors follows the same clock as outdoors. A café lit like noon
            at ten at night is the kind of small wrongness a child notices
            without being able to say what is wrong. */}
        <img
          ref={art}
          src={(!isDaytime() && interior.artNight) || interior.art}
          alt=""
          onLoad={() => setReady(true)}
        />

        {ready && interior.spots.map(spot => (
          <button
            key={spot.id}
            type="button"
            className={`interior-spot ${spot.kind}`}
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
            onClick={() => onSpot(spot)}
          >
            <span className="spot-pin" aria-hidden />
            <span className="spot-label">
              <strong>{spot.label}</strong>
              {spot.hint && <small>{spot.hint}</small>}
            </span>
          </button>
        ))}
      </div>

      <header className="interior-bar">
        <button type="button" className="round-button" onClick={onBack}>
          <ArrowLeft size={14} />{backLabel}
        </button>
        <h1>{interior.name}</h1>
      </header>

      {children}
    </main>
  );
}

/** The sheet a spot opens. One shape for every panel in every room. */
export function InteriorPanel({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="interior-scrim" role="dialog" aria-label={title} onClick={onClose}>
      <section className="interior-panel" onClick={event => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="picker-close" onClick={onClose} aria-label="收埋">✕</button>
        </header>
        <div className="interior-panel-body">{children}</div>
      </section>
    </div>
  );
}
