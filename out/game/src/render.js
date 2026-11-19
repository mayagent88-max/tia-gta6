// Drawing only: the city, the cars, the people, the helicopter and the
// light. The camera follows the player; only what the viewport sees is
// drawn. The HUD lives in hud.js.
import { BEACH_TOP, LANDMARKS, OCEAN_TOP, PALETTE, ROAD_WIDTH, ROAD_X, ROAD_Y, VIEW, WORLD } from './config.js';
import { clamp } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_ENDING = 'ending';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function inView(G, x, y, margin) {
    const cam = G.camera;
    return x > cam.x - margin && x < cam.x + VIEW.width + margin && y > cam.y - margin && y < cam.y + VIEW.height + margin;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGround(G) {
    const cam = G.camera;
    // Grass base for the whole visible area.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x, cam.y, VIEW.width, VIEW.height);
    // Mow stripes for a little texture.
    ctx.fillStyle = PALETTE.grassDark;
    const stripe = 120;
    const startY = Math.floor(cam.y / stripe) * stripe;
    for (let y = startY; y < cam.y + VIEW.height; y += stripe * 2) {
      ctx.fillRect(cam.x, y, VIEW.width, stripe);
    }
    // Beach and ocean along the south edge.
    if (cam.y + VIEW.height > BEACH_TOP) {
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(cam.x, BEACH_TOP, VIEW.width, OCEAN_TOP - BEACH_TOP);
      ctx.fillStyle = PALETTE.sandWet;
      ctx.fillRect(cam.x, OCEAN_TOP - 14, VIEW.width, 14);
      ctx.fillStyle = PALETTE.ocean;
      ctx.fillRect(cam.x, OCEAN_TOP, VIEW.width, cam.y + VIEW.height - OCEAN_TOP);
      // Animated wave lines.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let w = 0; w < 3; w += 1) {
        const wy = OCEAN_TOP + 24 + w * 34 + Math.sin(G.time * 1.4 + w * 2) * 5;
        ctx.beginPath();
        for (let x = cam.x - 40; x < cam.x + VIEW.width + 40; x += 40) {
          const yy = wy + Math.sin(x * 0.02 + G.time * 2 + w) * 4;
          if (x === cam.x - 40) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.oceanDeep;
      ctx.fillRect(cam.x, OCEAN_TOP + 150, VIEW.width, 6);
    }
    // Parks and the plaza.
    for (const park of G.world.parks) {
      if (!inView(G, park.x + park.w / 2, park.y + park.h / 2, Math.max(park.w, park.h))) continue;
      ctx.fillStyle = park.kind === 'plaza' ? '#b8a8d8' : '#4a8a4a';
      ctx.fillRect(park.x, park.y, park.w, park.h);
      if (park.kind === 'plaza') {
        ctx.strokeStyle = PALETTE.neon[0];
        ctx.lineWidth = 3;
        ctx.strokeRect(park.x + 6, park.y + 6, park.w - 12, park.h - 12);
      }
    }
  }

  function drawRoads(G) {
    const cam = G.camera;
    const half = ROAD_WIDTH / 2;
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of ROAD_X) ctx.fillRect(rx - half - 10, Math.max(0, cam.y), ROAD_WIDTH + 20, Math.min(WORLD.height, cam.y + VIEW.height) - Math.max(0, cam.y));
    for (const ry of ROAD_Y) ctx.fillRect(Math.max(0, cam.x), ry - half - 10, Math.min(WORLD.width, cam.x + VIEW.width) - Math.max(0, cam.x), ROAD_WIDTH + 20);
    ctx.fillStyle = PALETTE.road;
    for (const rx of ROAD_X) ctx.fillRect(rx - half, Math.max(0, cam.y), ROAD_WIDTH, Math.min(WORLD.height, cam.y + VIEW.height) - Math.max(0, cam.y));
    for (const ry of ROAD_Y) ctx.fillRect(Math.max(0, cam.x), ry - half, Math.min(WORLD.width, cam.x + VIEW.width) - Math.max(0, cam.x), ROAD_WIDTH);
    // Centre dashes.
    ctx.strokeStyle = PALETTE.lane;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    ctx.beginPath();
    for (const rx of ROAD_X) {
      if (rx < cam.x - 10 || rx > cam.x + VIEW.width + 10) continue;
      ctx.moveTo(rx, Math.max(0, cam.y));
      ctx.lineTo(rx, Math.min(WORLD.height, cam.y + VIEW.height));
    }
    for (const ry of ROAD_Y) {
      if (ry < cam.y - 10 || ry > cam.y + VIEW.height + 10) continue;
      ctx.moveTo(Math.max(0, cam.x), ry);
      ctx.lineTo(Math.min(WORLD.width, cam.x + VIEW.width), ry);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Beach road along the sand.
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(Math.max(0, cam.x), 2180, Math.min(WORLD.width, cam.x + VIEW.width) - Math.max(0, cam.x), 56);
    ctx.strokeStyle = PALETTE.lane;
    ctx.setLineDash([26, 30]);
    ctx.beginPath();
    ctx.moveTo(Math.max(0, cam.x), 2208);
    ctx.lineTo(Math.min(WORLD.width, cam.x + VIEW.width), 2208);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBuildings(G) {
    for (const b of G.world.buildings) {
      if (!inView(G, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
      // Soft shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = PALETTE.buildingEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Rooftop details: vents and a lighter inner court.
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 8, 16, 16);
      if (b.neon) {
        ctx.strokeStyle = b.neon;
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      }
    }
    // The Central ATM kiosk.
    const atm = LANDMARKS.atm;
    if (inView(G, atm.x, atm.y, 60)) {
      ctx.fillStyle = '#20242e';
      roundRect(atm.x - 16, atm.y - 16, 32, 32, 6);
      ctx.fill();
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ATM', atm.x, atm.y + 5);
    }
    // The Marina: two boats on the sand.
    const marina = LANDMARKS.marina;
    if (inView(G, marina.x, marina.y, 120)) {
      for (const off of [-40, 30]) {
        ctx.fillStyle = '#f2f2f2';
        ctx.beginPath();
        ctx.ellipse(marina.x + off, marina.y + 40, 34, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff2e88';
        ctx.fillRect(marina.x + off - 4, marina.y + 22, 8, 18);
      }
    }
  }

  function drawPalms(G) {
    for (const palm of G.world.palms) {
      if (!inView(G, palm.x, palm.y, 40)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(palm.x + 6, palm.y + 8, 14 * palm.size, 6 * palm.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.palmTrunk;
      ctx.lineWidth = 3 * palm.size;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y + 6);
      ctx.lineTo(palm.x, palm.y - 8 * palm.size);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palmLeaf;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.ellipse(palm.x + Math.cos(a) * 12 * palm.size, palm.y - 8 * palm.size + Math.sin(a) * 8 * palm.size, 12 * palm.size, 4.5 * palm.size, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCar(G, car) {
    const x = car.x;
    const y = car.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    // Shadow and body.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(-23 + 3, -11 + 4, 46, 22, 7);
    ctx.fill();
    ctx.fillStyle = car.wreck ? '#2a2a2a' : car.color;
    roundRect(-23, -11, 46, 22, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Cabin and windshield.
    ctx.fillStyle = car.wreck ? '#1a1a1a' : '#20242e';
    roundRect(-6, -9, 16, 18, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    ctx.fillRect(8, -8, 4, 16);
    // Police light bar, flashing with time.
    if (car.carKind === 'police') {
      ctx.fillStyle = Math.floor(G.time * 4) % 2 === 0 ? '#ff2e2e' : '#1e5cff';
      ctx.fillRect(-14, -9, 7, 5);
      ctx.fillStyle = Math.floor(G.time * 4) % 2 === 0 ? '#1e5cff' : '#ff2e2e';
      ctx.fillRect(-14, 4, 7, 5);
      ctx.fillStyle = '#0a0a0a';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACPD', -14, 2);
    }
    // The prototype carries a neon stripe.
    if (car.prototype) {
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
    }
    if (car.getaway) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
    }
    // Brake lights and headlights.
    if (car.brakeLights) {
      ctx.fillStyle = '#ff2e2e';
      ctx.fillRect(-24, -9, 3, 5);
      ctx.fillRect(-24, 4, 3, 5);
    }
    if (G.sunset) {
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      ctx.fillRect(22, -8, 5, 4);
      ctx.fillRect(22, 4, 5, 4);
    }
    ctx.restore();
    if (car.skid > 0) {
      ctx.strokeStyle = 'rgba(20,20,20,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(car.angle) * 30, y - Math.sin(car.angle) * 30);
      ctx.lineTo(x - Math.cos(car.angle) * 55, y - Math.sin(car.angle) * 55);
      ctx.stroke();
    }
  }

  function drawPerson(G, x, y, angle, color, radius, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, radius, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (radius + 5), y + Math.sin(angle) * (radius + 5));
    ctx.stroke();
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - radius - 6);
    }
  }

  function drawWorld(G) {
    drawGround(G);
    drawRoads(G);
    drawBuildings(G);
    drawPalms(G);
    // Skid-free parked and traffic cars, then the living ones.
    for (const car of G.cars) {
      if (inView(G, car.x, car.y, 60)) drawCar(G, car);
    }
    for (const ped of G.peds) {
      if (ped.state === 'down') {
        drawPerson(G, ped.x, ped.y, ped.angle, '#8a8a8a', 9);
        continue;
      }
      if (inView(G, ped.x, ped.y, 30)) drawPerson(G, ped.x, ped.y, ped.angle, ped.color, 9);
    }
    for (const officer of G.officers) {
      if (officer.health > 0 && inView(G, officer.x, officer.y, 30)) {
        drawPerson(G, officer.x, officer.y, officer.angle, '#1e5cff', 11, 'ACPD');
      }
    }
    for (const guard of G.guards) {
      if (guard.health > 0 && inView(G, guard.x, guard.y, 30)) {
        drawPerson(G, guard.x, guard.y, guard.angle, '#c81e3a', 11, 'SEC');
      }
    }
    if (G.v && G.v.health > 0) {
      drawPerson(G, G.v.x, G.v.y, G.v.angle, '#b45cff', 11, 'V');
      // Hack progress ring over V.
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(G.v.x, G.v.y, 18, -Math.PI / 2, -Math.PI / 2 + (1 - (G.mission ? G.mission.hackTimer : 0) / 90) * Math.PI * 2);
      ctx.stroke();
    }
    // Bullets and particles.
    for (const b of G.bullets) {
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(b.angle) * 12, b.y - Math.sin(b.angle) * 12);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of G.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // The player, on foot or driving.
    const player = G.player;
    if (!player.inCar) {
      const blink = player.hurtFlash > 0 && Math.floor(player.hurtFlash * 12) % 2 === 0;
      if (!blink) {
        drawPerson(G, player.x, player.y, player.angle, PALETTE.player, player.radius, 'JAX');
        // Aim line.
        ctx.strokeStyle = 'rgba(255,230,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20);
        ctx.lineTo(player.x + Math.cos(player.angle) * 44, player.y + Math.sin(player.angle) * 44);
        ctx.stroke();
      }
    }
    // Mission marker: a pulsing beacon over the objective.
    const marker = G.marker;
    if (marker && inView(G, marker.x, marker.y, 80)) {
      const pulse = 1 + Math.sin(G.time * 4) * 0.15;
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 26 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.moveTo(marker.x, marker.y - 34);
      ctx.lineTo(marker.x - 8, marker.y - 20);
      ctx.lineTo(marker.x + 8, marker.y - 20);
      ctx.closePath();
      ctx.fill();
    }
    // The helicopter: shadow on the ground, body above it, searchlight.
    if (G.heli) {
      const heli = G.heli;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(heli.x + 34, heli.y + 40, 30, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,180,0.10)';
      ctx.beginPath();
      ctx.moveTo(heli.x, heli.y);
      ctx.lineTo(heli.x - 60, heli.y + 190);
      ctx.lineTo(heli.x + 60, heli.y + 190);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(heli.x, heli.y);
      ctx.rotate(heli.angle);
      ctx.fillStyle = PALETTE.heli;
      roundRect(-26, -12, 52, 24, 10);
      ctx.fill();
      ctx.fillStyle = '#9adfff';
      ctx.fillRect(12, -8, 10, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      const rotor = heli.rotor % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(-Math.cos(rotor) * 34, -Math.sin(rotor) * 34);
      ctx.lineTo(Math.cos(rotor) * 34, Math.sin(rotor) * 34);
      ctx.stroke();
      ctx.restore();
    }
    // Sunset wash for mission 3 and the cover: warm light, long mood.
    if (G.sunset) {
      const grad = ctx.createLinearGradient(0, G.camera.y, 0, G.camera.y + VIEW.height);
      grad.addColorStop(0, 'rgba(255,120,40,0.10)');
      grad.addColorStop(0.6, 'rgba(255,80,120,0.10)');
      grad.addColorStop(1, 'rgba(120,40,160,0.16)');
      ctx.fillStyle = grad;
      ctx.fillRect(G.camera.x, G.camera.y, VIEW.width, VIEW.height);
    }
  }

  function draw(G, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 22 : 0;
    const shakeY = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 22 : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    ctx.save();
    ctx.translate(-G.camera.x, -G.camera.y);
    drawWorld(G);
    ctx.restore();
    return view;
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
