// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. Screens:
// title, play, paused, wasted, busted, ending.
//
// ?seed=N fixes the city. ?shot=cover|chase|city|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { LANDMARKS, PLAYER, STORY, VIEW, WORLD } from './config.js';
import { clamp, makeRng } from './random.js';
import { buildWorld } from './world.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { driveCar, makePlayer, moveWithBuildings } from './entities.js';
import { spawnStreetLife, updateTraffic } from './traffic.js';
import { addWanted, clearWanted, updatePolice, updateWanted } from './police.js';
import { playerShoot, startReload, updateCombat } from './combat.js';
import { missionMarker, onEnterCar, startMission, updateMission } from './missions.js';
import { createRenderer } from './render.js';
import { drawHud, drawPanel } from './hud.js';
import { loadSave } from './save.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function createGame(seedValue) {
  const save = loadSave();
  const G = {
    seed: seedValue,
    rng: makeRng(seedValue),
    world: buildWorld(seedValue),
    player: makePlayer(LANDMARKS.plaza.x, LANDMARKS.plaza.y + 260),
    cars: [],
    peds: [],
    officers: [],
    guards: [],
    bullets: [],
    particles: [],
    heli: null,
    v: null,
    prototypeCar: null,
    getawayCar: null,
    wanted: 0,
    wantedTimer: 0,
    spawnCooldown: 0,
    ramCooldown: 0,
    bustedTimer: 0,
    lastShootCrime: -99,
    cash: save.cash,
    missionsDone: save.missionsDone,
    save,
    mission: null,
    missionFailed: null,
    screen: 'title',
    time: 0,
    camera: { x: 960, y: 640 },
    sunset: false,
    input: new Input(canvas),
    sounds: new SoundBank(),
    dialog: null,
    banner: null,
    message: null,
    messageTimer: 0,
    marker: null,
    shake: 0,
  };
  spawnStreetLife(G);
  return G;
}

const G = createGame(seed);
window.__game = G;

function announce(message) {
  status.textContent = message;
}

function nearestEnterableCar(G) {
  const player = G.player;
  let best = null;
  let bestD = 70 * 70;
  for (const car of G.cars) {
    if (car.wreck || car.health <= 0 || car.driver === 'player') continue;
    const dx = car.x - player.x;
    const dy = car.y - player.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterOrExitCar(G) {
  const player = G.player;
  if (player.inCar) {
    const car = player.inCar;
    car.driver = null;
    player.inCar = null;
    player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
    player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
    G.sounds.setEngine(false, 0);
    return;
  }
  const car = nearestEnterableCar(G);
  if (!car) return;
  if (!car.stolen && car.driver !== 'player') {
    car.stolen = true;
    if (car.driver === 'police') addWanted(G, 2);
    else if (!car.prototype && !car.getaway) addWanted(G, 1);
  }
  car.driver = 'player';
  player.inCar = car;
  player.x = car.x;
  player.y = car.y;
  onEnterCar(G, car);
}

function updatePlayer(G, dt) {
  const player = G.player;
  const input = G.input;
  if (player.inCar) {
    const car = player.inCar;
    const throttle = (input.down('w') || input.down('arrowup') ? 1 : 0) - (input.down('s') || input.down('arrowdown') ? 1 : 0);
    const steer = (input.down('d') || input.down('arrowright') ? 1 : 0) - (input.down('a') || input.down('arrowleft') ? 1 : 0);
    driveCar(G.world, car, throttle, steer, dt);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    G.sounds.setEngine(true, Math.abs(car.speed) / car.maxSpeed);
    // Bump into other cars: slow down and spark.
    for (const other of G.cars) {
      if (other === car || other.health <= 0) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      if (dx * dx + dy * dy < 46 * 46) {
        if (Math.abs(car.speed) > 200) {
          G.sounds.crash();
          G.shake = Math.max(G.shake, 0.3);
        }
        car.speed *= 0.5;
        other.speed *= 0.5;
        car.x -= dx * 0.02;
        car.y -= dy * 0.02;
      }
    }
    if (input.wasPressed('e')) enterOrExitCar(G);
    return;
  }
  G.sounds.setEngine(false, 0);
  const axes = input.axes();
  const sprint = input.down('shift');
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  let dx = axes.x * speed * dt;
  let dy = axes.y * speed * dt;
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  const pos = moveWithBuildings(G.world, player.x, player.y, dx, dy, player.radius);
  player.x = pos.x;
  player.y = pos.y;
  // Aim at the mouse in world space.
  const wx = G.camera.x + input.mouseX;
  const wy = G.camera.y + input.mouseY;
  player.angle = Math.atan2(wy - player.y, wx - player.x);
  if (input.mouseDown) playerShoot(G);
  if (input.wasPressed('e')) enterOrExitCar(G);
  if (input.wasPressed('r')) startReload(G);
}

function updateCamera(G, dt) {
  const player = G.player;
  const tx = (player.inCar ? player.inCar.x : player.x) - VIEW.width / 2;
  const ty = (player.inCar ? player.inCar.y : player.y) - VIEW.height / 2;
  const k = Math.min(1, dt * 6);
  G.camera.x = clamp(G.camera.x + (tx - G.camera.x) * k, 0, WORLD.width - VIEW.width);
  G.camera.y = clamp(G.camera.y + (ty - G.camera.y) * k, 0, WORLD.height - VIEW.height);
}

function stepGame(G, dt) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2);
  if (G.messageTimer > 0) G.messageTimer -= dt;
  if (G.dialog && G.dialog.timer > 0) G.dialog.timer -= dt;
  if (G.banner && G.banner.timer > 0) G.banner.timer -= dt;
  G.marker = missionMarker(G);
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updateWanted(G, dt);
  updatePolice(G, dt);
  updateCombat(G, dt);
  updateMission(G, dt);
  updateCamera(G, dt);
  G.player.firing = false;
}

function runShot(name) {
  const screen = stageShot(name, G);
  G.screen = screen;
  G.marker = missionMarker(G);
  const renderer = createRenderer(canvas);
  let painted = 0;
  function paint() {
    const view = renderer.draw(G, screen);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === 'title') drawPanel(G, ctx, 'title');
    else drawHud(G, ctx);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const renderer = createRenderer(canvas);
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    G.screen = 'play';
    G.sounds.unlock();
    announce(`${STORY.title}. Press M to start your next job.`);
  }

  function restartAfterEnd() {
    const player = G.player;
    player.health = PLAYER.health;
    player.ammo = PLAYER.ammo;
    player.inCar = null;
    player.x = LANDMARKS.hideout.x;
    player.y = LANDMARKS.hideout.y;
    clearWanted(G);
    G.mission = null;
    G.guards = [];
    G.v = null;
    G.sunset = false;
    G.screen = 'play';
    announce('Back on the street. Press M for your next job.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += dt;
    last = now;
    const input = G.input;
    const screen = G.screen;

    if (screen === 'title') {
      // The title floats over a slow pan of the living city.
      G.time += dt;
      G.camera.x = 900 + Math.sin(G.time * 0.06) * 700;
      G.camera.y = 800 + Math.cos(G.time * 0.045) * 350;
      updateTraffic(G, STEP);
      if (input.wasPressed('enter') || input.mouseClicked) {
        G.sounds.unlock();
        startGame();
      }
    } else if (screen === 'play') {
      if (input.wasPressed('p') || input.wasPressed('escape')) {
        G.screen = 'paused';
        G.sounds.setEngine(false, 0);
        G.sounds.setSiren(false);
        announce('Paused.');
      } else {
        if (input.wasPressed('m') && !G.mission && G.missionsDone < 3) {
          startMission(G, G.missionsDone);
        }
        if (input.wasPressed('n')) {
          const muted = G.sounds.toggleMute();
          G.message = muted ? 'Sound muted.' : 'Sound on.';
          G.messageTimer = 1.5;
        }
        while (accumulator >= STEP && G.screen === 'play') {
          stepGame(G, STEP);
          accumulator -= STEP;
        }
      }
    } else if (screen === 'paused') {
      accumulator = 0;
      if (input.wasPressed('p') || input.wasPressed('escape') || input.wasPressed('enter')) {
        G.screen = 'play';
        if (G.wanted > 0) G.sounds.setSiren(true);
        announce('Playing.');
      }
    } else if (screen === 'wasted' || screen === 'busted' || screen === 'ending') {
      accumulator = 0;
      if (input.wasPressed('r') || input.wasPressed('enter')) restartAfterEnd();
    }

    const view = renderer.draw(G, G.screen);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (G.screen === 'play') drawHud(G, ctx);
    else if (G.screen !== 'play') drawPanel(G, ctx, G.screen);
    input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') {
      G.screen = 'paused';
      G.sounds.setEngine(false, 0);
      G.sounds.setSiren(false);
      announce('Paused.');
    }
  });

  announce(`${STORY.title} — ${STORY.subtitle}. Press Enter or click to start.`);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
