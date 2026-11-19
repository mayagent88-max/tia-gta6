// Combat: two weapons (pistol + SMG, switched with 1/2 or the hold-Tab
// weapon wheel), raycast shots from the camera, enemy fire, tracers,
// impact bursts, screen shake and damage. Cars explode at 0 HP. Ammo
// reloads with Q, or automatically when a mag runs dry.
const NV_COMBAT = {
  tracers: [], parts: [], raycaster: null,
  wheelOpen: false, wheelSel: 'pistol',

  init() { this.raycaster = new THREE.Raycaster(); },

  // --- Weapon wheel: hold Tab to open, 1/2 or A/D to pick a weapon,
  // release Tab (or click) to switch to it. The HUD draws the wheel.
  openWheel(G) {
    if (this.wheelOpen) return;
    this.ensureWeapons(G.player);
    this.wheelOpen = true;
    this.wheelSel = G.player.weapon;
    NV_HUD.showWheel(G, this.wheelSel);
    NV_AUDIO.click();
  },
  closeWheel(G, apply) {
    if (!this.wheelOpen) return;
    this.wheelOpen = false;
    NV_HUD.hideWheel(G);
    if (apply && this.wheelSel !== G.player.weapon) {
      this.switchWeapon(G, this.wheelSel);
    }
  },
  wheelSelect(G, name) {
    if (!this.wheelOpen || !NV_CONFIG.weapons[name]) return;
    this.wheelSel = name;
    NV_HUD.showWheel(G, this.wheelSel);
    NV_AUDIO.click();
  },
  wheelCycle(G, dir) {
    const order = ['pistol', 'smg'];
    const i = order.indexOf(this.wheelSel);
    this.wheelSelect(G, order[(i + dir + order.length) % order.length]);
  },

  weaponDef(P) {
    const w = NV_CONFIG.weapons[P.weapon || 'pistol'] || NV_CONFIG.weapons.pistol;
    return w;
  },

  // Ammo per weapon lives in P.ammoBy; P.ammo always mirrors the active one.
  ensureWeapons(P) {
    if (!P.ammoBy) {
      P.weapon = 'pistol';
      P.ammoBy = { pistol: NV_CONFIG.weapons.pistol.mag, smg: NV_CONFIG.weapons.smg.mag };
      P.ammo = P.ammoBy.pistol;
    }
  },

  switchWeapon(G, name) {
    const P = G.player;
    this.ensureWeapons(P);
    if (!NV_CONFIG.weapons[name] || P.weapon === name) return false;
    P.ammoBy[P.weapon] = P.ammo;
    P.weapon = name;
    P.ammo = P.ammoBy[name];
    P.reloadT = 0;
    P.shootT = 0;
    NV_AUDIO.click();
    return true;
  },

  startReload(G) {
    const P = G.player;
    this.ensureWeapons(P);
    const w = this.weaponDef(P);
    if (P.inCar || P.reloadT > 0 || P.ammo >= w.mag) return false;
    P.reloadT = NV_CONFIG.player.reloadTime;
    NV_AUDIO.reload();
    return true;
  },

  shoot(G) {
    const P = G.player;
    this.ensureWeapons(P);
    const w = this.weaponDef(P);
    if (P.inCar || P.reloadT > 0 || P.shootT > 0) return;
    if (P.ammo <= 0) { this.startReload(G); return; }
    P.shootT = w.cooldown;
    P.ammo -= 1;
    P.ammoBy[P.weapon] = P.ammo;
    if (P.weapon === 'smg') { NV_AUDIO.noise(0.07, 0.16, 3000); this.toneSmg(); }
    else NV_AUDIO.shot();
    G.shake = Math.min(1, G.shake + (P.weapon === 'smg' ? 0.06 : 0.12));
    const cam = G.camera;
    this.raycaster.setFromCamera({ x: 0, y: 0 }, cam);
    this.raycaster.far = 140;
    const targets = [];
    if (G.world.buildingMesh) targets.push(G.world.buildingMesh);
    for (const car of G.cars) if (!car.wrecked) targets.push(car.group);
    for (const o of NV_POLICE.officers) targets.push(o.mesh.group);
    for (const gd of NV_MISSIONS.guards) targets.push(gd.mesh.group);
    if (NV_MISSIONS.v) targets.push(NV_MISSIONS.v.mesh.group);
    const hits = this.raycaster.intersectObjects(targets, true);
    const from = cam.position.clone();
    let end = from.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).multiplyScalar(140));
    if (hits.length) {
      const h = hits[0];
      end = h.point.clone();
      this.spawnBurst(G, h.point, 0xffd75e, 10, 6);
      const obj = this.findOwner(h.object);
      if (obj) {
        if (obj.kind === 'officer') this.damageOfficer(G, obj.ref, w.damage);
        else if (obj.kind === 'guard') this.damageGuard(G, obj.ref, w.damage);
        else if (obj.kind === 'car') this.damageCar(G, obj.ref, Math.round(w.damage * 0.5));
      }
    }
    this.spawnTracer(G, from, end, 0xfff2c0);
    G.lastShotPos = { x: P.pos.x, z: P.pos.z };
    NV_TRAFFIC.scare(P.pos.x, P.pos.z, 45);
    NV_POLICE.addWanted(G, 0); // shooting keeps the heat fresh
    G.player.lastShotT = G.time;
  },

  toneSmg() { NV_AUDIO.tone(220, 0.05, 'square', 0.07, 70); },

  findOwner(obj) {
    let o = obj;
    while (o) {
      if (o.userData && o.userData.owner) return o.userData.owner;
      o = o.parent;
    }
    return null;
  },

  damageOfficer(G, o, dmg) {
    o.hp -= dmg;
    if (o.hp <= 0) {
      o.mesh.group.rotation.x = -Math.PI / 2;
      o.mesh.group.position.y = 0.4;
      setTimeout(() => G.scene.remove(o.mesh.group), 2000);
      NV_POLICE.officers.splice(NV_POLICE.officers.indexOf(o), 1);
    }
  },
  damageGuard(G, gd, dmg) {
    gd.hp -= dmg;
    if (gd.hp <= 0) {
      gd.mesh.group.rotation.x = -Math.PI / 2;
      gd.mesh.group.position.y = 0.4;
      setTimeout(() => G.scene.remove(gd.mesh.group), 2000);
      NV_MISSIONS.guards.splice(NV_MISSIONS.guards.indexOf(gd), 1);
    }
  },
  damageCar(G, car, dmg) {
    car.hp -= dmg;
    if (car.hp <= 0) this.explodeCar(G, car);
  },

  explodeCar(G, car) {
    if (car.wrecked) return;
    car.wrecked = true;
    car.speed = 0;
    this.spawnBurst(G, car.group.position.clone().setY(1.5), 0xff7a2e, 26, 14);
    this.spawnBurst(G, car.group.position.clone().setY(1.5), 0x333333, 16, 8);
    NV_AUDIO.explosion();
    G.shake = 1;
    car.group.children.forEach((m) => {
      if (m.material && m.material.color) m.material.color.setHex(0x1a1a1a);
    });
    if (G.player.inCar && G.player.car === car) NV_MAIN.wasted(G);
  },

  enemyShoot(G, fromPos, height, targetPos) {
    const from = new THREE.Vector3(fromPos.x, height, fromPos.z);
    const to = new THREE.Vector3(targetPos.x, 1.4, targetPos.z);
    const dist = from.distanceTo(to);
    this.spawnTracer(G, from, to, 0xff5040);
    NV_AUDIO.enemyShot();
    // Hit chance falls with distance; a hit hurts the player.
    if (Math.random() < Math.max(0.12, 0.45 - dist * 0.006)) {
      this.hurtPlayer(G, 7, fromPos);
    }
  },

  hurtPlayer(G, dmg, fromPos) {
    const P = G.player;
    if (G.screen !== 'playing' || P.hp <= 0) return;
    P.hp -= dmg;
    P.lastHurtT = G.time;
    G.shake = Math.min(1, G.shake + 0.25);
    if (P.hp <= 0) { P.hp = 0; NV_MAIN.wasted(G); }
  },

  spawnTracer(G, from, to, color) {
    const len = from.distanceTo(to);
    if (len < 0.5) return;
    const geo = new THREE.BoxGeometry(len, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.lookAt(to);
    G.scene.add(m);
    this.tracers.push({ mesh: m, life: 0.09, max: 0.09 });
  },

  spawnBurst(G, pos, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const mat = new THREE.MeshBasicMaterial({ color });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      G.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      this.parts.push({
        mesh: m, life: 0.5 + Math.random() * 0.3, max: 0.8,
        vel: new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.abs(Math.sin(b)) + 0.4, Math.sin(a) * Math.cos(b)).multiplyScalar(speed * (0.5 + Math.random())),
      });
    }
  },

  update(G, dt) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) { G.scene.remove(t.mesh); this.tracers.splice(i, 1); }
      else t.mesh.material.opacity = t.life / t.max;
    }
    for (let i = this.parts.length - 1; i >= 0; i -= 1) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { G.scene.remove(p.mesh); this.parts.splice(i, 1); continue; }
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.1) p.mesh.position.y = 0.1;
    }
    // Player health regen after 5 calm seconds.
    const P = G.player;
    this.ensureWeapons(P);
    if (P.hp > 0 && P.hp < 100 && G.time - (P.lastHurtT || -99) > 5) P.hp = Math.min(100, P.hp + 6 * dt);
    if (P.reloadT > 0) {
      P.reloadT -= dt;
      if (P.reloadT <= 0) {
        const w = this.weaponDef(P);
        P.ammo = w.mag;
        P.ammoBy[P.weapon] = P.ammo;
      }
    } else if (P.ammo <= 0 && !P.inCar && G.screen === 'playing') {
      this.startReload(G); // dry mag reloads itself
    }
    if (P.shootT > 0) P.shootT -= dt;
  },
};
