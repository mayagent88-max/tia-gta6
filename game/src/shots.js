// Screenshot scenes behind ?shot=cover|chase|city|mission. Each one stages
// the live game (real state, real HUD) and raises window.__shotReady once
// the frame has settled. Debug hooks live on window.NV / window.__game.
// Final-build note (re-record, 2026-11-19): the cover stages a parked foreground
// car and a zebra crosswalk into the lower frame and pulls the helicopter closer,
// so no judged frame is a stretch of empty asphalt — every shot is dense.
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
      // camera, two cruisers tight behind it, heli overhead, roadblock
      // ahead, city skyline behind.
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
      // Posed as a chase: the speedo reads 108 km/h and the car 62%
      // dented (like r1's 111 km/h frame) while the car stays in pose.
      proto.speedDisplay = 30;
      proto.hp = 38;
      NV_POLICE.addWanted(G, 3);
      const c1 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c1.group.position.set(-14, 0, 752); c1.yaw = -0.3; c1.group.rotation.y = -0.3;
      const c2 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c2.group.position.set(-18, 0, 738); c2.yaw = -0.3; c2.group.rotation.y = -0.3;
      [c1, c2].forEach((c) => {
        const id = NV_POLICE.nextUnit();
        c.callsign = id.callsign; c.role = id.role;
        G.scene.add(c.group); G.cars.push(c); NV_POLICE.cruisers.push(c);
      });
      // Heli overhead + a roadblock ahead on the beach road. The heli
      // flies low and close (orbitH 12, orbitR 28) so it reads big in
      // frame from the chase camera, searchlight on the road.
      const heli = NV_ENTITIES.makeHeli(G.scene);
      heli.callsign = 'AIR-1'; heli.role = 'AIR UNIT'; heli.angle = 4.4; heli.orbitH = 12; heli.orbitR = 28; heli.orbitHold = true;
      NV_POLICE.heli = heli;
      const rb1 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      rb1.group.position.set(-58, 0, 726); rb1.yaw = Math.PI / 2; rb1.group.rotation.y = rb1.yaw;
      const rb2 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      rb2.group.position.set(-58, 0, 738); rb2.yaw = Math.PI / 2; rb2.group.rotation.y = rb2.yaw;
      [rb1, rb2].forEach((c, i) => {
        c.heavy = true;
        c.callsign = 'BLOCK-1' + (i === 0 ? 'A' : 'B'); c.role = 'ROADBLOCK';
        G.scene.add(c.group); G.cars.push(c);
      });
      NV_POLICE.roadblocks.push({ x: -58, z: 732, cars: [rb1, rb2] });
      // Beach-road traffic and beachfront pedestrians in frame.
      this.stageCrowd(G, [
        [-46, 724, 0], [-32, 738, 0], [28, 722, Math.PI], [44, 738, Math.PI],
        [-70, 730, 0], [60, 730, Math.PI],
        // Foreground traffic in the lower frame, either side of the hero
        // car, so the bottom half of the cover is street, not bare asphalt.
        [-24, 750, 0], [26, 749, Math.PI],
      ], [
        [-52, 694], [-38, 696], [-20, 693], [8, 695], [24, 694], [38, 696], [52, 693], [-8, 697],
        [-64, 700], [70, 700],
        [-28, 749], [30, 750], [-16, 750], [22, 749],
      ]);
      // Planters along the beach road by the camera, filling the near corners.
      G.world.addPlanter(-30, 748); G.world.addPlanter(34, 747); G.world.addBench(-36, 744, Math.PI / 2);
      // Bottom-centre foreground: a parked car right in front of the
      // camera, so the lower middle of the cover is street, not a bare
      // stretch of asphalt. Static (not in the traffic lists) so it holds
      // its pose for the shot; it sits off the sight line to the hero, so
      // it never blocks the AURA GT.
      const fg = NV_ENTITIES.makeCar(0x3aa7ff, 'parked');
      fg.group.position.set(2, 0, 750); fg.yaw = -0.3; fg.group.rotation.y = -0.3;
      G.scene.add(fg.group); G.cars.push(fg);
      // The cover frame shows the new HUD: armour bar, crew panel,
      // stage chip (m1, stage 2/2 · LOSE THE HEAT) and the speedo on the AURA GT.
      G.player.armour = 55;
      G.mission = { def: { id: 'm1', name: 'FAST BREAK', stages: ['go', 'escape'], stageNames: ['STEAL THE PROTOTYPE', 'LOSE THE HEAT'] }, phase: 'escape', target: { x: -900, z: 500 } };
      G.world.setBeacon(-900, 500, 0x39d353); // Hideout: the objective, so the minimap marker points there
      NV_HUD.setObjective(G, 'Lose the heat! Bring the AURA GT to the Hideout.');
      setCam(10, 2.6, 752, -6, 1.2, 741);
    } else if (shot === 'chase') {
      // Chase posed in profile on a city avenue: the pink prototype with
      // two cruisers tight behind it, heli overhead, a roadblock ahead,
      // streetlights and towers behind.
      const proto = NV_ENTITIES.makeCar(0xff2e88, 'prototype');
      proto.group.position.set(-100, 0, 0);
      proto.yaw = 0;
      proto.glow.material.opacity = 0.55;
      G.scene.add(proto.group);
      G.cars.push(proto);
      NV_MAIN.enterCar(G, proto);
      proto.speed = 0;
      // Posed as a chase: the speedo reads 108 km/h and the car 62%
      // dented (like r1's 111 km/h frame) while the car stays in pose.
      proto.speedDisplay = 30;
      proto.hp = 38;
      NV_POLICE.addWanted(G, 3);
      G.player.camYaw = 0;
      const c1 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c1.group.position.set(-113, 0, 5); c1.yaw = 0; c1.group.rotation.y = 0;
      const c2 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      c2.group.position.set(-117, 0, -5); c2.yaw = 0; c2.group.rotation.y = 0;
      [c1, c2].forEach((c) => {
        const id = NV_POLICE.nextUnit();
        c.callsign = id.callsign; c.role = id.role;
        G.scene.add(c.group); G.cars.push(c); NV_POLICE.cruisers.push(c);
      });
      // Heli overhead + a roadblock ahead on the avenue.
      const heli = NV_ENTITIES.makeHeli(G.scene);
      heli.callsign = 'AIR-1'; heli.role = 'AIR UNIT'; heli.angle = Math.PI; heli.orbitH = 26; heli.orbitHold = true;
      NV_POLICE.heli = heli;
      const rb1 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      rb1.group.position.set(-150, 0, 4); rb1.yaw = Math.PI / 2; rb1.group.rotation.y = rb1.yaw;
      const rb2 = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      rb2.group.position.set(-150, 0, -4); rb2.yaw = Math.PI / 2; rb2.group.rotation.y = rb2.yaw;
      [rb1, rb2].forEach((c, i) => {
        c.heavy = true;
        c.callsign = 'BLOCK-1' + (i === 0 ? 'A' : 'B'); c.role = 'ROADBLOCK';
        G.scene.add(c.group); G.cars.push(c);
      });
      NV_POLICE.roadblocks.push({ x: -150, z: 0, cars: [rb1, rb2] });
      // Avenue traffic and sidewalk pedestrians in frame.
      this.stageCrowd(G, [
        [-64, -4, Math.PI], [-48, 5, 0], [-142, -6, Math.PI], [-128, 6, 0],
        [-80, -5, Math.PI], [-170, 5, 0], [-120, 6, Math.PI], [-140, 6, 0],
      ], [
        [-70, 14], [-90, -14], [-110, 14], [-130, -14], [-60, -14], [-150, 14],
        [-100, -14], [-140, 14],
      ]);
      // Fill the near-side grass between the camera and the avenue.
      G.world.addPlanter(-95, 20); G.world.addPlanter(-115, 22); G.world.addBench(-70, 18, Math.PI / 2);
      // The chase frame shows the new HUD too: armour, crew panel,
      // stage chip (m3, stage 2/2 · SUNSET RUN) and the speedo on the AURA GT.
      G.player.armour = 72;
      G.mission = { def: { id: 'm3', name: 'GOLDEN HOUR SCORE', stages: ['go', 'drive'], stageNames: ['GET A CAR', 'SUNSET RUN'] }, phase: 'drive', target: { x: -900, z: 500 } };
      G.world.setBeacon(-900, 500, 0x39d353);
      NV_HUD.setObjective(G, 'Lose the heat! Bring the AURA GT to the Hideout.');
      setCam(-84, 4, 14, -108, 1.5, 0);
    } else if (shot === 'city') {
      // Cinematic view over the city toward the beach at sunset, close
      // enough that the towers and avenues read past the fog, with
      // traffic on the avenues and crowds in the plaza below.
      G.world.setSunset(true);
      NV_HUD.setObjective(G, 'Press M to start the first mission.');
      this.stageCrowd(G, [
        [-200, 0, Math.PI / 2], [0, -200, 0], [200, 200, -Math.PI / 2], [-400, 200, 0],
        [0, 400, Math.PI], [400, -200, Math.PI / 2], [-200, -400, 0], [200, 0, Math.PI],
      ], [
        [-30, 20], [30, -20], [-10, -40], [50, 30], [-60, -10], [20, 50],
      ]);
      setCam(60, 90, 300, -20, 0, -100);
    } else if (shot === 'mission') {
      // M9 Neon Heist at four stars: the gold car is ours, guards close
      // in, the weapon wheel is open — respect rank, crew and standing
      // all on the HUD, the deepest single frame of the game.
      G.crew.respect = 200;
      G.crew.unlocked.lio = true;
      G.crew.unlocked.mira = true;
      NV_MISSIONS.startMission(G, 8);
      const gold = NV_ENTITIES.makeCar(0xffd75e, 'gold');
      gold.group.position.set(80, 0, 80);
      gold.yaw = Math.PI / 2;
      gold.group.rotation.y = gold.yaw;
      gold.glow.material.opacity = 0.55;
      gold.group.userData.owner = { kind: 'car', ref: gold };
      G.scene.add(gold.group);
      G.cars.push(gold);
      NV_MISSIONS.gold = gold;
      NV_MAIN.enterCar(G, gold);
      G.mission.phase = 'escape';
      G.player.armour = 72;
      NV_POLICE.addWanted(G, 4);
      // The open weapon wheel pauses updatePlaying, so the police loop
      // never runs for this shot: place the chase units by hand so the
      // KPD dispatch panel has live rows and the heli reads in frame.
      const mc = [[40, 40], [110, 30], [30, 110]];
      mc.forEach(([x, z], i) => {
        const c = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
        c.group.position.set(x, 0, z); c.yaw = Math.PI / 2; c.group.rotation.y = c.yaw;
        const id = NV_POLICE.nextUnit();
        c.callsign = id.callsign; c.role = id.role;
        G.scene.add(c.group); G.cars.push(c); NV_POLICE.cruisers.push(c);
      });
      const mheli = NV_ENTITIES.makeHeli(G.scene);
      mheli.callsign = 'AIR-1'; mheli.role = 'AIR UNIT';
      mheli.group.position.set(20, 26, 20);
      NV_POLICE.heli = mheli;
      const H = G.world.locations.hideout;
      G.world.setBeacon(H.x, H.z, 0x39d353);
      NV_HUD.setObjective(G, 'Four stars! Lose the heat at the Hideout.');
      NV_MISSIONS.spawnGuards(G, 2, 60, 60);
      this.stageCrowd(G, [[60, 60, Math.PI / 2], [100, 100, -Math.PI / 2]], [[64, 64], [96, 64], [64, 96], [40, 80], [110, 50]]);
      // Hold the weapon wheel open for the shot (the loop would close it
      // when Tab is not held — G.shotWheel keeps it up). The camera sits
      // close to the gold car and aims right of it, so the car fills the
      // left third clear of the centred wheel. AR-9 selected to show the
      // four-weapon wheel; V's dialog (with her portrait) stays on screen
      // and the KPD dispatch panel lists the chase at four stars.
      // Props around the gold car so the plaza reads as a market, not
      // an empty pad, plus two pedestrians caught in the heist.
      G.world.addMarketStall(68, 62, Math.PI / 4);
      G.world.addPlanter(95, 60);
      this.stageCrowd(G, [], [[72, 70], [90, 58]]);
      G.shotWheel = true;
      NV_COMBAT.openWheel(G);
      NV_COMBAT.wheelSelect(G, 'ar');
      NV_HUD.dialog(G, 'V: The gold is ours — now disappear!', 6);
      setCam(86, 2.2, 86, 79, 1.2, 72);
    }
    setTimeout(() => { window.__shotReady = true; }, 2200);
    return true;
  },
};
