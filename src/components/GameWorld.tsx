import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findHero, TOWN_PETS } from "../lib/characters";
import {
  hotspotNear, isDaytime, zoneBackground, ZONES, type Hotspot, type Zone,
} from "../lib/world";

// The world screen: the background IS the screen, not a panel inside a page.
//
// Everything is in normalised 0-1 space against the background, so one set
// of coordinates works on a phone held portrait and on a desktop window, and
// swapping the art does not mean re-tuning every door.

const SPEED = 0.0042;
const HERO_H = 0.16;

interface Wanderer { id: string; art: string; name: string; x: number; y: number; angle: number; flip: boolean }

export interface GameWorldProps {
  heroId?: string | null;
  /** Zones the child has already finished, drawn with a tick. */
  doneRooms?: string[];
  onEnterRoom: (roomId: string) => void;
  onExit?: () => void;
}

export function GameWorld({ heroId, doneRooms = [], onEnterRoom, onExit }: GameWorldProps) {
  const hero = findHero(heroId);
  const [zoneId, setZoneId] = useState("town");
  const [pos, setPos] = useState({ x: 0.5, y: 0.8 });
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [moving, setMoving] = useState(false);
  const [fading, setFading] = useState(false);
  const [near, setNear] = useState<Hotspot | null>(null);

  const zone: Zone = ZONES[zoneId] ?? ZONES.town;
  const daytime = useMemo(() => isDaytime(), []);
  const held = useRef({ up: false, down: false, left: false, right: false });
  const raf = useRef(0);

  // Only the pets whose home falls in this zone show up, so each screen has
  // a couple of neighbours rather than all twelve crowding one street.
  const [pets, setPets] = useState<Wanderer[]>([]);
  useEffect(() => {
    const slice = TOWN_PETS.filter((_, index) => index % 4 === Object.keys(ZONES).indexOf(zoneId) % 4);
    setPets(slice.map((pet, index) => ({
      id: pet.id, art: pet.art, name: pet.nameZh,
      x: 0.15 + (index * 0.23) % 0.7,
      y: zone.walk.top + 0.05 + ((index * 0.17) % (zone.walk.bottom - zone.walk.top - 0.1)),
      angle: Math.random() * Math.PI * 2, flip: false,
    })));
  }, [zoneId, zone.walk.top, zone.walk.bottom]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPets(current => current.map(pet => {
        const angle = pet.angle + (Math.random() - 0.5) * 0.7;
        const x = Math.min(Math.max(pet.x + Math.cos(angle) * 0.006, 0.06), 0.94);
        const y = Math.min(Math.max(pet.y + Math.sin(angle) * 0.004, zone.walk.top), zone.walk.bottom);
        return { ...pet, x, y, angle, flip: Math.cos(angle) < 0 };
      }));
    }, 500);
    return () => window.clearInterval(timer);
  }, [zone.walk.top, zone.walk.bottom]);

  useEffect(() => {
    let running = true;
    const step = () => {
      if (!running) return;
      const dx = (held.current.right ? 1 : 0) - (held.current.left ? 1 : 0);
      const dy = (held.current.down ? 1 : 0) - (held.current.up ? 1 : 0);
      if (dx === 0 && dy === 0) setMoving(false);
      else {
        setMoving(true);
        if (dx < 0) setFacing("left");
        else if (dx > 0) setFacing("right");
        const length = Math.hypot(dx, dy) || 1;
        setPos(current => ({
          x: Math.min(Math.max(current.x + (dx / length) * SPEED, 0.04), 0.96),
          // Walking is confined to the ground band, which is what keeps the
          // child out of the sky without per-pixel collision on painted art.
          y: Math.min(Math.max(current.y + (dy / length) * SPEED * 0.7, zone.walk.top), zone.walk.bottom),
        }));
      }
      raf.current = window.requestAnimationFrame(step);
    };
    raf.current = window.requestAnimationFrame(step);
    return () => { running = false; window.cancelAnimationFrame(raf.current); };
  }, [zone.walk.top, zone.walk.bottom]);

  useEffect(() => { setNear(hotspotNear(zone, pos.x, pos.y)); }, [zone, pos]);

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

  // Crossing between zones fades rather than cutting, so the world reads as
  // continuous instead of teleporting.
  const travel = useCallback((spot: Hotspot) => {
    if (spot.kind === "door") { onEnterRoom(spot.target); return; }
    setFading(true);
    window.setTimeout(() => {
      setZoneId(spot.target);
      // Enter from the side you walked in from.
      setPos({ x: spot.x > 0.5 ? 0.12 : 0.88, y: 0.85 });
      setFading(false);
    }, 420);
  }, [onEnterRoom]);

  function hold(dir: keyof typeof held.current, value: boolean) { held.current[dir] = value; }

  return <div className="world">
    <div
      className="world-bg"
      style={{ backgroundImage: `url(${zoneBackground(zone)})` }}
      data-zone={zoneId}
    />
    <div className={daytime ? "world-tint day" : "world-tint night"} />

    <div className="world-hud">
      <span className="world-place">{zone.name}</span>
      <span className="world-time">{daytime ? "☀ 日頭" : "🌙 夜晚"}</span>
      {onExit && <button className="world-exit" onClick={onExit}>離開</button>}
    </div>

    {/* Doors and gates are marked on the ground so the child can see where
        there is something to do without walking the whole map first. */}
    {zone.hotspots.map(spot => (
      <div
        key={spot.id}
        className={`world-marker ${spot.kind}${doneRooms.includes(spot.target) ? " done" : ""}`}
        style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
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
        style={{ left: `${pet.x * 100}%`, top: `${pet.y * 100}%`, transform: `translate(-50%, -100%) scaleX(${pet.flip ? -1 : 1})` }}
      />
    ))}

    <img
      className={moving ? "world-hero walking" : "world-hero"}
      src={hero.art}
      alt={hero.nameZh}
      style={{
        left: `${pos.x * 100}%`, top: `${pos.y * 100}%`,
        height: `${HERO_H * 100}%`,
        transform: `translate(-50%, -100%) scaleX(${facing === "left" ? -1 : 1})`,
      }}
    />

    {near && <button className="world-action" onClick={() => travel(near)}>
      {near.kind === "door" ? `入去 ${near.label}` : near.label}
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

    <div className={fading ? "world-fade on" : "world-fade"} />
  </div>;
}
