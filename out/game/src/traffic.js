// Street life: traffic cars that drive the road grid and pedestrians
// that walk the sidewalks, plus parked cars to steal. Traffic keeps the
// city feeling alive even when no mission is running.
import { CAR_COLORS, ROAD_WIDTH, ROAD_X, ROAD_Y, WORLD } from './config.js';
import { makeCar, makePed, moveWithBuildings } from './entities.js';
import { clamp, dist2 } from './random.js';
import { groundAt } from './world.js';

const TRAFFIC_COUNT = 14;
const PED_COUNT = 42;
const PARKED_COUNT = 10;

export function spawnStreetLife(G) {
  const rng = G.rng;
  G.cars = [];
  G.peds = [];
  // Traffic cars on the road grid, each driving one road line.
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    const line = vertical ? rng.pick(ROAD_X) : rng.pick(ROAD_Y);
    const along = rng.range(120, (vertical ? WORLD.height : WORLD.width) - 240);
    const dir = rng.chance(0.5) ? 1 : -1;
    const car = makeCar(rng.chance(0.12) ? 'taxi' : 'sedan', vertical ? line : along, vertical ? along : line, vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI, rng.chance(0.12) ? CAR_COLORS.taxi : rng.pick(CAR_COLORS.sedan));
    car.driver = 'traffic';
    car.axis = vertical ? 'y' : 'x';
    car.dir = dir;
    car.cruise = rng.range(110, 175);
    car.speed = car.cruise;
    G.cars.push(car);
  }
  // Parked cars along the plaza, the marina and the hideout.
  for (let i = 0; i < PARKED_COUNT; i += 1) {
    const spot = G.world.parkingSpots[i % G.world.parkingSpots.length];
    const car = makeCar('sedan', spot.x + rng.range(-6, 6), spot.y + rng.range(-6, 6), spot.angle, rng.pick(CAR_COLORS.sedan));
    car.driver = null;
    G.cars.push(car);
  }
  // Pedestrians on the sidewalks.
  for (let i = 0; i < PED_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    const line = vertical ? rng.pick(ROAD_X) : rng.pick(ROAD_Y);
    const along = rng.range(120, (vertical ? WORLD.height : WORLD.width) - 240);
    const offset = (rng.chance(0.5) ? 1 : -1) * (ROAD_WIDTH / 2 + 14);
    const ped = makePed(vertical ? line + offset : along, vertical ? along : line + offset, rng);
    G.peds.push(ped);
  }
}

// Keep the street populated: respawn traffic that drove off the map.
function respawnTrafficCar(G, car) {
  const rng = G.rng;
  const vertical = rng.chance(0.5);
  const line = vertical ? rng.pick(ROAD_X) : rng.pick(ROAD_Y);
  const along = rng.chance(0.5) ? 100 : (vertical ? WORLD.height : WORLD.width) - 260;
  car.x = vertical ? line : along;
  car.y = vertical ? along : line;
  car.axis = vertical ? 'y' : 'x';
  car.dir = rng.chance(0.5) ? 1 : -1;
  car.angle = vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.dir > 0 ? 0 : Math.PI;
  car.speed = car.cruise;
}

export function updateTraffic(G, dt) {
  const player = G.player;
  for (const car of G.cars) {
    if (car.driver !== 'traffic') continue;
    // Slow down for the car ahead on the same road.
    let target = car.cruise;
    for (const other of G.cars) {
      if (other === car || other.driver === null) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = car.axis === 'y' ? Math.sign(dy) === car.dir && Math.abs(dx) < 30 : Math.sign(dx) === car.dir && Math.abs(dy) < 30;
      const gap = car.axis === 'y' ? Math.abs(dy) : Math.abs(dx);
      if (ahead && gap < 90) target = 0;
    }
    car.speed += clamp(target - car.speed, -300 * dt, 200 * dt);
    const step = car.speed * car.dir * dt;
    if (car.axis === 'y') car.y += step;
    else car.x += step;
    // At an intersection, sometimes turn onto the crossing road.
    const cross = car.axis === 'y' ? ROAD_Y : ROAD_X;
    const along = car.axis === 'y' ? car.y : car.x;
    for (const line of cross) {
      if (Math.abs(along - line) < 6 && G.rng.chance(0.25)) {
        const otherLine = car.axis === 'y' ? ROAD_X : ROAD_Y;
        const current = car.axis === 'y' ? car.x : car.y;
        if (Math.abs(current - line) > 200) break;
        car.axis = car.axis === 'y' ? 'x' : 'y';
        car.dir = G.rng.chance(0.5) ? 1 : -1;
        car.angle = car.axis === 'y' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.dir > 0 ? 0 : Math.PI;
        if (car.axis === 'y') car.x = line;
        else car.y = line;
        void otherLine;
        break;
      }
    }
    if (car.x < 60 || car.x > WORLD.width - 60 || car.y < 60 || car.y > WORLD.height - 60) {
      respawnTrafficCar(G, car);
    }
  }

  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.stateTimer -= dt;
      continue;
    }
    if (ped.state === 'flee') {
      // Run away from the last gunfire, then calm down.
      ped.panic -= dt;
      const dx = Math.cos(ped.angle) * 150 * dt;
      const dy = Math.sin(ped.angle) * 150 * dt;
      const pos = moveWithBuildings(G.world, ped.x, ped.y, dx, dy, ped.radius);
      ped.x = pos.x;
      ped.y = pos.y;
      if (ped.panic <= 0) ped.state = 'walk';
      continue;
    }
    ped.stateTimer -= dt;
    if (ped.stateTimer <= 0) {
      ped.stateTimer = G.rng.range(2, 7);
      ped.angle = G.rng.range(0, Math.PI * 2);
    }
    const dx = Math.cos(ped.angle) * ped.speed * dt;
    const dy = Math.sin(ped.angle) * ped.speed * dt;
    const ground = groundAt(ped.x + dx, ped.y + dy);
    if (ground === 'ocean') {
      ped.angle += Math.PI;
      continue;
    }
    const pos = moveWithBuildings(G.world, ped.x, ped.y, dx, dy, ped.radius);
    ped.x = pos.x;
    ped.y = pos.y;
    // A pedestrian hit by a speeding car goes down and the law notices.
    const car = carHittingPed(G, ped);
    if (car && Math.abs(car.speed) > 60) {
      ped.state = 'down';
      ped.stateTimer = 6;
      G.particles.push({ x: ped.x, y: ped.y, color: '#ff5c5c', life: 0.6, maxLife: 0.6, vx: 0, vy: -30, size: 5 });
      if (car.driver === 'player') {
        addWantedSafe(G, 1);
        G.message = 'You hit a pedestrian! The police are coming.';
        G.messageTimer = 3;
      }
    }
    // Gunfire nearby sends pedestrians running.
    if (player.firing && dist2(ped.x, ped.y, player.x, player.y) < 420 * 420) {
      ped.state = 'flee';
      ped.panic = 2.5;
      ped.angle = Math.atan2(ped.y - player.y, ped.x - player.x);
    }
  }
  // Downed pedestrians get back up after a while.
  for (const ped of G.peds) {
    if (ped.state === 'down' && ped.stateTimer <= 0) {
      ped.state = 'walk';
      ped.stateTimer = G.rng.range(2, 6);
    }
  }
}

function carHittingPed(G, ped) {
  for (const car of G.cars) {
    if (Math.abs(car.speed) < 1) continue;
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    const along = Math.abs(dx * Math.cos(car.angle) + dy * Math.sin(car.angle));
    const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along < 26 && across < 16) return car;
  }
  return null;
}

// Local import to avoid a cycle: police.js owns the wanted level.
import { addWanted as addWantedSafe } from './police.js';
