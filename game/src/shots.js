// Screenshot scenes behind ?shot=cover|chase|city|mission. Each one sets
// the real game to a fixed, seeded state and steps it forward, so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. No scene is faked: the HUD, the minimap, the
// traffic and the police are all the live game.
import { LANDMARKS } from './config.js';
import { makeCar, makeGuard } from './entities.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { spawnStreetLife, updateTraffic } from './traffic.js';

const STEP = 1 / 60;

function resetForShot(G) {
  G.cars = [];
  G.peds = [];
  G.officers = [];
  G.guards = [];
  G.bullets = [];
  G.particles = [];
  G.heli = null;
  G.v = null;
  G.mission = null;
  G.missionFailed = null;
  G.wanted = 0;
  G.wantedTimer = 0;
  G.spawnCooldown = 0;
  G.ramCooldown = 0;
  G.bustedTimer = 0;
  G.dialog = null;
  G.banner = null;
  G.message = null;
  G.messageTimer = 0;
  G.sunset = false;
  G.player.health = 100;
  G.player.ammo = 12;
  G.player.inCar = null;
  spawnStreetLife(G);
}

function stepWorld(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    G.time += STEP;
    updateTraffic(G, STEP);
  }
}

// The cover: the title screen over the sunset city, the hero car on the
// beach road with the palms and the ocean behind it.
function stageCover(G) {
  resetForShot(G);
  G.sunset = true;
  const car = makeCar('sports', 1500, 2208, 0, '#ff2e88');
  car.prototype = true;
  car.driver = null;
  G.cars.push(car);
  G.player.x = 1560;
  G.player.y = 2160;
  G.player.angle = Math.PI / 2;
  G.camera.x = 1500 - 640;
  G.camera.y = 2208 - 480;
  stepWorld(G, 4);
  return 'title';
}

// A two-star chase: the player in the AURA GT, two cruisers closing in,
// the wanted stars and the minimap on screen.
function stageChase(G) {
  resetForShot(G);
  const car = makeCar('sports', 1400, 1000, 0, '#ff2e88');
  car.prototype = true;
  car.driver = 'player';
  car.speed = 420;
  G.cars.push(car);
  G.player.inCar = car;
  G.player.x = car.x;
  G.player.y = car.y;
  const cop1 = makeCar('police', 1180, 1000, 0, '#e8e8e8');
  cop1.driver = 'police';
  cop1.speed = 380;
  G.cars.push(cop1);
  const cop2 = makeCar('police', 1260, 1064, 0, '#e8e8e8');
  cop2.driver = 'police';
  cop2.speed = 360;
  G.cars.push(cop2);
  addWanted(G, 2);
  G.camera.x = car.x - 640;
  G.camera.y = car.y - 360;
  stepWorld(G, 1.5);
  return 'play';
}

// The living city: traffic on the avenues, pedestrians on the sidewalks,
// palms and neon roofs, the player on foot in the plaza.
function stageCity(G) {
  resetForShot(G);
  G.player.x = 1600;
  G.player.y = 900;
  G.player.angle = Math.PI / 2;
  G.camera.x = 1600 - 640;
  G.camera.y = 900 - 360;
  stepWorld(G, 8);
  return 'play';
}

// Mission 2 in progress: V hacking the Central ATM while security
// closes in, the objective and the minimap route on screen.
function stageMission(G) {
  resetForShot(G);
  startMission(G, 1);
  G.player.x = LANDMARKS.atm.x + 10;
  G.player.y = LANDMARKS.atm.y + 130;
  G.player.angle = -Math.PI / 2;
  // Skip the walk: put V at the ATM and the hack half done.
  G.mission.phase = 'defend';
  G.mission.hackTimer = 45;
  G.mission.wave = 1;
  G.mission.waveTimer = 18;
  G.v = { x: LANDMARKS.atm.x + 30, y: LANDMARKS.atm.y + 10, health: 100, angle: 0, kind: 'v' };
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + 0.5;
    G.guards.push(makeGuard(LANDMARKS.atm.x + Math.cos(angle) * 300, LANDMARKS.atm.y + Math.sin(angle) * 300));
  }
  addWanted(G, 1);
  G.message = 'Defend V — security is coming!';
  G.messageTimer = 3;
  G.camera.x = LANDMARKS.atm.x - 640;
  G.camera.y = LANDMARKS.atm.y - 360;
  stepWorld(G, 2);
  return 'play';
}

// Set `G` to the named scene and return the screen to draw over it.
export function stageShot(name, G) {
  if (name === 'chase') return stageChase(G);
  if (name === 'city') return stageCity(G);
  if (name === 'mission') return stageMission(G);
  return stageCover(G);
}
