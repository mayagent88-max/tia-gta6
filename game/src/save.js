// Save and load through localStorage (this browser only). The v2 save
// holds cash, completed jobs, garage upgrades, the AURA CREW (respect,
// district standing, unlocked members) and the owned cars Jax keeps in
// his garage, so a run survives a reload.
const NV_SAVE = {
  key: 'nv-aura-city-save-v2',
  load() {
    const empty = {
      cash: 0, missionsDone: 0,
      upgrades: { engine: 0, armor: 0, nitro: 0 },
      crew: NV_CREW.fresh(),
      ownedCars: [],
    };
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return empty;
      const d = JSON.parse(raw);
      const u = d.upgrades || {};
      const c = d.crew || {};
      const s = c.standing || {};
      const un = c.unlocked || {};
      return {
        cash: d.cash | 0,
        missionsDone: d.missionsDone | 0,
        upgrades: { engine: u.engine | 0, armor: u.armor | 0, nitro: u.nitro | 0 },
        crew: {
          respect: c.respect | 0,
          standing: {
            plaza: s.plaza | 0, beach: s.beach | 0,
            marina: s.marina | 0, garage: s.garage | 0,
          },
          unlocked: {
            v: true,
            lio: !!un.lio, mira: !!un.mira, kiki: !!un.kiki,
          },
        },
        ownedCars: Array.isArray(d.ownedCars) ? d.ownedCars.map((o) => ({
          name: String(o.name || 'KEPT CAR'),
          color: o.color | 0,
          kind: String(o.kind || 'parked'),
          upgrades: {
            engine: (o.upgrades && o.upgrades.engine) | 0,
            armor: (o.upgrades && o.upgrades.armor) | 0,
            nitro: (o.upgrades && o.upgrades.nitro) | 0,
          },
        })) : [],
      };
    } catch (e) { return empty; }
  },
  save(G) {
    try {
      localStorage.setItem(this.key, JSON.stringify({
        cash: G.cash,
        missionsDone: G.missionsDone,
        upgrades: G.upgrades || { engine: 0, armor: 0, nitro: 0 },
        crew: G.crew || NV_CREW.fresh(),
        ownedCars: (G.ownedCars || []).map((o) => ({
          name: o.name, color: o.color, kind: o.kind, upgrades: o.upgrades,
        })),
      }));
    } catch (e) {}
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch (e) {}
  },
};
