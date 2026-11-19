// Entity factories and movement: the player on foot, cars (street,
// sports, taxi, police), pedestrians, foot officers and the helicopter.
// Every entity is a plain object; the systems in traffic.js, police.js
// and combat.js move them, and render.js draws them.
import { CAR, CAR_COLORS, PLAYER, WORLD } from './config.js';
import { angleDiff, clamp } from './random.js';

let nextId = 1;

export function makePlayer(x, y) {
  return {
    id: nextId,
    kind: 'player',
    x,
    y,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    health: PLAYER.health,
    ammo: PLAYER.ammo,
    ammoMax: PLAYER.ammoMax,
    reloading: 0,
    fireCooldown: 0,
    inCar: null,
    speed: 0,
    hurtFlash: 0,
    lastHurtAt: -99,
  };
}

export function makeCar(kind, x, y, angle, color) {
  const palette = kind === 'sports' ? CAR_COLORS.sports : kind === 'police' ? CAR_COLORS.police : kind === 'taxi' ? CAR_COLORS.taxi : null;
  return {
    id: nextId,
    kind: 'car',
    carKind: kind,
    x,
    y,
    angle,
    speed: 0,
    color: color || palette || '#c8ccd4',
    length: CAR.length,
    width: CAR.width,
    health: kind === 'police' ? 120 : 100,
    driver: null, // 'player' | 'traffic' | 'police' | null (parked)
    maxSpeed:
      kind === 'sports' ? CAR.sportsMaxSpeed : kind === 'police' ? CAR.policeMaxSpeed : CAR.maxSpeed,
    brakeLights: false,
    skid: 0,
  };
}

export function makePed(x, y, rng) {
  const colors = ['#e8e8e8', '#ff8a5c', '#5c8aff', '#8aff5c', '#ff5c8a', '#c95cff', '#5cffe8'];
  return {
    id: nextId,
    kind: 'ped',
    x,
    y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(28, 52),
    color: rng.pick(colors),
    radius: 9,
    state: 'walk', // walk | flee | down
    stateTimer: rng.range(2, 6),
    panic: 0,
  };
}

export function makeOfficer(x, y) {
  return {
    id: nextId,
    kind: 'officer',
    x,
    y,
    angle: 0,
    speed: 200,
    radius: 11,
    health: 100,
    fireCooldown: 1,
    state: 'chase',
  };
}

export function makeGuard(x, y) {
  return {
    id: nextId,
    kind: 'guard',
    x,
    y,
    angle: 0,
    speed: 150,
    radius: 11,
    health: 100,
    fireCooldown: 1.2,
    state: 'approach',
  };
}

export function makeHeli(x, y) {
  return {
    id: nextId,
    kind: 'heli',
    x,
    y,
    angle: 0,
    radius: 26,
    orbitAngle: 0,
    rotor: 0,
  };
}

export function makeBullet(x, y, angle, from, damage) {
  return {
    id: nextId,
    kind: 'bullet',
    x,
    y,
    angle,
    from, // 'player' | 'enemy'
    damage: damage || PLAYER.bulletDamage,
    speed: PLAYER.bulletSpeed,
    travelled: 0,
    range: PLAYER.bulletRange,
  };
}

export function makeParticle(x, y, color, life, vx, vy, size) {
  return { x, y, color, life, maxLife: life, vx, vy, size: size || 3 };
}

// Move a point by (dx, dy) and push it out of every building it lands in.
// Returns the corrected position; used by the player, peds and officers.
export function moveWithBuildings(world, x, y, dx, dy, radius) {
  let nx = clamp(x + dx, radius, WORLD.width - radius);
  let ny = clamp(y + dy, radius, WORLD.height - radius);
  if (ny > 2240) ny = 2240; // the ocean is a wall
  for (const b of world.buildings) {
    if (nx + radius > b.x && nx - radius < b.x + b.w && ny + radius > b.y && ny - radius < b.y + b.h) {
      const pushLeft = nx + radius - b.x;
      const pushRight = b.x + b.w - (nx - radius);
      const pushUp = ny + radius - b.y;
      const pushDown = b.y + b.h - (ny - radius);
      const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (min === pushLeft) nx = b.x - radius;
      else if (min === pushRight) nx = b.x + b.w + radius;
      else if (min === pushUp) ny = b.y - radius;
      else ny = b.y + b.h + radius;
    }
  }
  return { x: nx, y: ny };
}

// Drive a car one step: throttle, steering, grip and building bounces.
export function driveCar(world, car, throttle, steer, dt) {
  const max = car.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed += CAR.reverseAccel * throttle * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 260 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = clamp(car.speed, -180, max);
  const speedRatio = Math.abs(car.speed) / max;
  car.angle += steer * CAR.turnRate * speedRatio * Math.sign(car.speed || 1) * dt;
  // Grip: bleed sideways drift so the car feels planted, not floaty.
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  car.x = clamp(nx, 24, WORLD.width - 24);
  car.y = clamp(ny, 24, WORLD.height - 24);
  if (car.y > 2246) car.y = 2246;
  // Building hit: stop and bounce back a little, with a skid mark.
  for (const b of world.buildings) {
    if (car.x + 14 > b.x && car.x - 14 < b.x + b.w && car.y + 14 > b.y && car.y - 14 < b.y + b.h) {
      car.x = before.x;
      car.y = before.y;
      if (Math.abs(car.speed) > 120) car.skid = 0.6;
      car.speed *= -0.25;
      break;
    }
  }
  car.brakeLights = throttle < 0 && car.speed > 5;
  if (car.skid > 0) car.skid -= dt;
}

// Steer a chaser (police car) toward a target point, using the same
// driving physics and building collision as every other car.
export function steerToward(world, car, tx, ty, dt) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  const diff = angleDiff(car.angle, want);
  const steer = clamp(diff * 1.8, -1, 1);
  driveCar(world, car, 1, steer, dt);
}
