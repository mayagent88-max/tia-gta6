// The HUD: cash, health, ammo, wanted stars, the mission objective,
// the minimap and every screen panel (title, pause, wasted, busted,
// ending). Drawn in screen space, after the world.
import { LANDMARKS, MISSIONS, PLAYER, STORY, VIEW, WORLD } from './config.js';
import { clamp } from './random.js';
import { missionMarker, missionObjective } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function drawHud(G, ctx) {
  const player = G.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: cash and health.
  ctx.fillStyle = 'rgba(10,12,20,0.72)';
  roundRect(ctx, 14, 14, 250, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#7cff00';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${G.cash.toLocaleString('en-US')}`, 28, 42);
  ctx.fillStyle = '#333';
  roundRect(ctx, 28, 50, 140, 12, 6);
  ctx.fill();
  ctx.fillStyle = player.health > 40 ? '#7cff00' : '#ff2e2e';
  roundRect(ctx, 28, 50, 140 * clamp(player.health / PLAYER.health, 0, 1), 12, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`HP ${Math.ceil(player.health)}`, 176, 61);
  // Ammo, under the cash panel, only on foot.
  if (!player.inCar) {
    ctx.fillStyle = 'rgba(10,12,20,0.72)';
    roundRect(ctx, 14, 86, 150, 34, 10);
    ctx.fill();
    ctx.fillStyle = player.reloading > 0 ? '#ffb13a' : '#fff';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(player.reloading > 0 ? 'RELOADING…' : `AMMO ${player.ammo} / ${player.ammoMax}`, 26, 108);
  }
  // Top-right: wanted stars.
  if (G.wanted > 0) {
    ctx.fillStyle = 'rgba(10,12,20,0.72)';
    roundRect(ctx, VIEW.width - 214, 14, 200, 40, 10);
    ctx.fill();
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < G.wanted ? '#ffe600' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', VIEW.width - 200 + i * 34, 42);
    }
  }
  // Bottom-left: the current objective.
  ctx.fillStyle = 'rgba(10,12,20,0.72)';
  const objective = missionObjective(G);
  ctx.font = `bold 15px ${FONT}`;
  const objWidth = Math.min(560, ctx.measureText(objective).width + 32);
  roundRect(ctx, 14, VIEW.height - 52, objWidth, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe600';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ ${objective}`, 28, VIEW.height - 29);
  // A short-lived message line above the objective.
  if (G.message && G.messageTimer > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = `15px ${FONT}`;
    ctx.fillText(G.message, 28, VIEW.height - 62);
  }
  // Controls hint, bottom centre.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('WASD move / drive   •   E enter car   •   Click shoot   •   M mission   •   P pause', VIEW.width / 2, VIEW.height - 8);
  drawMinimap(G, ctx);
  // Dialog box (mission briefs) at the top centre.
  if (G.dialog && G.dialog.timer > 0) {
    const lines = G.dialog.lines;
    const width = 640;
    const height = 66 + lines.length * 20;
    ctx.fillStyle = 'rgba(10,12,20,0.85)';
    roundRect(ctx, (VIEW.width - width) / 2, 84, width, height, 12);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(G.dialog.title, VIEW.width / 2, 110);
    ctx.fillStyle = '#fff';
    ctx.font = `15px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 134 + i * 20));
  }
  // Mission banner (complete / failed), centre screen.
  if (G.banner && G.banner.timer > 0) {
    ctx.fillStyle = 'rgba(10,12,20,0.8)';
    roundRect(ctx, (VIEW.width - 520) / 2, VIEW.height / 2 - 70, 520, 110, 14);
    ctx.fill();
    ctx.fillStyle = G.banner.title.includes('FAILED') ? '#ff2e2e' : '#7cff00';
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(G.banner.title, VIEW.width / 2, VIEW.height / 2 - 22);
    ctx.fillStyle = '#fff';
    ctx.font = `17px ${FONT}`;
    ctx.fillText(G.banner.sub, VIEW.width / 2, VIEW.height / 2 + 12);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMinimap(G, ctx) {
  const mw = 190;
  const mh = 142;
  const mx = VIEW.width - mw - 14;
  const my = VIEW.height - mh - 14;
  const sx = mw / WORLD.width;
  const sy = mh / WORLD.height;
  ctx.fillStyle = 'rgba(10,12,20,0.78)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  // Ocean and sand.
  ctx.fillStyle = '#1d6f9e';
  ctx.fillRect(mx, my + (2080 * sy), mw, mh - 2080 * sy);
  ctx.fillStyle = '#3f7d4a';
  ctx.fillRect(mx, my, mw, 2080 * sy);
  // Roads.
  ctx.strokeStyle = 'rgba(200,200,210,0.8)';
  ctx.lineWidth = 1.5;
  for (const rx of [200, 600, 1000, 1400, 1800, 2200, 2600, 3000]) {
    ctx.beginPath();
    ctx.moveTo(mx + rx * sx, my);
    ctx.lineTo(mx + rx * sx, my + 2080 * sy);
    ctx.stroke();
  }
  for (const ry of [200, 600, 1000, 1400, 1800, 2200]) {
    ctx.beginPath();
    ctx.moveTo(mx, my + ry * sy);
    ctx.lineTo(mx + mw, my + ry * sy);
    ctx.stroke();
  }
  // Buildings as faint blocks.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const b of G.world.buildings) {
    ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
  }
  // Mission marker, pulsing.
  const marker = missionMarker(G);
  if (marker) {
    const pulse = 3 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(mx + marker.x * sx, my + marker.y * sy, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police as red dots, the player as a white arrow.
  ctx.fillStyle = '#ff2e2e';
  for (const car of G.cars) {
    if (car.driver === 'police') {
      ctx.beginPath();
      ctx.arc(mx + car.x * sx, my + car.y * sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const px = G.player.inCar ? G.player.inCar.x : G.player.x;
  const py = G.player.inCar ? G.player.inCar.y : G.player.y;
  ctx.save();
  ctx.translate(mx + px * sx, my + py * sy);
  ctx.rotate(G.player.inCar ? G.player.inCar.angle : G.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North label.
  ctx.fillStyle = '#fff';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('N', mx + 4, my + 12);
  ctx.restore();
}

// Full-screen panels for the title, pause, wasted, busted and ending
// screens. The title paints over the live city behind it.
export function drawPanel(G, ctx, screen) {
  if (screen === 'title') {
    ctx.fillStyle = 'rgba(8,10,24,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2e88';
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText(STORY.title, VIEW.width / 2, 190);
    ctx.fillStyle = '#00e5ff';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`— ${STORY.subtitle} —`, VIEW.width / 2, 232);
    ctx.fillStyle = '#fff';
    ctx.font = `17px ${FONT}`;
    STORY.intro.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 280 + i * 26));
    ctx.fillStyle = '#b8bcc8';
    ctx.font = `14px ${FONT}`;
    STORY.controls.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 392 + i * 22));
    if (G.save.missionsDone > 0) {
      ctx.fillStyle = '#7cff00';
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(`Continue: ${G.save.missionsDone} of 3 jobs done — $${G.save.cash.toLocaleString('en-US')} earned`, VIEW.width / 2, 528);
    }
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold 22px ${FONT}`;
    const blink = Math.floor(G.time * 2) % 2 === 0;
    if (blink) ctx.fillText('PRESS ENTER OR CLICK TO START', VIEW.width / 2, 580);
    return;
  }
  ctx.fillStyle = 'rgba(8,10,24,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  if (screen === 'paused') {
    ctx.fillStyle = '#fff';
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText('PAUSED', VIEW.width / 2, 330);
    ctx.fillStyle = '#b8bcc8';
    ctx.font = `18px ${FONT}`;
    ctx.fillText('Press P to resume', VIEW.width / 2, 372);
  } else if (screen === 'wasted') {
    ctx.fillStyle = '#ff2e2e';
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('WASTED', VIEW.width / 2, 330);
    ctx.fillStyle = '#fff';
    ctx.font = `18px ${FONT}`;
    ctx.fillText('Jax went down. The Syndicate is not impressed.', VIEW.width / 2, 372);
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('Press R to try again', VIEW.width / 2, 420);
  } else if (screen === 'busted') {
    ctx.fillStyle = '#1e5cff';
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('BUSTED', VIEW.width / 2, 330);
    ctx.fillStyle = '#fff';
    ctx.font = `18px ${FONT}`;
    ctx.fillText('The Aura City Police Department has you. For now.', VIEW.width / 2, 372);
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('Press R to try again', VIEW.width / 2, 420);
  } else if (screen === 'ending') {
    ctx.fillStyle = '#7cff00';
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText('THE GILDED CAGE', VIEW.width / 2, 280);
    ctx.fillStyle = '#fff';
    ctx.font = `20px ${FONT}`;
    ctx.fillText('Three jobs. One sunset. The debt is gone.', VIEW.width / 2, 330);
    ctx.fillText('Jax and V sail out of Aura City as the city locks down behind them.', VIEW.width / 2, 360);
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`Total earned: $${G.cash.toLocaleString('en-US')}`, VIEW.width / 2, 420);
    ctx.fillStyle = '#b8bcc8';
    ctx.font = `16px ${FONT}`;
    ctx.fillText('Press R to keep roaming Aura City', VIEW.width / 2, 470);
  }
}

export { LANDMARKS, MISSIONS };
