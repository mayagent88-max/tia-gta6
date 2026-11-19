// The garage at AURA MOTORS: Jax's owned cars live here. Keep a stolen
// car with K and it joins the collection (up to 4); the garage tunes the
// selected owned car — engine (top speed), armor (car HP), nitro (a Shift
// boost with a meter) — three levels each, bought with mission cash.
// Upgrades belong to the car, persist in the save, and follow it wherever
// Jax drives it. Lio's crew discount takes 20% off every price.
const NV_GARAGE = {
  rows: [
    { key: 'engine', label: 'ENGINE', desc: '+8% top speed / level' },
    { key: 'armor', label: 'ARMOR', desc: '+50 car HP / level' },
    { key: 'nitro', label: 'NITRO', desc: 'Shift boost, bigger meter / level' },
  ],
  maxOwned: 4,

  costs(key) { return NV_CONFIG.garage[key]; },

  // The car the garage is tuning right now: the one Jax sits in when it
  // is owned, otherwise the selected car from the collection.
  selectedCar(G) {
    const P = G.player;
    if (P.inCar && P.car && P.car.owned) return P.car.owned;
    return (G.ownedCars && G.ownedCars[G.selectedOwned || 0]) || null;
  },

  nextCost(G, key, owned) {
    const lvl = (owned && owned.upgrades[key]) || 0;
    const table = this.costs(key);
    if (lvl >= table.length) return null;
    return Math.round(table[lvl] * NV_CREW.garageMult(G));
  },

  nearGarage(G) {
    const L = G.world.locations.garage;
    const pp = G.player.inCar ? G.player.car.group.position : G.player.pos;
    return Math.hypot(pp.x - L.x, pp.z - L.z) < 20;
  },

  // Can this car be kept? Only cars Jax stole off the street — never
  // police, mission or prototype cars.
  keepable(car) {
    return car && !car.wrecked && !car.owned &&
      (car.kind === 'parked' || car.kind === 'traffic');
  },

  keepCar(G, car) {
    if (!this.keepable(car)) return null;
    if ((G.ownedCars || []).length >= this.maxOwned) {
      NV_HUD.banner(G, 'GARAGE FULL — 4 CARS MAX');
      return null;
    }
    const name = NV_CONFIG.carNames[(G.ownedCars.length * 3 + (car.color % 5)) % NV_CONFIG.carNames.length];
    const owned = {
      name, color: car.color, kind: car.kind,
      upgrades: { engine: 0, armor: 0, nitro: 0 },
    };
    car.owned = owned;
    G.ownedCars.push(owned);
    G.selectedOwned = G.ownedCars.length - 1;
    NV_MAIN.applyUpgrades(G, car);
    NV_SAVE.save(G);
    NV_AUDIO.jingle();
    NV_HUD.banner(G, 'KEPT: ' + name + ' — PARKED AT AURA MOTORS');
    NV_HUD.dialog(G, 'V: Nice — ' + name + ' is yours now. Tune it at the garage.', 5);
    return owned;
  },

  // Park an owned car at the garage yard (used when loading a save).
  parkOwned(G, owned, slot) {
    const L = G.world.locations.garage;
    const car = NV_ENTITIES.makeCar(owned.color, owned.kind);
    car.group.position.set(L.x - 40 + slot * 16, 0, L.z + 34);
    car.yaw = Math.PI / 2;
    car.group.rotation.y = car.yaw;
    car.owned = owned;
    car.group.userData.owner = { kind: 'car', ref: car };
    G.scene.add(car.group);
    G.cars.push(car);
    return car;
  },

  // Summon the selected owned car to the garage yard.
  summon(G) {
    const owned = this.selectedCar(G);
    if (!owned) { NV_HUD.garageNote(G, 'No owned car yet — steal one and press K.'); return false; }
    const car = this.parkOwned(G, owned, 0);
    NV_MAIN.applyUpgrades(G, car);
    NV_HUD.garageNote(G, owned.name + ' is waiting in the yard.');
    return true;
  },

  cycleSelected(G) {
    if (!G.ownedCars || !G.ownedCars.length) return;
    G.selectedOwned = ((G.selectedOwned || 0) + 1) % G.ownedCars.length;
    NV_HUD.showGarage(G);
    NV_AUDIO.click();
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
    const owned = this.selectedCar(G);
    if (!owned) { NV_HUD.garageNote(G, 'No owned car here — steal one and press K first.'); return false; }
    const cost = this.nextCost(G, key, owned);
    if (cost === null) { NV_HUD.garageNote(G, 'Already maxed out.'); return false; }
    if (G.cash < cost) { NV_HUD.garageNote(G, 'Not enough cash — $' + cost + ' needed.'); return false; }
    G.cash -= cost;
    owned.upgrades[key] = (owned.upgrades[key] || 0) + 1;
    // Apply at once to the car Jax is sitting in, when it is this one.
    if (G.player.inCar && G.player.car && G.player.car.owned === owned) {
      NV_MAIN.applyUpgrades(G, G.player.car);
    }
    NV_SAVE.save(G);
    NV_AUDIO.jingle();
    NV_HUD.garageNote(G, owned.name + ' ' + key.toUpperCase() + ' upgraded to level ' + owned.upgrades[key] + '!');
    NV_HUD.showGarage(G);
    return true;
  },
};
