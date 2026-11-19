// The garage at AURA MOTORS: spend mission cash on three upgrade lines
// for the cars Jax drives — engine (top speed), armor (car HP), nitro
// (a Shift boost with a meter). Upgrades live on G.upgrades, persist in
// the save, and apply to whichever car the player is driving.
const NV_GARAGE = {
  rows: [
    { key: 'engine', label: 'ENGINE', desc: '+8% top speed / level' },
    { key: 'armor', label: 'ARMOR', desc: '+50 car HP / level' },
    { key: 'nitro', label: 'NITRO', desc: 'Shift boost, bigger meter / level' },
  ],

  costs(key) { return NV_CONFIG.garage[key]; },

  nextCost(G, key) {
    const lvl = (G.upgrades && G.upgrades[key]) || 0;
    const table = this.costs(key);
    return lvl >= table.length ? null : table[lvl];
  },

  nearGarage(G) {
    const L = G.world.locations.garage;
    const pp = G.player.inCar ? G.player.car.group.position : G.player.pos;
    return Math.hypot(pp.x - L.x, pp.z - L.z) < 20;
  },

  open(G) {
    G.garageOpen = true;
    NV_HUD.showGarage(G);
    NV_AUDIO.click();
  },

  close(G) {
    G.garageOpen = false;
    NV_HUD.hideGarage(G);
  },

  buy(G, key) {
    const cost = this.nextCost(G, key);
    if (cost === null) { NV_HUD.garageNote(G, 'Already maxed out.'); return false; }
    if (G.cash < cost) { NV_HUD.garageNote(G, 'Not enough cash — $' + cost + ' needed.'); return false; }
    G.cash -= cost;
    G.upgrades[key] = (G.upgrades[key] || 0) + 1;
    // Apply at once to the car Jax is sitting in.
    if (G.player.inCar && G.player.car) NV_MAIN.applyUpgrades(G, G.player.car);
    NV_SAVE.save(G);
    NV_AUDIO.jingle();
    NV_HUD.garageNote(G, key.toUpperCase() + ' upgraded to level ' + G.upgrades[key] + '!');
    NV_HUD.showGarage(G);
    return true;
  },
};
