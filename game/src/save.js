// Save and load through localStorage (this browser only). The save holds
// mission progress and cash, so a returning player continues the story
// instead of starting over.
export const SAVE_KEY = 'neon-velocity-aura-city.save.v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { missionsDone: 0, cash: 0, bestCash: 0 };
    const data = JSON.parse(raw);
    return {
      missionsDone: Math.max(0, Math.min(3, data.missionsDone | 0)),
      cash: Math.max(0, data.cash | 0),
      bestCash: Math.max(0, data.bestCash | 0),
    };
  } catch {
    return { missionsDone: 0, cash: 0, bestCash: 0 };
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private mode or a full store: the game still runs, it just forgets.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore.
  }
}
