// The HUD: cash, health, weapons + ammo, wanted stars, radio station,
// respect + district standing + crew, the mission objective, dialog,
// banners, the garage prompt, the weapon wheel and the live minimap.
// Screens (title/pause/wasted/busted/ending) are plain overlays toggled
// from here.
const NV_HUD = {
  els: {}, dialogT: 0, bannerT: 0,

  init() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      hud: $('hud'), cash: $('cash'), hpfill: $('hpfill'), hptext: $('hptext'),
      ammo: $('ammo'), weapons: $('weapons'), nitro: $('nitro'), nitrofill: $('nitrofill'),
      upgrades: $('upgrades'), radio: $('radio'),
      respect: $('respect'), district: $('district'),
      stars: $('stars'), objective: $('objective'),
      dialog: $('dialog'), banner: $('banner'), crosshair: $('crosshair'),
      minimap: $('minimap'),
      wheel: $('wheel'), wheelSlots: $('wheel-slots'),
      keepPrompt: $('keep-prompt'),
      title: $('title-screen'), pause: $('pause-screen'),
      wasted: $('wasted-screen'), busted: $('busted-screen'), ending: $('ending-screen'),
      saveLine: $('save-line'), endingStats: $('ending-stats'),
      garagePrompt: $('garage-prompt'), garageScreen: $('garage-screen'),
      garageRows: $('garage-rows'), garageNote: $('garage-note'),
      garageCars: $('garage-cars'),
    };
    this.els.minimapCtx = this.els.minimap.getContext('2d');
  },

  showScreen(G, name) {
    const e = this.els;
    [e.title, e.pause, e.wasted, e.busted, e.ending].forEach((el) => el.classList.add('hidden'));
    e.hud.classList.toggle('hidden', name === 'title');
    if (name === 'title') {
      e.title.classList.remove('hidden');
      if (G.missionsDone > 0 || G.cash > 0) {
        e.saveLine.textContent = 'Save found: ' + G.missionsDone + '/10 jobs done, $' + G.cash + ' banked.';
      }
    }
    if (name === 'paused') e.pause.classList.remove('hidden');
    if (name === 'wasted') e.wasted.classList.remove('hidden');
    if (name === 'busted') e.busted.classList.remove('hidden');
    if (name === 'ending') {
      e.endingStats.textContent = 'Jobs done: ' + G.missionsDone + '/10 · Cash banked: $' + G.cash + ' · ' + NV_CREW.hudLine(G);
      e.ending.classList.remove('hidden');
    }
  },

  setObjective(G, text) { G.objective = text; this.els.objective.textContent = text; },
  dialog(G, text, secs) {
    this.els.dialog.textContent = text;
    this.els.dialog.classList.remove('hidden');
    this.dialogT = secs || 4;
  },
  banner(G, text) {
    this.els.banner.textContent = text;
    this.els.banner.classList.remove('hidden');
    this.bannerT = 2.6;
  },

  // --- Garage overlay: the selected owned car's upgrades, plus the
  // collection itself (press 4 to pick another car, 5 to summon it).
  showGarage(G) {
    const e = this.els;
    const owned = NV_GARAGE.selectedCar(G);
    const rows = NV_GARAGE.rows.map((r, i) => {
      const lvl = (owned && owned.upgrades[r.key]) || 0;
      const cost = owned ? NV_GARAGE.nextCost(G, r.key, owned) : null;
      const right = !owned ? '—' : (cost === null ? 'MAX' : '$' + cost);
      return '<div class="grow"><span class="gkey">' + (i + 1) + '</span> <b>' + r.label + '</b> <span class="gdesc">' + r.desc + '</span> <span class="glvl">LV ' + lvl + '</span> <span class="gcost">' + right + '</span></div>';
    }).join('');
    e.garageRows.innerHTML = rows;
    const cars = (G.ownedCars || []).map((o, i) => {
      const sel = owned === o;
      return '<div class="grow' + (sel ? ' sel' : '') + '"><span class="gkey">CAR</span> <b>' + o.name + '</b> <span class="gdesc">ENG ' + o.upgrades.engine + ' · ARM ' + o.upgrades.armor + ' · NITRO ' + o.upgrades.nitro + '</span>' + (sel ? ' <span class="gcost">SELECTED</span>' : '') + '</div>';
    }).join('');
    e.garageCars.innerHTML = cars || '<div class="grow"><span class="gdesc">No owned cars yet — steal one off the street and press K to keep it.</span></div>';
    e.garageScreen.classList.remove('hidden');
  },
  hideGarage(G) { this.els.garageScreen.classList.add('hidden'); },
  garageNote(G, text) { this.els.garageNote.textContent = text; },

  // --- Weapon wheel overlay (hold Tab).
  showWheel(G, sel) {
    const e = this.els;
    e.wheelSlots.innerHTML = ['pistol', 'smg'].map((k) => {
      const d = NV_CONFIG.weapons[k];
      const cur = sel === k;
      return '<div class="wheelslot' + (cur ? ' on' : '') + '"><b>' + d.name + '</b><span>' + G.player.ammoBy[k] + ' / ' + d.mag + '</span></div>';
    }).join('');
    e.wheel.classList.remove('hidden');
  },
  hideWheel(G) { this.els.wheel.classList.add('hidden'); },

  update(G, dt) {
    const e = this.els;
    const P = G.player;
    NV_COMBAT.ensureWeapons(P);
    e.cash.textContent = '$' + G.cash;
    const hp = Math.max(0, Math.ceil(P.hp));
    e.hpfill.style.width = hp + '%';
    e.hptext.textContent = 'HP ' + hp;
    const w = NV_COMBAT.weaponDef(P);
    e.ammo.textContent = P.inCar ? 'DRIVING' : (P.reloadT > 0 ? 'RELOADING…' : w.name + ' ' + P.ammo + ' / ' + w.mag);
    // Weapon slots: [1] PISTOL [2] SMG, current one highlighted.
    e.weapons.innerHTML = ['pistol', 'smg'].map((k, i) => {
      const d = NV_CONFIG.weapons[k];
      const cur = P.weapon === k;
      return '<span class="wslot' + (cur ? ' on' : '') + '">' + (i + 1) + ' ' + d.name + ' ' + P.ammoBy[k] + '/' + d.mag + '</span>';
    }).join('');
    // Nitro meter (only when the player owns nitro).
    const hasNitro = (G.upgrades && G.upgrades.nitro > 0);
    e.nitro.classList.toggle('hidden', !hasNitro);
    if (hasNitro) {
      const car = P.inCar ? P.car : null;
      const v = car ? Math.round(car.nitro || 0) : 100;
      e.nitrofill.style.width = v + '%';
    }
    const u = G.upgrades || { engine: 0, armor: 0, nitro: 0 };
    const cur = G.player.inCar && G.player.car && G.player.car.owned ? G.player.car.owned.upgrades : u;
    e.upgrades.textContent = 'ENG ' + cur.engine + ' · ARM ' + cur.armor + ' · NITRO ' + cur.nitro;
    e.radio.textContent = '♪ ' + NV_AUDIO.radioName();
    // Respect + crew, and the district the player is standing in.
    e.respect.textContent = NV_CREW.hudLine(G);
    e.district.textContent = NV_CREW.districtLine(G);
    // Garage prompt near AURA MOTORS.
    e.garagePrompt.classList.toggle('hidden', !(G.screen === 'playing' && !G.garageOpen && NV_GARAGE.nearGarage(G)));
    // Keep-car prompt: driving a stealable street car.
    const kp = G.screen === 'playing' && !G.garageOpen && P.inCar && NV_GARAGE.keepable(P.car);
    e.keepPrompt.classList.toggle('hidden', !kp);
    if (kp) e.keepPrompt.textContent = 'Press K — keep this car in your garage';
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += '<span class="' + (i < G.wanted ? '' : 'off') + '">★</span>';
    e.stars.innerHTML = stars;
    e.crosshair.classList.toggle('hidden', !(G.screen === 'playing' && !P.inCar && !G.shotCam));
    if (this.dialogT > 0) {
      this.dialogT -= dt;
      if (this.dialogT <= 0) e.dialog.classList.add('hidden');
    }
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) e.banner.classList.add('hidden');
    }
    this.drawMinimap(G);
  },

  drawMinimap(G) {
    const ctx = this.els.minimapCtx;
    const W = NV_CONFIG.world;
    const S = 220;
    const sx = (x) => (x + W.sizeX / 2) / W.sizeX * S;
    const sy = (z) => (z + W.sizeZ / 2) / W.sizeZ * S;
    // Grass base.
    ctx.fillStyle = '#1d3a1e';
    ctx.fillRect(0, 0, S, S);
    // Sidewalk pads (city blocks).
    ctx.fillStyle = '#3a3a44';
    for (let bx = -1100; bx <= 1100; bx += W.roadGap) {
      for (let bz = -800; bz <= 800; bz += W.roadGap) {
        if (bz >= W.beachZ - 100) continue;
        ctx.fillRect(sx(bx + 12), sy(bz + 12), sx(bx + W.blockSize) - sx(bx + 12), sy(bz + W.blockSize) - sy(bz + 12));
      }
    }
    // Neon Plaza.
    ctx.fillStyle = '#6a5a7a';
    ctx.fillRect(sx(-90), sy(-90), sx(90) - sx(-90), sy(90) - sy(-90));
    // Beach + ocean (south strip).
    ctx.fillStyle = '#d9b380'; ctx.fillRect(0, sy(W.beachZ), S, S - sy(W.beachZ));
    ctx.fillStyle = '#0e4d7a'; ctx.fillRect(0, sy(W.oceanZ), S, S - sy(W.oceanZ));
    // Marina water (east edge).
    ctx.fillStyle = '#0e4d7a'; ctx.fillRect(sx(1010), sy(240), S - sx(1010), sy(560) - sy(240));
    // Roads, drawn bright so the grid reads at a glance.
    ctx.strokeStyle = '#9a9aa8'; ctx.lineWidth = 3;
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      ctx.beginPath(); ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), sy(W.beachZ)); ctx.stroke();
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      ctx.beginPath(); ctx.moveTo(0, sy(z)); ctx.lineTo(S, sy(z)); ctx.stroke();
    }
    // Beach road.
    ctx.beginPath(); ctx.moveTo(0, sy(730)); ctx.lineTo(S, sy(730)); ctx.stroke();
    // Buildings as solid blocks so the city reads, not just the grid.
    ctx.fillStyle = '#9a8fd6';
    for (const b of G.world.buildings) {
      ctx.fillRect(sx(b.x - b.w / 2), sy(b.z - b.d / 2), Math.max(2, (b.w / W.sizeX) * S), Math.max(2, (b.d / W.sizeZ) * S));
    }
    const dot = (x, z, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(sx(x), sy(z), r, 0, Math.PI * 2); ctx.fill();
    };
    // Mission marker: the mission target, or the live beacon when the
    // mission has no fixed target (staged shots, m7 survive phase).
    if (G.mission && G.mission.target) {
      dot(G.mission.target.x, G.mission.target.z, 6, '#ff2e88');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx(G.mission.target.x), sy(G.mission.target.z), 8, 0, Math.PI * 2); ctx.stroke();
    } else if (G.world.beacon && G.world.beacon.visible) {
      const bp = G.world.beacon.position;
      dot(bp.x, bp.z, 6, '#ff2e88');
    }
    // Police cruisers + roadblocks + heli.
    for (const c of NV_POLICE.cruisers) dot(c.group.position.x, c.group.position.z, 3, '#4aa8ff');
    for (const rb of NV_POLICE.roadblocks) {
      for (const c of rb.cars) dot(c.group.position.x, c.group.position.z, 3, '#4aa8ff');
    }
    if (NV_POLICE.heli) dot(NV_POLICE.heli.group.position.x, NV_POLICE.heli.group.position.z, 4, '#ffd75e');
    // Mission actors: V, guards, courier, rival, payoff truck.
    if (NV_MISSIONS.v) dot(NV_MISSIONS.v.pos.x, NV_MISSIONS.v.pos.z, 4, '#19c3ff');
    for (const gd of NV_MISSIONS.guards) dot(gd.pos.x, gd.pos.z, 3, '#ff5040');
    if (NV_MISSIONS.courier) dot(NV_MISSIONS.courier.group.position.x, NV_MISSIONS.courier.group.position.z, 4, '#ffd75e');
    if (NV_MISSIONS.rival) dot(NV_MISSIONS.rival.group.position.x, NV_MISSIONS.rival.group.position.z, 4, '#b06ae8');
    if (NV_MISSIONS.truck) dot(NV_MISSIONS.truck.group.position.x, NV_MISSIONS.truck.group.position.z, 4, '#ffd75e');
    // Player arrow.
    const pp = G.player.inCar ? G.player.car.group.position : G.player.pos;
    const yaw = G.player.inCar ? G.player.car.yaw : G.player.yaw;
    ctx.save();
    ctx.translate(sx(pp.x), sy(pp.z));
    ctx.rotate(-yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
};
