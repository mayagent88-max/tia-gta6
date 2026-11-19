// Combat: the player's pistol, enemy fire, bullets and damage. Bullets
// stop at buildings and wreck cars; hitting people has consequences.
import { PLAYER } from './config.js';
import { makeBullet, makeParticle } from './entities.js';
import { angleTo, dist2 } from './random.js';
import { hitsBuilding } from './world.js';
import { addWanted, hurtPlayer } from './police.js';

export function playerShoot(G) {
  const player = G.player;
  if (player.inCar || player.reloading > 0 || player.fireCooldown > 0) return;
  if (player.ammo <= 0) {
    startReload(G);
    return;
  }
  player.ammo -= 1;
  player.fireCooldown = PLAYER.fireCooldown;
  player.firing = true;
  const cam = G.camera;
  const wx = cam.x + G.input.mouseX;
  const wy = cam.y + G.input.mouseY;
  const angle = angleTo(player.x, player.y, wx, wy);
  player.angle = angle;
  G.bullets.push(makeBullet(player.x + Math.cos(angle) * 20, player.y + Math.sin(angle) * 20, angle, 'player', PLAYER.bulletDamage));
  G.particles.push(makeParticle(player.x + Math.cos(angle) * 24, player.y + Math.sin(angle) * 24, '#ffe600', 0.12, Math.cos(angle) * 60, Math.sin(angle) * 60, 5));
  G.sounds.shoot();
  G.shake = Math.max(G.shake, 0.08);
  // Firing in public draws the law, but not on every single shot.
  if (G.wanted === 0 && G.time - G.lastShootCrime > 4) {
    G.lastShootCrime = G.time;
    addWanted(G, 1);
  }
}

export function startReload(G) {
  const player = G.player;
  if (player.reloading > 0 || player.ammo === player.ammoMax) return;
  player.reloading = PLAYER.reloadSeconds;
}

export function updateCombat(G, dt) {
  const player = G.player;
  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
  if (player.reloading > 0) {
    player.reloading -= dt;
    if (player.reloading <= 0) {
      player.ammo = player.ammoMax;
      player.reloading = 0;
    }
  }
  // Slow health regen after five quiet seconds.
  if (player.health > 0 && player.health < PLAYER.health && G.time - player.lastHurtAt > 5) {
    player.health = Math.min(PLAYER.health, player.health + 6 * dt);
  }

  for (const bullet of G.bullets) {
    const step = bullet.speed * dt;
    bullet.x += Math.cos(bullet.angle) * step;
    bullet.y += Math.sin(bullet.angle) * step;
    bullet.travelled += step;
    if (bullet.travelled > bullet.range) {
      bullet.dead = true;
      continue;
    }
    if (hitsBuilding(G.world, bullet.x, bullet.y, 2)) {
      bullet.dead = true;
      G.particles.push(makeParticle(bullet.x, bullet.y, '#c8ccd4', 0.25, 0, -20, 3));
      continue;
    }
    if (bullet.from === 'player') {
      if (hitEnemies(G, bullet)) continue;
      if (hitCars(G, bullet)) continue;
    } else if (dist2(bullet.x, bullet.y, player.x, player.y) < 16 * 16 && !player.inCar) {
      bullet.dead = true;
      hurtPlayer(G, bullet.damage);
    }
  }
  G.bullets = G.bullets.filter((b) => !b.dead);

  // V, the hacker, takes damage from guards during mission 2.
  if (G.v && G.v.health > 0) {
    for (const bullet of G.bullets) {
      if (bullet.from === 'enemy' && dist2(bullet.x, bullet.y, G.v.x, G.v.y) < 16 * 16) {
        bullet.dead = true;
        G.v.health -= bullet.damage;
        G.particles.push(makeParticle(G.v.x, G.v.y, '#ff5c5c', 0.3, 0, -20, 4));
        if (G.v.health <= 0) {
          G.v.health = 0;
          G.missionFailed = 'V went down. The job is blown.';
        }
      }
    }
    G.bullets = G.bullets.filter((b) => !b.dead);
  }

  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
}

function hitEnemies(G, bullet) {
  const targets = [...G.officers, ...G.guards];
  for (const t of targets) {
    if (t.health <= 0) continue;
    if (dist2(bullet.x, bullet.y, t.x, t.y) < 15 * 15) {
      bullet.dead = true;
      t.health -= bullet.damage;
      G.particles.push(makeParticle(bullet.x, bullet.y, '#ff5c5c', 0.3, 0, -20, 4));
      G.sounds.hit();
      if (t.health <= 0) {
        t.health = 0;
        t.state = 'down';
        if (t.kind === 'officer') {
          addWanted(G, 2);
          G.message = 'You dropped a cop. Every unit in the city is coming.';
          G.messageTimer = 3;
        }
      }
      return true;
    }
  }
  return false;
}

function hitCars(G, bullet) {
  for (const car of G.cars) {
    if (car.health <= 0) continue;
    const dx = bullet.x - car.x;
    const dy = bullet.y - car.y;
    const along = Math.abs(dx * Math.cos(car.angle) + dy * Math.sin(car.angle));
    const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along < 26 && across < 15) {
      bullet.dead = true;
      car.health -= bullet.damage;
      G.particles.push(makeParticle(bullet.x, bullet.y, '#ffb13a', 0.3, 0, -20, 4));
      if (car.health <= 0) {
        car.health = 0;
        car.driver = null;
        car.wreck = true;
        G.particles.push(makeParticle(car.x, car.y, '#ff7a00', 0.8, 0, -40, 8));
        G.particles.push(makeParticle(car.x, car.y, '#3a3a3a', 1.4, 0, -60, 10));
        G.sounds.crash();
        G.shake = 0.4;
        if (car === G.player.inCar) {
          G.player.inCar = null;
          G.player.x = car.x + 40;
          G.player.y = car.y + 40;
        }
      }
      return true;
    }
  }
  return false;
}
