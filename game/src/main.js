// Boot and the one loop: the 3D city renders behind the title screen, the
// player drives and shoots in third person, and the three jobs run through
// the mission state machine. Debug hooks live on window.NV / window.__game.
const NV_MAIN = {
  startGame(G) {
    NV_AUDIO.ensure(); NV_AUDIO.resume();
    G.screen = 'playing';
    NV_HUD.showScreen(G, 'playing');
    NV_HUD.setObjective(G, G.mission ? G.objective : 'Press M to start the first mission.');
  },
  enterCar(G, car) {
    const P = G.player;
    P.inCar = true; P.car = car; car.driver = 'player';
    P.mesh.group.visible = false;
    NV_AUDIO.setEngine(0.1);
  },
  exitCar(G) {
    const P = G.player;
    if (!P.inCar) return;
    const car = P.car;
    car.driver = null;
    car.speed = 0;
    P.pos.set(car.group.position.x - Math.cos(car.yaw) * 4, 0, car.group.position.z + Math.sin(car.yaw) * 4);
    P.yaw = car.yaw;
    P.mesh.group.visible = true;
    P.inCar = false; P.car = null;
    NV_AUDIO.setEngine(0);
  },
  wasted(G) {
    if (G.screen !== 'playing') return;
    G.screen = 'wasted';
    NV_AUDIO.setSiren(false); NV_AUDIO.setEngine(0);
    NV_HUD.showScreen(G, 'wasted');
  },
  busted(G) {
    if (G.screen !== 'playing') return;
    G.screen = 'busted';
    NV_AUDIO.setSiren(false); NV_AUDIO.setEngine(0);
    NV_HUD.showScreen(G, 'busted');
  },
  ending(G) {
    G.screen = 'ending';
    NV_AUDIO.setSiren(false); NV_AUDIO.setEngine(0);
    NV_HUD.showScreen(G, 'ending');
  },
  resetRun(G) {
    const P = G.player;
    P.hp = 100; P.ammo = NV_CONFIG.player.magSize; P.reloadT = 0;
    P.pos.copy(G.world.locations.spawn);
    P.yaw = -Math.PI / 2; P.camYaw = -Math.PI / 2;
    if (P.inCar) { P.car.driver = null; P.inCar = false; P.car = null; }
    P.mesh.group.visible = true;
    G.wanted = 0;
    NV_MISSIONS.clearField(G);
    G.mission = null;
    G.world.hideBeacon();
    G.world.setSunset(false);
    for (const c of NV_POLICE.cruisers) { G.scene.remove(c.group); const i = G.cars.indexOf(c); if (i >= 0) G.cars.splice(i, 1); }
    NV_POLICE.cruisers = [];
    for (const o of NV_POLICE.officers) G.scene.remove(o.mesh.group);
    NV_POLICE.officers = [];
    if (NV_POLICE.heli) { G.scene.remove(NV_POLICE.heli.group); NV_POLICE.heli = null; }
    NV_AUDIO.setSiren(false);
    G.screen = 'playing';
    NV_HUD.showScreen(G, 'playing');
    NV_HUD.setObjective(G, 'Press M to start the first mission.');
  },
};

function buildGame() {
  const params = new URLSearchParams(window.location.search);
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  const rng = makeRng(seed);
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 2200);
  camera.position.set(0, 12, 60);

  NV_WORLD.build(scene, rng);
  const G = {
    renderer, scene, camera, rng, seed,
    screen: 'title', time: 0, cash: 0, missionsDone: 0,
    wanted: 0, shake: 0, objective: '', mission: null,
    cars: [], world: NV_WORLD, shotCam: null,
    lastShotPos: { x: 0, z: 0 },
  };
  const save = NV_SAVE.load();
  G.cash = save.cash; G.missionsDone = save.missionsDone;

  // Player: Jax, orange shirt, dark pants.
  const person = NV_ENTITIES.makePerson(0xff5a3c, 0x222233);
  person.group.position.copy(NV_WORLD.locations.spawn);
  scene.add(person.group);
  G.player = {
    mesh: person, pos: person.group.position, yaw: -Math.PI / 2, camYaw: -Math.PI / 2,
    camPitch: 0.12, hp: NV_CONFIG.player.hp, inCar: false, car: null,
    ammo: NV_CONFIG.player.magSize, reloadT: 0, shootT: 0, walkPhase: 0,
    lastHurtT: -99, lastShotT: -99, speed: 0,
  };
  G.player.mesh.group.userData.owner = { kind: 'player', ref: G.player };

  NV_TRAFFIC.init(scene, rng, NV_WORLD);
  G.cars.push(...NV_TRAFFIC.trafficCars, ...NV_TRAFFIC.parkedCars);
  // Raycast ownership for cars.
  for (const car of G.cars) car.group.userData.owner = { kind: 'car', ref: car };

  NV_COMBAT.init();
  NV_INPUT.init(canvas);
  NV_HUD.init();
  NV_HUD.showScreen(G, 'title');
  NV_HUD.setObjective(G, 'Press M to start the first mission.');

  document.getElementById('start-btn').addEventListener('click', () => NV_MAIN.startGame(G));
  document.getElementById('resume-btn').addEventListener('click', () => { G.screen = 'playing'; NV_HUD.showScreen(G, 'playing'); });
  document.getElementById('wasted-btn').addEventListener('click', () => NV_MAIN.resetRun(G));
  document.getElementById('busted-btn').addEventListener('click', () => NV_MAIN.resetRun(G));
  document.getElementById('ending-btn').addEventListener('click', () => { NV_SAVE.clear(); NV_MAIN.resetRun(G); G.cash = 0; G.missionsDone = 0; });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.__game = G;
  window.NV = {
    G,
    startMission: (i) => NV_MISSIONS.startMission(G, i),
    setWanted: (n) => { G.wanted = n; NV_AUDIO.setSiren(n > 0); },
    teleport: (x, z) => { G.player.pos.set(x, 0, z); if (G.player.inCar) G.player.car.group.position.set(x, 0, z); },
    enterCar: (car) => NV_MAIN.enterCar(G, car),
  };

  const staged = NV_SHOTS.maybeStage(G);

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    G.time += dt;
    // Keys work on the menu screens too: Enter starts / retries, P resumes.
    if (G.screen === 'title' && NV_INPUT.consume('enter')) NV_MAIN.startGame(G);
    else if (G.screen === 'paused' && NV_INPUT.consume('p')) { G.screen = 'playing'; NV_HUD.showScreen(G, 'playing'); }
    else if ((G.screen === 'wasted' || G.screen === 'busted') && NV_INPUT.consume('enter')) NV_MAIN.resetRun(G);
    else if (G.screen === 'ending' && NV_INPUT.consume('enter')) { NV_SAVE.clear(); NV_MAIN.resetRun(G); G.cash = 0; G.missionsDone = 0; }
    if (G.screen === 'playing') updatePlaying(G, dt);
    else if (G.screen === 'title') {
      // Slow orbit around Neon Plaza behind the title screen.
      const t = G.time * 0.06;
      camera.position.set(Math.sin(t) * 130, 46, Math.cos(t) * 130 + 40);
      camera.lookAt(0, 12, 0);
      NV_WORLD.update(dt);
      NV_TRAFFIC.update(G, dt);
    }
    updateCamera(G, dt);
    NV_WORLD.update(dt);
    NV_HUD.update(G, dt);
    renderer.render(scene, camera);
    NV_INPUT.endFrame();
  }
  requestAnimationFrame(frame);
  return G;
}

function updatePlaying(G, dt) {
  const P = G.player;
  const I = NV_INPUT;
  // Camera aim from the mouse.
  P.camYaw -= I.mouseDX * 0.0032;
  P.camPitch = Math.max(-0.15, Math.min(0.55, P.camPitch + I.mouseDY * 0.0022));
  if (I.consume('enter')) NV_MAIN.startGame(G);
  if (I.consume('p')) {
    G.screen = 'paused';
    NV_HUD.showScreen(G, 'paused');
    return;
  }
  if (I.consume('n')) NV_AUDIO.toggleMute();
  if (I.consume('m')) {
    if (!G.mission && G.missionsDone < 3) NV_MISSIONS.startMission(G, G.missionsDone);
  }
  if (I.consume('r') && !P.inCar && P.ammo < NV_CONFIG.player.magSize && P.reloadT <= 0) {
    P.reloadT = NV_CONFIG.player.reloadTime;
    NV_AUDIO.reload();
  }
  if (I.consume('e')) {
    if (!NV_MISSIONS.tryInteract(G)) {
      if (P.inCar) NV_MAIN.exitCar(G);
      else {
        // Enter the nearest car.
        let best = null, bestD = 5;
        for (const car of G.cars) {
          if (car.wrecked || car.driver) continue;
          const d = Math.hypot(car.group.position.x - P.pos.x, car.group.position.z - P.pos.z);
          if (d < bestD) { bestD = d; best = car; }
        }
        if (best) {
          if (best.kind === 'parked' || best.kind === 'traffic') NV_POLICE.addWanted(G, 1);
          NV_MAIN.enterCar(G, best);
          NV_AUDIO.pickup();
        }
      }
    }
  }
  if (I.clicked && !P.inCar) NV_COMBAT.shoot(G);

  if (P.inCar && P.car) {
    NV_ENTITIES.updateCar(P.car, I, dt, G.world.colliders, G.cars);
    NV_AUDIO.setEngine(Math.abs(P.car.speed) / NV_CONFIG.car.maxSpeed);
    // Camera follows the car heading.
    let dy = P.car.yaw - P.camYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    P.camYaw += dy * Math.min(1, 2.2 * dt);
  } else {
    const axis = I.moveAxis();
    const fwdX = Math.cos(P.camYaw), fwdZ = -Math.sin(P.camYaw);
    const rgtX = Math.sin(P.camYaw), rgtZ = Math.cos(P.camYaw);
    let mx = fwdX * axis.y + rgtX * axis.x;
    let mz = fwdZ * axis.y + rgtZ * axis.x;
    const ml = Math.hypot(mx, mz);
    const speed = I.sprint() ? NV_CONFIG.player.runSpeed : NV_CONFIG.player.walkSpeed;
    if (ml > 0.01) {
      mx /= ml; mz /= ml;
      const wantYaw = Math.atan2(-mz, mx);
      let dy = wantYaw - P.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      P.yaw += Math.max(-8 * dt, Math.min(8 * dt, dy));
      NV_PHYSICS.move(P.pos, NV_CONFIG.player.radius, mx * speed * dt, mz * speed * dt, G.world.colliders);
      P.speed = speed;
      NV_PHYSICS.clampWorld(P.pos, 6);
    } else { P.speed = 0; }
    NV_ENTITIES.walkPerson(P.mesh, P.pos, P.yaw, P.speed, dt);
    NV_AUDIO.setEngine(0);
  }
  NV_TRAFFIC.update(G, dt);
  NV_POLICE.update(G, dt);
  NV_COMBAT.update(G, dt);
  NV_MISSIONS.update(G, dt);
}

function updateCamera(G, dt) {
  const P = G.player;
  const cam = G.camera;
  if (G.shotCam) {
    cam.position.copy(G.shotCam.pos);
    cam.lookAt(G.shotCam.look);
    return;
  }
  if (G.screen === 'title') return; // orbit handled in the loop
  const target = P.inCar && P.car ? P.car.group.position : P.pos;
  const dist = G.camTight ? 9.5 : (P.inCar ? 13.5 : 8.5);
  const height = G.camTight ? 3.8 : (P.inCar ? 5.2 : 4.2);
  const fx = Math.cos(P.camYaw), fz = -Math.sin(P.camYaw);
  const px = Math.sin(P.camPitch);
  const want = new THREE.Vector3(
    target.x - fx * dist,
    target.y + height + px * 6,
    target.z - fz * dist
  );
  const k = 1 - Math.exp(-7 * dt);
  cam.position.lerp(want, k);
  if (G.shake > 0) {
    cam.position.x += (Math.random() - 0.5) * G.shake * 0.7;
    cam.position.y += (Math.random() - 0.5) * G.shake * 0.5;
    cam.position.z += (Math.random() - 0.5) * G.shake * 0.7;
    G.shake = Math.max(0, G.shake - dt * 2.2);
  }
  cam.lookAt(target.x + fx * 6, target.y + 2, target.z - fz * 6);
}

buildGame();
