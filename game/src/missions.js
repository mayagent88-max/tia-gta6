// The story: three jobs for Jax and V, each a small state machine with
// phases, objectives, guards and rewards. Missions are started with M
// and progress is saved, so the story continues across visits.
import { LANDMARKS, MISSIONS } from './config.js';
import { makeCar, makeGuard } from './entities.js';
import { dist2 } from './random.js';
import { addWanted, clearWanted, fireAt } from './police.js';
import { writeSave } from './save.js';

export function startMission(G, index) {
  if (G.mission || index >= MISSIONS.length) return false;
  const def = MISSIONS[index];
  G.mission = {
    index,
    def,
    phase: 'start',
    phaseTimer: 0,
    hackTimer: 90,
    wave: 0,
    waveTimer: 0,
    banner: null,
  };
  G.sounds.missionStart();
  G.dialog = { title: def.title, lines: [def.brief], timer: 6 };
  if (index === 0) {
    // The prototype waits in the Neon Plaza Garage.
    const car = makeCar('sports', LANDMARKS.garage.x, LANDMARKS.garage.y, -Math.PI / 2, '#ff2e88');
    car.driver = null;
    car.prototype = true;
    G.cars.push(car);
    G.prototypeCar = car;
    G.mission.phase = 'goto-garage';
  } else if (index === 1) {
    G.mission.phase = 'goto-atm';
  } else if (index === 2) {
    const car = makeCar('sports', LANDMARKS.hideout.x + 60, LANDMARKS.hideout.y, 0, '#00e5ff');
    car.driver = null;
    car.getaway = true;
    G.cars.push(car);
    G.getawayCar = car;
    G.mission.phase = 'get-car';
  }
  return true;
}

export function missionObjective(G) {
  const m = G.mission;
  if (!m) {
    return G.missionsDone < 3
      ? `Press M to start ${MISSIONS[G.missionsDone].title}`
      : 'All jobs done — Aura City is yours. Free roam!';
  }
  if (m.index === 0) {
    if (m.phase === 'goto-garage') return 'Steal the AURA GT prototype — Neon Plaza Garage';
    if (m.phase === 'escape') return 'Lose the heat! Bring the AURA GT to the Hideout';
  }
  if (m.index === 1) {
    if (m.phase === 'goto-atm') return 'Get to the Central ATM so V can start the hack';
    if (m.phase === 'defend') return `Protect V while she hacks — ${Math.ceil(m.hackTimer)}s left`;
  }
  if (m.index === 2) {
    if (m.phase === 'get-car') return 'Get in the getaway car at the Hideout';
    if (m.phase === 'drive') return 'Drive the beach road to the Marina boat — do not stop!';
  }
  return m.def.title;
}

export function missionMarker(G) {
  const m = G.mission;
  if (!m) {
    if (G.missionsDone < 3) {
      const next = G.missionsDone;
      if (next === 0) return { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y };
      if (next === 1) return { x: LANDMARKS.atm.x, y: LANDMARKS.atm.y };
      return { x: LANDMARKS.hideout.x, y: LANDMARKS.hideout.y };
    }
    return null;
  }
  if (m.index === 0) {
    if (m.phase === 'goto-garage') return { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y };
    return { x: LANDMARKS.hideout.x, y: LANDMARKS.hideout.y };
  }
  if (m.index === 1) return { x: LANDMARKS.atm.x, y: LANDMARKS.atm.y };
  if (m.index === 2) {
    if (m.phase === 'get-car') return { x: LANDMARKS.hideout.x, y: LANDMARKS.hideout.y };
    return { x: LANDMARKS.marina.x, y: LANDMARKS.marina.y };
  }
  return null;
}

function completeMission(G) {
  const m = G.mission;
  const reward = m.def.reward;
  G.cash += reward;
  G.missionsDone = Math.max(G.missionsDone, m.index + 1);
  G.save.bestCash = Math.max(G.save.bestCash, G.cash);
  G.save.cash = G.cash;
  G.save.missionsDone = G.missionsDone;
  writeSave(G.save);
  G.banner = { title: 'MISSION COMPLETE', sub: `+$${reward.toLocaleString('en-US')} — ${m.def.title}`, timer: 3.5 };
  G.sounds.missionComplete();
  clearWanted(G);
  G.guards = [];
  G.v = null;
  G.sunset = false;
  const doneIndex = m.index;
  G.mission = null;
  if (doneIndex === 2) {
    G.screen = 'ending';
    G.sounds.setEngine(false, 0);
    G.sounds.setSiren(false);
  }
}

function failMission(G, reason) {
  G.missionFailed = reason;
  G.banner = { title: 'MISSION FAILED', sub: reason, timer: 3.5 };
  G.sounds.missionFail();
  G.guards = [];
  G.v = null;
  G.sunset = false;
  G.mission = null;
  G.player.health = 100;
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m) return;
  const player = G.player;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;

  if (m.index === 0) {
    if (m.phase === 'escape') {
      const d = Math.sqrt(dist2(px, py, LANDMARKS.hideout.x, LANDMARKS.hideout.y));
      if (player.inCar === G.prototypeCar && d < 140) {
        completeMission(G);
        return;
      }
    }
  }

  if (m.index === 1) {
    if (m.phase === 'goto-atm') {
      const d = Math.sqrt(dist2(px, py, LANDMARKS.atm.x, LANDMARKS.atm.y));
      if (d < 120) {
        m.phase = 'defend';
        m.hackTimer = 90;
        m.wave = 0;
        m.waveTimer = 0;
        G.v = { x: LANDMARKS.atm.x + 30, y: LANDMARKS.atm.y + 10, health: 100, angle: 0, kind: 'v' };
        G.dialog = { title: 'V IS IN', lines: ['V: "Ninety seconds. Keep the street clear and do not let them touch me."'], timer: 5 };
        G.message = 'Defend V — security is coming!';
        G.messageTimer = 3;
      }
    } else if (m.phase === 'defend') {
      m.hackTimer -= dt;
      // Waves of security guards close in on the ATM.
      m.waveTimer -= dt;
      const waveSize = [2, 3, 4][m.wave] || 0;
      if (m.wave < 3 && m.waveTimer <= 0) {
        m.wave += 1;
        m.waveTimer = 30;
        for (let i = 0; i < waveSize; i += 1) {
          const angle = G.rng.range(0, Math.PI * 2);
          const guard = makeGuard(LANDMARKS.atm.x + Math.cos(angle) * 420, LANDMARKS.atm.y + Math.sin(angle) * 420);
          G.guards.push(guard);
        }
        G.message = `Security wave ${m.wave} incoming!`;
        G.messageTimer = 2.5;
      }
      // Guards hunt V, and shoot the player when close.
      for (const guard of G.guards) {
        if (guard.health <= 0) continue;
        const target = G.v && G.v.health > 0 ? G.v : player;
        const tx = target.inCar ? target.inCar.x : target.x;
        const ty = target.inCar ? target.inCar.y : target.y;
        const d = Math.sqrt(dist2(guard.x, guard.y, tx, ty));
        guard.angle = Math.atan2(ty - guard.y, tx - guard.x);
        if (d > 300) {
          guard.x += Math.cos(guard.angle) * guard.speed * dt;
          guard.y += Math.sin(guard.angle) * guard.speed * dt;
        } else {
          guard.fireCooldown -= dt;
          if (guard.fireCooldown <= 0) {
            guard.fireCooldown = 1.6;
            fireAt(G, guard.x, guard.y, tx, ty, 'enemy', 6);
          }
        }
      }
      G.guards = G.guards.filter((g) => g.health > 0);
      if (G.missionFailed) {
        failMission(G, G.missionFailed);
        G.missionFailed = null;
        return;
      }
      if (m.hackTimer <= 0) {
        completeMission(G);
        return;
      }
    }
  }

  if (m.index === 2) {
    if (m.phase === 'drive') {
      const d = Math.sqrt(dist2(px, py, LANDMARKS.marina.x, LANDMARKS.marina.y));
      if (player.inCar === G.getawayCar && d < 170) {
        completeMission(G);
        return;
      }
    }
  }
}

// Called from the enter-car action: stealing the prototype or taking the
// getaway car advances the mission it belongs to.
export function onEnterCar(G, car) {
  const m = G.mission;
  if (!m) return;
  if (m.index === 0 && m.phase === 'goto-garage' && car.prototype) {
    m.phase = 'escape';
    addWanted(G, 2);
    G.dialog = { title: 'ALARM!', lines: ['V: "You tripped the garage alarm. Lose them and get to the Hideout!"'], timer: 5 };
    G.message = 'The AURA GT is yours — now lose the heat!';
    G.messageTimer = 3;
    G.sounds.pickup();
  }
  if (m.index === 2 && m.phase === 'get-car' && car.getaway) {
    m.phase = 'drive';
    G.sunset = true;
    addWanted(G, 3);
    G.dialog = { title: 'GOLDEN HOUR', lines: ['V: "Sunset run. Beach road, all the way to the boat. Do not stop."'], timer: 5 };
    G.sounds.pickup();
  }
}
