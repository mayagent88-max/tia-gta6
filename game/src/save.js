// Save and load through localStorage (this browser only). The save holds
// cash and completed jobs so a run survives a reload.
const NV_SAVE = {
  key: 'nv-aura-city-save-v1',
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return { cash: 0, missionsDone: 0 };
      const d = JSON.parse(raw);
      return { cash: d.cash | 0, missionsDone: d.missionsDone | 0 };
    } catch (e) { return { cash: 0, missionsDone: 0 }; }
  },
  save(G) {
    try {
      localStorage.setItem(this.key, JSON.stringify({ cash: G.cash, missionsDone: G.missionsDone }));
    } catch (e) {}
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch (e) {}
  },
};
