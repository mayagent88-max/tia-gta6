// Screenshot scenes behind ?shot=cover|chase|city|mission. Each one stages
// the live game (real state, real HUD) and raises window.__shotReady once
// the frame has settled. Debug hooks live on window.NV / window.__game.
const NV_SHOTS = {
  params() { return new URLSearchParams(window.location.search); },

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
      setCam(124, 7, -76, 100, 2, -100);
    }
    setTimeout(() => { window.__shotReady = true; }, 2200);
    return true;
  },
};
