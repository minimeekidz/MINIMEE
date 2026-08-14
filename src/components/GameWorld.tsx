import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findHero, TOWN_PETS } from "../lib/characters";
import {
  arrivalPoint, hotspotNear, isDaytime, isWalkable, nearestWalkable, ROOM_ZONE,
  zoneAspect, zoneBackground, ZONES, type Hotspot, type Zone,
} from "../lib/world";

// The world screen. The map is bigger than the window and the camera follows
// the child, which is the whole point — walking has to cover ground before it
// feels like walking.
//
// Movement is Sims-style tap-to-walk first, with a d-pad and arrow keys for
// anyone who prefers them. Tapping is what a child reaches for on a phone,
// and it also means the walk can route around a fence the child cannot see
// the edge of.

/**
 * How big the child is drawn, as a share of the screen. The map is then sized
 * to suit, rather than the other way round: keying the zoom off the window
 * height alone made a phone — tall and narrow — show nothing but the paving
 * slab underfoot, so the anchor is the geometric mean of both dimensions.
 */
const HERO_ON_SCREEN = 0.125;
/** Map-space units per frame at 60fps. */
const SPEED = 0.0028;
/** Hero height as a share of the drawn map height. */
const HERO_H = 0.062;
/** Stop this close to a tapped point rather than jittering on top of it. */
const ARRIVE = 0.006;

interface Wanderer { id: string; art: string; name: string; x: number; y: number; angle: number; flip: boolean }
interface Point { x: number; y: number }

export interface GameWorldProps {
  heroId?: string | null;
  /** Rooms the child has already finished, drawn with a tick. */
  doneRooms?: string[];
  /** Room the child has just stepped out of, so they land at its door. */
  returningFrom?: string | null;
  onEnterRoom: (roomId: string) => void;
  onExit?: () => void;
}

export function GameWorld({ heroId, doneRooms = [], returningFrom, onEnterRoom, onExit }: GameWorldProps) {
  const hero = findHero(heroId);

  // Coming out of a room starts in that room's own zone, standing at its door.
  const openedAt = useRef<{ zone: string; from: { room?: string; zone?: string } }>({
    zone: (returningFrom && ROOM_ZONE[returningFrom]) || "town",
    from: returningFrom ? { room: returningFrom } : {},
  });
  const [zoneId, setZoneId] = useState(openedAt.current.zone);
  const zone: Zone = ZONES[zoneId] ?? ZONES.town;

  // Where the child should appear in whichever zone loads next. Set by travel
  // before the zone changes, so the arrival effect has it to hand.
  const arriveFrom = useRef<{ room?: string; zone?: string }>(openedAt.current.from);

  const [pos, setPos] = useState<Point>(() => arrivalPoint(zone, openedAt.current.from));
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [moving, setMoving] = useState(false);
  const [fading, setFading] = useState(false);
  const [near, setNear] = useState<Hotspot | null>(null);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });

  const daytime = useMemo(() => isDaytime(), []);
  const held = useRef({ up: false, down: false, left: false, right: false });
  const target = useRef<Point | null>(null);
  const raf = useRef(0);
  const stage = useRef<HTMLDivElement | null>(null);
  // Read by the space/Enter handler at press time, so it can bind once instead
  // of re-binding every time the child moves.
  const nearRef = useRef<Hotspot | null>(null);
  const travelRef = useRef<(spot: Hotspot) => void>(() => {});

  // Map size in pixels. Never smaller than the window in either axis, or the
  // background would letterbox and the illusion of standing somewhere breaks.
  const map = useMemo(() => {
    const aspect = zoneAspect(zone);
    const anchor = Math.sqrt(viewport.w * viewport.h);
    let h = (anchor * HERO_ON_SCREEN) / HERO_H;
    let w = h * aspect;
    // Never smaller than the window in either axis, or the map would
    // letterbox and stop reading as somewhere the child is standing.
    if (w < viewport.w) { w = viewport.w; h = w / aspect; }
    if (h < viewport.h) { h = viewport.h; w = h * aspect; }
    return { w, h };
  }, [zone, viewport]);

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Camera: centre on the child, then clamp so the map never pulls away from
  // the edge of the window.
  const camera = useMemo(() => ({
    x: Math.min(Math.max(pos.x * map.w - viewport.w / 2, 0), Math.max(0, map.w - viewport.w)),
    y: Math.min(Math.max(pos.y * map.h - viewport.h / 2, 0), Math.max(0, map.h - viewport.h)),
  }), [pos, map, viewport]);

  // Only a few pets per zone, so a street has neighbours rather than a crowd.
  const [pets, setPets] = useState<Wanderer[]>([]);
  useEffect(() => {
    const index = Object.keys(ZONES).indexOf(zone.id);
    const slice = TOWN_PETS.filter((_, i) => i % 4 === index % 4);
    setPets(slice.map((pet, i) => {
      const spot = nearestWalkable(zone, 0.2 + (i * 0.27) % 0.6, 0.3 + (i * 0.19) % 0.5)
        ?? zone.spawn;
      return {
        id: pet.id, art: pet.art, name: pet.nameZh,
        x: spot.x, y: spot.y, angle: Math.random() * Math.PI * 2, flip: false,
      };
    }));
  }, [zone]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPets(current => current.map(pet => {
        const angle = pet.angle + (Math.random() - 0.5) * 0.9;
        const x = pet.x + Math.cos(angle) * 0.005;
        const y = pet.y + Math.sin(angle) * 0.005;
        // Pets obey the paths too. A neighbour standing in the sea would give
        // the game away faster than anything else on screen.
        if (!isWalkable(zone, x, y)) return { ...pet, angle: angle + Math.PI };
        return { ...pet, x, y, angle, flip: Math.cos(angle) < 0 };
      }));
    }, 520);
    return () => window.clearInterval(timer);
  }, [zone]);

  // Land at whichever entrance we came through. Doing it on the zone change
  // rather than inside the travel handler keeps a deep link into a zone
  // landing in the right place too.
  useEffect(() => {
    setPos(arrivalPoint(zone, arriveFrom.current));
    target.current = null;
  }, [zone]);

  useEffect(() => {
    let running = true;
    const step = () => {
      if (!running) return;
      let dx = (held.current.right ? 1 : 0) - (held.current.left ? 1 : 0);
      let dy = (held.current.down ? 1 : 0) - (held.current.up ? 1 : 0);
      // A held key cancels a tapped destination, so the child is never
      // fighting the game for control.
      if (dx !== 0 || dy !== 0) target.current = null;

      setPos(current => {
        const goal = target.current;
        if (dx === 0 && dy === 0 && goal) {
          const gx = goal.x - current.x;
          const gy = goal.y - current.y;
          if (Math.hypot(gx, gy) < ARRIVE) { return current; }
          dx = gx; dy = gy;
        }
        if (dx === 0 && dy === 0) return current;

        const length = Math.hypot(dx, dy) || 1;
        // The maps are tall, so a step of the same map-space size covers far
        // more pixels vertically. Scaling by the aspect keeps the child's
        // speed the same in every direction on screen.
        const aspect = map.w / map.h;
        const stepX = (dx / length) * SPEED;
        const stepY = (dy / length) * SPEED * aspect;

        // Slide along whatever the child hits instead of sticking to it: try
        // the full move, then each axis alone.
        for (const [tx, ty] of [[stepX, stepY], [stepX, 0], [0, stepY]]) {
          const nx = current.x + tx;
          const ny = current.y + ty;
          if (tx === 0 && ty === 0) continue;
          if (isWalkable(zone, nx, ny)) return { x: nx, y: ny };
        }
        target.current = null;
        return current;
      });

      raf.current = window.requestAnimationFrame(step);
    };
    raf.current = window.requestAnimationFrame(step);
    return () => { running = false; window.cancelAnimationFrame(raf.current); };
  }, [zone, map]);

  // Facing and the walk animation are derived from where the child actually
  // ended up, so they cannot disagree with what is on screen.
  const previous = useRef(pos);
  useEffect(() => {
    const dx = pos.x - previous.current.x;
    const dy = pos.y - previous.current.y;
    previous.current = pos;
    const walked = Math.hypot(dx, dy) > 0.0001;
    setMoving(walked);
    if (dx > 0.0002) setFacing("right");
    else if (dx < -0.0002) setFacing("left");
  }, [pos]);

  useEffect(() => {
    const spot = hotspotNear(zone, pos.x, pos.y);
    setNear(spot);
    nearRef.current = spot;
  }, [zone, pos]);

  useEffect(() => {
    const map: Record<string, keyof typeof held.current> = {
      ArrowUp: "up", w: "up", ArrowDown: "down", s: "down",
      ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right",
    };
    const set = (event: KeyboardEvent, value: boolean) => {
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      held.current[dir] = value;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Space and Enter do whatever the orange button offers, so walking in with
  // the keyboard and then going in does not mean reaching for the mouse.
  useEffect(() => {
    const act = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      if (!nearRef.current) return;
      event.preventDefault();
      travelRef.current(nearRef.current);
    };
    window.addEventListener("keydown", act);
    return () => window.removeEventListener("keydown", act);
  }, []);

  const walkTo = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    const x = (event.clientX - box.left + camera.x) / map.w;
    const y = (event.clientY - box.top + camera.y) / map.h;
    // Tapping a rooftop walks to the doorstep in front of it rather than
    // doing nothing at all.
    target.current = nearestWalkable(zone, x, y);
  }, [camera, map, zone]);

  const travel = useCallback((spot: Hotspot) => {
    if (spot.kind === "door") { onEnterRoom(spot.target); return; }
    // Remember which zone we left, so the next zone puts us at the gate that
    // leads back here rather than at its own starting point.
    arriveFrom.current = { zone: zone.id };
    setFading(true);
    window.setTimeout(() => { setZoneId(spot.target); setFading(false); }, 420);
  }, [onEnterRoom, zone.id]);

  useEffect(() => { travelRef.current = travel; }, [travel]);

  function hold(dir: keyof typeof held.current, value: boolean) {
    held.current[dir] = value;
  }

  // Everything on the ground is placed and depth-sorted the same way, so a
  // pet in front of the child overlaps them and one behind does not.
  const place = (x: number, y: number) => ({
    left: `${x * map.w - camera.x}px`,
    top: `${y * map.h - camera.y}px`,
    zIndex: 2 + Math.round(y * 100),
  });

  return <div className="world">
    <div
      ref={stage}
      className="world-stage"
      onPointerDown={walkTo}
      style={{
        backgroundImage: `url(${zoneBackground(zone)})`,
        backgroundSize: `${map.w}px ${map.h}px`,
        backgroundPosition: `${-camera.x}px ${-camera.y}px`,
      }}
    >
      {/* Doors and gates are marked on the ground so there is something to
          head for without walking the whole map first. */}
      {zone.hotspots.map(spot => (
        <div
          key={spot.id}
          className={`world-marker ${spot.kind}${doneRooms.includes(spot.target) ? " done" : ""}`}
          style={place(spot.x, spot.y)}
        >
          <span>{spot.kind === "gate" ? "➜" : doneRooms.includes(spot.target) ? "✓" : "▲"}</span>
          <small>{spot.label}</small>
        </div>
      ))}

      {pets.map(pet => (
        <img
          key={pet.id}
          className="world-npc"
          src={pet.art}
          alt={pet.name}
          style={{
            ...place(pet.x, pet.y),
            height: `${HERO_H * 0.62 * map.h}px`,
            transform: `translate(-50%, -100%) scaleX(${pet.flip ? -1 : 1})`,
          }}
        />
      ))}

      <img
        className={moving ? "world-hero walking" : "world-hero"}
        src={hero.art}
        alt={hero.nameZh}
        style={{
          ...place(pos.x, pos.y),
          zIndex: 3 + Math.round(pos.y * 100),
          height: `${HERO_H * map.h}px`,
          transform: `translate(-50%, -100%) scaleX(${facing === "left" ? -1 : 1})`,
        }}
      />
    </div>

    <div className={daytime ? "world-tint day" : "world-tint night"} />

    <div className="world-hud">
      <span className="world-place">{zone.name}</span>
      <span className="world-time">{daytime ? "☀ 日頭" : "🌙 夜晚"}</span>
      {onExit && <button className="world-exit" onClick={onExit}>離開</button>}
    </div>

    {near && <button className="world-action" onClick={() => travel(near)}>
      {near.kind === "door" ? `入去 ${near.label}` : near.label}
      <small>空白鍵</small>
    </button>}

    <div className="world-pad">
      <button aria-label="向上行" className="pad-up"
        onPointerDown={() => hold("up", true)} onPointerUp={() => hold("up", false)} onPointerLeave={() => hold("up", false)}>▲</button>
      <button aria-label="向左行" className="pad-left"
        onPointerDown={() => hold("left", true)} onPointerUp={() => hold("left", false)} onPointerLeave={() => hold("left", false)}>◀</button>
      <button aria-label="向右行" className="pad-right"
        onPointerDown={() => hold("right", true)} onPointerUp={() => hold("right", false)} onPointerLeave={() => hold("right", false)}>▶</button>
      <button aria-label="向下行" className="pad-down"
        onPointerDown={() => hold("down", true)} onPointerUp={() => hold("down", false)} onPointerLeave={() => hold("down", false)}>▼</button>
    </div>

    <p className="world-hint">撳邊度行去邊度 · 方向鍵行路 · 空白鍵入去</p>

    <div className={fading ? "world-fade on" : "world-fade"} />
  </div>;
}
