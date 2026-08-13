import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

// A long left-to-right pixel world the child walks through. Pickups are
// placed along the track; walking into one collects it and, when it is tied
// to a task, marks that task done. Deliberately small in scope: movement +
// collection, no pet stats, no combat, no jump physics — it has to be fun on
// a phone in thirty seconds, not be a platformer.

const WORLD_WIDTH = 4200;
const VIEW_HEIGHT = 320;
const WALK_SPEED = 3.4;
const SPRITE_WIDTH = 56;
const GROUND_Y = 232;

export interface Pickup {
  id: string;
  x: number;
  label: string;
  art: string;
}

export interface PixelWorldGameProps {
  pickups: Pickup[];
  /** Parallax scenery, back layer first. */
  backdrop: string;
  midground?: string;
  avatar: string;
  /**
   * Pickups already earned in an earlier session. They render as taken and
   * never re-fire onCollect, so returning to the town does not replay every
   * award the child has already collected.
   */
  collectedIds?: string[];
  onCollect?: (pickupId: string) => void;
}

type Direction = "left" | "right";

export function PixelWorldGame({
  pickups, backdrop, midground, avatar, collectedIds, onCollect,
}: PixelWorldGameProps) {
  const [x, setX] = useState(60);
  const [facing, setFacing] = useState<Direction>("right");
  const [walking, setWalking] = useState(false);
  const [collected, setCollected] = useState<string[]>(collectedIds ?? []);
  const [toast, setToast] = useState<string | null>(null);

  // Earned pickups arrive asynchronously on the real town, so fold them in
  // once they land rather than only seeding initial state.
  useEffect(() => {
    if (!collectedIds?.length) return;
    setCollected(current => {
      const merged = new Set([...current, ...collectedIds]);
      return merged.size === current.length ? current : Array.from(merged);
    });
  }, [collectedIds]);

  // Held direction lives in a ref so the animation loop reads it without
  // being torn down and recreated on every key event.
  const held = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const frame = useRef<number>(0);
  const viewport = useRef<HTMLDivElement | null>(null);

  const collect = useCallback((pickup: Pickup) => {
    setCollected(current => {
      if (current.includes(pickup.id)) return current;
      setToast(pickup.label);
      window.setTimeout(() => setToast(null), 1800);
      onCollect?.(pickup.id);
      return [...current, pickup.id];
    });
  }, [onCollect]);

  useEffect(() => {
    let running = true;
    const step = () => {
      if (!running) return;
      setX(current => {
        const direction = (held.current.right ? 1 : 0) - (held.current.left ? 1 : 0);
        if (direction === 0) {
          setWalking(false);
          return current;
        }
        setWalking(true);
        setFacing(direction > 0 ? "right" : "left");
        const next = Math.min(Math.max(current + direction * WALK_SPEED, 0), WORLD_WIDTH - SPRITE_WIDTH);
        return next;
      });
      frame.current = window.requestAnimationFrame(step);
    };
    frame.current = window.requestAnimationFrame(step);
    return () => { running = false; window.cancelAnimationFrame(frame.current); };
  }, []);

  // Collection is checked off the committed position rather than inside the
  // movement updater, so it never fires twice for one overlap.
  useEffect(() => {
    const hit = pickups.find(pickup =>
      !collected.includes(pickup.id) && Math.abs(pickup.x - x) < 34);
    if (hit) collect(hit);
  }, [x, pickups, collected, collect]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") held.current.left = true;
      if (event.key === "ArrowRight" || event.key === "d") held.current.right = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") held.current.left = false;
      if (event.key === "ArrowRight" || event.key === "d") held.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Keep the walker roughly centred once they are past the first screen.
  const cameraX = useMemo(() => {
    const width = viewport.current?.clientWidth ?? 720;
    return Math.min(Math.max(x - width / 2 + SPRITE_WIDTH / 2, 0), WORLD_WIDTH - width);
  }, [x]);

  const remaining = pickups.length - collected.length;

  return <div className="pixel-game">
    <div className="pixel-game-hud">
      <span><Sparkles size={14} />收集咗 {collected.length} / {pickups.length}</span>
      <span>{remaining === 0 ? "全部搵齊喇！" : "用方向鍵或者下面嘅掣行"}</span>
    </div>

    <div className="pixel-viewport" ref={viewport}>
      <div className="pixel-layer back" style={{ backgroundImage: `url(${backdrop})`, transform: `translateX(${-cameraX * 0.25}px)` }} />
      {midground && <div className="pixel-layer mid" style={{ backgroundImage: `url(${midground})`, transform: `translateX(${-cameraX * 0.55}px)` }} />}

      <div className="pixel-track" style={{ width: WORLD_WIDTH, transform: `translateX(${-cameraX}px)` }}>
        {pickups.map(pickup => (
          <img
            key={pickup.id}
            className={collected.includes(pickup.id) ? "pixel-pickup taken" : "pixel-pickup"}
            src={pickup.art}
            alt={pickup.label}
            style={{ left: pickup.x, bottom: VIEW_HEIGHT - GROUND_Y + 14 }}
          />
        ))}
        <img
          className={walking ? "pixel-walker walking" : "pixel-walker"}
          src={avatar}
          alt="你嘅角色"
          style={{ left: x, bottom: VIEW_HEIGHT - GROUND_Y, transform: `scaleX(${facing === "left" ? -1 : 1})` }}
        />
        <div className="pixel-ground" />
      </div>

      {toast && <div className="pixel-toast" role="status">執到咗：{toast}</div>}
    </div>

    <div className="pixel-controls">
      <button
        aria-label="向左行"
        onPointerDown={() => { held.current.left = true; }}
        onPointerUp={() => { held.current.left = false; }}
        onPointerLeave={() => { held.current.left = false; }}
      ><ArrowLeft /></button>
      <button
        aria-label="向右行"
        onPointerDown={() => { held.current.right = true; }}
        onPointerUp={() => { held.current.right = false; }}
        onPointerLeave={() => { held.current.right = false; }}
      ><ArrowRight /></button>
    </div>
  </div>;
}
