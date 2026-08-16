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
  "town-centre-day": [
    [ // the plaza itself, a wide walkable disc in the middle
      { x: 0.48, y: 0.42, r: 0.20 }, { x: 0.44, y: 0.48, r: 0.19 },
      { x: 0.52, y: 0.48, r: 0.19 }, { x: 0.48, y: 0.53, r: 0.18 },
    ],
    [ // main road, bottom edge up into the plaza
      { x: 0.47, y: 0.99, r: 0.10 }, { x: 0.47, y: 0.93, r: 0.10 },
      { x: 0.47, y: 0.87, r: 0.10 }, { x: 0.47, y: 0.81, r: 0.10 },
      { x: 0.47, y: 0.75, r: 0.11 }, { x: 0.47, y: 0.69, r: 0.12 },
      { x: 0.47, y: 0.63, r: 0.13 },
    ],
    [ // up-left to the cinema door
      { x: 0.42, y: 0.44, r: 0.11 }, { x: 0.36, y: 0.41, r: 0.10 },
      { x: 0.30, y: 0.38, r: 0.09 }, { x: 0.25, y: 0.35, r: 0.08 },
      { x: 0.21, y: 0.32, r: 0.07 }, { x: 0.20, y: 0.30, r: 0.065 },
    ],
    [ // straight up to Hero Studio, the centrepiece
      { x: 0.49, y: 0.40, r: 0.11 }, { x: 0.50, y: 0.36, r: 0.09 },
      { x: 0.50, y: 0.32, r: 0.08 }, { x: 0.50, y: 0.29, r: 0.07 },
    ],
    [ // up-right to the library door
      { x: 0.55, y: 0.44, r: 0.11 }, { x: 0.62, y: 0.41, r: 0.10 },
      { x: 0.68, y: 0.38, r: 0.09 }, { x: 0.74, y: 0.35, r: 0.08 },
      { x: 0.78, y: 0.32, r: 0.07 }, { x: 0.79, y: 0.31, r: 0.065 },
    ],
    [ // down-left to the café door
      { x: 0.40, y: 0.53, r: 0.12 }, { x: 0.34, y: 0.55, r: 0.10 },
      { x: 0.28, y: 0.57, r: 0.09 }, { x: 0.23, y: 0.58, r: 0.08 },
      { x: 0.21, y: 0.58, r: 0.07 },
    ],
    [ // down-right to the album hall door
      { x: 0.56, y: 0.54, r: 0.12 }, { x: 0.62, y: 0.56, r: 0.10 },
      { x: 0.68, y: 0.58, r: 0.09 }, { x: 0.73, y: 0.59, r: 0.08 },
      { x: 0.76, y: 0.60, r: 0.07 },
    ],
    [ // the coast path, up the right edge to the wharf gate
      { x: 0.66, y: 0.36, r: 0.09 }, { x: 0.74, y: 0.30, r: 0.08 },
      { x: 0.81, y: 0.24, r: 0.075 }, { x: 0.87, y: 0.18, r: 0.07 },
      { x: 0.91, y: 0.13, r: 0.065 }, { x: 0.93, y: 0.10, r: 0.06 },
    ],
  ],
  // 小鎮廣場 — redrawn for Em's new art (2026-08-16). One big paved square
  // with the notice board in the middle, a stage in the upper left, the
  // village arch on the right and the park path on the left. Deliberately
  // the roomiest map in the world: this is where the pets wander, and a
  // narrow square makes them shuffle on the spot.
  "town-square-day": [
    [ // the square itself
      { x: 0.48, y: 0.68, r: 0.30 }, { x: 0.42, y: 0.55, r: 0.26 },
      { x: 0.56, y: 0.55, r: 0.26 }, { x: 0.48, y: 0.45, r: 0.24 },
      { x: 0.40, y: 0.36, r: 0.20 }, { x: 0.58, y: 0.36, r: 0.20 },
      { x: 0.48, y: 0.30, r: 0.18 },
    ],
    [ // in from the bottom edge
      { x: 0.47, y: 0.99, r: 0.14 }, { x: 0.47, y: 0.93, r: 0.14 },
      { x: 0.47, y: 0.87, r: 0.15 },
    ],
    [ // up-left to the stage steps
      { x: 0.40, y: 0.36, r: 0.16 }, { x: 0.34, y: 0.31, r: 0.13 },
      { x: 0.29, y: 0.27, r: 0.10 }, { x: 0.27, y: 0.25, r: 0.08 },
    ],
    [ // right to the village arch
      { x: 0.60, y: 0.33, r: 0.15 }, { x: 0.68, y: 0.27, r: 0.12 },
      { x: 0.74, y: 0.22, r: 0.10 }, { x: 0.79, y: 0.18, r: 0.085 },
    ],
    [ // left to the park path
      { x: 0.34, y: 0.48, r: 0.16 }, { x: 0.26, y: 0.50, r: 0.13 },
      { x: 0.18, y: 0.52, r: 0.11 }, { x: 0.11, y: 0.54, r: 0.09 },
      { x: 0.08, y: 0.55, r: 0.08 },
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
  "wharf-market-day": [
    [ // the open quay, most of the lower half
      { x: 0.47, y: 0.78, r: 0.24 }, { x: 0.40, y: 0.70, r: 0.22 },
      { x: 0.55, y: 0.70, r: 0.22 }, { x: 0.47, y: 0.64, r: 0.21 },
    ],
    [ // in from the bottom edge
      { x: 0.47, y: 0.99, r: 0.13 }, { x: 0.47, y: 0.93, r: 0.13 },
      { x: 0.47, y: 0.87, r: 0.14 },
    ],
    [ // up the middle, past registration to the harbour master
      { x: 0.47, y: 0.62, r: 0.15 }, { x: 0.47, y: 0.56, r: 0.12 },
      { x: 0.48, y: 0.49, r: 0.11 }, { x: 0.48, y: 0.42, r: 0.10 },
      { x: 0.48, y: 0.35, r: 0.09 }, { x: 0.48, y: 0.29, r: 0.08 },
      { x: 0.48, y: 0.24, r: 0.075 },
    ],
    [ // left along the front of the card stall
      { x: 0.42, y: 0.60, r: 0.14 }, { x: 0.35, y: 0.55, r: 0.12 },
      { x: 0.29, y: 0.49, r: 0.10 }, { x: 0.25, y: 0.43, r: 0.09 },
      { x: 0.23, y: 0.38, r: 0.08 },
    ],
    [ // right to payment, then on to lost property
      { x: 0.55, y: 0.62, r: 0.14 }, { x: 0.63, y: 0.59, r: 0.12 },
      { x: 0.71, y: 0.57, r: 0.11 }, { x: 0.78, y: 0.56, r: 0.10 },
      { x: 0.79, y: 0.49, r: 0.09 }, { x: 0.78, y: 0.42, r: 0.09 },
      { x: 0.77, y: 0.35, r: 0.08 },
    ],
  ],
};
