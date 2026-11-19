// NEON VELOCITY: AURA CITY — world constants, tuning and palette.
// A top-down open-world crime game: a sun-soaked tropical coastal city
// the player explores on foot and by car, with traffic, pedestrians,
// police, missions and a story of its own.
export const WORLD = { width: 3200, height: 2400 };
export const ROAD_WIDTH = 64;
export const ROAD_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_Y = [200, 600, 1000, 1400, 1800, 2200];
export const BEACH_TOP = 2080;
export const OCEAN_TOP = 2260;
export const VIEW = { width: 1280, height: 720 };

// Landmarks: every mission objective points at one of these.
export const LANDMARKS = {
  garage: { x: 1640, y: 1180, label: 'Neon Plaza Garage' },
  hideout: { x: 330, y: 1990, label: 'Hideout' },
  atm: { x: 1470, y: 640, label: 'Central ATM' },
  marina: { x: 3030, y: 2050, label: 'Marina' },
  plaza: { x: 1600, y: 1000, label: 'Neon Plaza' },
};

export const PALETTE = {
  grass: '#3f7d4a',
  grassDark: '#356b3f',
  road: '#23242e',
  roadEdge: '#3a3b47',
  lane: '#e8d44d',
  sidewalk: '#8d8fa3',
  sand: '#e8c98a',
  sandWet: '#d9b878',
  ocean: '#1d6f9e',
  oceanDeep: '#155a82',
  buildingRoof: ['#5b4a7a', '#7a4a5b', '#4a6a7a', '#6a5a3a', '#4a7a5b', '#715a8a'],
  buildingEdge: '#2c2c38',
  neon: ['#ff2e88', '#00e5ff', '#ffe600', '#7cff00', '#ff7a00'],
  palmTrunk: '#7a5a38',
  palmLeaf: '#2f9e4f',
  player: '#ffe600',
  police: '#1e5cff',
  heli: '#3a3f4a',
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 185,
  sprintSpeed: 285,
  health: 100,
  ammo: 12,
  ammoMax: 12,
  reloadSeconds: 1.1,
  fireCooldown: 0.16,
  bulletSpeed: 920,
  bulletRange: 520,
  bulletDamage: 34,
};

export const CAR = {
  // Sports prototype, street cars and police cruisers share this model.
  accel: 620,
  brake: 900,
  reverseAccel: 320,
  maxSpeed: 520,
  sportsMaxSpeed: 660,
  policeMaxSpeed: 580,
  turnRate: 2.6,
  grip: 3.2,
  length: 46,
  width: 22,
};

export const CAR_COLORS = {
  sports: '#ff2e88',
  sedan: ['#c8ccd4', '#4a6a8a', '#8a4a4a', '#d8b13a', '#5a8a4a', '#7a5a9a'],
  taxi: '#ffc81e',
  police: '#e8e8e8',
  truck: '#9a8a6a',
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 22,
  stealCar: 1,
  shoot: 1,
  hitPed: 1,
  killCop: 2,
  // Police cars on the road for each wanted level (index = stars).
  cruisers: [0, 1, 2, 3, 4, 5],
  // Foot officers on the street for each wanted level.
  officers: [0, 0, 1, 2, 3, 4],
  heliAtStars: 3,
};

export const MISSIONS = [
  {
    id: 'fast-break',
    title: 'MISSION 1 — FAST BREAK',
    brief:
      'Jax, the AURA GT prototype is sitting in the Neon Plaza Garage. Steal it, then lose the heat and bring it to the Hideout.',
    reward: 2500,
  },
  {
    id: 'data-breach',
    title: 'MISSION 2 — DATA BREACH',
    brief:
      'V is going to drain the Central ATM. Get her there, then hold the street while she hacks. If V goes down, the job fails.',
    reward: 4000,
  },
  {
    id: 'golden-hour',
    title: 'MISSION 3 — GOLDEN HOUR SCORE',
    brief:
      'One last run before lockdown. Take the getaway car down the beach road to the Marina boat. The whole city will be on you.',
    reward: 7500,
  },
];

export const STORY = {
  title: 'NEON VELOCITY',
  subtitle: 'AURA CITY',
  intro: [
    'Jax owes the Meridian Syndicate a fortune.',
    'V has a plan: three jobs, one sunset, and the debt is gone.',
    'Welcome to Aura City. Try not to get caught.',
  ],
  controls: [
    'WASD / Arrows — move or drive',
    'Mouse — aim    Click — shoot',
    'E — steal / enter / exit car',
    'SHIFT — sprint    R — reload',
    'M — start next mission    P — pause    N — mute',
  ],
};
