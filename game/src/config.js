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
  car: {
    maxSpeed: 42, reverseSpeed: 14, accel: 26, brake: 40,
    steerMax: 0.55, grip: 6.0, driftGrip: 2.2, radius: 2.6,
  },
  police: { maxCruisers: 4, maxOfficers: 6, heliAtWanted: 3, chaseRange: 320 },
  traffic: { cars: 14, peds: 36, parked: 10 },
  missions: [
    {
      id: 'm1', name: 'FAST BREAK',
      brief: 'Steal the AURA GT prototype from the garage, then lose the heat at the Hideout.',
      reward: 2500,
    },
    {
      id: 'm2', name: 'DATA BREACH',
      brief: 'Protect V while she hacks the Central ATM. Survive 90 seconds of security waves.',
      reward: 4000,
    },
    {
      id: 'm3', name: 'GOLDEN HOUR SCORE',
      brief: 'Sunset escape: drive the beach road to the Marina boat while the heli hunts you.',
      reward: 7500,
    },
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
