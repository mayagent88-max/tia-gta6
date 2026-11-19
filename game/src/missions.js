// The story: three jobs for Jax and V, each a small state machine with
// phases, a beacon, objectives and dialog. Completing a job pays cash and
// saves; failing one sends Jax back to the start of that job.
const NV_MISSIONS = {
  guards: [], v: null,

  startMission(G, idx) {
    const def = NV_CONFIG.missions[idx];
    if (!def) return false;
    const L = G.world.locations;
    const target = def.id === 'm1' ? L.garage : def.id === 'm2' ? L.atm : L.beachRoad;
    G.mission = { def, phase: 'go', timer: 0, target };
    G.world.setBeacon(target.x, target.z, 0xff2e88);
    NV_HUD.banner(G, 'MISSION ' + (idx + 1) + ' — ' + def.name);
    NV_HUD.dialog(G, 'V: ' + def.brief, 6);
    NV_HUD.setObjective(G, def.brief);
    NV_AUDIO.pickup();
    return true;
  },

  // E key: context action for the current mission phase.
  tryInteract(G) {
    const M = G.mission;
    if (!M) return false;
    const P = G.player;
    const pp = P.inCar ? P.car.group.position : P.pos;
    if (M.def.id === 'm1' && M.phase === 'go') {
      const L = G.world.locations.garage;
      if (Math.hypot(pp.x - L.x, pp.z - L.z) < 12 && !P.inCar) {
        // The prototype is parked in the garage yard.
        const proto = NV_ENTITIES.makeCar(0xff2e88, 'prototype');
        proto.group.position.set(L.x + 30, 0, L.z);
        proto.yaw = Math.PI / 2;
        proto.group.rotation.y = proto.yaw;
        proto.group.userData.owner = { kind: 'car', ref: proto };
        G.scene.add(proto.group);
        G.cars.push(proto);
        NV_MAIN.enterCar(G, proto);
        M.phase = 'escape';
        M.proto = proto;
        NV_POLICE.addWanted(G, 2);
        const H = G.world.locations.hideout;
        G.world.setBeacon(H.x, H.z, 0x39d353);
        NV_HUD.setObjective(G, 'Lose the heat! Bring the AURA GT to the Hideout.');
        NV_HUD.dialog(G, 'V: Nice ride. Two stars already — get to the Hideout, fast!', 5);
        return true;
      }
    }
    if (M.def.id === 'm2' && M.phase === 'go') {
      const L = G.world.locations.atm;
      if (Math.hypot(pp.x - L.x, pp.z - L.z) < 10 && !P.inCar) {
        M.phase = 'hack';
        M.timer = 90;
        M.waves = [60, 30, 10];
        const v = NV_ENTITIES.makePerson(0x19c3ff, 0x222233);
        v.group.position.set(L.x + 4, 0, L.z);
        G.scene.add(v.group);
        this.v = { mesh: v, pos: v.group.position, hp: 100 };
        G.world.setBeacon(L.x, L.z, 0x19c3ff);
        NV_HUD.setObjective(G, 'Protect V — hack in progress. 90 seconds.');
        NV_HUD.dialog(G, 'V: I\'m in. Keep the SEC guards off me!', 5);
        return true;
      }
    }
    return false;
  },

  update(G, dt) {
    const M = G.mission;
    if (!M) return;
    const P = G.player;
    const pp = P.inCar ? P.car.group.position : P.pos;
    if (M.def.id === 'm1') {
      if (M.phase === 'escape') {
        if (M.proto && M.proto.wrecked) { this.fail(G, 'The AURA GT is wrecked.'); return; }
        const H = G.world.locations.hideout;
        if (P.inCar && Math.hypot(pp.x - H.x, pp.z - H.z) < 13) this.complete(G);
      }
    } else if (M.def.id === 'm2') {
      if (M.phase === 'hack') {
        M.timer -= dt;
        NV_HUD.setObjective(G, 'Protect V — hack in progress. ' + Math.ceil(Math.max(0, M.timer)) + 's left. V HP ' + Math.max(0, Math.ceil(this.v ? this.v.hp : 0)));
        // Security waves at 60s, 30s and 10s remaining.
        if (M.waves.length && M.timer <= M.waves[0]) {
          M.waves.shift();
          this.spawnGuards(G, 2);
          NV_HUD.dialog(G, 'V: More SEC guards incoming!', 3);
        }
        // Guards chase V and shoot her.
        for (let i = this.guards.length - 1; i >= 0; i -= 1) {
          const gd = this.guards[i];
          if (gd.hp <= 0) continue;
          const vx = this.v.pos.x - gd.pos.x, vz = this.v.pos.z - gd.pos.z;
          const d = Math.hypot(vx, vz);
          const wantYaw = Math.atan2(-vz, vx);
          let dy = wantYaw - gd.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          gd.yaw += Math.max(-3.5 * dt, Math.min(3.5 * dt, dy));
          const spd = d > 14 ? 7 : 2.5;
          const nx = gd.pos.x + Math.cos(gd.yaw) * spd * dt;
          const nz = gd.pos.z - Math.sin(gd.yaw) * spd * dt;
          if (!NV_PHYSICS.hitsAny(nx, nz, 0.7, G.world.colliders)) { gd.pos.x = nx; gd.pos.z = nz; }
          NV_ENTITIES.walkPerson(gd.mesh, gd.pos, gd.yaw, spd, dt);
          gd.shootT -= dt;
          if (d < 32 && gd.shootT <= 0) {
            gd.shootT = 1.5;
            const from = new THREE.Vector3(gd.pos.x, 1.6, gd.pos.z);
            const to = new THREE.Vector3(this.v.pos.x, 1.4, this.v.pos.z);
            NV_COMBAT.spawnTracer(G, from, to, 0xff5040);
            NV_AUDIO.enemyShot();
            if (Math.random() < 0.4) {
              this.v.hp -= 6;
              NV_COMBAT.spawnBurst(G, to, 0xff5040, 4, 4);
            }
          }
        }
        if (this.v && this.v.hp <= 0) {
          NV_HUD.dialog(G, 'V: I\'m hit — pull me out!', 4);
          this.fail(G, 'V went down during the hack.');
          return;
        }
        if (M.timer <= 0) this.complete(G);
      }
    } else if (M.def.id === 'm3') {
      if (M.phase === 'go' && P.inCar) {
        M.phase = 'drive';
        G.world.setSunset(true);
        NV_POLICE.addWanted(G, 3);
        const B = G.world.locations.marina;
        G.world.setBeacon(B.x, B.z, 0xffd75e);
        NV_HUD.setObjective(G, 'Sunset escape — reach the Marina boat!');
        NV_HUD.dialog(G, 'V: The heli is on us. Don\'t stop for anything!', 5);
      } else if (M.phase === 'drive') {
        const B = G.world.locations.marina;
        if (P.inCar && Math.hypot(pp.x - B.x, pp.z - B.z) < 16) this.complete(G);
      }
    }
  },

  spawnGuards(G, n) {
    const L = G.world.locations.atm;
    for (let i = 0; i < n; i += 1) {
      const person = NV_ENTITIES.makePerson(0x222228, 0x181820);
      const a = G.rng.range(0, Math.PI * 2);
      person.group.position.set(L.x + Math.cos(a) * 45, 0, L.z + Math.sin(a) * 45);
      person.group.userData.owner = { kind: 'guard', ref: null };
      G.scene.add(person.group);
      const gd = { mesh: person, pos: person.group.position, yaw: 0, hp: 50, shootT: 1, phase: 0 };
      person.group.userData.owner.ref = gd;
      this.guards.push(gd);
    }
  },

  complete(G) {
    const M = G.mission;
    G.cash += M.def.reward;
    G.missionsDone += 1;
    NV_SAVE.save(G);
    NV_AUDIO.jingle();
    NV_HUD.banner(G, 'MISSION COMPLETE  +$' + M.def.reward);
    NV_HUD.dialog(G, 'V: That\'s one down. The Syndicate won\'t know what hit them.', 5);
    this.clearField(G);
    const doneId = M.def.id;
    G.mission = null;
    G.world.hideBeacon();
    if (doneId === 'm3') { NV_MAIN.ending(G); return; }
    NV_HUD.setObjective(G, G.missionsDone < 3 ? 'Press M for the next mission.' : 'All jobs done — free roam Aura City.');
  },

  fail(G, reason) {
    NV_HUD.banner(G, 'JOB FAILED');
    NV_HUD.dialog(G, reason + ' Try again — press M to restart the job.', 6);
    this.clearField(G);
    const idx = NV_CONFIG.missions.indexOf(G.mission.def);
    G.mission = null;
    G.world.hideBeacon();
    // Restart the same job at its start point.
    this.startMission(G, idx);
  },

  clearField(G) {
    for (const gd of this.guards) G.scene.remove(gd.mesh.group);
    this.guards = [];
    if (this.v) { G.scene.remove(this.v.mesh.group); this.v = null; }
  },
};
