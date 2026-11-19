// The wanted system: stars for crimes, police cruisers and foot
// officers that chase the player, and the news helicopter at 3 stars.
// Wanted decays when the player stays clean and out of sight.
import { WANTED } from './config.js';
import { makeCar, makeHeli, makeOfficer, steerToward } from './entities.js';
import { dist2 } from './random.js';

export function addWanted(G, stars) {
  if (stars <= 0) return;
  G.wanted = Math.min(WANTED.maxStars, G.wanted + stars);
  G.wantedTimer = WANTED.decaySeconds;
  G.sounds.setSiren(G.wanted > 0);
}

export function clearWanted(G) {
  G.wanted = 0;
  G.wantedTimer = 0;
  G.sounds.setSiren(false);
  for (const car of G.cars) {
    if (car.driver === 'police') car.driver = 'despawn';
  }
  G.officers = [];
  G.heli = null;
}

function spawnCruiser(G) {
  const player = G.player;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  // Appear on a road a little way off, so they drive in instead of popping up.
  const angle = G.rng.range(0, Math.PI * 2);
  const x = Math.max(100, Math.min(3100, px + Math.cos(angle) * 700));
  const y = Math.max(100, Math.min(2200, py + Math.sin(angle) * 700));
  const car = makeCar('police', x, y, 0, '#e8e8e8');
  car.driver = 'police';
  car.speed = 200;
  G.cars.push(car);
  return car;
}

function spawnOfficer(G) {
  const player = G.player;
  const angle = G.rng.range(0, Math.PI * 2);
  const x = Math.max(60, Math.min(3140, player.x + Math.cos(angle) * 420));
  const y = Math.max(60, Math.min(2200, player.y + Math.sin(angle) * 420));
  const officer = makeOfficer(x, y);
  G.officers.push(officer);
  return officer;
}

export function updateWanted(G, dt) {
  const wanted = G.wanted;
  if (wanted > 0) {
    G.wantedTimer -= dt;
    if (G.wantedTimer <= 0) {
      // Staying clean cools the heat off, one star at a time.
      G.wanted -= 1;
      G.wantedTimer = WANTED.decaySeconds;
      if (G.wanted === 0) clearWanted(G);
    }
  }
  const cruisers = G.cars.filter((c) => c.driver === 'police').length;
  const wantCruisers = WANTED.cruisers[wanted] || 0;
  if (cruisers < wantCruisers && G.spawnCooldown <= 0) {
    spawnCruiser(G);
    G.spawnCooldown = 2.5;
  }
  const wantOfficers = WANTED.officers[wanted] || 0;
  if (G.officers.length < wantOfficers && G.spawnCooldown <= 0 && !G.player.inCar) {
    spawnOfficer(G);
    G.spawnCooldown = 2.5;
  }
  if (G.spawnCooldown > 0) G.spawnCooldown -= dt;
  // The helicopter joins the chase at 3 stars.
  if (wanted >= WANTED.heliAtStars && !G.heli) {
    const px = G.player.inCar ? G.player.inCar.x : G.player.x;
    const py = G.player.inCar ? G.player.inCar.y : G.player.y;
    G.heli = makeHeli(px - 200, py - 200);
    G.message = 'News helicopter overhead — the whole city is watching.';
    G.messageTimer = 3;
  }
  if (wanted < WANTED.heliAtStars && G.heli) G.heli = null;
}

export function updatePolice(G, dt) {
  const player = G.player;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  for (const car of G.cars) {
    if (car.driver !== 'police') continue;
    steerToward(G.world, car, px, py, dt);
    // Ram the player's car: a hard hit slows them and hurts the player.
    if (player.inCar && dist2(car.x, car.y, px, py) < 55 * 55) {
      if (Math.abs(car.speed) > 150 && G.ramCooldown <= 0) {
        G.ramCooldown = 1;
        hurtPlayer(G, 8);
        player.inCar.speed *= 0.6;
        G.sounds.crash();
        G.shake = 0.35;
      }
    }
    // A cruiser that flips onto the beach road or stalls gets replaced.
    if (dist2(car.x, car.y, px, py) > 1600 * 1600) {
      car.driver = 'despawn';
    }
  }
  // Cruisers that drove off are removed.
  G.cars = G.cars.filter((c) => c.driver !== 'despawn');
  if (G.ramCooldown > 0) G.ramCooldown -= dt;

  for (const officer of G.officers) {
    const d = Math.sqrt(dist2(officer.x, officer.y, px, py));
    if (d > 520) {
      // Too far behind: the officer gives up and leaves.
      officer.state = 'leave';
    }
    if (officer.state === 'leave') {
      officer.angle = Math.atan2(officer.y - py, officer.x - px);
      officer.x += Math.cos(officer.angle) * officer.speed * dt;
      officer.y += Math.sin(officer.angle) * officer.speed * dt;
      continue;
    }
    officer.angle = Math.atan2(py - officer.y, px - officer.x);
    if (d > 40) {
      officer.x += Math.cos(officer.angle) * officer.speed * dt;
      officer.y += Math.sin(officer.angle) * officer.speed * dt;
    }
    // Officers shoot when close enough and the player is on foot.
    officer.fireCooldown -= dt;
    if (d < 340 && !player.inCar && officer.fireCooldown <= 0) {
      officer.fireCooldown = 1.4;
      fireAt(G, officer.x, officer.y, px, py, 'enemy', 7);
    }
    // An officer who catches the player on foot makes the arrest.
    if (!player.inCar && d < 26) {
      G.bustedTimer += dt;
      if (G.bustedTimer > 1.2) {
        G.screen = 'busted';
        G.sounds.setSiren(false);
        G.sounds.missionFail();
      }
    }
  }
  G.officers = G.officers.filter((o) => o.state !== 'leave' || dist2(o.x, o.y, px, py) < 900 * 900);
  if (player.inCar || G.officers.every((o) => Math.sqrt(dist2(o.x, o.y, px, py)) > 30)) {
    G.bustedTimer = 0;
  }

  if (G.heli) {
    const heli = G.heli;
    heli.orbitAngle += dt * 0.5;
    const tx = px + Math.cos(heli.orbitAngle) * 220;
    const ty = py + Math.sin(heli.orbitAngle) * 220 - 60;
    heli.x += (tx - heli.x) * Math.min(1, dt * 1.5);
    heli.y += (ty - heli.y) * Math.min(1, dt * 1.5);
    heli.rotor += dt * 30;
    heli.angle = Math.atan2(py - heli.y, px - heli.x);
  }
}

export function hurtPlayer(G, amount) {
  const player = G.player;
  if (player.health <= 0) return;
  player.health -= amount;
  player.hurtFlash = 0.3;
  player.lastHurtAt = G.time;
  G.sounds.hit();
  G.shake = Math.max(G.shake, 0.2);
  if (player.health <= 0) {
    player.health = 0;
    G.screen = 'wasted';
    G.sounds.setSiren(false);
    G.sounds.setEngine(false, 0);
    G.sounds.missionFail();
  }
}

// An enemy shot from (x, y) toward (tx, ty) with spread.
import { makeBullet } from './entities.js';

export function fireAt(G, x, y, tx, ty, from, damage) {
  const spread = 0.12;
  const angle = Math.atan2(ty - y, tx - x) + (G.rng.next() - 0.5) * spread * 2;
  G.bullets.push(makeBullet(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, angle, from, damage));
  G.sounds.enemyShoot();
}
