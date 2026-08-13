import { useMemo } from "react";

// The twelve MINIMEE pets, drawn in code rather than loaded as art.
//
// Hand-authoring 12 pets x 3 facings x 2 walk frames would be 72 grids to
// keep in sync by hand. Instead each pet is a short description — ear shape,
// body build, palette, accessory — and the grid is painted from that. Adding
// a pet is a row in PETS, not a new sprite sheet, and a change to the walk
// cycle lands on all twelve at once.
//
// Swapping in real art later means replacing `usePetFrame` with a sprite
// sheet lookup; the component's interface (kind, facing, frame) already
// matches how a sheet would be indexed.

export const GRID = 16;

export type Facing = "down" | "up" | "left" | "right";

export type PetKind =
  | "sunshine-sheep" | "bao-hamster" | "milk-cat" | "watermelon-shiba"
  | "wave-penguin" | "aviator-chick" | "yarn-granny-mouse" | "heart-bunny"
  | "cowboy-pup" | "super-pig" | "spin-hedgehog" | "kimono-calico";

type EarShape = "round" | "pointy" | "long" | "tiny" | "spiky" | "none";
type Build = "chunky" | "slim" | "tall";

interface PetSpec {
  nameZh: string;
  nameEn: string;
  ears: EarShape;
  build: Build;
  /** Main coat. */
  fur: string;
  /** Lighter belly/muzzle. */
  belly: string;
  /** Outline — a dark relative of the coat reads better than pure black. */
  ink: string;
  /** Scarf, cape or costume band across the chest. */
  accent: string;
  /** Optional cheek blush; omitted for the birds. */
  blush?: string;
}

export const PETS: Record<PetKind, PetSpec> = {
  "sunshine-sheep":    { nameZh: "大太陽羊",   nameEn: "Sunshine Sheep",    ears: "tiny",   build: "chunky", fur: "#fdf6e6", belly: "#fffdf7", ink: "#6b5a44", accent: "#f5b731", blush: "#f6b6b0" },
  "bao-hamster":       { nameZh: "包子倉鼠",   nameEn: "Bao Hamster",       ears: "round",  build: "chunky", fur: "#e8a95c", belly: "#f8ecd4", ink: "#7a4f25", accent: "#c8452f", blush: "#f2a2a2" },
  "milk-cat":          { nameZh: "牛奶貓",     nameEn: "Milk Carton Cat",   ears: "pointy", build: "slim",   fur: "#f3f5fa", belly: "#ffffff", ink: "#5b6072", accent: "#6fb3e0", blush: "#f4b3bd" },
  "watermelon-shiba":  { nameZh: "西瓜柴犬",   nameEn: "Watermelon Shiba",  ears: "pointy", build: "chunky", fur: "#e8a95c", belly: "#fdf1dd", ink: "#7a4f25", accent: "#d8433f", blush: "#f2a2a2" },
  "wave-penguin":      { nameZh: "海浪企鵝",   nameEn: "Wave Penguin",      ears: "none",   build: "tall",   fur: "#3f5580", belly: "#fdfcf6", ink: "#232a3c", accent: "#4fa3c7" },
  "aviator-chick":     { nameZh: "飛行小雞",   nameEn: "Aviator Chick",     ears: "none",   build: "slim",   fur: "#f7d24a", belly: "#fdefb0", ink: "#8a6612", accent: "#8b5e3c" },
  "yarn-granny-mouse": { nameZh: "毛線鼠婆婆", nameEn: "Yarn Granny Mouse", ears: "round",  build: "slim",   fur: "#bfb6c9", belly: "#efeaf3", ink: "#5d5468", accent: "#9b6fb0", blush: "#e8a8b8" },
  "heart-bunny":       { nameZh: "愛心可愛兔", nameEn: "Lovely Heart Bunny", ears: "long",  build: "slim",   fur: "#fdf3f6", belly: "#ffffff", ink: "#7a5c68", accent: "#ef8fae", blush: "#f6aec2" },
  "cowboy-pup":        { nameZh: "牛仔小狗",   nameEn: "Cowboy Pup",        ears: "long",   build: "chunky", fur: "#d8b487", belly: "#f6e7cf", ink: "#6d4c2f", accent: "#8b5e3c", blush: "#eaa79c" },
  "super-pig":         { nameZh: "愛心超級豬", nameEn: "Super Heart Pig",   ears: "pointy", build: "chunky", fur: "#f7bfc9", belly: "#fde3e8", ink: "#8f5563", accent: "#e34b5c", blush: "#f194a6" },
  "spin-hedgehog":     { nameZh: "旋轉刺蝟",   nameEn: "Spin Hedgehog",     ears: "spiky",  build: "chunky", fur: "#a5714a", belly: "#f2ddc0", ink: "#4a3222", accent: "#d1584f", blush: "#e0a08e" },
  "kimono-calico":     { nameZh: "和服三花貓", nameEn: "Kimono Calico Cat", ears: "pointy", build: "slim",   fur: "#f6efe6", belly: "#fffcf7", ink: "#6b5a4a", accent: "#c86a86", blush: "#f2b0ae" },
};

export const PET_KINDS = Object.keys(PETS) as PetKind[];

// Painting helpers -----------------------------------------------------------
// The grid holds palette keys, not colours, so one paint pass serves every
// pet and only the lookup at render time differs.
type Key = "." | "o" | "f" | "b" | "a" | "e" | "n" | "h";
type Canvas = Key[][];

function blank(): Canvas {
  return Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => "." as Key));
}

function put(canvas: Canvas, x: number, y: number, key: Key) {
  if (y < 0 || y >= GRID || x < 0 || x >= GRID) return;
  canvas[y][x] = key;
}

/** Fills a horizontal run, inclusive of both ends. */
function row(canvas: Canvas, y: number, x0: number, x1: number, key: Key) {
  for (let x = x0; x <= x1; x++) put(canvas, x, y, key);
}

/** Body silhouettes: half-width of the blob at each row, from head to feet. */
const BUILDS: Record<Build, number[]> = {
  //          head ....................... body ................. feet
  chunky: [3, 5, 6, 6, 6, 6, 6, 6, 6, 6, 5],
  slim:   [3, 4, 5, 5, 5, 5, 5, 5, 5, 4, 4],
  tall:   [3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4],
};

const BODY_TOP = 3;

function drawEars(canvas: Canvas, ears: EarShape, facing: "down" | "up" | "side") {
  // Side-on, the far ear is hidden behind the head, so only one is drawn.
  const positions: number[] = facing === "side" ? [6] : [4, 11];
  switch (ears) {
    case "round":
      for (const x of positions) {
        row(canvas, 1, x - 1, x + 1, "o");
        row(canvas, 2, x - 1, x + 1, "f");
      }
      break;
    case "pointy":
      for (const x of positions) {
        put(canvas, x, 0, "o");
        row(canvas, 1, x - 1, x + 1, "f");
        row(canvas, 2, x - 1, x + 1, "f");
      }
      break;
    case "long":
      for (const x of positions) {
        for (let y = 0; y <= 2; y++) row(canvas, y, x, x + 1, y === 0 ? "o" : "f");
      }
      break;
    case "tiny":
      // Barely-there ears still need an outline or they vanish into the head.
      for (const x of positions) { put(canvas, x, 1, "o"); put(canvas, x, 2, "f"); }
      break;
    case "spiky":
      for (let x = 3; x <= 12; x += 2) put(canvas, x, 2, "o");
      break;
    case "none":
      break;
  }
}

function drawFace(canvas: Canvas, facing: "down" | "up" | "side", blush: boolean) {
  if (facing === "up") return; // back of the head
  if (facing === "side") {
    put(canvas, 10, 6, "e");
    row(canvas, 8, 10, 12, "b");
    put(canvas, 12, 8, "n");
    if (blush) put(canvas, 7, 7, "h");
    return;
  }
  put(canvas, 5, 6, "e");
  put(canvas, 10, 6, "e");
  row(canvas, 8, 6, 9, "b");
  put(canvas, 7, 9, "n");
  put(canvas, 8, 9, "n");
  if (blush) { put(canvas, 3, 7, "h"); put(canvas, 12, 7, "h"); }
}

function buildSprite(spec: PetSpec, facing: "down" | "up" | "side", step: number): Canvas {
  const canvas = blank();
  const widths = BUILDS[spec.build];

  widths.forEach((halfWidth, index) => {
    const y = BODY_TOP + index;
    const x0 = 8 - halfWidth;
    const x1 = 7 + halfWidth;
    row(canvas, y, x0, x1, "o");
    row(canvas, y, x0 + 1, x1 - 1, "f");
  });

  // Belly patch and the accent band sit below the face, not through it —
  // the muzzle occupies rows 8-9, so the chest starts at 10.
  const bellyTop = BODY_TOP + 8;
  for (let y = bellyTop; y < bellyTop + 2; y++) row(canvas, y, 6, 9, "b");
  row(canvas, BODY_TOP + 7, 4, 11, "a");

  drawEars(canvas, spec.ears, facing);
  drawFace(canvas, facing, Boolean(spec.blush));

  // Feet. The two frames differ only here, which is all a walk cycle needs
  // to read at this size.
  const footY = BODY_TOP + widths.length;
  if (step === 0) { row(canvas, footY, 4, 5, "o"); row(canvas, footY, 10, 11, "o"); }
  else { row(canvas, footY, 5, 6, "o"); row(canvas, footY, 9, 10, "o"); }

  return canvas;
}

export interface PixelPetProps {
  kind?: PetKind;
  facing?: Facing;
  /** Which walk frame to show. Hold it steady to stand still. */
  frame?: number;
  /** Rendered pixel size of one sprite cell. */
  scale?: number;
  className?: string;
  title?: string;
}

export function PixelPet({
  kind = "watermelon-shiba", facing = "down", frame = 0, scale = 3, className, title,
}: PixelPetProps) {
  const spec = PETS[kind] ?? PETS["watermelon-shiba"];
  const set = facing === "up" ? "up" : facing === "down" ? "down" : "side";

  const cells = useMemo(() => {
    const canvas = buildSprite(spec, set, frame % 2);
    const colours: Record<Exclude<Key, ".">, string> = {
      o: spec.ink, f: spec.fur, b: spec.belly, a: spec.accent,
      e: spec.ink, n: spec.ink, h: spec.blush ?? spec.fur,
    };
    const out: { x: number; y: number; fill: string }[] = [];
    canvas.forEach((line, y) => line.forEach((key, x) => {
      if (key !== ".") out.push({ x, y, fill: colours[key] });
    }));
    return out;
  }, [spec, set, frame]);

  return (
    <svg
      className={className}
      width={GRID * scale}
      height={GRID * scale}
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ transform: facing === "left" ? "scaleX(-1)" : undefined, imageRendering: "pixelated" }}
    >
      {cells.map(cell => (
        <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={1} height={1} fill={cell.fill} />
      ))}
    </svg>
  );
}

/** Exposed for tests: every pet must paint a full, well-formed grid. */
export function spriteGrid(kind: PetKind, facing: "down" | "up" | "side", step: number) {
  return buildSprite(PETS[kind], facing, step).map(line => line.join(""));
}
