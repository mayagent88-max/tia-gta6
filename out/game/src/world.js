// The city of Aura City, generated from one seed: a road grid, blocks
// with buildings, parks, the Neon Plaza, the beach and the ocean. The
// generator is pure data — no drawing, no browser — so the same seed
// always builds the same city for screenshots and play.
import { BEACH_TOP, LANDMARKS, OCEAN_TOP, PALETTE, ROAD_WIDTH, ROAD_X, ROAD_Y, WORLD } from './config.js';
import { makeRng } from './random.js';

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const palms = [];
  const parks = [];
  const parkingSpots = [];

  const xEdges = [0, ...ROAD_X, WORLD.width];
  const yEdges = [0, ...ROAD_Y, BEACH_TOP];
  const plazaCell = { xi: 3, yi: 3 }; // the block between roads 1400..1800 x 1000..1400

  for (let xi = 0; xi < xEdges.length - 1; xi += 1) {
    for (let yi = 0; yi < yEdges.length - 1; yi += 1) {
      const x0 = xEdges[xi];
      const x1 = xEdges[xi + 1];
      const y0 = yEdges[yi];
      const y1 = yEdges[yi + 1];
      // The block proper: inset from the road centrelines.
      const bx = x0 === 0 ? 24 : x0 + ROAD_WIDTH / 2 + 12;
      const bx1 = x1 === WORLD.width ? WORLD.width - 24 : x1 - ROAD_WIDTH / 2 - 12;
      const by = y0 === 0 ? 24 : y0 + ROAD_WIDTH / 2 + 12;
      const by1 = y1 === BEACH_TOP ? BEACH_TOP - 12 : y1 - ROAD_WIDTH / 2 - 12;
      const bw = bx1 - bx;
      const bh = by1 - by;
      if (bw < 90 || bh < 90) continue;
      // Neon Plaza stays open: the prototype car and the garage live here.
      if (xi === plazaCell.xi && yi === plazaCell.yi) {
        parks.push({ x: bx, y: by, w: bw, h: bh, kind: 'plaza' });
        parkingSpots.push({ x: LANDMARKS.garage.x - 90, y: LANDMARKS.garage.y + 40, angle: 0 });
        parkingSpots.push({ x: LANDMARKS.garage.x + 90, y: LANDMARKS.garage.y - 40, angle: Math.PI });
        continue;
      }
      // A few blocks are parks with palms instead of buildings.
      if (rng.chance(0.16)) {
        parks.push({ x: bx, y: by, w: bw, h: bh, kind: 'park' });
        const count = rng.int(3, 6);
        for (let i = 0; i < count; i += 1) {
          palms.push({ x: rng.range(bx + 20, bx1 - 20), y: rng.range(by + 20, by1 - 20), size: rng.range(0.8, 1.3) });
        }
        continue;
      }
      // 1 to 4 buildings fill the block, with alleys between them.
      const cols = bw > 260 ? 2 : 1;
      const rows = bh > 260 ? 2 : 1;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if (rng.chance(0.12)) continue;
          const cellW = bw / cols;
          const cellH = bh / rows;
          const w = rng.range(cellW * 0.5, cellW * 0.82);
          const h = rng.range(cellH * 0.5, cellH * 0.82);
          const x = bx + (cx * cellW + (cellW - w) / 2) + rng.range(-8, 8);
          const y = by + (cy * cellH + (cellH - h) / 2) + rng.range(-8, 8);
          buildings.push({
            x,
            y,
            w,
            h,
            color: rng.pick(PALETTE.buildingRoof),
            neon: rng.chance(0.45) ? rng.pick(PALETTE.neon) : null,
            height: rng.int(1, 3),
          });
        }
      }
    }
  }

  // Palm-lined beach road: the sunset drive of mission 3.
  for (let x = 120; x < WORLD.width - 60; x += 95) {
    palms.push({ x: x + rng.range(-14, 14), y: 2130 + rng.range(-8, 8), size: rng.range(0.9, 1.4) });
    if (rng.chance(0.5)) palms.push({ x: x + 48, y: 2030 + rng.range(-6, 6), size: rng.range(0.8, 1.2) });
  }
  // Marina parking at the east end of the beach.
  parkingSpots.push({ x: 2960, y: 2050, angle: Math.PI / 2 });
  parkingSpots.push({ x: 2900, y: 2050, angle: Math.PI / 2 });
  // Hideout parking on the west edge.
  parkingSpots.push({ x: 300, y: 1930, angle: 0 });

  return { seed, buildings, palms, parks, parkingSpots };
}

// Is this point on a road (asphalt), including the beach road?
export function isOnRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const rx of ROAD_X) if (Math.abs(x - rx) <= half && y < BEACH_TOP) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) <= half && x < WORLD.width) return true;
  return false;
}

// Is this point on sand or in the ocean?
export function groundAt(x, y) {
  if (y >= OCEAN_TOP) return 'ocean';
  if (y >= BEACH_TOP) return 'sand';
  return isOnRoad(x, y) ? 'road' : 'grass';
}

// Does a circle of `radius` at (x, y) touch any building?
export function hitsBuilding(world, x, y, radius) {
  for (const b of world.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
  }
  return null;
}

// The nearest road centreline coordinate on one axis.
export function nearestRoadX(x) {
  let best = ROAD_X[0];
  for (const rx of ROAD_X) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = ROAD_Y[0];
  for (const ry of ROAD_Y) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}
