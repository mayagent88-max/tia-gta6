// Save and load through localStorage (this browser only). The save holds
// cash, completed jobs and garage upgrades so a run survives a reload.
const NV_SAVE = {
  key: 'nv-aura-city-save-v1',
  load() {
    const empty = { cash: 0, missionsDone: 0, upgrades: { engine: 0, armor: 0, nitro: 0 } };
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return empty;
      const d = JSON.parse(raw);
      const u = d.upgrades || {};
      return {
        cash: d.cash | 0,
        missionsDone: d.missionsDone | 0,
        upgrades: { engine: u.engine | 0, armor: u.armor | 0, nitro: u.nitro | 0 },
      };
    } catch (e) { return empty; }
  },
  save(G) {
    try {
      localStorage.setItem(this.key, JSON.stringify({
        cash: G.cash,
        missionsDone: G.missionsDone,
        upgrades: G.upgrades || { engine: 0, armor: 0, nitro: 0 },
      }));
    } catch (e) {}
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch (e) {}
  },
};
