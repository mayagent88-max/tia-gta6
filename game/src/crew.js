// The AURA CREW: respect, crew members and district standing — the
// progression layer that rewards play. Every finished job earns respect
// and raises standing in the district it happened in; standing pays a
// bonus on later jobs there, and respect unlocks crew members whose
// passive bonuses change how the city plays.
const NV_CREW = {
  // Respect ranks: 25 respect per finished job, so Lio joins after the
  // third job, Mira after the sixth, Kiki after the ninth.
  ranks: [
    { min: 0, name: 'NOBODY' },
    { min: 75, name: 'HUSTLER' },
    { min: 150, name: 'STREET KING' },
    { min: 225, name: 'AURA LEGEND' },
  ],
  // Crew members and what they do for Jax. V is there from the start.
  members: {
    v: { name: 'V', role: 'HACKER', desc: 'Channels and hacks run 20% faster', at: 0 },
    lio: { name: 'LIO', role: 'MECHANIC', desc: 'Garage upgrades cost 20% less', at: 75 },
    mira: { name: 'MIRA', role: 'DRIVER', desc: 'Owned cars run 12% faster', at: 150 },
    kiki: { name: 'KIKI', role: 'LOOKOUT', desc: 'Wanted stars cool off twice as fast', at: 225 },
  },
  // The four districts of Aura City, each with a standing level 0-5.
  // Standing pays +5% per level on jobs in that district.
  districts: [
    { id: 'plaza', name: 'NEON PLAZA', cx: 0, cz: 0, r: 230 },
    { id: 'beach', name: 'KUMALA STRAND', cx: 0, cz: 730, r: 280 },
    { id: 'marina', name: 'MARINA', cx: 1100, cz: 400, r: 280 },
    { id: 'garage', name: 'GARAGE YARD', cx: -700, cz: -500, r: 280 },
  ],

  // Fresh progression state (merged over the save on load).
  fresh() {
    return {
      respect: 0,
      standing: { plaza: 0, beach: 0, marina: 0, garage: 0 },
      unlocked: { v: true, lio: false, mira: false, kiki: false },
    };
  },

  // Per-member rank letter (r1 style: "FIXER rank B"): D when the member
  // joins, then a letter every 25 respect above their unlock threshold —
  // V can reach S by the finale, Kiki tops out at C.
  rankLetter(G, key) {
    const m = this.members[key];
    if (!m) return '';
    const letters = ['D', 'C', 'B', 'A', 'S'];
    const respect = (G.crew && G.crew.respect) || 0;
    const idx = Math.max(0, Math.min(4, Math.floor((respect - m.at) / 25)));
    return letters[idx];
  },

  rankName(respect) {
    let name = 'NOBODY';
    for (const r of this.ranks) if (respect >= r.min) name = r.name;
    return name;
  },

  // Nearest district to a point; null when far from every district.
  districtOf(x, z) {
    let best = null, bestD = 1e9;
    for (const d of this.districts) {
      const dd = Math.hypot(x - d.cx, z - d.cz);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return bestD <= 420 ? best : null;
  },

  districtName(id) {
    const d = this.districts.find((x) => x.id === id);
    return d ? d.name : 'AURA CITY';
  },

  has(G, key) {
    return !!(G.crew && G.crew.unlocked && G.crew.unlocked[key]);
  },

  // Payout multiplier for a job in a district: +5% per standing level.
  payoutMult(G, district) {
    if (!district || district === 'mixed') return 1;
    const lvl = (G.crew && G.crew.standing[district]) || 0;
    return 1 + 0.05 * lvl;
  },

  // V hacks faster: channel and hack timers drain 20% quicker.
  channelRate(G) { return this.has(G, 'v') ? 1.2 : 1; },

  // Lio's garage discount: 20% off every upgrade while he is crew.
  garageMult(G) { return this.has(G, 'lio') ? 0.8 : 1; },

  // Mira's handling bonus, applied to owned cars at enterCar time.
  topSpeedMult(G) { return this.has(G, 'mira') ? 1.12 : 1; },

  // Kiki's lookout bonus: wanted heat cools off twice as fast.
  decayMult(G) { return this.has(G, 'kiki') ? 2 : 1; },

  // Award respect + standing when a job completes. Returns the list of
  // crew members who just unlocked, so the game can celebrate them.
  award(G, district) {
    const crew = G.crew;
    crew.respect += 25;
    const gained = [];
    if (district && district !== 'mixed' && crew.standing[district] < 5) {
      crew.standing[district] += 1;
    }
    for (const key of Object.keys(this.members)) {
      const m = this.members[key];
      if (!crew.unlocked[key] && crew.respect >= m.at) {
        crew.unlocked[key] = true;
        gained.push(m);
      }
    }
    NV_SAVE.save(G);
    return gained;
  },

  // Usable crew abilities (keys Z/X/C/B, one per member, with cooldowns).
  // Each member's ability is a real tool in a chase, not just a passive:
  // V swaps the plates (a star drops), Lio patches the car on the spot,
  // Mira fires a nitro surge, Kiki puts eyes on every unit.
  abilities: {
    v: { name: 'SWAP PLATES', key: 'z', cd: 45, desc: 'Drop 1 wanted star' },
    lio: { name: 'QUICK FIX', key: 'x', cd: 30, desc: 'Repair the car +25 HP' },
    mira: { name: 'NITRO SURGE', key: 'c', cd: 40, desc: 'Nitro full + 6s boost' },
    kiki: { name: 'EYES OUT', key: 'b', cd: 35, desc: 'Mark police on map' },
  },

  // Cooldowns tick down while playing (G.crewCds, seconds left per key).
  tick(G, dt) {
    if (!G.crewCds) G.crewCds = {};
    for (const k of Object.keys(G.crewCds)) {
      G.crewCds[k] = Math.max(0, G.crewCds[k] - dt);
    }
    if (G.eyesOutT > 0) G.eyesOutT = Math.max(0, G.eyesOutT - dt);
  },

  // Fire a crew ability. Returns true when it went off (cooldown starts),
  // false when it fizzled (locked, cooling down, or no car to use it on).
  useAbility(G, key) {
    const def = this.abilities[key];
    if (!def || !this.has(G, key)) return false;
    const cds = G.crewCds || (G.crewCds = {});
    if ((cds[key] || 0) > 0) {
      NV_HUD.banner(G, def.name + ' — ' + Math.ceil(cds[key]) + 's COOLDOWN');
      return false;
    }
    const P = G.player;
    if (key === 'v') {
      if (G.wanted <= 0) { NV_HUD.banner(G, 'SWAP PLATES — NO HEAT TO DROP'); return false; }
      G.wanted -= 1;
      NV_POLICE.heat = 100;
      if (G.wanted === 0) NV_AUDIO.setSiren(false);
      NV_HUD.banner(G, 'SWAP PLATES — HEAT DOWN TO ' + G.wanted + ' STAR' + (G.wanted === 1 ? '' : 'S'));
    } else if (key === 'lio') {
      if (P.inCar && P.car) {
        const car = P.car;
        car.hp = Math.min(car.hpMax || 100, car.hp + 50);
        P.hp = Math.min(100, P.hp + 25);
        NV_HUD.banner(G, 'QUICK FIX — CAR PATCHED UP');
      } else {
        P.hp = Math.min(100, P.hp + 25);
        NV_HUD.banner(G, 'QUICK FIX — PATCHED UP +25 HP');
      }
    } else if (key === 'mira') {
      if (!P.inCar || !P.car) { NV_HUD.banner(G, 'NITRO SURGE — NEED A CAR FIRST'); return false; }
      P.car.nitro = 100;
      P.car.surgeT = 6;
      NV_HUD.banner(G, 'NITRO SURGE — HOLD SHIFT AND FLY');
    } else if (key === 'kiki') {
      G.eyesOutT = 20;
      NV_HUD.banner(G, 'EYES OUT — KIKI HAS EYES ON EVERY UNIT');
    }
    cds[key] = def.cd;
    NV_AUDIO.pickup();
    return true;
  },

  // A short line for the HUD: rank, respect and the crew on board.
  hudLine(G) {
    const crew = G.crew || this.fresh();
    const names = Object.keys(this.members)
      .filter((k) => crew.unlocked[k])
      .map((k) => this.members[k].name)
      .join(' · ');
    return 'RESPECT ' + crew.respect + ' · ' + this.rankName(crew.respect) + ' — CREW: ' + names;
  },

  // Current district line for the HUD, with its standing pips.
  districtLine(G) {
    const P = G.player;
    const pp = P.inCar ? P.car.group.position : P.pos;
    const d = this.districtOf(pp.x, pp.z);
    if (!d) return 'AURA CITY — OPEN STREETS';
    const lvl = (G.crew && G.crew.standing[d.id]) || 0;
    let pips = '';
    for (let i = 0; i < 5; i += 1) pips += i < lvl ? '★' : '☆';
    return d.name + ' ' + pips + '  +' + (lvl * 5) + '% PAY';
  },
};
