import { useMemo } from "react";

// A real pixel character, drawn cell by cell rather than an icon with a
// background knocked out. Every frame is a 16x16 grid of palette keys, so
// the sprite stays crisp at any scale and a child's pet can be recoloured
// without new art.
//
// Frames are stored as strings for legibility — one character per pixel,
// one string per row. A test asserts every row in every frame is exactly
// GRID wide, because a short row would silently shift the whole sprite.

export const GRID = 16;

export type PetKind = "shiba" | "cat" | "bunny" | "penguin" | "hedgehog";
export type Facing = "down" | "up" | "left" | "right";

// . transparent   o outline    f fur        l light fur
// w muzzle/belly  e eye        n nose       s scarf
type PaletteKey = "o" | "f" | "l" | "w" | "e" | "n" | "s";

const PALETTES: Record<PetKind, Record<PaletteKey, string>> = {
  shiba:    { o: "#3b2a1e", f: "#e8a95c", l: "#f6cf9b", w: "#fff6e8", e: "#2a1c14", n: "#2a1c14", s: "#4f8f5b" },
  cat:      { o: "#33303d", f: "#9aa3b5", l: "#c6cddc", w: "#fdfbff", e: "#232030", n: "#e08aa4", s: "#b06a9c" },
  bunny:    { o: "#4a3a44", f: "#fdf3f6", l: "#ffffff", w: "#fff9fb", e: "#3a2c34", n: "#e08aa4", s: "#ef8fae" },
  penguin:  { o: "#232a3c", f: "#3f5580", l: "#5d78ab", w: "#fdfcf6", e: "#161c2a", n: "#f0b429", s: "#4fa3c7" },
  hedgehog: { o: "#3c2b22", f: "#a5714a", l: "#c99368", w: "#f7e2c9", e: "#2b1d16", n: "#2b1d16", s: "#d1584f" },
};

// Body is shared across kinds; the palette is what makes each pet distinct.
// Rows 13-15 are the legs, which is the only part the walk cycle moves.
const DOWN_BODY = [
  "................",
  "...oo......oo...",
  "..offo....offo..",
  "..offo....offo..",
  "..oooooooooooo..",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offeffffffeffo.",
  ".offffffffffffo.",
  ".offfwwwwwwfffo.",
  ".offfwnnnnwfffo.",
  ".offfwwwwwwfffo.",
  ".offffffffffffo.",
  ".ossssssssssso..",
];

const UP_BODY = [
  "................",
  "...oo......oo...",
  "..offo....offo..",
  "..offo....offo..",
  "..oooooooooooo..",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".offffffffffffo.",
  ".ossssssssssso..",
];

const SIDE_BODY = [
  "................",
  "....oo..........",
  "...offo.........",
  "...offo...oo....",
  "..oooooooofflo..",
  ".offffffffffflo.",
  ".offffffffffelo.",
  ".offffffffffwlo.",
  ".offffffffwnnlo.",
  ".offffffffffwlo.",
  ".offfffffffflo..",
  ".offffffffffo...",
  ".offffffffffo...",
  ".ossssssssso....",
];

// Two leg positions. Alternating them at ~7fps reads as walking without
// needing a full redraw of the body for every frame.
const LEGS_A = ["..oo..oo..oo..o.", "..oo..oo..oo..o."];
const LEGS_B = ["...oo..oo..oo...", "..oo....oo..oo.."];

function buildFrame(body: string[], legs: string[]): string[] {
  const frame = [...body, ...legs];
  while (frame.length < GRID) frame.push(".".repeat(GRID));
  return frame.slice(0, GRID);
}

export const FRAMES: Record<"down" | "up" | "side", string[][]> = {
  down: [buildFrame(DOWN_BODY, LEGS_A), buildFrame(DOWN_BODY, LEGS_B)],
  up: [buildFrame(UP_BODY, LEGS_A), buildFrame(UP_BODY, LEGS_B)],
  side: [buildFrame(SIDE_BODY, LEGS_A), buildFrame(SIDE_BODY, LEGS_B)],
};

export interface PixelPetProps {
  kind?: PetKind;
  facing?: Facing;
  /** Which walk frame to show. Hold it steady to stand still. */
  frame?: number;
  /** Rendered pixel size of one sprite cell. */
  scale?: number;
  className?: string;
}

export function PixelPet({
  kind = "shiba", facing = "down", frame = 0, scale = 3, className,
}: PixelPetProps) {
  const palette = PALETTES[kind] ?? PALETTES.shiba;
  const set = facing === "up" ? "up" : facing === "down" ? "down" : "side";
  const rows = FRAMES[set][frame % FRAMES[set].length];

  const cells = useMemo(() => {
    const out: { x: number; y: number; fill: string }[] = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const key = row[x] as PaletteKey | ".";
        if (key === ".") continue;
        const fill = palette[key];
        if (fill) out.push({ x, y, fill });
      }
    });
    return out;
  }, [rows, palette]);

  return (
    <svg
      className={className}
      width={GRID * scale}
      height={GRID * scale}
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ transform: facing === "left" ? "scaleX(-1)" : undefined, imageRendering: "pixelated" }}
    >
      {cells.map(cell => (
        <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={1} height={1} fill={cell.fill} />
      ))}
    </svg>
  );
}
