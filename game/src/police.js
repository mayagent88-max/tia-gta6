// The wanted system: stars for crimes, police cruisers that chase and ram,
// foot officers who chase and shoot, and the news helicopter with its
// searchlight at 3+ stars. Sirens wail while any star is lit.
const NV_POLICE = {
  cruisers: [], officers: [], heli: null, heat: 0, lastCrimeT: -99,

  addWanted(G, n) {
    G.wanted = Math.max(0, Math.min(5, G.wanted + n));
    this.heat = 100;
    this.lastCrimeT = G.time;
    NV_AUDIO.setSiren(G.wanted > 0);
  },

  update(G, dt) {
    // Wanted decays after 8 clean seconds: one star per 6 seconds.
    if (G.wanted > 0 && G.time - this.lastCrimeT > 8) {
      this.heat -= dt * 16;
      if (this.heat <= 0) {
        G.wanted -= 1;
        this.heat = 100;
        NV_AUDIO.setSiren(G.wanted > 0);
      }
    }
    const playerPos = G.player.inCar ? G.player.car.group.position : G.player.pos;
    // Cruisers: spawn up to one per star, chase and ram.
    const wantCruisers = Math.min(G.wanted, NV_CONFIG.police.maxCruisers);
    while (this.cruisers.length < wantCruisers) {
      const car = NV_ENTITIES.makeCar(0xf2f2f2, 'police');
      const a = G.rng.range(0, Math.PI * 2);
      const p = G.rng.pick(G.world.roadPoints);
      car.group.position.set(p.x, 0, p.z);
      car.group.rotation.y = a;
      G.scene.add(car.group);
      G.cars.push(car);
      this.cruisers.push(car);
    }
    for (let i = this.cruisers.length - 1; i >= 0; i -= 1) {
      const c = this.cruisers[i];
      if (c.wrecked) { this.cruisers.splice(i, 1); continue; }
      if (G.wanted === 0) {
        // No heat: cruise away and despawn.
        NV_ENTITIES.driveToward(c, c.group.position.x + 100, c.group.position.z, dt, 10, G.world.colliders, G.cars);
        if (Math.hypot(c.group.position.x - playerPos.x, c.group.position.z - playerPos.z) > 300) {
          G.scene.remove(c.group);
          G.cars.splice(G.cars.indexOf(c), 1);
          this.cruisers.splice(i, 1);
        }
        continue;
      }
      NV_ENTITIES.driveToward(c, playerPos.x, playerPos.z, dt, 26 + G.wanted * 2.5, G.world.colliders, G.cars);
      // Flash the light bar.
      const on = Math.floor(G.time * 6) % 2 === 0;
      if (c.lightRed) c.lightRed.emissiveIntensity = on ? 2.5 : 0.3;
      if (c.lightBlue) c.lightBlue.emissiveIntensity = on ? 0.3 : 2.5;
      // Ram the player: damage on contact.
      const d = Math.hypot(c.group.position.x - playerPos.x, c.group.position.z - playerPos.z);
      if (d < 5.5) {
        if (G.player.inCar) {
          G.player.car.hp -= 12 * dt * 4;
          G.shake = Math.min(1, G.shake + 0.3);
          if (G.player.car.hp <= 0) NV_COMBAT.explodeCar(G, G.player.car);
        } else {
          NV_COMBAT.hurtPlayer(G, 10 * dt * 2, c.group.position);
        }
      }
    }
    // Foot officers: chase on foot, shoot when close, bust on contact.
    const wantOfficers = G.wanted > 0 ? Math.min(G.wanted * 2, NV_CONFIG.police.maxOfficers) : 0;
    while (this.officers.length < wantOfficers) {
      const person = NV_ENTITIES.makePerson(0x1a2a6e, 0x1a1a22);
      const a = G.rng.range(0, Math.PI * 2);
      person.group.position.set(playerPos.x + Math.cos(a) * 60, 0, playerPos.z + Math.sin(a) * 60);
      G.scene.add(person.group);
      this.officers.push({ mesh: person, pos: person.group.position, yaw: 0, hp: 50, shootT: 1, bustT: 0, phase: 0 });
    }
    for (let i = this.officers.length - 1; i >= 0; i -= 1) {
      const o = this.officers[i];
      if (o.hp <= 0) { this.officers.splice(i, 1); continue; }
      if (G.wanted === 0) {
        G.scene.remove(o.mesh.group);
        this.officers.splice(i, 1);
        continue;
      }
      const dx = playerPos.x - o.pos.x, dz = playerPos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(-dz, dx);
      let dy = wantYaw - o.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      o.yaw += Math.max(-3.5 * dt, Math.min(3.5 * dt, dy));
      const spd = d > 12 ? 7.5 : 3;
      const nx = o.pos.x + Math.cos(o.yaw) * spd * dt;
      const nz = o.pos.z - Math.sin(o.yaw) * spd * dt;
      if (!NV_PHYSICS.hitsAny(nx, nz, 0.7, G.world.colliders)) { o.pos.x = nx; o.pos.z = nz; }
      NV_ENTITIES.walkPerson(o.mesh, o.pos, o.yaw, spd, dt);
      o.shootT -= dt;
      if (d < 55 && o.shootT <= 0 && !G.player.inCar) {
        o.shootT = 1.1;
        NV_COMBAT.enemyShoot(G, o.pos, 2.2, playerPos);
      }
      // Bust: an officer standing on the player for 1.5s ends the run.
      if (d < 2.6 && !G.player.inCar) {
        o.bustT += dt;
        if (o.bustT > 1.5) NV_MAIN.busted(G);
      } else { o.bustT = 0; }
    }
    // Helicopter at 3+ stars: circles the player, spotlight follows.
    if (G.wanted >= NV_CONFIG.police.heliAtWanted && !this.heli) {
      this.heli = NV_ENTITIES.makeHeli(G.scene);
      NV_AUDIO.setSiren(true);
    }
    if (this.heli) {
      if (G.wanted < NV_CONFIG.police.heliAtWanted) {
        G.scene.remove(this.heli.group);
        this.heli = null;
      } else {
        const h = this.heli;
        h.angle += dt * 0.45;
        const hx = playerPos.x + Math.cos(h.angle) * 45;
        const hz = playerPos.z + Math.sin(h.angle) * 45;
        h.group.position.set(hx, 58, hz);
        h.group.rotation.y = Math.atan2(-(playerPos.z - hz), playerPos.x - hx);
        h.rotor.rotation.y += dt * 22;
        h.light.target.position.set(playerPos.x - hx, -58, playerPos.z - hz);
        h.light.target.updateMatrixWorld();
      }
    }
  },
};
