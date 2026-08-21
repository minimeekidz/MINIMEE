// A QR encoder, written out rather than installed.
//
// Buddy Café's whole point is 「小朋友與小朋友之間互掃 qrcode 加好友」, and a
// café that shows a URL in a <code> block is not that — a six-year-old cannot
// type a slug, and two children holding phones up to each other is the actual
// interaction Em drew. So the code has to be a real scannable square.
//
// It is written here instead of pulled in because the project has four
// runtime dependencies and this is a closed, finished algorithm: it is
// specified down to the polynomial, it will never need updating, and a
// dependency that renders a canvas would be larger than the spec it
// implements. Same reasoning as the babble engine.
//
// Scope is deliberately narrow: byte mode, error correction level L,
// versions 1 to 5. That covers 106 bytes, and a card link is about thirty.
// Every one of those versions has exactly one error-correction block, which
// is what keeps this short — interleaving multiple blocks is where a general
// encoder gets long, and nothing here needs it.

/** Data codewords and EC codewords per version, level L, one block each. */
const CAPACITY = [
  { data: 19, ec: 7 },   // version 1, 21x21
  { data: 34, ec: 10 },  // version 2, 25x25
  { data: 55, ec: 15 },  // version 3, 29x29
  { data: 80, ec: 20 },  // version 4, 33x33
  { data: 108, ec: 26 }, // version 5, 37x37
];

/** Centre of the single alignment pattern, by version. Version 1 has none. */
const ALIGN_CENTRE = [0, 18, 22, 26, 30];

// --- GF(256) ---------------------------------------------------------------
// The field QR uses: x^8 + x^4 + x^3 + x^2 + 1, primitive element 2.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}

function mul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

/** The generator polynomial for `degree` error-correction codewords. */
function generator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon remainder — the error-correction codewords. */
function ecCodewords(data: Uint8Array, count: number): Uint8Array {
  const gen = generator(count);
  const rem = new Uint8Array(count);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.copyWithin(0, 1);
    rem[count - 1] = 0;
    for (let i = 0; i < count; i += 1) rem[i] ^= mul(gen[i + 1], factor);
  }
  return rem;
}

// --- bit stream ------------------------------------------------------------

function encodeData(text: string, version: number): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const { data: capacity } = CAPACITY[version - 1];

  const bits: number[] = [];
  const push = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);       // byte mode
  push(bytes.length, 8); // versions 1-9 use an 8-bit count
  for (const byte of bytes) push(byte, 8);

  // Terminator, then round up to a whole codeword.
  for (let i = 0; i < 4 && bits.length < capacity * 8; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(capacity);
  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i]) out[i >> 3] |= 0x80 >> (i & 7);
  }
  // The specified pad bytes, alternating, for whatever is left.
  for (let i = bits.length / 8; i < capacity; i += 1) {
    out[i] = (i - bits.length / 8) % 2 === 0 ? 0xec : 0x11;
  }
  return out;
}

// --- the grid --------------------------------------------------------------

type Grid = { size: number; on: Uint8Array; fixed: Uint8Array };

function at(g: Grid, x: number, y: number): number {
  return g.on[y * g.size + x];
}

function set(g: Grid, x: number, y: number, on: number, fixed = true) {
  g.on[y * g.size + x] = on;
  if (fixed) g.fixed[y * g.size + x] = 1;
}

function finder(g: Grid, cx: number, cy: number) {
  // The 7x7 eye plus its one-module separator, clipped at the edges.
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= g.size || y >= g.size) continue;
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      set(g, x, y, ring === 2 || ring > 3 ? 0 : 1);
    }
  }
}

function skeleton(version: number): Grid {
  const size = version * 4 + 17;
  const g: Grid = { size, on: new Uint8Array(size * size), fixed: new Uint8Array(size * size) };

  finder(g, 0, 0);
  finder(g, size - 7, 0);
  finder(g, 0, size - 7);

  // Timing rows.
  for (let i = 8; i < size - 8; i += 1) {
    set(g, i, 6, i % 2 === 0 ? 1 : 0);
    set(g, 6, i, i % 2 === 0 ? 1 : 0);
  }

  // The single alignment pattern, versions 2 and up.
  const centre = ALIGN_CENTRE[version - 1];
  if (centre) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        set(g, centre + dx, centre + dy, ring === 1 ? 0 : 1);
      }
    }
  }

  // Dark module, and the format-info strips reserved so data skips them.
  set(g, 8, size - 8, 1);
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) { set(g, i, 8, 0); set(g, 8, i, 0); }
  }
  for (let i = 0; i < 8; i += 1) {
    set(g, size - 1 - i, 8, 0);
    if (i < 7) set(g, 8, size - 1 - i, 0);
  }
  return g;
}

/** Walk the two-module-wide columns, bottom-right to top-left, skipping the
 *  timing column, and lay the codewords down. */
function placeData(g: Grid, codewords: Uint8Array) {
  let bit = 0;
  let upward = true;
  for (let right = g.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the vertical timing pattern is not a column
    for (let step = 0; step < g.size; step += 1) {
      const y = upward ? g.size - 1 - step : step;
      for (const x of [right, right - 1]) {
        if (g.fixed[y * g.size + x]) continue;
        const value = bit < codewords.length * 8
          ? (codewords[bit >> 3] >> (7 - (bit & 7))) & 1
          : 0;
        g.on[y * g.size + x] = value;
        bit += 1;
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (x: number, y: number) => (x + y) % 2 === 0,
  (_x: number, y: number) => y % 2 === 0,
  (x: number, _y: number) => x % 3 === 0,
  (x: number, y: number) => (x + y) % 3 === 0,
  (x: number, y: number) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The four penalty rules. Lower is a code that scans more reliably. */
function penalty(g: Grid): number {
  const { size } = g;
  let score = 0;

  // Rule 1: runs of five or more of the same colour, each way.
  for (let i = 0; i < size; i += 1) {
    for (const row of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j += 1) {
        const a = row ? at(g, j, i) : at(g, i, j);
        const b = row ? at(g, j - 1, i) : at(g, i, j - 1);
        if (a === b) { run += 1; continue; }
        if (run >= 5) score += run - 2;
        run = 1;
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const v = at(g, x, y);
      if (v === at(g, x + 1, y) && v === at(g, x, y + 1) && v === at(g, x + 1, y + 1)) score += 3;
    }
  }

  // Rule 3: the finder-lookalike 1011101 with four light modules beside it.
  const a = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const b = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j + 11 <= size; j += 1) {
      let rowA = true, rowB = true, colA = true, colB = true;
      for (let k = 0; k < 11; k += 1) {
        if (at(g, j + k, i) !== a[k]) rowA = false;
        if (at(g, j + k, i) !== b[k]) rowB = false;
        if (at(g, i, j + k) !== a[k]) colA = false;
        if (at(g, i, j + k) !== b[k]) colB = false;
      }
      score += (rowA ? 40 : 0) + (rowB ? 40 : 0) + (colA ? 40 : 0) + (colB ? 40 : 0);
    }
  }

  // Rule 4: how far the dark proportion strays from half.
  let dark = 0;
  for (const v of g.on) dark += v;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/** 15-bit BCH format info for level L and the chosen mask. */
function formatBits(mask: number): number {
  let value = (0b01 << 3) | mask; // 01 is error-correction level L
  let rem = value << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  return ((value << 10) | rem) ^ 0b101010000010010;
}

function writeFormat(g: Grid, mask: number) {
  const bits = formatBits(mask);
  const { size } = g;
  for (let i = 0; i < 15; i += 1) {
    const bit = (bits >> i) & 1;
    // Copy one: down the left column and along the top row.
    if (i < 6) set(g, 8, i, bit);
    else if (i === 6) set(g, 8, 7, bit);
    else if (i === 7) set(g, 8, 8, bit);
    else if (i === 8) set(g, 7, 8, bit);
    else set(g, 14 - i, 8, bit);
    // Copy two: along the bottom-left and the top-right.
    if (i < 8) set(g, size - 1 - i, 8, bit);
    else set(g, 8, size - 15 + i, bit);
  }
  set(g, 8, size - 8, 1); // the dark module, always
}

// --- the one thing this file is for ----------------------------------------

/**
 * The module grid for `text`, as rows of booleans. `true` is a dark module.
 *
 * Throws if the text does not fit in version 5, which for a card link would
 * mean a slug several times longer than the schema allows.
 */
export function qrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text).length;
  const version = CAPACITY.findIndex(cap => bytes + 2 <= cap.data) + 1;
  if (version === 0) throw new Error(`QR: ${bytes} bytes is too long for version 5`);

  const { ec } = CAPACITY[version - 1];
  const data = encodeData(text, version);
  const codewords = new Uint8Array(data.length + ec);
  codewords.set(data);
  codewords.set(ecCodewords(data, ec), data.length);

  const base = skeleton(version);
  placeData(base, codewords);

  // Try every mask and keep the one the spec's own scoring likes best.
  let best: Grid | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const g: Grid = { size: base.size, on: base.on.slice(), fixed: base.fixed.slice() };
    for (let y = 0; y < g.size; y += 1) {
      for (let x = 0; x < g.size; x += 1) {
        if (!g.fixed[y * g.size + x] && MASKS[mask](x, y)) g.on[y * g.size + x] ^= 1;
      }
    }
    writeFormat(g, mask);
    const score = penalty(g);
    if (score < bestScore) { bestScore = score; best = g; }
  }

  const g = best as Grid;
  const rows: boolean[][] = [];
  for (let y = 0; y < g.size; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < g.size; x += 1) row.push(at(g, x, y) === 1);
    rows.push(row);
  }
  return rows;
}

/**
 * The same code as an SVG path string, plus the viewBox size.
 *
 * A path of squares rather than one <rect> per module: a version 3 code is
 * 841 modules, and 400-odd elements in the DOM is a real cost on the cheap
 * tablets these are read on.
 */
export function qrPath(text: string, quiet = 2): { d: string; size: number } {
  const rows = qrMatrix(text);
  const size = rows.length + quiet * 2;
  let d = "";
  rows.forEach((row, y) => {
    row.forEach((on, x) => {
      if (on) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    });
  });
  return { d, size };
}
