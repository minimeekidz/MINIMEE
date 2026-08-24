import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import type { Interior, InteriorFrame, InteriorSpot } from "../lib/interiors";
import { findHero } from "../lib/characters";
import { isDaytime } from "../lib/world";
import { play } from "../lib/sfx";

// A room you are standing in, drawn as one picture with the things you came
// for marked on it.
//
// It used to be a picture with buttons and nobody in it. Em played it and
// said so: 「就算入到每一間房，人物都係跟住入去，唔會剩係得個畫面或者按鈕而
// 沒有角色」— and 「可以坐的位置要真的可以坐，而唔係得句子」. She is right on
// both counts, and they are the same point: if the child is not in the room
// then sitting down can only ever be a sentence about sitting down.
//
// So the hero walks in with you. Tap the floor and they walk there; tap a
// thing and they walk to it before it opens; tap a seat and they sit on it,
// and stay sitting until they get up. The floor is a rectangle per room
// (`Interior.floor`) rather than a walk mask — one enclosed space with a
// clear band of floor does not need fifteen hand-authored bitmaps.

interface Point { x: number; y: number }

/** How fast the child crosses a room, in fractions of the art per frame. */
const STEP = 0.0055;
/** Close enough to have arrived. */
const REACH = 0.008;

/** Keep a point on the floor, so a tap on the ceiling walks to the wall. */
function onFloor(interior: Interior, at: Point): Point {
  const f = interior.floor;
  if (!f) return at;
  return {
    x: Math.min(f.x1, Math.max(f.x0, at.x)),
    y: Math.min(f.y1, Math.max(f.y0, at.y)),
  };
}

/**
 * Where the child stands to use a thing.
 *
 * A seat is the exception: you stand *on* it, a little below the marker so
 * the sprite's feet land at the front of the cushion rather than behind it.
 */
function standingSpot(interior: Interior, spot: InteriorSpot): Point {
  if (spot.kind === "seat") return { x: spot.x, y: spot.y + 0.035 };
  return onFloor(interior, { x: spot.x, y: spot.y + 0.06 });
}

export interface InteriorSceneProps {
  interior: Interior;
  /** Which of the six heroes walked in. */
  heroId?: string | null;
  onSpot: (spot: InteriorSpot) => void;
  onBack: () => void;
  backLabel: string;
  /**
   * What goes in each blank rectangle Em painted — the cinema marquee, its
   * three posters, the screens. Returning null leaves the frame empty, which
   * is what an unset month should look like rather than a placeholder.
   */
  renderFrame?: (frame: InteriorFrame) => ReactNode;
  /** The open panel, drawn over the scene. */
  children?: ReactNode;
}

export function InteriorScene({
  interior, heroId, onSpot, onBack, backLabel, renderFrame, children,
}: InteriorSceneProps) {
  const hero = findHero(heroId);
  const floor = interior.floor;
  // In at the bottom of the floor, middle — which is where a door is.
  const entrance: Point = floor
    ? { x: (floor.x0 + floor.x1) / 2, y: floor.y1 - 0.01 }
    : { x: 0.5, y: 0.9 };

  const [pos, setPos] = useState<Point>(entrance);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [seated, setSeated] = useState<InteriorSpot | null>(null);
  const [walking, setWalking] = useState(false);
  const goal = useRef<Point | null>(null);
  // What to open once the child gets there. Walking first is the difference
  // between a room and a menu.
  const errand = useRef<InteriorSpot | null>(null);

  useEffect(() => {
    setPos(entrance);
    setSeated(null);
    goal.current = null;
    errand.current = null;
    // `entrance` is derived from the interior; re-deriving it in the deps
    // would restart the walk on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interior.id]);

  const arrive = useCallback(() => {
    const spot = errand.current;
    errand.current = null;
    if (!spot) return;
    if (spot.kind === "seat") { play("sit"); setSeated(spot); }
    onSpot(spot);
  }, [onSpot]);

  useEffect(() => {
    let running = true;
    let frame = 0;
    const tick = () => {
      if (!running) return;
      setPos(current => {
        const to = goal.current;
        if (!to) return current;
        const dx = to.x - current.x;
        const dy = to.y - current.y;
        const distance = Math.hypot(dx, dy);
        if (distance < REACH) {
          goal.current = null;
          setWalking(false);
          arrive();
          return to;
        }
        if (Math.abs(dx) > 0.002) setFacing(dx < 0 ? -1 : 1);
        return { x: current.x + (dx / distance) * STEP, y: current.y + (dy / distance) * STEP };
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => { running = false; window.cancelAnimationFrame(frame); };
  }, [arrive]);

  /** Send the child somewhere, optionally to do something when they land. */
  function walkTo(to: Point, spot?: InteriorSpot) {
    if (seated) { play("stand"); setSeated(null); }
    goal.current = to;
    errand.current = spot ?? null;
    setWalking(true);
  }

  function tapFloor(event: React.MouseEvent<HTMLDivElement>) {
    if (!floor) return;
    const box = event.currentTarget.getBoundingClientRect();
    walkTo(onFloor(interior, {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    }));
  }
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
      <div className="interior-art" onClick={tapFloor}>
        {/* Indoors follows the same clock as outdoors. A café lit like noon
            at ten at night is the kind of small wrongness a child notices
            without being able to say what is wrong. */}
        <img
          ref={art}
          className="interior-bg"
          src={(!isDaytime() && interior.artNight) || interior.art}
          alt=""
          onLoad={() => setReady(true)}
        />

        {/* The dynamic rectangles go under the markers: a poster is part of
            the wall, not something floating in front of it.
            
            The kind is prefixed — `frame-poster`, not `poster`. Unprefixed it
            collided with the component classes of the same name: `.poster`
            (Hero Studio's lesson cards) carries `position: relative`, which
            cancelled the absolute positioning and dropped all three cinema
            posters out of the picture and down the page; `.tray` (a card in a
            panel) carries `background: #fff`, which painted a white pill over
            the gem strip in 碎片拼合室. Both were invisible in review and
            obvious on screen. */}
        {ready && renderFrame && interior.frames?.map(frame => {
          const content = renderFrame(frame);
          return content === null || content === undefined ? null : (
            <div
              key={frame.id}
              className={`interior-frame frame-${frame.kind}`}
              style={{
                left: `${frame.x * 100}%`, top: `${frame.y * 100}%`,
                width: `${frame.w * 100}%`, height: `${frame.h * 100}%`,
              }}
            >{content}</div>
          );
        })}

        {ready && interior.spots.map(spot => (
          <button
            key={spot.id}
            type="button"
            className={`interior-spot ${spot.kind}`}
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
            onClick={event => {
              event.stopPropagation();
              // Rooms and routes leave immediately; there is nothing to walk
              // to on the other side of a door you are about to go through.
              if (spot.kind === "room" || spot.kind === "route") { onSpot(spot); return; }
              walkTo(standingSpot(interior, spot), spot);
            }}
          >
            <span className="spot-pin" aria-hidden />
            <span className="spot-label">
              <strong>{spot.label}</strong>
              {spot.hint && <small>{spot.hint}</small>}
            </span>
          </button>
        ))}

        {/* The child, standing in the room. */}
        <img
          className={
            seated ? "interior-hero sitting" : walking ? "interior-hero walking" : "interior-hero"
          }
          src={hero.art}
          alt={hero.nameZh}
          style={{
            left: `${pos.x * 100}%`, top: `${pos.y * 100}%`,
            zIndex: 4 + Math.round(pos.y * 100),
            transform: `translate(-50%, -100%) scaleX(${facing})`,
          }}
        />
      </div>

      {seated && (
        <button
          type="button"
          className="interior-stand"
          onClick={() => { play("stand"); setSeated(null); }}
        >起身</button>
      )}

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
