// NEON VELOCITY: AURA CITY — 3D configuration. All tuning lives here so the
// systems below stay small and readable.
const NV_CONFIG = {
  world: {
    sizeX: 2400, sizeZ: 1800, // city ground plane, centred on 0,0
    roadGap: 200,             // distance between road centrelines
    blockSize: 150,           // building block side
    beachZ: 700,              // sand starts here (south edge)
    oceanZ: 900,              // ocean plane starts here
    marinaX: 1000,            // marina docks on the east edge
  },
  player: {
    walkSpeed: 9, runSpeed: 15, accel: 40, radius: 0.9, hp: 100,
    magSize: 12, reloadTime: 1.1, shootCooldown: 0.16,
  },
  // Four weapons (r1 shows FISTS/.38/SMG/AR-9): fists are free melee,
  // the pistol hits hard with a small mag, the SMG is fast and weak,
  // the AR-9 is the workhorse. Keys 1-4, hold Tab for the wheel.
  weapons: {
    fists: { name: 'FISTS', mag: 0, damage: 22, cooldown: 0.35, melee: true },
    pistol: { name: 'PISTOL', mag: 12, damage: 34, cooldown: 0.16 },
    smg: { name: 'SMG', mag: 32, damage: 14, cooldown: 0.06 },
    ar: { name: 'AR-9', mag: 30, damage: 26, cooldown: 0.10 },
  },
  weaponOrder: ['fists', 'pistol', 'smg', 'ar'],
  car: {
    maxSpeed: 42, reverseSpeed: 14, accel: 26, brake: 40,
    steerMax: 0.55, grip: 6.0, driftGrip: 2.2, radius: 2.6,
  },
  police: {
    maxCruisers: 4, maxOfficers: 6, heliAtWanted: 3, chaseRange: 320,
    maxRoadblocks: 2, roadblockCooldown: 16,
  },
  traffic: { cars: 20, peds: 48, parked: 14 },
  // Garage upgrades: three levels each, bought with mission cash at the
  // garage (press G near AURA MOTORS). Engine adds top speed, armor adds car
  // HP, nitro adds a Shift boost with a meter that refills.
  garage: {
    engine: [1500, 2500, 4000],
    armor: [1200, 2200, 3500],
    nitro: [1800, 3000, 4500],
  },
  missions: [
    {
      id: 'm1', name: 'FAST BREAK', district: 'garage',
      brief: 'Steal the AURA GT prototype from the garage, then lose the heat at the Hideout.',
      reward: 2500,
    },
    {
      id: 'm2', name: 'DATA BREACH', district: 'plaza',
      brief: 'Protect V while she hacks the Central ATM. Survive 90 seconds of security waves.',
      reward: 4000,
    },
    {
      id: 'm3', name: 'GOLDEN HOUR SCORE', district: 'beach',
      brief: 'Sunset escape: drive the beach road to the Marina boat while the heli hunts you.',
      reward: 7500,
    },
    {
      id: 'm4', name: 'COURIER INTERCEPT', district: 'beach',
      brief: 'A rival courier is running Syndicate cash down the beach road. Grab the package and drop it at Neon Plaza.',
      reward: 3500,
    },
    {
      id: 'm5', name: 'VAULT CHAIN', district: 'mixed',
      brief: 'Drain three vault terminals across the city — Central ATM, garage yard, marina dock. Hold E at each one.',
      reward: 5000,
    },
    {
      id: 'm6', name: 'RIVAL RACE', district: 'plaza',
      brief: 'A rival crew driver challenges you to a street race: four checkpoints, first one there wins. Get a car.',
      reward: 5500,
    },
    {
      id: 'm7', name: 'SKYLINE GETAWAY', district: 'beach',
      brief: 'Four stars and nowhere to hide. Survive 60 seconds of heat, then reach the Hideout.',
      reward: 6500,
    },
    {
      id: 'm8', name: 'THE PAYOFF', district: 'marina',
      brief: 'The final job: drive the payoff truck to the Marina boat under five stars. Do not lose the truck.',
      reward: 10000,
    },
    {
      id: 'm9', name: 'NEON HEIST', district: 'plaza',
      brief: 'A four-phase heist at Neon Plaza: scout the panel, kill the security, grab the gold car and run at four stars.',
      reward: 8000,
    },
    {
      id: 'm10', name: 'SYNDICATE FINALE', district: 'marina',
      brief: 'The boss himself. Chase his car through three checkpoints, take down his guards, and deliver his ride to the Marina.',
      reward: 12000,
    },
  ],
  // Names for cars Jax keeps in his garage, picked by colour.
  carNames: [
    'NEON STREAKER', 'VICE VIPER', 'GOLDEN HOUR', 'MIDNIGHT RUNNER',
    'SUNSET BLADE', 'PALM SHADOW', 'CHROME TIDE', 'STATIC KING',
  ],
  // Palette: sun-soaked neon coast.
  colors: {
    sky: 0x2a1350, fog: 0x3a1c5e, sunsetFog: 0x8a3a20,
    sun: 0xffb347, hemiSky: 0x8a7bff, hemiGround: 0x2a1a2e,
    asphalt: 0x1c1c22, sidewalk: 0x3a3a44, grass: 0x2e7d32,
    sand: 0xd9b380, ocean: 0x0e4d7a, neonPink: 0xff2e88, neonCyan: 0x19c3ff,
    building: [0x4a3b6b, 0x5e4a7a, 0x37415e, 0x6b4a5e, 0x2e4a5e, 0x7a5a3a],
  },
};
