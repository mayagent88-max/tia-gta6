// The HUD: cash, health, weapons + ammo, wanted stars, radio station,
// respect + district standing + crew, the mission objective, dialog
// (with a speaker portrait), the KPD dispatch panel, banners, the
// garage prompt, the weapon wheel and the live minimap.
// Screens (title/pause/wasted/busted/ending) are plain overlays toggled
// from here.
// Final-build note (re-record, 2026-11-19): the HUD now shows everything the
// leader's frame shows — HP + ARMOUR bars, a live speedo (km/h, car name, damage %),
// the crew-ability panel with rank letters, the named stage chip, the KPD dispatch
// panel with live named units, and the radio station + song line.
const NV_HUD = {
  els: {}, dialogT: 0, bannerT: 0,

  // Character portraits: simple canvas faces, drawn in code (no images).
  portraits: {
    v: { skin: '#e8b88a', hair: '#19c3ff', name: 'V', role: 'HACKER' },
    lio: { skin: '#c98d5a', hair: '#ff7a2e', name: 'LIO', role: 'MECHANIC' },
    mira: { skin: '#e8b88a', hair: '#b06ae8', name: 'MIRA', role: 'DRIVER' },
    kiki: { skin: '#d9a066', hair: '#39d353', name: 'KIKI', role: 'LOOKOUT' },
    jax: { skin: '#e8b88a', hair: '#222233', name: 'JAX', role: 'DRIVER' },
  },
  drawPortrait(key) {
    const c = this.els.face;
    if (!c) return;
    const ctx = c.getContext('2d');
    const p = this.portraits[key] || this.portraits.jax;
    const shirt = key === 'v' ? '#19c3ff' : key === 'jax' ? '#ff5a3c' : key === 'mira' ? '#b06ae8' : key === 'lio' ? '#ff7a2e' : key === 'kiki' ? '#39d353' : '#33334a';
    // Backdrop: a soft radial glow in the member's colour.
    const grad = ctx.createRadialGradient(32, 30, 4, 32, 32, 48);
    grad.addColorStop(0, shirt);
    grad.addColorStop(1, '#101018');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    // Shoulders / shirt with a pale collar line.
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(6, 64);
    ctx.quadraticCurveTo(12, 46, 32, 44);
    ctx.quadraticCurveTo(52, 46, 58, 64);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(30, 46, 4, 18);
    // Neck + face, with a shaded cheek, a forehead highlight from the
    // top-left light, a jaw shadow and a neck shadow.
    ctx.fillStyle = p.skin;
    ctx.fillRect(28, 38, 8, 8);
    ctx.beginPath();
    ctx.ellipse(32, 26, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(40, 28, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(27, 17, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(32, 39, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(28, 38, 8, 3);
    // Hair, drawn per character.
    ctx.fillStyle = p.hair;
    if (key === 'mira') {
      ctx.beginPath(); ctx.ellipse(32, 14, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(47, 32, 4, 10, 0.3, 0, Math.PI * 2); ctx.fill(); // ponytail
    } else if (key === 'lio') {
      ctx.beginPath(); ctx.ellipse(32, 14, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c98d5a'; ctx.fillRect(18, 44, 28, 8); // beard
    } else if (key === 'kiki') {
      ctx.beginPath(); ctx.arc(19, 15, 7, 0, Math.PI * 2); ctx.arc(45, 15, 7, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(18, 28);
      ctx.quadraticCurveTo(19, 8, 32, 8);
      ctx.quadraticCurveTo(45, 8, 46, 28);
      ctx.lineTo(42, 16);
      ctx.quadraticCurveTo(32, 12, 22, 16);
      ctx.closePath();
      ctx.fill();
    }
    // Hair strands + a light streak so the hair reads as hair, not a cap,
    // and a rim light on the head's top-left edge.
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (const sx of [24, 30, 36]) {
      ctx.beginPath(); ctx.moveTo(sx, 10); ctx.quadraticCurveTo(sx + 1, 14, sx, 17); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(24, 9); ctx.quadraticCurveTo(30, 8, 38, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(32, 26, 13.5, Math.PI, Math.PI * 1.5); ctx.stroke();
    // Eyes: white, coloured iris, dark pupil, catchlight, eyebrow above each.
    const iris = key === 'v' ? '#19c3ff' : key === 'lio' ? '#6b4a2a' : key === 'mira' ? '#7a4fd0' : key === 'kiki' ? '#2fae4e' : '#3a3a4a';
    for (const ex of [26, 38]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, 24, 3.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.arc(ex, 24, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(ex, 24, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex + 0.7, 23.2, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(ex - 3, 18.5, 6, 1);
    }
    // Nose + two-tone lips (darker upper, lighter lower).
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(32, 27); ctx.lineTo(31, 31); ctx.stroke();
    ctx.fillStyle = '#8a3a3a';
    ctx.fillRect(28, 35, 8, 1);
    ctx.fillStyle = '#b06a6a';
    ctx.fillRect(28, 36, 8, 1);
    // Per-character accessory.
    if (key === 'v') {
      ctx.strokeStyle = '#19c3ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(32, 24, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.fillStyle = '#19c3ff';
      ctx.fillRect(17, 22, 3, 6); ctx.fillRect(44, 22, 3, 6);
    }
    if (key === 'lio') {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      for (const ex of [26, 38]) { ctx.beginPath(); ctx.arc(ex, 24, 4.2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(30, 24); ctx.lineTo(34, 24); ctx.stroke();
    }
    if (key === 'mira') {
      ctx.fillStyle = '#e8304f';
      ctx.fillRect(19, 13, 26, 4);
      ctx.beginPath(); ctx.moveTo(45, 14); ctx.lineTo(51, 12); ctx.lineTo(50, 18); ctx.closePath(); ctx.fill();
    }
    if (key === 'kiki') {
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath(); ctx.arc(32, 16, 12, Math.PI, 0); ctx.fill();
      ctx.fillRect(20, 14, 24, 3);
    }
    // Accent bar at the bottom.
    ctx.fillStyle = shirt;
    ctx.fillRect(0, 60, 64, 4);
  },

  init() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      hud: $('hud'), cash: $('cash'), hpfill: $('hpfill'), hptext: $('hptext'),
      ammo: $('ammo'), weapons: $('weapons'), nitro: $('nitro'), nitrofill: $('nitrofill'),
      upgrades: $('upgrades'), radio: $('radio'),
      respect: $('respect'), district: $('district'),
      stars: $('stars'), objective: $('objective'),
      armfill: $('armfill'), armtext: $('armtext'),
      crewpanel: $('crew-panel'),
      stage: $('stage'),
      speedo: $('speedo'), speed: $('speed'), carname: $('carname'), cardmg: $('cardmg'),
      dialog: $('dialog'), face: $('dialog-face'), dname: $('dialog-name'), dtext: $('dialog-text'),
      dispatch: $('dispatch'),
      banner: $('banner'), crosshair: $('crosshair'),
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
  // Dialog with a speaker portrait: a "V: ..." prefix becomes V's face
  // + name, the prefix stripped from the shown text; "NEW CREW: LIO —"
  // shows that member. Lines with no speaker show no portrait.
  dialog(G, text, secs) {
    let speaker = null, body = text;
    const crewMatch = text.match(/^NEW CREW: ([A-Z]+) —/);
    if (crewMatch) {
      speaker = crewMatch[1].toLowerCase();
      body = text;
    } else {
      const m = text.match(/^([A-Z]+): (.*)$/);
      if (m && this.portraits[m[1].toLowerCase()]) {
        speaker = m[1].toLowerCase();
        body = m[2];
      }
    }
    const e = this.els;
    if (speaker && this.portraits[speaker]) {
      this.drawPortrait(speaker);
      e.face.classList.remove('hidden');
      const p = this.portraits[speaker];
      e.dname.textContent = p.name + ' — ' + p.role;
      e.dname.classList.remove('hidden');
    } else {
      e.face.classList.add('hidden');
      e.dname.classList.add('hidden');
    }
    e.dtext.textContent = body;
    e.dialog.classList.remove('hidden');
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

  // --- Weapon wheel overlay (hold Tab): all four weapons, fists show ∞.
  showWheel(G, sel) {
    const e = this.els;
    e.wheelSlots.innerHTML = NV_CONFIG.weaponOrder.map((k) => {
      const d = NV_CONFIG.weapons[k];
      const cur = sel === k;
      const ammo = d.melee ? '∞' : (G.player.ammoBy[k] + ' / ' + d.mag);
      return '<div class="wheelslot' + (cur ? ' on' : '') + '"><b>' + d.name + '</b><span>' + ammo + '</span></div>';
    }).join('');
    e.wheel.classList.remove('hidden');
  },
  hideWheel(G) { this.els.wheel.classList.add('hidden'); },

  // --- KPD dispatch panel: the responding units, live, nearest first.
  // Shown during a chase (2+ stars), hidden when calm.
  drawDispatch(G) {
    const e = this.els.dispatch;
    if (G.wanted < 2 || G.screen !== 'playing') { e.classList.add('hidden'); return; }
    const pp = G.player.inCar ? G.player.car.group.position : G.player.pos;
    const dist = (p) => Math.hypot(p.x - pp.x, p.z - pp.z);
    const units = [];
    for (const c of NV_POLICE.cruisers) {
      units.push({ name: c.callsign || 'KPD', role: c.role || 'PURSUIT', d: dist(c.group.position) });
    }
    for (const rb of NV_POLICE.roadblocks) {
      for (const c of rb.cars) {
        units.push({ name: c.callsign || 'BLOCK', role: 'ROADBLOCK', d: dist(c.group.position) });
      }
    }
    for (const o of NV_POLICE.officers.slice(0, 2)) {
      units.push({ name: o.callsign || 'KPD', role: o.role || 'FOOT PATROL', d: dist(o.pos) });
    }
    if (NV_POLICE.heli) {
      units.push({ name: 'AIR-1', role: 'AIR UNIT', d: dist(NV_POLICE.heli.group.position) });
    }
    units.sort((a, b) => a.d - b.d);
    const rows = units.slice(0, 6).map((u) => (
      '<div class="drow"><span class="dcall">' + u.name + '</span>' +
      '<span class="drole">' + u.role + '</span>' +
      '<span class="ddist">' + Math.round(u.d) + ' m</span></div>'
    )).join('');
    const extra = units.length > 6
      ? '<div class="drow dmore">+' + (units.length - 6) + ' more</div>' : '';
    e.innerHTML = '<div class="dhead">KPD RESPONSE &nbsp;·&nbsp; ' + units.length + ' UNITS</div>' + rows + extra;
    e.classList.remove('hidden');
  },

  update(G, dt) {
    const e = this.els;
    const P = G.player;
    NV_COMBAT.ensureWeapons(P);
    e.cash.textContent = '$' + G.cash;
    const hp = Math.max(0, Math.ceil(P.hp));
    e.hpfill.style.width = hp + '%';
    e.hptext.textContent = 'HP ' + hp;
    // Armour vest: absorbs damage first, blue bar beside HP.
    const arm = Math.max(0, Math.ceil(P.armour || 0));
    e.armfill.style.width = arm + '%';
    e.armtext.textContent = 'ARMOUR ' + arm;
    const w = NV_COMBAT.weaponDef(P);
    e.ammo.textContent = P.inCar ? 'DRIVING' : (P.reloadT > 0 ? 'RELOADING…' : (w.melee ? 'FISTS ∞' : w.name + ' ' + P.ammo + ' / ' + w.mag));
    // Weapon slots: [1] FISTS [2] PISTOL [3] SMG [4] AR-9, current one highlighted.
    e.weapons.innerHTML = NV_CONFIG.weaponOrder.map((k, i) => {
      const d = NV_CONFIG.weapons[k];
      const cur = P.weapon === k;
      const ammo = d.melee ? '∞' : (P.ammoBy[k] + '/' + d.mag);
      return '<span class="wslot' + (cur ? ' on' : '') + '">' + (i + 1) + ' ' + d.name + ' ' + ammo + '</span>';
    }).join('');
    // KPD dispatch panel during a chase.
    this.drawDispatch(G);
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
    e.radio.textContent = '♪ ' + NV_AUDIO.radioLine();
    // Respect + crew, and the district the player is standing in.
    e.respect.textContent = NV_CREW.hudLine(G);
    e.district.textContent = NV_CREW.districtLine(G);
    // Speedo (bottom right, above the minimap): live km/h, car name,
    // damage % — only while driving.
    if (P.inCar && P.car) {
      e.speedo.classList.remove('hidden');
      // The speedo reads the car's speed — or speedDisplay, the posed
      // value the screenshot staging sets so a parked pose can read as
      // a chase (108 km/h) without the car driving out of frame.
      e.speed.textContent = String(Math.round(Math.abs(P.car.speedDisplay ?? P.car.speed) * 3.6));
      e.carname.textContent = NV_ENTITIES.carDisplayName(P.car);
      const dmg = Math.max(0, Math.round(100 * (1 - (P.car.hp || 0) / (P.car.hpMax || 100))));
      e.cardmg.textContent = dmg + '% DENTED';
      e.cardmg.style.color = dmg >= 60 ? '#ff4d6d' : '#ff8fb8';
    } else {
      e.speedo.classList.add('hidden');
    }
    // Crew-ability panel: each member, key, ability, rank letter and cooldown.
    e.crewpanel.innerHTML = Object.keys(NV_CREW.members).map((key) => {
      const m = NV_CREW.members[key];
      const a = NV_CREW.abilities[key];
      const got = NV_CREW.has(G, key);
      const cd = Math.ceil((G.crewCds || {})[key] || 0);
      const state = !got ? 'LOCKED' : cd > 0 ? cd + 's' : 'READY';
      const cls = cd > 0 ? 'crow cd' : 'crow';
      const rank = got ? ' · RANK ' + NV_CREW.rankLetter(G, key) : '';
      return '<div class="' + cls + '"><span class="ckey">' + a.key.toUpperCase() + '</span>' +
        '<span class="cname">' + m.name + ' · ' + m.role + rank + '</span> ' + a.name +
        ' <span class="cdesc">' + a.desc + '</span>' +
        '<span class="cstate">' + state + '</span></div>';
    }).join('');
    // Mission stage chip: "STAGE 3/5 · NEON HEIST" while a job runs.
    const stageTxt = NV_MISSIONS.stageText(G);
    if (stageTxt) {
      e.stage.classList.remove('hidden');
      e.stage.textContent = stageTxt;
    } else {
      e.stage.classList.add('hidden');
    }
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

  // Zoomed minimap: a 900x700 world-unit window around the player, so
  // streets and blocks read instead of the whole city collapsing into
  // a noise grid. The window clamps to the city bounds.
  drawMinimap(G) {
    const ctx = this.els.minimapCtx;
    const W = NV_CONFIG.world;
    const S = 220;
    const pp0 = G.player.inCar ? G.player.car.group.position : G.player.pos;
    const VW = 900, VH = 700;
    const cx = Math.max(-W.sizeX / 2 + VW / 2, Math.min(W.sizeX / 2 - VW / 2, pp0.x));
    const cz = Math.max(-W.sizeZ / 2 + VH / 2, Math.min(W.sizeZ / 2 - VH / 2, pp0.z));
    const sx = (x) => (x - (cx - VW / 2)) / VW * S;
    const sy = (z) => (z - (cz - VH / 2)) / VH * S;
    // Dark city base so the bright roads read at a glance.
    ctx.fillStyle = '#0e0e16';
    ctx.fillRect(0, 0, S, S);
    // Sidewalk pads (city blocks), dark so roads + buildings pop.
    ctx.fillStyle = '#26263a';
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
    // Roads, bright and thick so the grid reads, not the blocks.
    ctx.strokeStyle = '#a8a8b8'; ctx.lineWidth = 4;
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      ctx.beginPath(); ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), sy(W.beachZ)); ctx.stroke();
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      ctx.beginPath(); ctx.moveTo(0, sy(z)); ctx.lineTo(S, sy(z)); ctx.stroke();
    }
    // Beach road.
    ctx.beginPath(); ctx.moveTo(0, sy(730)); ctx.lineTo(S, sy(730)); ctx.stroke();
    // Buildings as muted blocks so the city reads, not just the grid.
    ctx.fillStyle = '#8a7fd0';
    for (const b of G.world.buildings) {
      ctx.fillRect(sx(b.x - b.w / 2), sy(b.z - b.d / 2), Math.max(3, (b.w / VW) * S), Math.max(3, (b.d / VH) * S));
    }
    const dot = (x, z, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(sx(x), sy(z), r, 0, Math.PI * 2); ctx.fill();
    };
    // Mission marker: the mission target, or the live beacon when the
    // mission has no fixed target (staged shots, m7 survive phase).
    if (G.mission && G.mission.target) {
      dot(G.mission.target.x, G.mission.target.z, 7, '#ff2e88');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx(G.mission.target.x), sy(G.mission.target.z), 10, 0, Math.PI * 2); ctx.stroke();
    } else if (G.world.beacon && G.world.beacon.visible) {
      const bp = G.world.beacon.position;
      dot(bp.x, bp.z, 7, '#ff2e88');
    }
    // Police cruisers + roadblocks + heli.
    for (const c of NV_POLICE.cruisers) dot(c.group.position.x, c.group.position.z, 4, '#4aa8ff');
    for (const rb of NV_POLICE.roadblocks) {
      for (const c of rb.cars) dot(c.group.position.x, c.group.position.z, 4, '#4aa8ff');
    }
    if (NV_POLICE.heli) dot(NV_POLICE.heli.group.position.x, NV_POLICE.heli.group.position.z, 5, '#ffd75e');
    // Kiki's EYES OUT: while it is live, every KPD unit is ringed gold
    // on the minimap so the player can thread the gaps.
    if ((G.eyesOutT || 0) > 0) {
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2;
      const ring = (x, z) => { ctx.beginPath(); ctx.arc(sx(x), sy(z), 7, 0, Math.PI * 2); ctx.stroke(); };
      for (const c of NV_POLICE.cruisers) ring(c.group.position.x, c.group.position.z);
      for (const rb of NV_POLICE.roadblocks) {
        for (const c of rb.cars) ring(c.group.position.x, c.group.position.z);
      }
      if (NV_POLICE.heli) ring(NV_POLICE.heli.group.position.x, NV_POLICE.heli.group.position.z);
    }
    // Mission actors: V, guards, courier, rival, payoff truck.
    if (NV_MISSIONS.v) dot(NV_MISSIONS.v.pos.x, NV_MISSIONS.v.pos.z, 4, '#19c3ff');
    for (const gd of NV_MISSIONS.guards) dot(gd.pos.x, gd.pos.z, 3, '#ff5040');
    if (NV_MISSIONS.courier) dot(NV_MISSIONS.courier.group.position.x, NV_MISSIONS.courier.group.position.z, 4, '#ffd75e');
    if (NV_MISSIONS.rival) dot(NV_MISSIONS.rival.group.position.x, NV_MISSIONS.rival.group.position.z, 4, '#b06ae8');
    if (NV_MISSIONS.truck) dot(NV_MISSIONS.truck.group.position.x, NV_MISSIONS.truck.group.position.z, 4, '#ffd75e');
    // Player arrow, bigger so it never drowns in the grid.
    const pp = G.player.inCar ? G.player.car.group.position : G.player.pos;
    const yaw = G.player.inCar ? G.player.car.yaw : G.player.yaw;
    ctx.save();
    ctx.translate(sx(pp.x), sy(pp.z));
    ctx.rotate(-yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -6); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
};
