// Street life: traffic cars that drive the road grid and pedestrians who
// walk the sidewalks and flee gunfire. Parked cars wait to be stolen.
// Final-build note (re-record, 2026-11-19): density is up for the final build —
// 20 traffic cars, 48 pedestrians, 14 parked cars — so the streets and the cover
// frame read as a lived-in city, not an empty grid.
const NV_TRAFFIC = {
  trafficCars: [], peds: [], parkedCars: [],
  palette: [0xe8e8e8, 0x2a6fd6, 0xd62a2a, 0x2ad67a, 0xe8c832, 0x7a4ad6, 0xd67a2a, 0x4a4a55],

  init(scene, rng, world) {
    // Traffic cars on the road grid.
    for (let i = 0; i < NV_CONFIG.traffic.cars; i += 1) {
      const car = NV_ENTITIES.makeCar(rng.pick(this.palette), 'traffic');
      const p = rng.pick(world.roadPoints);
      car.group.position.set(p.x, 0, p.z);
      car.yaw = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      car.group.rotation.y = car.yaw;
      car.speed = rng.range(8, 13);
      car.target = rng.pick(world.roadPoints);
      scene.add(car.group);
      this.trafficCars.push(car);
    }
    // Parked cars along roadsides.
    for (let i = 0; i < NV_CONFIG.traffic.parked; i += 1) {
      const car = NV_ENTITIES.makeCar(rng.pick(this.palette), 'parked');
      const p = rng.pick(world.roadPoints);
      const along = rng.chance(0.5);
      car.group.position.set(p.x + (along ? rng.range(-40, 40) : 13), 0, p.z + (along ? 13 : rng.range(-40, 40)));
      car.yaw = along ? 0 : Math.PI / 2;
      car.group.rotation.y = car.yaw;
      scene.add(car.group);
      this.parkedCars.push(car);
    }
    // Pedestrians on the sidewalks.
    for (let i = 0; i < NV_CONFIG.traffic.peds; i += 1) {
      const person = NV_ENTITIES.makePerson(rng.pick([0xd62a6f, 0x2a6fd6, 0xe8c832, 0x7a4ad6, 0x2ad67a]), 0x2a2a33);
      const p = rng.pick(world.roadPoints);
      person.group.position.set(p.x + rng.range(-30, 30), 0, p.z + rng.range(-30, 30));
      scene.add(person.group);
      this.peds.push({
        mesh: person, pos: person.group.position, yaw: rng.range(0, Math.PI * 2),
        speed: rng.range(1.8, 3.2), target: null, fleeT: 0, phase: rng.range(0, 6),
      });
    }
  },

  update(G, dt) {
    const world = G.world;
    const playerPos = G.player.inCar ? G.player.car.group.position : G.player.pos;
    // Traffic: drive toward the current intersection, pick a new one on arrival.
    for (const car of this.trafficCars) {
      if (car.wrecked) {
        // A wrecked traffic car is towed away and a fresh one rolls in,
        // so the streets never empty out after a shootout.
        car.respawnT = (car.respawnT || 0) + dt;
        if (car.respawnT > 30) {
          car.respawnT = 0;
          car.wrecked = false;
          car.hp = 100;
          car.speed = 8;
          const p = G.rng.pick(world.roadPoints);
          car.group.position.set(p.x, 0, p.z);
          car.target = G.rng.pick(world.roadPoints);
          // Paint it back: explosions darken every part's material.
          if (car.paintMat) car.paintMat.color.setHex(car.color);
          if (car.darkMat) car.darkMat.color.setHex(0x111116);
          if (car.wheelMat) car.wheelMat.color.setHex(0x0a0a0a);
          if (car.headMat) car.headMat.color.setHex(0xfff2c0);
          if (car.tailMat) car.tailMat.color.setHex(0xff2020);
          if (car.glowMat) { car.glowMat.color.setHex(car.color); car.glowMat.opacity = 0.22; }
        }
        continue;
      }
      const dx = car.target.x - car.group.position.x;
      const dz = car.target.z - car.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6) { car.target = G.rng.pick(world.roadPoints); continue; }
      // Slow down for a car directly ahead.
      let slow = false;
      for (const o of G.cars) {
        if (o === car || o.wrecked) continue;
        const ox = o.group.position.x - car.group.position.x;
        const oz = o.group.position.z - car.group.position.z;
        const od = Math.hypot(ox, oz);
        if (od < 14) {
          const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw);
          if ((ox * fx + oz * fz) / od > 0.6) { slow = true; break; }
        }
      }
      const top = slow ? 2 : 12;
      NV_ENTITIES.driveToward(car, car.target.x, car.target.z, dt, top, world.colliders, G.cars);
      // Recycle far-away traffic near the player so streets stay alive.
      const pd = Math.hypot(car.group.position.x - playerPos.x, car.group.position.z - playerPos.z);
      if (pd > 550) {
        const p = G.rng.pick(world.roadPoints);
        car.group.position.set(p.x, 0, p.z);
        car.target = G.rng.pick(world.roadPoints);
      }
    }
    // Pedestrians: stroll to random nearby points, flee gunfire.
    for (const ped of this.peds) {
      if (ped.fleeT > 0) ped.fleeT -= dt;
      if (!ped.target || Math.hypot(ped.target.x - ped.pos.x, ped.target.z - ped.pos.z) < 3) {
        const p = G.rng.pick(world.roadPoints);
        ped.target = { x: p.x + G.rng.range(-40, 40), z: p.z + G.rng.range(-40, 40) };
      }
      let tx = ped.target.x, tz = ped.target.z;
      let spd = ped.speed;
      if (ped.fleeT > 0) {
        tx = ped.pos.x + (ped.pos.x - G.lastShotPos.x);
        tz = ped.pos.z + (ped.pos.z - G.lastShotPos.z);
        spd = 7;
      }
      const dx = tx - ped.pos.x, dz = tz - ped.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5) {
        const wantYaw = Math.atan2(-dz, dx);
        let dy = wantYaw - ped.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        ped.yaw += Math.max(-3 * dt, Math.min(3 * dt, dy));
        const step = spd * dt;
        const nx = ped.pos.x + Math.cos(ped.yaw) * step;
        const nz = ped.pos.z - Math.sin(ped.yaw) * step;
        if (!NV_PHYSICS.hitsAny(nx, nz, 0.6, world.colliders)) { ped.pos.x = nx; ped.pos.z = nz; }
        NV_PHYSICS.clampWorld(ped.pos, 6);
      }
      NV_ENTITIES.walkPerson(ped.mesh, ped.pos, ped.yaw, spd, dt);
    }
  },

  // Gunfire nearby makes pedestrians run.
  scare(x, z, radius) {
    for (const ped of this.peds) {
      if (Math.hypot(ped.pos.x - x, ped.pos.z - z) < radius) ped.fleeT = 3;
    }
  },
};
