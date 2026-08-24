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
  // 小鎮中心 — one central plaza with a compass rose, five doors around it,
  // and two ways out. Redrawn for Em's new art (2026-08-16): the old chain
  // climbed diagonally to a café at the top left, which no longer exists.
  //
  // Discs are spaced closer than their radii on purpose. An early pass used a
  // 0.07 step with a 0.055 radius, which on a 1.78 portrait map leaves a gap
  // between centres — the chain came apart and left the upper town
  // unreachable. Keep every step shorter than the smaller radius.
  // 小鎮中心 — Em's 2026-08-24 art. A sand plaza with a compass rose, the
  // road in from the bottom edge, a spur to each of the three doors, and the
  // path climbing away to the pier at the top right.
  //
  // Redrawn from scratch: the picture this replaces was a different town
  // altogether, so nothing from the old chain survives.
  "town-centre-day": [
    [ // the plaza — a broad band under the three shopfronts that narrows as
      // it comes forward, which is what the painting does
      { x: 0.470, y: 0.435, r: 0.180 },
      { x: 0.250, y: 0.425, r: 0.130 }, { x: 0.700, y: 0.425, r: 0.130 },
      { x: 0.480, y: 0.520, r: 0.170 }, { x: 0.480, y: 0.590, r: 0.150 },
    ],
    [ // the road in from the bottom edge, narrowing as it comes forward
      { x: 0.465, y: 0.990, r: 0.085 }, { x: 0.463, y: 0.945, r: 0.088 },
      { x: 0.461, y: 0.900, r: 0.090 }, { x: 0.459, y: 0.855, r: 0.092 },
      { x: 0.458, y: 0.810, r: 0.095 }, { x: 0.457, y: 0.765, r: 0.100 },
      { x: 0.458, y: 0.720, r: 0.105 }, { x: 0.463, y: 0.675, r: 0.110 },
      { x: 0.470, y: 0.630, r: 0.120 },
    ],
    [ // up-left to the cinema steps. A short spur rather than a wider plaza
      // disc: widening it put walkable ground on the café roof.
      { x: 0.260, y: 0.400, r: 0.085 }, { x: 0.225, y: 0.378, r: 0.070 },
      { x: 0.200, y: 0.355, r: 0.060 },
    ],
    [ // up-right to the library steps
      { x: 0.705, y: 0.415, r: 0.085 }, { x: 0.730, y: 0.395, r: 0.070 },
      { x: 0.750, y: 0.375, r: 0.060 },
    ],
    [ // left to the Buddy Café doorstep
      { x: 0.360, y: 0.560, r: 0.100 }, { x: 0.298, y: 0.583, r: 0.080 },
      { x: 0.235, y: 0.605, r: 0.068 },
    ],
    [ // right to MEE 珍藏館
      { x: 0.590, y: 0.590, r: 0.100 }, { x: 0.670, y: 0.622, r: 0.082 },
      { x: 0.750, y: 0.655, r: 0.070 },
    ],
    [ // up the right edge to the pier. The path runs behind the library, not
      // diagonally across the hedge the way the first pass had it.
      { x: 0.800, y: 0.400, r: 0.100 }, { x: 0.860, y: 0.345, r: 0.075 },
      { x: 0.895, y: 0.290, r: 0.065 }, { x: 0.910, y: 0.235, r: 0.060 },
      { x: 0.905, y: 0.180, r: 0.058 }, { x: 0.893, y: 0.137, r: 0.052 },
      { x: 0.885, y: 0.100, r: 0.048 },
    ],
  ],

  // 小鎮廣場 — Em's 2026-08-24 art, and the roomiest map in the world on
  // purpose: this is where the pets wander, and a narrow square makes them
  // shuffle on the spot.
  //
  // Almost all of it is paving. The shapes carved out of it are the notice
  // board in the middle, the stage deck at the top left (you stand at the
  // foot of its steps, not on it), and the planters along the bottom corners.
  "town-square-day": [
    [ // the open floor, most of the picture
      { x: 0.480, y: 0.700, r: 0.290 }, { x: 0.480, y: 0.850, r: 0.270 },
      { x: 0.195, y: 0.625, r: 0.155 }, { x: 0.775, y: 0.625, r: 0.155 },
    ],
    [ // in from the bottom edge
      { x: 0.470, y: 0.990, r: 0.170 }, { x: 0.470, y: 0.930, r: 0.185 },
    ],
    [ // up the left, past the park signpost, to the stage steps
      { x: 0.155, y: 0.545, r: 0.115 }, { x: 0.155, y: 0.470, r: 0.105 },
      { x: 0.180, y: 0.405, r: 0.095 }, { x: 0.250, y: 0.365, r: 0.090 },
      { x: 0.340, y: 0.345, r: 0.085 },
    ],
    [ // out to 散步公園 through the left edge
      { x: 0.150, y: 0.630, r: 0.115 }, { x: 0.055, y: 0.645, r: 0.090 },
    ],
    [ // up the right, to the arch
      { x: 0.790, y: 0.545, r: 0.115 }, { x: 0.800, y: 0.470, r: 0.105 },
      { x: 0.820, y: 0.400, r: 0.095 }, { x: 0.845, y: 0.335, r: 0.085 },
    ],
    [ // the strip in front of the notice board
      { x: 0.470, y: 0.618, r: 0.110 },
    ],
  ],

  // 散步公園 — redrawn for Em's new art (2026-08-16). Read off the picture
  // rather than guessed: a scan for the pale stone gives the path's left and
  // right edge on every row, and these discs sit on the middle of it. The
  // first pass was eyeballed off a thumbnail and ran a corridor up the grass
  // beside the path for most of its length.
  //
  // One winding path bottom to top, with three short spurs: west to the
  // picnic lawn, south-west to the swing under the roses, east over the
  // little bridge. The spurs exist because of the seats — 「公園長椅及野餐墊
  // 是可以有『坐下』的互動」— and a bench you cannot walk to is a bench that
  // is only a picture.
  "seaside-park-day": [
    [ // the path itself, bottom edge to the 小屋區 exit at the top right
      { x: 0.480, y: 0.99, r: 0.13 }, { x: 0.485, y: 0.93, r: 0.13 },
      { x: 0.490, y: 0.87, r: 0.13 }, { x: 0.500, y: 0.81, r: 0.12 },
      { x: 0.510, y: 0.75, r: 0.12 }, { x: 0.525, y: 0.69, r: 0.12 },
      { x: 0.535, y: 0.63, r: 0.12 }, { x: 0.535, y: 0.57, r: 0.11 },
      { x: 0.505, y: 0.51, r: 0.11 }, { x: 0.470, y: 0.455, r: 0.10 },
      { x: 0.460, y: 0.400, r: 0.10 }, { x: 0.500, y: 0.350, r: 0.09 },
      { x: 0.530, y: 0.300, r: 0.09 }, { x: 0.545, y: 0.250, r: 0.09 },
      { x: 0.565, y: 0.205, r: 0.080 }, { x: 0.610, y: 0.165, r: 0.070 },
      { x: 0.675, y: 0.125, r: 0.065 }, { x: 0.735, y: 0.090, r: 0.065 },
      { x: 0.795, y: 0.062, r: 0.065 }, { x: 0.845, y: 0.045, r: 0.065 },
    ],
    [ // west onto the picnic lawn, then down to the bench below it
      { x: 0.360, y: 0.420, r: 0.08 }, { x: 0.300, y: 0.414, r: 0.07 },
      { x: 0.240, y: 0.410, r: 0.065 }, { x: 0.220, y: 0.410, r: 0.06 },
      { x: 0.255, y: 0.455, r: 0.06 }, { x: 0.255, y: 0.495, r: 0.055 },
    ],
    [ // south-west to the swing seat under the rose pergola
      { x: 0.380, y: 0.620, r: 0.08 }, { x: 0.320, y: 0.660, r: 0.07 },
      { x: 0.270, y: 0.700, r: 0.065 }, { x: 0.220, y: 0.735, r: 0.06 },
      { x: 0.185, y: 0.752, r: 0.055 },
    ],
    [ // east over the little stone bridge to where the bicycles are parked
      { x: 0.570, y: 0.455, r: 0.055 }, { x: 0.630, y: 0.452, r: 0.05 },
      { x: 0.690, y: 0.462, r: 0.05 }, { x: 0.745, y: 0.495, r: 0.05 },
      { x: 0.790, y: 0.532, r: 0.05 }, { x: 0.820, y: 0.560, r: 0.05 },
    ],
    [ // east to the bench beside the park map
      { x: 0.620, y: 0.275, r: 0.07 }, { x: 0.680, y: 0.278, r: 0.06 },
      { x: 0.720, y: 0.282, r: 0.06 }, { x: 0.790, y: 0.245, r: 0.06 },
      { x: 0.830, y: 0.215, r: 0.06 },
    ],
  ],

  // 小屋區入口 — redrawn for Em's new art (2026-08-16). A paw-print arch on
  // the path up from 小鎮廣場, then six cottages around a wide stone
  // forecourt. The old chain was traced over a canal town with a lighthouse
  // and shares nothing with this.
  //
  // Every cottage gets a disc at its doorstep even though five of them do not
  // open. A child walks up to a front door whether or not it opens, and a
  // door they cannot reach reads as a bug rather than as a closed house.
  //
  // Two of those approaches are stepping stones through grass rather than
  // paving — the purple tower and the glass greenhouse both sit off the main
  // stone, and the stones are drawn in the art. Following them is what keeps
  // these corridors on the picture instead of cutting across a flower bed.
  "village-gate-day": [
    [ // the approach, bottom edge up through the arch
      { x: 0.490, y: 0.99, r: 0.13 }, { x: 0.490, y: 0.93, r: 0.13 },
      { x: 0.500, y: 0.87, r: 0.13 }, { x: 0.505, y: 0.81, r: 0.13 },
      { x: 0.510, y: 0.75, r: 0.13 }, { x: 0.510, y: 0.70, r: 0.12 },
      { x: 0.510, y: 0.66, r: 0.11 },
    ],
    [ // the forecourt inside the arch
      { x: 0.500, y: 0.600, r: 0.13 }, { x: 0.440, y: 0.575, r: 0.11 },
      { x: 0.560, y: 0.575, r: 0.11 }, { x: 0.500, y: 0.530, r: 0.12 },
      { x: 0.550, y: 0.490, r: 0.11 }, { x: 0.530, y: 0.450, r: 0.10 },
    ],
    [ // west, up to the foot of 我的小屋's wooden steps
      { x: 0.420, y: 0.560, r: 0.085 }, { x: 0.375, y: 0.545, r: 0.07 },
      { x: 0.330, y: 0.535, r: 0.06 }, { x: 0.290, y: 0.528, r: 0.055 },
    ],
    [ // the spine, climbing to the shell cottage's frontage
      { x: 0.530, y: 0.410, r: 0.09 }, { x: 0.530, y: 0.360, r: 0.085 },
      { x: 0.530, y: 0.310, r: 0.08 }, { x: 0.545, y: 0.265, r: 0.08 },
      { x: 0.560, y: 0.225, r: 0.075 }, { x: 0.545, y: 0.195, r: 0.07 },
      { x: 0.500, y: 0.205, r: 0.06 },
    ],
    [ // the stepping stones west to the purple tower's steps
      { x: 0.470, y: 0.310, r: 0.055 }, { x: 0.420, y: 0.296, r: 0.05 },
      { x: 0.375, y: 0.268, r: 0.05 }, { x: 0.330, y: 0.244, r: 0.05 },
      { x: 0.280, y: 0.226, r: 0.05 },
    ],
    [ // east along the top frontage, past the clock cottage and out to the park
      { x: 0.620, y: 0.215, r: 0.07 }, { x: 0.680, y: 0.205, r: 0.07 },
      { x: 0.740, y: 0.195, r: 0.07 }, { x: 0.800, y: 0.190, r: 0.07 },
      { x: 0.865, y: 0.185, r: 0.07 }, { x: 0.945, y: 0.180, r: 0.07 },
    ],
    [ // the stepping stones east to the greenhouse door
      { x: 0.630, y: 0.385, r: 0.08 }, { x: 0.690, y: 0.373, r: 0.06 },
      { x: 0.735, y: 0.366, r: 0.055 }, { x: 0.770, y: 0.358, r: 0.055 },
    ],
    [ // south-east to the blue cottage and its bicycle
      { x: 0.620, y: 0.555, r: 0.09 }, { x: 0.690, y: 0.553, r: 0.08 },
      { x: 0.760, y: 0.551, r: 0.075 }, { x: 0.820, y: 0.550, r: 0.07 },
    ],
  ],

  // 碼頭市集 — the compass plaza and the steps down to the exit.
  // 碼頭市集 — redrawn for Em's new art (2026-08-16). Five stalls spread
  // around a cobbled quay: cards on the left, lost property on the right,
  // registration in the middle, payment to its right, and the harbour
  // master's booth at the top by the pier. The old chain assumed all five
  // huddled around the centre.
  // 碼頭市集 — the compass plaza, the road down to the bottom edge, and a
  // lobe out to each of the five counters. Redrawn against the shipped art.
  "wharf-market-day": [
    [ // the compass plaza
      { x: 0.470, y: 0.605, r: 0.19 }, { x: 0.470, y: 0.530, r: 0.15 },
      { x: 0.470, y: 0.680, r: 0.16 },
    ],
    [ // the road down and out
      { x: 0.470, y: 0.99, r: 0.11 }, { x: 0.470, y: 0.93, r: 0.11 },
      { x: 0.470, y: 0.87, r: 0.11 }, { x: 0.470, y: 0.81, r: 0.12 },
      { x: 0.470, y: 0.75, r: 0.13 },
    ],
    [ // left, to the map-and-card stall
      { x: 0.360, y: 0.580, r: 0.11 }, { x: 0.280, y: 0.565, r: 0.09 },
      { x: 0.210, y: 0.555, r: 0.075 }, { x: 0.170, y: 0.545, r: 0.07 },
    ],
    [ // up, to the striped market awning
      { x: 0.450, y: 0.560, r: 0.10 }, { x: 0.440, y: 0.510, r: 0.075 },
    ],
    [ // right, to the harbour-master and the notice board beside it
      { x: 0.570, y: 0.580, r: 0.095 }, { x: 0.650, y: 0.560, r: 0.075 },
      { x: 0.720, y: 0.548, r: 0.065 }, { x: 0.790, y: 0.560, r: 0.062 },
      { x: 0.845, y: 0.600, r: 0.062 }, { x: 0.880, y: 0.640, r: 0.062 },
    ],
    [ // down-right, to the table under the parasol
      { x: 0.560, y: 0.735, r: 0.085 }, { x: 0.650, y: 0.765, r: 0.075 },
      { x: 0.745, y: 0.792, r: 0.070 }, { x: 0.830, y: 0.815, r: 0.068 },
    ],
  ],

};
