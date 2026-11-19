// Screenshot scenes behind ?shot=cover|chase|city|mission. Each one stages
// the live game (real state, real HUD) and raises window.__shotReady once
// the frame has settled. Debug hooks live on window.NV / window.__game.
const NV_SHOTS = {
  params() { return new URLSearchParams(window.location.search); },

  // Pull a few traffic cars and pedestrians into the shot frame so the
  // street reads as a city, not an empty lot. cars: [[x,z,yaw],...] on the
  // road; peds: [[x,z],...] on the sidewalk. Targets are kept nearby so the
  // crowd is still in frame when the shot fires 2.2s later.
  stageCrowd(G, cars, peds) {
    let ci = 0;
    for (const [x, z, yaw] of cars) {
      const car = NV_TRAFFIC.trafficCars[ci % NV_TRAFFIC.trafficCars.length];
      ci += 1;
      car.group.position.set(x, 0, z);
      car.yaw = yaw; car.group.rotation.y = yaw;
      car.speed = 6;
      car.target = { x: x + Math.cos(yaw) * 40, z: z - Math.sin(yaw) * 40 };
    }
    let pi = 0;
    for (const [x, z] of peds) {
      const ped = NV_TRAFFIC.peds[pi % NV_TRAFFIC.peds.length];
      pi += 1;
      ped.pos.set(x, 0, z);
      ped.target = { x: x + G.rng.range(-8, 8), z: z + G.rng.range(-8, 8) };
    }
  },

  maybeStage(G) {
    const shot = this.params().get('shot');
    if (!shot) return false;
    NV_MAIN.startGame(G);
    const L = G.world.locations;
    const setCam = (x, y, z, lx, ly, lz) => {
      G.shotCam = { pos: new THREE.Vector3(x, y, z), look: new THREE.Vector3(lx, ly, lz) };
    };
    if (shot === 'cover') {
      // M1 escape on the beach road at sunset: hero car posed close to the
      // camera, two cruisers tight behind it, city skyline behind.
      G.world.setSunset(true);
      const proto = NV_ENTITIES.makeCar(0xff2e88, 'prototype');
      proto.group.position.set(0, 0, 745);
      proto.yaw = -0.3;
      proto.group.rotation.y = -0.3;
      proto.glow.material.opacity = 0.55;
      G.scene.add(proto.group);
      G.cars.push(proto);
      NV_MAIN.enterCar(G, proto);
      proto.speed = 0;
      NV_POLICE.addWanted(G, 2);
      const c1 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c1.group.position.set(-14, 0, 752); c1.yaw = -0.3; c1.group.rotation.y = -0.3;
      const c2 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c2.group.position.set(-18, 0, 738); c2.yaw = -0.3; c2.group.rotation.y = -0.3;
      [c1, c2].forEach((c) => { G.scene.add(c.group); G.cars.push(c); NV_POLICE.cruisers.push(c); });
      // Beach-road traffic and beachfront pedestrians in frame.
      this.stageCrowd(G, [
        [-46, 724, 0], [-32, 738, 0], [28, 722, Math.PI], [44, 738, Math.PI],
      ], [
        [-52, 694], [-38, 696], [-20, 693], [8, 695], [24, 694], [38, 696], [52, 693], [-8, 697],
      ]);
      G.world.setBeacon(-900, 500, 0x39d353); // Hideout: the objective, so the minimap marker points there
      NV_HUD.setObjective(G, 'Lose the heat! Bring the AURA GT to the Hideout.');
      setCam(14, 3.8, 758, -4, 1.5, 742);
    } else if (shot === 'chase') {
      // Chase posed in profile on a city avenue: the pink prototype with
      // two cruisers tight behind it, streetlights and towers behind.
      const proto = NV_ENTITIES.makeCar(0xff2e88, 'prototype');
      proto.group.position.set(-100, 0, 0);
      proto.yaw = 0;
      proto.glow.material.opacity = 0.55;
      G.scene.add(proto.group);
      G.cars.push(proto);
      NV_MAIN.enterCar(G, proto);
      proto.speed = 0;
      NV_POLICE.addWanted(G, 2);
      G.player.camYaw = 0;
      const c1 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c1.group.position.set(-113, 0, 5); c1.yaw = 0; c1.group.rotation.y = 0;
      const c2 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c2.group.position.set(-117, 0, -5); c2.yaw = 0; c2.group.rotation.y = 0;
      [c1, c2].forEach((c) => { G.scene.add(c.group); G.cars.push(c); NV_POLICE.cruisers.push(c); });
      // Avenue traffic and sidewalk pedestrians in frame.
      this.stageCrowd(G, [
        [-64, -4, Math.PI], [-48, 5, 0], [-142, -6, Math.PI], [-128, 6, 0],
      ], [
        [-70, 14], [-90, -14], [-110, 14], [-130, -14], [-60, -14], [-150, 14],
      ]);
      G.world.setBeacon(-900, 500, 0x39d353);
      NV_HUD.setObjective(G, 'Lose the heat! Bring the AURA GT to the Hideout.');
      setCam(-76, 5, 20, -108, 1.5, 0);
    } else if (shot === 'city') {
      // Cinematic high view over the city toward the beach at sunset.
      G.world.setSunset(true);
      NV_HUD.setObjective(G, 'Press M to start the first mission.');
      setCam(100, 170, 520, -40, 0, -150);
    } else if (shot === 'mission') {
      // M2 hack in progress: V at the ATM, guards closing in.
      NV_MISSIONS.startMission(G, 1);
      const P = G.player;
      P.pos.set(106, 0, -94);
      P.yaw = Math.PI * 0.75;
      P.camYaw = P.yaw;
      NV_MISSIONS.tryInteract(G);
      if (NV_MISSIONS.guards.length === 0) NV_MISSIONS.spawnGuards(G, 2);
      if (G.mission) G.mission.timer = 62;
      // A couple of bystanders near the ATM corner.
      this.stageCrowd(G, [[80, -80, Math.PI / 2], [130, -120, -Math.PI / 2]], [[84, -84], [120, -112], [92, -116]]);
      setCam(124, 7, -76, 100, 2, -100);
    }
    setTimeout(() => { window.__shotReady = true; }, 2200);
    return true;
  },
};
