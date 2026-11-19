// The HUD: cash, health, ammo, wanted stars, the mission objective, dialog,
// banners and the live minimap. Screens (title/pause/wasted/busted/ending)
// are plain overlays toggled from here.
const NV_HUD = {
  els: {}, dialogT: 0, bannerT: 0,

  init() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      hud: $('hud'), cash: $('cash'), hpfill: $('hpfill'), hptext: $('hptext'),
      ammo: $('ammo'), stars: $('stars'), objective: $('objective'),
      dialog: $('dialog'), banner: $('banner'), crosshair: $('crosshair'),
      minimap: $('minimap'),
      title: $('title-screen'), pause: $('pause-screen'),
      wasted: $('wasted-screen'), busted: $('busted-screen'), ending: $('ending-screen'),
      saveLine: $('save-line'), endingStats: $('ending-stats'),
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
        e.saveLine.textContent = 'Save found: ' + G.missionsDone + '/3 jobs done, $' + G.cash + ' banked.';
      }
    }
    if (name === 'paused') e.pause.classList.remove('hidden');
    if (name === 'wasted') e.wasted.classList.remove('hidden');
    if (name === 'busted') e.busted.classList.remove('hidden');
    if (name === 'ending') {
      e.endingStats.textContent = 'Jobs done: ' + G.missionsDone + '/3 · Cash banked: $' + G.cash;
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

  update(G, dt) {
    const e = this.els;
    const P = G.player;
    e.cash.textContent = '$' + G.cash;
    const hp = Math.max(0, Math.ceil(P.hp));
    e.hpfill.style.width = hp + '%';
    e.hptext.textContent = 'HP ' + hp;
    e.ammo.textContent = P.inCar ? 'DRIVING' : (P.reloadT > 0 ? 'RELOADING…' : 'AMMO ' + P.ammo + ' / ' + NV_CONFIG.player.magSize);
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
    ctx.fillStyle = '#0a1410';
    ctx.fillRect(0, 0, S, S);
    // Beach + ocean (south strip).
    ctx.fillStyle = '#d9b380'; ctx.fillRect(0, sy(W.beachZ), S, S - sy(W.beachZ));
    ctx.fillStyle = '#0e4d7a'; ctx.fillRect(0, sy(W.oceanZ), S, S - sy(W.oceanZ));
    // Roads.
    ctx.strokeStyle = '#5a5a66'; ctx.lineWidth = 2;
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      ctx.beginPath(); ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), sy(W.beachZ)); ctx.stroke();
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      ctx.beginPath(); ctx.moveTo(0, sy(z)); ctx.lineTo(S, sy(z)); ctx.stroke();
    }
    const dot = (x, z, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(sx(x), sy(z), r, 0, Math.PI * 2); ctx.fill();
    };
    // Mission marker.
    if (G.mission) dot(G.mission.target.x, G.mission.target.z, 6, '#ff2e88');
    // Police cruisers + heli.
    for (const c of NV_POLICE.cruisers) dot(c.group.position.x, c.group.position.z, 3, '#4aa8ff');
    if (NV_POLICE.heli) dot(NV_POLICE.heli.group.position.x, NV_POLICE.heli.group.position.z, 4, '#ffd75e');
    if (NV_MISSIONS.v) dot(NV_MISSIONS.v.pos.x, NV_MISSIONS.v.pos.z, 4, '#19c3ff');
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
