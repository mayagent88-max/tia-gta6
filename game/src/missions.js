// The story: eight jobs for Jax and V, each a small state machine with
// phases, a beacon, objectives and dialog. Completing a job pays cash and
// saves; failing one sends Jax back to the start of that job.
const NV_MISSIONS = {
  guards: [], v: null, courier: null, rival: null, truck: null,

  startMission(G, idx) {
    const def = NV_CONFIG.missions[idx];
    if (!def) return false;
    const L = G.world.locations;
    let target = null;
    if (def.id === 'm1') target = L.garage;
    else if (def.id === 'm2') target = L.atm;
    else if (def.id === 'm3') target = L.beachRoad;
    else if (def.id === 'm5') target = null; // terminals set below
    else if (def.id === 'm8') target = L.garage;
    G.mission = { def, phase: 'go', timer: 0, target };
    if (target) G.world.setBeacon(target.x, target.z, 0xff2e88);
    if (def.id === 'm4') this.spawnCourier(G);
    if (def.id === 'm5') {
      G.mission.atms = [
        { x: L.atm.x, z: L.atm.z },
        { x: L.atm2.x, z: L.atm2.z },
        { x: L.atm3.x, z: L.atm3.z },
      ];
      G.mission.atmIdx = 0;
      G.mission.target = G.mission.atms[0];
      G.world.setBeacon(G.mission.target.x, G.mission.target.z, 0x19c3ff);
    }
    if (def.id === 'm6') this.spawnRival(G);
    if (def.id === 'm7') {
      G.mission.surviveT = 60;
      G.mission.heatT = 0;
      G.mission.target = null;
      NV_POLICE.addWanted(G, 4);
    }
    if (def.id === 'm8') this.spawnTruck(G);
    NV_HUD.banner(G, 'MISSION ' + (idx + 1) + ' — ' + def.name);
    NV_HUD.dialog(G, 'V: ' + def.brief, 6);
    NV_HUD.setObjective(G, def.brief);
    NV_AUDIO.pickup();
    return true;
  },

  spawnCourier(G) {
    const M = G.mission;
    const courier = NV_ENTITIES.makeCar(0xe8c832, 'courier');
    courier.group.position.set(-1000, 0, 730);
    courier.yaw = 0;
    courier.group.rotation.y = 0;
    courier.group.userData.owner = { kind: 'car', ref: courier };
    courier.waypoints = [{ x: 1000, z: 730 }, { x: -1000, z: 730 }];
    courier.wpIdx = 0;
    courier.speed = 14;
    G.scene.add(courier.group);
    G.cars.push(courier);
    this.courier = courier;
    M.target = { x: -1000, z: 730 };
    G.world.setBeacon(-1000, 730, 0xffd75e);
    NV_HUD.setObjective(G, 'Intercept the rival courier on the beach road — get close and press E.');
  },

  spawnRival(G) {
    const M = G.mission;
    M.cps = [{ x: -600, z: -400 }, { x: 600, z: -400 }, { x: 600, z: 400 }, { x: -600, z: 400 }];
    M.cpIdx = 0;
    const rival = NV_ENTITIES.makeCar(0x7a4ad6, 'rival');
    rival.group.position.set(-600, 0, -380);
    rival.yaw = 0;
    rival.group.rotation.y = 0;
    rival.group.userData.owner = { kind: 'car', ref: rival };
    rival.cpIdx = 0;
    G.scene.add(rival.group);
    G.cars.push(rival);
    this.rival = rival;
    M.target = M.cps[0];
    G.world.setBeacon(M.cps[0].x, M.cps[0].z, 0x7a4ad6);
    NV_HUD.setObjective(G, 'Race the rival crew: checkpoint 1 of 4. Get a car!');
  },

  spawnTruck(G) {
    const L = G.world.locations.garage;
    const truck = NV_ENTITIES.makeCar(0xffd75e, 'payoff');
    truck.group.position.set(L.x + 30, 0, L.z + 20);
    truck.yaw = Math.PI / 2;
    truck.group.rotation.y = truck.yaw;
    truck.group.userData.owner = { kind: 'car', ref: truck };
    G.scene.add(truck.group);
    G.cars.push(truck);
    this.truck = truck;
    NV_HUD.setObjective(G, 'Get in the payoff truck at the garage.');
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
    if (M.def.id === 'm4' && M.phase === 'go' && this.courier && !this.courier.wrecked) {
      const c = this.courier.group.position;
      if (Math.hypot(pp.x - c.x, pp.z - c.z) < 10) {
        this.courier.speed = 0;
        M.phase = 'deliver';
        NV_POLICE.addWanted(G, 1);
        const P0 = G.world.locations.plaza;
        M.target = { x: P0.x, z: P0.z };
        G.world.setBeacon(P0.x, P0.z, 0x39d353);
        NV_HUD.setObjective(G, 'Package grabbed! Drop it at Neon Plaza.');
        NV_HUD.dialog(G, 'V: Got it! Now get that package to the Plaza drop.', 5);
        return true;
      }
    }
    if (M.def.id === 'm5' && M.phase === 'go' && !P.inCar) {
      const t = M.atms[M.atmIdx];
      if (Math.hypot(pp.x - t.x, pp.z - t.z) < 10) {
        M.phase = 'channel';
        M.channelT = 20;
        NV_POLICE.addWanted(G, 1);
        this.spawnGuards(G, 1, t.x, t.z);
        G.world.setBeacon(t.x, t.z, 0x19c3ff);
        NV_HUD.setObjective(G, 'Draining terminal ' + (M.atmIdx + 1) + ' of 3 — stay close! 20s.');
        NV_HUD.dialog(G, 'V: Hold still, I\'m pulling the cash out…', 4);
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
    } else if (M.def.id === 'm4') {
      if (M.phase === 'go' && this.courier && !this.courier.wrecked) {
        const wp = this.courier.waypoints[this.courier.wpIdx];
        const d = NV_ENTITIES.driveToward(this.courier, wp.x, wp.z, dt, 14, G.world.colliders, G.cars);
        if (d < 8) this.courier.wpIdx = (this.courier.wpIdx + 1) % this.courier.waypoints.length;
        // Beacon follows the moving courier.
        M.target = { x: this.courier.group.position.x, z: this.courier.group.position.z };
        G.world.setBeacon(M.target.x, M.target.z, 0xffd75e);
      } else if (M.phase === 'go' && this.courier && this.courier.wrecked) {
        this.fail(G, 'The courier car is wrecked — the package is gone.');
        return;
      } else if (M.phase === 'deliver') {
        const P0 = G.world.locations.plaza;
        if (Math.hypot(pp.x - P0.x, pp.z - P0.z) < 14) this.complete(G);
      }
    } else if (M.def.id === 'm5') {
      if (M.phase === 'channel') {
        const t = M.atms[M.atmIdx];
        const d = Math.hypot(pp.x - t.x, pp.z - t.z);
        if (!P.inCar && d < 12) {
          M.channelT -= dt;
          NV_HUD.setObjective(G, 'Draining terminal ' + (M.atmIdx + 1) + ' of 3 — ' + Math.ceil(Math.max(0, M.channelT)) + 's left.');
        } else {
          NV_HUD.setObjective(G, 'Draining terminal ' + (M.atmIdx + 1) + ' of 3 — stay close to the terminal!');
        }
        if (M.channelT <= 0) {
          M.atmIdx += 1;
          if (M.atmIdx >= 3) { this.complete(G); return; }
          M.phase = 'go';
          const nt = M.atms[M.atmIdx];
          M.target = nt;
          G.world.setBeacon(nt.x, nt.z, 0x19c3ff);
          NV_HUD.setObjective(G, 'Terminal ' + (M.atmIdx + 1) + ' of 3 — get to the next vault terminal.');
          NV_HUD.dialog(G, 'V: One down, ' + (3 - M.atmIdx) + ' to go. Move!', 4);
        }
      }
    } else if (M.def.id === 'm6') {
      if (M.phase === 'go') {
        const cp = M.cps[M.cpIdx];
        if (Math.hypot(pp.x - cp.x, pp.z - cp.z) < 15) {
          M.cpIdx += 1;
          if (M.cpIdx >= 4) { this.complete(G); return; }
          const nt = M.cps[M.cpIdx];
          M.target = nt;
          G.world.setBeacon(nt.x, nt.z, 0x7a4ad6);
          NV_HUD.setObjective(G, 'Checkpoint ' + (M.cpIdx + 1) + ' of 4 — beat the rival there!');
          NV_HUD.dialog(G, 'V: Checkpoint ' + M.cpIdx + ' down. Keep pushing!', 3);
        }
        // The rival drives the same checkpoints.
        if (this.rival && !this.rival.wrecked) {
          const rcp = M.cps[this.rival.cpIdx];
          const d = NV_ENTITIES.driveToward(this.rival, rcp.x, rcp.z, dt, 30, G.world.colliders, G.cars);
          if (d < 12) {
            this.rival.cpIdx += 1;
            if (this.rival.cpIdx >= 4) {
              this.fail(G, 'The rival crew beat you to the finish.');
              return;
            }
          }
        }
      }
    } else if (M.def.id === 'm7') {
      if (M.phase === 'go') {
        // Keep the heat at four stars while surviving.
        M.heatT += dt;
        if (M.heatT > 6) {
          M.heatT = 0;
          if (G.wanted < 4) NV_POLICE.addWanted(G, 1);
        }
        M.surviveT -= dt;
        NV_HUD.setObjective(G, 'Survive the heat — ' + Math.ceil(Math.max(0, M.surviveT)) + 's left. Four stars!');
        if (M.surviveT <= 0) {
          M.phase = 'run';
          const H = G.world.locations.hideout;
          M.target = { x: H.x, z: H.z };
          G.world.setBeacon(H.x, H.z, 0x39d353);
          NV_HUD.setObjective(G, 'You lived! Now reach the Hideout.');
          NV_HUD.dialog(G, 'V: They lost you — get to the Hideout, now!', 5);
        }
      } else if (M.phase === 'run') {
        const H = G.world.locations.hideout;
        if (Math.hypot(pp.x - H.x, pp.z - H.z) < 13) this.complete(G);
      }
    } else if (M.def.id === 'm8') {
      if (M.phase === 'go' && P.inCar && P.car && P.car.kind === 'payoff') {
        M.phase = 'drive';
        NV_POLICE.addWanted(G, 5);
        const B = G.world.locations.marina;
        M.target = { x: B.x, z: B.z };
        G.world.setBeacon(B.x, B.z, 0xffd75e);
        NV_HUD.setObjective(G, 'Five stars! Deliver the payoff truck to the Marina boat!');
        NV_HUD.dialog(G, 'V: The whole city is on us. Don\'t lose the truck!', 5);
      } else if (M.phase === 'drive') {
        if (this.truck && this.truck.wrecked) { this.fail(G, 'The payoff truck is wrecked.'); return; }
        const B = G.world.locations.marina;
        if (P.inCar && Math.hypot(pp.x - B.x, pp.z - B.z) < 16) this.complete(G);
      }
    }
  },

  spawnGuards(G, n, x, z) {
    const L = G.world.locations.atm;
    const cx = (x !== undefined) ? x : L.x;
    const cz = (z !== undefined) ? z : L.z;
    for (let i = 0; i < n; i += 1) {
      const person = NV_ENTITIES.makePerson(0x222228, 0x181820);
      const a = G.rng.range(0, Math.PI * 2);
      person.group.position.set(cx + Math.cos(a) * 45, 0, cz + Math.sin(a) * 45);
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
    if (doneId === 'm8') { NV_MAIN.ending(G); return; }
    NV_HUD.setObjective(G, G.missionsDone < 8 ? 'Press M for the next mission.' : 'All jobs done — free roam Aura City.');
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
    if (this.courier) {
      G.scene.remove(this.courier.group);
      const i = G.cars.indexOf(this.courier);
      if (i >= 0) G.cars.splice(i, 1);
      this.courier = null;
    }
    if (this.rival) {
      G.scene.remove(this.rival.group);
      const i = G.cars.indexOf(this.rival);
      if (i >= 0) G.cars.splice(i, 1);
      this.rival = null;
    }
    if (this.truck) {
      G.scene.remove(this.truck.group);
      const i = G.cars.indexOf(this.truck);
      if (i >= 0) G.cars.splice(i, 1);
      this.truck = null;
    }
  },
};
