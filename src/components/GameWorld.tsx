import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findHero, TOWN_PETS, type TownPet } from "../lib/characters";
import { PET_WISHES, WISH_MS } from "../lib/petFriends";
import { petsForZone } from "../lib/petSpawn";
import { usePetFriends } from "../lib/petStore";
import { useFullscreen } from "../lib/fullscreen";
import { checkParentPin, openParentGate, parentGateOpen } from "../lib/parentGate";
import { PetEncounter } from "./PetEncounter";
import {
  arrivalPoint, hotspotNear, isDaytime, isWalkable, nearestWalkable, prefersWide,
  ROOM_ZONE, START_ZONE, zoneAspect, zoneBackgroundLayers, ZONES,
  type Hotspot, type Zone,
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
 *
 * Raised from 0.125 because Em read the child as 勁細粒 against the animals
 * painted into the backgrounds. This closes most of the gap without touching
 * her artwork; the rest of it is that some scenes have large pets drawn in,
 * and a painted pet cannot be out-scaled — it has to come out of the picture.
 */
const HERO_ON_SCREEN = 0.18;
/** Map-space units per frame at 60fps. */
const SPEED = 0.0028;
/** Hero height as a share of the drawn map height. */
const HERO_H = 0.062;
/** Stop this close to a tapped point rather than jittering on top of it. */
const ARRIVE = 0.006;

/** How fast a pet ambles, relative to the child. */
const PET_SPEED = 0.0011;
/** How far a pet will wander from where it is before picking a new spot. */
const PET_ROAM = 0.12;
/** Close enough to say hello. */
const PET_REACH = 0.06;

/** Somewhere walkable within roaming distance, or stay put if hemmed in. */
function roam(zone: Zone, at: { x: number; y: number }): Point {
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const reach = PET_ROAM * (0.35 + Math.random() * 0.65);
    const candidate = { x: at.x + Math.cos(angle) * reach, y: at.y + Math.sin(angle) * reach * 1.6 };
    if (isWalkable(zone, candidate.x, candidate.y)) return candidate;
  }
  return { x: at.x, y: at.y };
}

interface Wanderer {
  pet: TownPet;
  x: number; y: number;
  goal: Point;
  flip: boolean;
  wish: string;
}
interface Point { x: number; y: number }

export interface GameWorldProps {
  heroId?: string | null;
  /** Rooms the child has already finished, drawn with a tick. */
  doneRooms?: string[];
  /** Room the child has just stepped out of, so they land at its door. */
  returningFrom?: string | null;
  /** The child's card, which is what 好感度 is stored against. Null in the
   *  public demo, where the pets still talk but nothing is kept. */
  cardId?: string | null;
  onEnterRoom: (roomId: string) => void;
  /** A market counter, which opens one of the parent pages. */
  onEnterStall?: (stallId: string) => void;
  /** The 公告板, which opens in place rather than leading anywhere. */
  onReadBoard?: () => void;
  onTakeStage?: () => void;
  /** Zone to open in, when coming back out of a building. */
  startZone?: string | null;
  onExit?: () => void;
}

export function GameWorld({
  heroId, doneRooms = [], returningFrom, cardId = null, startZone = null,
  onEnterRoom, onEnterStall, onReadBoard, onTakeStage, onExit,
}: GameWorldProps) {
  const hero = findHero(heroId);

  // Coming out of a room starts in that room's own zone, standing at its door.
  const openedAt = useRef<{ zone: string; from: { room?: string; zone?: string } }>({
    zone: (startZone && ZONES[startZone] ? startZone : null)
      ?? (returningFrom && ROOM_ZONE[returningFrom]) ?? START_ZONE,
    from: returningFrom ? { room: returningFrom } : {},
  });
  const [zoneId, setZoneId] = useState(openedAt.current.zone);
  /** The zone the 船飛 is being asked for, if any. */
  const [askingPin, setAskingPin] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinWrong, setPinWrong] = useState(false);
  const zone: Zone = ZONES[zoneId] ?? ZONES[START_ZONE];

  // Where the child should appear in whichever zone loads next. Set by travel
  // before the zone changes, so the arrival effect has it to hand.
  const arriveFrom = useRef<{ room?: string; zone?: string }>(openedAt.current.from);

  const [pos, setPos] = useState<Point>(() => arrivalPoint(zone, openedAt.current.from));
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [moving, setMoving] = useState(false);
  const [fading, setFading] = useState(false);
  const [near, setNear] = useState<Hotspot | null>(null);
  // Sitting down. Em: 「公園長椅及野餐墊是可以有『坐下』的互動」. It is a
  // state rather than an animation because there is no sitting sprite yet —
  // the child stops where the seat is, the scene says what they can see from
  // there, and any step in any direction stands them back up.
  const [seated, setSeated] = useState<Hotspot | null>(null);
  // A pet's front door. Five of the six cottages in 小屋區入口 do not open,
  // and a tap that does nothing reads as broken, so they say whose house it
  // is instead.
  const [peek, setPeek] = useState<Hotspot | null>(null);
  const [meeting, setMeeting] = useState<TownPet | null>(null);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });

  const { friends, usedToday, refresh: refreshFriends } = usePetFriends(cardId);
  const fullscreen = useFullscreen();

  const daytime = useMemo(() => isDaytime(), []);
  const held = useRef({ up: false, down: false, left: false, right: false });
  const target = useRef<Point | null>(null);
  const raf = useRef(0);
  const stage = useRef<HTMLDivElement | null>(null);
  // Read by the space/Enter handler at press time, so it can bind once instead
  // of re-binding every time the child moves.
  const nearRef = useRef<Hotspot | null>(null);
  const travelRef = useRef<(spot: Hotspot) => void>(() => {});
  const petRef = useRef<Wanderer | null>(null);
  const meetRef = useRef<(walker: Wanderer) => void>(() => {});
  // The pets' animation loop reads the child's position without re-binding on
  // every step of the walk, which would restart the loop sixty times a second.
  const heroAt = useRef<Point>({ x: 0.5, y: 0.8 });

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

  // Every pet turns up somewhere. Which zone a pet is in is derived from its
  // own id rather than shuffled, so the child can learn where a friend lives
  // and go back to find them — a pet that teleported nightly would make
  // 好感度 feel like it belonged to nobody.
  const [pets, setPets] = useState<Wanderer[]>([]);
  useEffect(() => {
    // Who is here comes from sheet 08_出沒地點規則 — each pet's own home
    // ground and hours — rather than dealing the twelve out evenly by index,
    // which made where a pet lived arbitrary.
    const here = petsForZone({ zoneId: zone.id });
    const residents = here
      .map(gameId => TOWN_PETS.find(pet => pet.id === gameId))
      .filter((pet): pet is TownPet => Boolean(pet));
    // Placed around where the child arrives rather than at fixed map
    // coordinates. Spread evenly over the map they all landed most of a
    // screen above the entrance, so the first thing a child saw was an empty
    // street and the pets were something you had to already know to look for.
    const nearby = [
      { x: 0.13, y: -0.04 },
      { x: -0.15, y: -0.11 },
      { x: 0.04, y: -0.19 },
      { x: -0.06, y: -0.27 },
    ];
    setPets(residents.map((pet, i) => {
      const offset = nearby[i % nearby.length];
      const spot = nearestWalkable(zone, zone.spawn.x + offset.x, zone.spawn.y + offset.y)
        ?? zone.spawn;
      return {
        pet, x: spot.x, y: spot.y, goal: spot, flip: false,
        wish: PET_WISHES[Math.floor(Math.random() * PET_WISHES.length)],
      };
    }));
  }, [zone]);

  // Pets walk, rather than jumping a step every half second. They pick a spot
  // nearby and amble to it, which is what reads as "alive" — the old version
  // nudged them a few pixels at a time and looked like drift.
  useEffect(() => {
    let running = true;
    let frame = 0;
    const step = () => {
      if (!running) return;
      setPets(current => current.map(walker => {
        // A pet stops and turns when the child comes close. It reads the way
        // an animal actually behaves, and — the practical half — a small
        // child cannot reliably tap a target that never stops moving.
        const toChild = Math.hypot(walker.x - heroAt.current.x, (walker.y - heroAt.current.y) * 0.6);
        if (toChild < PET_REACH * 1.7) {
          return { ...walker, flip: heroAt.current.x < walker.x };
        }
        const dx = walker.goal.x - walker.x;
        const dy = walker.goal.y - walker.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.004) return { ...walker, goal: roam(zone, walker) };
        const aspect = map.w / map.h;
        const nx = walker.x + (dx / distance) * PET_SPEED;
        const ny = walker.y + (dy / distance) * PET_SPEED * aspect;
        // Pets obey the paths too. A neighbour standing in the sea would give
        // the game away faster than anything else on screen.
        if (!isWalkable(zone, nx, ny)) return { ...walker, goal: roam(zone, walker) };
        return { ...walker, x: nx, y: ny, flip: dx < 0 };
      }));
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => { running = false; window.cancelAnimationFrame(frame); };
  }, [zone, map]);

  // What each pet is daydreaming about, changed on a timer so the town has
  // something going on even when the child is standing still.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPets(current => current.map(walker => (
        Math.random() < 0.4
          ? { ...walker, wish: PET_WISHES[Math.floor(Math.random() * PET_WISHES.length)] }
          : walker
      )));
    }, WISH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Land at whichever entrance we came through. Doing it on the zone change
  // rather than inside the travel handler keeps a deep link into a zone
  // landing in the right place too.
  useEffect(() => {
    setPos(arrivalPoint(zone, arriveFrom.current));
    target.current = null;
    setSeated(null);
    setPeek(null);
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
    heroAt.current = pos;
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

  // The pet standing closest to the child, if one is within saying-hello
  // distance. Recomputed from positions rather than tracked, so a pet that
  // wanders off cancels the prompt by itself.
  const nearPet = useMemo(() => {
    let best: Wanderer | null = null;
    let bestDistance = PET_REACH;
    for (const walker of pets) {
      const distance = Math.hypot(walker.x - pos.x, (walker.y - pos.y) * 0.6);
      if (distance < bestDistance) { best = walker; bestDistance = distance; }
    }
    return best;
  }, [pets, pos]);

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
      // A step in any direction is standing up. Nothing to press, nothing to
      // dismiss — walking away is how a child leaves a bench.
      if (value) setSeated(null);
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
      if (!nearRef.current && !petRef.current) return;
      event.preventDefault();
      if (nearRef.current) travelRef.current(nearRef.current);
      else if (petRef.current) meetRef.current(petRef.current);
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
    setSeated(null);
  }, [camera, map, zone]);

  const travel = useCallback((spot: Hotspot) => {
    if (spot.kind === "door") { onEnterRoom(spot.target); return; }
    if (spot.kind === "board") { onReadBoard?.(); return; }
    // The stage. Em: 「如果有節慶／活動時都可以係到有d野做下」 — so it is a
    // real place to stand, and what is on it comes from the almanac rather
    // than from a schedule anybody has to maintain.
    if (spot.kind === "stage") { onTakeStage?.(); return; }
    if (spot.kind === "seat") {
      // Snap onto the seat rather than stopping a stride short of it: the
      // whole point is that the child is on the bench, not beside it.
      target.current = null;
      setPos({ x: spot.x, y: spot.y });
      setSeated(spot);
      return;
    }
    if (spot.kind === "cottage") { setPeek(spot); return; }
    if (spot.kind === "stall") { onEnterStall?.(spot.target); return; }
    // 碼頭市集 asks for the 船飛 first. A child holding the phone must not be
    // able to walk into the account, the money or the privacy switches.
    if (ZONES[spot.target]?.parentsOnly && !parentGateOpen()) {
      setAskingPin(spot.target);
      return;
    }
    // Remember which zone we left, so the next zone puts us at the gate that
    // leads back here rather than at its own starting point.
    arriveFrom.current = { zone: zone.id };
    setFading(true);
    window.setTimeout(() => { setZoneId(spot.target); setFading(false); }, 420);
  }, [onEnterRoom, onEnterStall, onReadBoard, onTakeStage, zone.id]);

  useEffect(() => { travelRef.current = travel; }, [travel]);
  useEffect(() => { petRef.current = nearPet; }, [nearPet]);
  // No dependency list on purpose: meetPet closes over the current position,
  // and assigning the ref during render would not survive StrictMode's
  // double-invocation.
  useEffect(() => { meetRef.current = meetPet; });

  function hold(dir: keyof typeof held.current, value: boolean) {
    held.current[dir] = value;
  }

  // Tapping a pet walks over to it and opens the chat. Walking first matters:
  // a panel that opened from across the map would make the pets feel like
  // buttons rather than neighbours.
  function meetPet(walker: Wanderer) {
    const distance = Math.hypot(walker.x - pos.x, (walker.y - pos.y) * 0.6);
    if (distance > PET_REACH) {
      target.current = nearestWalkable(zone, walker.x, walker.y);
      return;
    }
    target.current = null;
    setMeeting(walker.pet);
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
        backgroundImage: zoneBackgroundLayers(zone, undefined, prefersWide(viewport.w, viewport.h))
          .map(art => `url(${art})`).join(", "),
        // One value covers both layers: CSS repeats the list when it is
        // shorter than the number of backgrounds.
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
          <span>{
            spot.kind === "gate" ? "➜"
              : spot.kind === "stage" ? "🎪"
              : spot.kind === "seat" ? "🪑"
              : spot.kind === "cottage" ? "🏠"
              : spot.kind === "board" ? "🗞"
              : spot.kind === "stall" ? "🛎"
              : doneRooms.includes(spot.target) ? "✓" : "▲"
          }</span>
          <small>{spot.label}</small>
        </div>
      ))}

      {/* Each pet carries what it is daydreaming about. It is decoration, but
          it is the decoration that makes the town look inhabited rather than
          decorated with props. */}
      {pets.map(walker => (
        <div key={walker.pet.id} className="world-npc-wrap" style={place(walker.x, walker.y)}>
          <span className="world-wish">{walker.wish}</span>
          <button
            className={nearPet?.pet.id === walker.pet.id ? "world-npc close" : "world-npc"}
            onClick={event => { event.stopPropagation(); meetPet(walker); }}
            style={{ transform: `scaleX(${walker.flip ? -1 : 1})` }}
          >
            <img
              src={walker.pet.art}
              alt={walker.pet.nameZh}
              style={{ height: `${HERO_H * 0.62 * map.h}px` }}
            />
          </button>
        </div>
      ))}

      <img
        className={seated ? "world-hero sitting" : moving ? "world-hero walking" : "world-hero"}
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

    <div className="world-tint" />

    <div className="world-hud">
      <span className="world-place">{zone.name}</span>
      <span className="world-time">{daytime ? "☀ 日頭" : "🌙 夜晚"}</span>
      {fullscreen.supported && <button
        className="world-exit ghost"
        onClick={fullscreen.toggle}
        aria-label={fullscreen.active ? "退出全螢幕" : "全螢幕"}
      >{fullscreen.active ? "⤡" : "⤢"}</button>}
      {onExit && <button className="world-exit" onClick={onExit}>離開</button>}
    </div>

    {/* Sitting takes over the prompt: while the child is on the bench, the
        thing to offer is what they can see and a way up, not the button that
        put them there. */}
    {seated
      ? <div className="world-seated" role="status">
          <p>{seated.note ?? `坐緊喺${seated.label}度。`}</p>
          <button className="world-action" onClick={() => setSeated(null)}>
            企返起身
            <small>行一步都得</small>
          </button>
        </div>
      : near
      ? <button className="world-action" onClick={() => travel(near)}>
          {near.kind === "door" ? `入去 ${near.label}`
            : near.kind === "stage" ? `上 ${near.label}`
            : near.kind === "seat" ? `坐低 · ${near.label}`
            : near.kind === "cottage" ? `望下 ${near.label}`
            : near.kind === "board" ? `睇 ${near.label}`
            : near.kind === "stall" ? `去 ${near.label}`
            : near.label}
          <small>空白鍵</small>
        </button>
      : nearPet && <button className="world-action pet" onClick={() => meetPet(nearPet)}>
          同 {nearPet.pet.nameZh} 傾計
          <small>空白鍵</small>
        </button>}

    {/* A closed front door. It says whose house it is and that it is shut,
        which is a place; saying nothing would be a bug. */}
    {peek && (
      <button className="world-peek" onClick={() => setPeek(null)}>
        <strong>{peek.label}</strong>
        <span>{peek.note}</span>
        <small>呢間屋暫時入唔到 · 撳一下收埋</small>
      </button>
    )}

    {askingPin && (
      <div className="picker-scrim" role="dialog" aria-label="船飛" onClick={() => setAskingPin(null)}>
        <form
          className="pin-sheet"
          onClick={event => event.stopPropagation()}
          onSubmit={event => {
            event.preventDefault();
            if (!checkParentPin(pin)) { setPinWrong(true); return; }
            openParentGate();
            const target = askingPin;
            setAskingPin(null); setPin(""); setPinWrong(false);
            arriveFrom.current = { zone: zone.id };
            setFading(true);
            window.setTimeout(() => { setZoneId(target); setFading(false); }, 420);
          }}
        >
          <h2>要出示船飛</h2>
          <p>碼頭市集係大人做嘢嘅地方 —— 帳戶、付款同私隱設定都喺度。</p>
          <label>
            四位數家長 PIN
            <input
              aria-label="四位數家長 PIN"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={event => { setPin(event.target.value.replace(/\D/g, "")); setPinWrong(false); }}
              autoFocus
            />
          </label>
          {pinWrong && <p className="form-error" role="alert">PIN 唔啱，再試一次。</p>}
          <div className="pin-sheet-actions">
            <button type="button" className="tape-button ghost" onClick={() => setAskingPin(null)}>返轉頭</button>
            <button type="submit" className="tape-button" disabled={pin.length !== 4}>入去</button>
          </div>
        </form>
      </div>
    )}

    {/* Keyed by pet: without it React reuses the panel across pets, and every
        bit of its local state — the running total, the bubble, today's
        question — carries over to the next animal. Two pets on the same
        stored score (any two at zero) would then share a total. */}
    {meeting && <PetEncounter
      key={meeting.id}
      pet={meeting}
      cardId={cardId}
      points={friends[meeting.id] ?? 0}
      usedToday={usedToday}
      onClose={() => setMeeting(null)}
      onChanged={() => void refreshFriends()}
    />}

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
