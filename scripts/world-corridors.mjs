// Where the child can walk, per outdoor map.
//
// This used to be derived from the art by colour: the paths were pale warm
// stone and everything else was green, blue or dark, so one rule separated
// them. That rule does not survive the new art. Here the stone paths, the
// timber roofs, the awnings, the signboards and the lamplit walls are all the
// same warm palette, so the classifier kept the roofs and — worse — kept
// severing the road wherever foliage overhangs it, which left the child able
// to walk the bottom third of 小鎮中心 and nothing else. Retuning thresholds
// moved which half broke, not whether it broke.
//
// So the corridors are written down instead. Each is a chain of discs along
// the middle of a path, in normalised 0-1 coordinates read off the art, and
// the mask is the union of them. Discs rather than polygons because a path is
// a corridor: a centre line and a width is what it actually is, and it is far
// easier to check a stroke against the picture than a ring of vertices.
//
// To adjust one: run `node scripts/build-walkmask.mjs --debug`, open the
// overlay it writes to /tmp, and move the disc that is wrong. Magenta is
// walkable; if magenta covers a roof or stops short of a doorway, fix it here.

/** @typedef {{ x: number, y: number, r: number }} Disc */

export const CORRIDORS = {
  // 小鎮中心 — the road climbs from the bottom edge to Buddy Café, with
  // branches right to Hero Studio and the MEE 珍藏館 steps, and along the
  // bottom to the wharf gate.
  // Discs are spaced closer than their radii on purpose. The first pass used
  // a 0.07 step with a 0.055 radius near the top, which on a 1.78 portrait map
  // is a 0.124 gap between centres — the chain came apart and left the whole
  // upper town unreachable. Keep every step shorter than the smaller radius.
  "town-centre-day": [
    [ // main road, bottom edge up to the café terrace
      { x: 0.46, y: 0.99, r: 0.12 }, { x: 0.45, y: 0.93, r: 0.12 },
      { x: 0.45, y: 0.87, r: 0.11 }, { x: 0.45, y: 0.81, r: 0.10 },
      { x: 0.45, y: 0.75, r: 0.095 }, { x: 0.45, y: 0.69, r: 0.09 },
      { x: 0.44, y: 0.64, r: 0.085 }, { x: 0.44, y: 0.59, r: 0.08 },
      { x: 0.43, y: 0.54, r: 0.075 }, { x: 0.43, y: 0.49, r: 0.07 },
      { x: 0.42, y: 0.45, r: 0.065 }, { x: 0.40, y: 0.41, r: 0.06 },
      { x: 0.38, y: 0.37, r: 0.055 }, { x: 0.36, y: 0.33, r: 0.05 },
      { x: 0.34, y: 0.30, r: 0.045 }, { x: 0.33, y: 0.27, r: 0.045 },
      { x: 0.32, y: 0.24, r: 0.045 },
    ],
    [ // right, along the terrace under Hero Studio to its door
      { x: 0.47, y: 0.52, r: 0.07 }, { x: 0.53, y: 0.51, r: 0.06 },
      { x: 0.59, y: 0.50, r: 0.055 }, { x: 0.65, y: 0.48, r: 0.055 },
      { x: 0.71, y: 0.46, r: 0.05 }, { x: 0.76, y: 0.44, r: 0.05 },
      { x: 0.80, y: 0.41, r: 0.05 },
    ],
    [ // right to the MEE 珍藏館 steps
      { x: 0.47, y: 0.71, r: 0.07 }, { x: 0.53, y: 0.71, r: 0.06 },
      { x: 0.59, y: 0.71, r: 0.055 }, { x: 0.64, y: 0.70, r: 0.05 },
      { x: 0.68, y: 0.68, r: 0.05 },
    ],
    [ // along the bottom to the wharf gate
      { x: 0.52, y: 0.91, r: 0.08 }, { x: 0.59, y: 0.91, r: 0.07 },
      { x: 0.66, y: 0.92, r: 0.07 }, { x: 0.73, y: 0.92, r: 0.065 },
      { x: 0.79, y: 0.93, r: 0.06 },
    ],
  ],

  // 小鎮廣場 — an open plaza rather than a road, so the discs are wide.
  "town-square-day": [
    [
      { x: 0.45, y: 0.99, r: 0.16 }, { x: 0.44, y: 0.90, r: 0.18 },
      { x: 0.43, y: 0.80, r: 0.21 }, { x: 0.42, y: 0.70, r: 0.24 },
      { x: 0.42, y: 0.60, r: 0.24 }, { x: 0.43, y: 0.51, r: 0.23 },
      { x: 0.45, y: 0.45, r: 0.20 },
    ],
    [ // left arm, out to the 散步公園 gate
      { x: 0.20, y: 0.62, r: 0.14 }, { x: 0.12, y: 0.65, r: 0.11 },
      { x: 0.06, y: 0.68, r: 0.09 },
    ],
    [ // right, through the stone arch to 小屋區入口
      { x: 0.66, y: 0.50, r: 0.10 }, { x: 0.74, y: 0.47, r: 0.08 },
      { x: 0.81, y: 0.44, r: 0.06 }, { x: 0.86, y: 0.42, r: 0.05 },
    ],
  ],

  // 散步公園 — one S-curve from the bottom edge to the wooden gate.
  "seaside-park-day": [
    [
      { x: 0.42, y: 0.99, r: 0.14 }, { x: 0.44, y: 0.91, r: 0.13 },
      { x: 0.49, y: 0.83, r: 0.12 }, { x: 0.54, y: 0.75, r: 0.10 },
      { x: 0.58, y: 0.67, r: 0.09 }, { x: 0.60, y: 0.60, r: 0.08 },
      { x: 0.62, y: 0.53, r: 0.075 }, { x: 0.65, y: 0.47, r: 0.07 },
      { x: 0.68, y: 0.41, r: 0.06 }, { x: 0.71, y: 0.36, r: 0.055 },
      { x: 0.75, y: 0.31, r: 0.05 }, { x: 0.78, y: 0.28, r: 0.045 },
    ],
    [ // the little bridge over the pond, a side loop rather than a route
      { x: 0.56, y: 0.56, r: 0.05 }, { x: 0.50, y: 0.55, r: 0.045 },
      { x: 0.44, y: 0.55, r: 0.04 },
    ],
  ],

  // 小屋區入口 — a wide forecourt, the bridge over the river, and the climb
  // to the archway.
  // Radii here are deliberately conservative. A generous disc on the plaza's
  // north edge reached over the fence and put the river inside the mask, and
  // a child standing on the water is worse than a child who cannot quite
  // reach the railing.
  "village-gate-day": [
    [ // the forecourt
      { x: 0.44, y: 0.99, r: 0.19 }, { x: 0.43, y: 0.92, r: 0.19 },
      { x: 0.42, y: 0.85, r: 0.18 }, { x: 0.41, y: 0.78, r: 0.17 },
      { x: 0.40, y: 0.72, r: 0.15 }, { x: 0.40, y: 0.66, r: 0.13 },
      { x: 0.41, y: 0.61, r: 0.10 },
    ],
    // Traced off Em's drawn route (uploads/場景/19 and 21): out of the
    // forecourt, up its right shoulder, across the stone bridge, then along
    // the far bank to the archway. Two earlier guesses had it climbing the
    // middle or hugging the far right — both put the river inside the mask.
    [
      { x: 0.46, y: 0.62, r: 0.075 }, { x: 0.45, y: 0.57, r: 0.065 },
      { x: 0.45, y: 0.53, r: 0.055 }, { x: 0.49, y: 0.50, r: 0.05 },
      { x: 0.54, y: 0.483, r: 0.045 }, { x: 0.59, y: 0.470, r: 0.045 },
      { x: 0.64, y: 0.460, r: 0.045 }, { x: 0.69, y: 0.450, r: 0.045 },
      { x: 0.74, y: 0.437, r: 0.045 }, { x: 0.78, y: 0.420, r: 0.042 },
      { x: 0.815, y: 0.395, r: 0.04 }, { x: 0.845, y: 0.360, r: 0.04 },
    ],
    [ // left, to 我的小屋's steps
      { x: 0.30, y: 0.69, r: 0.09 }, { x: 0.25, y: 0.67, r: 0.07 },
      { x: 0.21, y: 0.65, r: 0.055 }, { x: 0.18, y: 0.63, r: 0.05 },
    ],
  ],

  // 碼頭市集 — the compass plaza and the steps down to the exit.
  "wharf-market-day": [
    [
      { x: 0.47, y: 0.99, r: 0.10 }, { x: 0.47, y: 0.90, r: 0.10 },
      { x: 0.47, y: 0.81, r: 0.10 }, { x: 0.47, y: 0.72, r: 0.11 },
      { x: 0.48, y: 0.63, r: 0.13 }, { x: 0.48, y: 0.55, r: 0.14 },
      { x: 0.47, y: 0.48, r: 0.12 },
    ],
    [ // in front of the stalls, left and right
      { x: 0.32, y: 0.58, r: 0.09 }, { x: 0.24, y: 0.60, r: 0.07 },
      { x: 0.64, y: 0.58, r: 0.09 }, { x: 0.71, y: 0.62, r: 0.08 },
    ],
  ],
};
