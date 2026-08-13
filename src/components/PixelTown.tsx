import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PixelPet, type Facing, type PetKind } from "./PixelPet";

// A top-down town the child walks around freely in eight directions, with
// the camera following them — not a side-scroller on rails. Buildings are
// solid, so the world reads as a place rather than a backdrop, and each one
// is a doorway into a part of the product.

const WORLD_W = 1800;
const WORLD_H = 1300;
const SPEED = 2.6;
const PET_SIZE = 48;
/** Only the pet's lower half collides, so it can overlap a roof and look inside it. */
const FEET_H = 14;
const WALK_FPS = 7;

export interface TownBuilding {
  id: string;
  label: string;
  art: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where walking into the door leads. */
  to?: string;
}

export interface TownPickup {
  id: string;
  label: string;
  art: string;
  x: number;
  y: number;
}

export interface PixelTownProps {
  ground: string;
  buildings: TownBuilding[];
  pickups: TownPickup[];
  collectedIds?: string[];
  pet?: PetKind;
  onCollect?: (pickupId: string) => void;
  onEnter?: (building: TownBuilding) => void;
}

interface Box { x: number; y: number; w: number; h: number }

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function PixelTown({
  ground, buildings, pickups, collectedIds, pet = "shiba", onCollect, onEnter,
}: PixelTownProps) {
  // Spawn on open ground: standing on a pickup would hand the child a free
  // card the moment the town opens, and standing in a doorway would pop the
  // "go inside" prompt before they have moved.
  const [pos, setPos] = useState({ x: 480, y: 1140 });
  const [facing, setFacing] = useState<Facing>("down");
  const [walkFrame, setWalkFrame] = useState(0);
  const [moving, setMoving] = useState(false);
  const [collected, setCollected] = useState<string[]>(collectedIds ?? []);
  const [toast, setToast] = useState<string | null>(null);
  const [nearby, setNearby] = useState<TownBuilding | null>(null);
  const [viewport, setViewport] = useState({ w: 720, h: 420 });

  const held = useRef({ up: false, down: false, left: false, right: false });
  const frameRef = useRef(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  // Guards against awarding the same pickup twice. `collected` has not
  // re-rendered at the moment of the overlap, so state cannot be the guard.
  const awarded = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!collectedIds?.length) return;
    for (const id of collectedIds) awarded.current.add(id);
    setCollected(current => {
      const merged = new Set([...current, ...collectedIds]);
      return merged.size === current.length ? current : Array.from(merged);
    });
  }, [collectedIds]);

  // Solid footprints: the bottom slice of each building, so the pet walks
  // behind the upper part instead of being blocked by empty roof pixels.
  const solids = useMemo<Box[]>(
    () => buildings.map(b => ({ x: b.x, y: b.y + b.h * 0.45, w: b.w, h: b.h * 0.55 })),
    [buildings],
  );

  useEffect(() => {
    const measure = () => {
      const el = shellRef.current;
      if (el) setViewport({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let running = true;
    const feet = (x: number, y: number): Box =>
      ({ x, y: y + PET_SIZE - FEET_H, w: PET_SIZE, h: FEET_H });

    const step = () => {
      if (!running) return;
      const dx = (held.current.right ? 1 : 0) - (held.current.left ? 1 : 0);
      const dy = (held.current.down ? 1 : 0) - (held.current.up ? 1 : 0);

      // Facing and the moving flag are set here rather than inside the
      // position updater: an updater has to be pure, and React runs it twice
      // in StrictMode, so state writes belong outside it.
      if (dx === 0 && dy === 0) {
        setMoving(false);
      } else {
        setMoving(true);
        if (dy < 0) setFacing("up");
        else if (dy > 0) setFacing("down");
        if (dx < 0) setFacing("left");
        else if (dx > 0) setFacing("right");

        // Normalise so diagonals are not faster than the axes.
        const len = Math.hypot(dx, dy) || 1;
        const stepX = (dx / len) * SPEED;
        const stepY = (dy / len) * SPEED;

        setPos(current => {
          // Resolve each axis separately so sliding along a wall works.
          let nextX = current.x;
          let nextY = current.y;

          const tryX = Math.min(Math.max(current.x + stepX, 0), WORLD_W - PET_SIZE);
          if (!solids.some(solid => overlaps(feet(tryX, current.y), solid))) nextX = tryX;

          const tryY = Math.min(Math.max(current.y + stepY, 0), WORLD_H - PET_SIZE);
          if (!solids.some(solid => overlaps(feet(nextX, tryY), solid))) nextY = tryY;

          return nextX === current.x && nextY === current.y ? current : { x: nextX, y: nextY };
        });
      }
      frameRef.current = window.requestAnimationFrame(step);
    };
    frameRef.current = window.requestAnimationFrame(step);
    return () => { running = false; window.cancelAnimationFrame(frameRef.current); };
  }, [solids]);

  // Legs only cycle while actually walking.
  useEffect(() => {
    if (!moving) { setWalkFrame(0); return; }
    const timer = window.setInterval(() => setWalkFrame(current => (current + 1) % 2), 1000 / WALK_FPS);
    return () => window.clearInterval(timer);
  }, [moving]);

  const collect = useCallback((pickup: TownPickup) => {
    if (awarded.current.has(pickup.id)) return;
    awarded.current.add(pickup.id);
    setCollected(current => current.includes(pickup.id) ? current : [...current, pickup.id]);
    setToast(`執到：${pickup.label}`);
    window.setTimeout(() => setToast(null), 1800);
    onCollect?.(pickup.id);
  }, [onCollect]);

  useEffect(() => {
    const centre = { x: pos.x + PET_SIZE / 2, y: pos.y + PET_SIZE / 2 };
    const hit = pickups.find(pickup =>
      !collected.includes(pickup.id) && Math.hypot(pickup.x - centre.x, pickup.y - centre.y) < 44);
    if (hit) collect(hit);

    const door = buildings.find(building => overlaps(
      { x: pos.x, y: pos.y + PET_SIZE - FEET_H, w: PET_SIZE, h: FEET_H + 18 },
      { x: building.x, y: building.y + building.h, w: building.w, h: 26 },
    ));
    setNearby(door ?? null);
  }, [pos, pickups, collected, collect, buildings]);

  useEffect(() => {
    const key = (event: KeyboardEvent, down: boolean) => {
      const map: Record<string, keyof typeof held.current> = {
        ArrowUp: "up", w: "up", ArrowDown: "down", s: "down",
        ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right",
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      held.current[dir] = down;
    };
    const down = (event: KeyboardEvent) => key(event, true);
    const up = (event: KeyboardEvent) => key(event, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const camX = Math.min(Math.max(pos.x + PET_SIZE / 2 - viewport.w / 2, 0), Math.max(WORLD_W - viewport.w, 0));
  const camY = Math.min(Math.max(pos.y + PET_SIZE / 2 - viewport.h / 2, 0), Math.max(WORLD_H - viewport.h, 0));

  function hold(dir: keyof typeof held.current, value: boolean) {
    held.current[dir] = value;
  }

  return <div className="town">
    <div className="town-hud">
      <span>{`執到 ${collected.length} / ${pickups.length} 張 MEE 卡`}</span>
      <span>用方向鍵 / WASD，或者下面嘅方向掣</span>
    </div>

    <div className="town-viewport" ref={shellRef}>
      <div
        className="town-world"
        style={{
          width: WORLD_W, height: WORLD_H,
          backgroundImage: `url(${ground})`,
          transform: `translate3d(${-camX}px, ${-camY}px, 0)`,
        }}
      >
        {buildings.map(building => (
          <div key={building.id} className="town-building"
            style={{ left: building.x, top: building.y, width: building.w, height: building.h }}>
            <img src={building.art} alt="" />
            <span className="town-building-sign">{building.label}</span>
          </div>
        ))}

        {pickups.map(pickup => (
          <img
            key={pickup.id}
            className={collected.includes(pickup.id) ? "town-pickup taken" : "town-pickup"}
            src={pickup.art}
            alt={pickup.label}
            style={{ left: pickup.x - 20, top: pickup.y - 28 }}
          />
        ))}

        <div className="town-pet" style={{ left: pos.x, top: pos.y, width: PET_SIZE, height: PET_SIZE }}>
          <PixelPet kind={pet} facing={facing} frame={walkFrame} scale={PET_SIZE / 16} />
          <span className="town-pet-shadow" />
        </div>
      </div>

      {toast && <div className="town-toast" role="status">{toast}</div>}

      {nearby && <button className="town-door" onClick={() => onEnter?.(nearby)}>
        入去 {nearby.label}
      </button>}
    </div>

    <div className="town-dpad">
      <button aria-label="向上行" className="dpad-up"
        onPointerDown={() => hold("up", true)} onPointerUp={() => hold("up", false)} onPointerLeave={() => hold("up", false)}>▲</button>
      <button aria-label="向左行" className="dpad-left"
        onPointerDown={() => hold("left", true)} onPointerUp={() => hold("left", false)} onPointerLeave={() => hold("left", false)}>◀</button>
      <button aria-label="向右行" className="dpad-right"
        onPointerDown={() => hold("right", true)} onPointerUp={() => hold("right", false)} onPointerLeave={() => hold("right", false)}>▶</button>
      <button aria-label="向下行" className="dpad-down"
        onPointerDown={() => hold("down", true)} onPointerUp={() => hold("down", false)} onPointerLeave={() => hold("down", false)}>▼</button>
    </div>
  </div>;
}
