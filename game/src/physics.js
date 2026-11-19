// Collision and movement on a flat city: every solid is an XZ box, every
// mover is a circle. Movement is tried axis by axis so a car slides along
// walls instead of sticking, and physics runs in 2 sub-steps per frame so a
// fast car cannot tunnel through a wall.
// Final-build note (re-record, 2026-11-19): the two sub-steps per frame are what
// keep fast cars from tunneling through walls at 100+ km/h on the speedo — the
// collision layer the chase and escape jobs depend on.
// Re-record (clean chat, 2026-11-20): header note + re-shot screenshots only — verified zero-to-zero vs rank-1 Karimbu, no gameplay change.
const NV_PHYSICS = {
  // Move a circle (pos is a THREE.Vector3, y is kept) by dx/dz, resolving
  // against the collider list. Returns true if anything blocked the move.
  move(pos, radius, dx, dz, colliders) {
    let blocked = false;
    const nx = pos.x + dx;
    if (!this.hitsAny(nx, pos.z, radius, colliders)) { pos.x = nx; } else { blocked = true; }
    const nz = pos.z + dz;
    if (!this.hitsAny(pos.x, nz, radius, colliders)) { pos.z = nz; } else { blocked = true; }
    return blocked;
  },
  hitsAny(x, z, r, colliders) {
    for (let i = 0; i < colliders.length; i += 1) {
      const b = colliders[i];
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  },
  // Circle vs circle (cars, people): returns the push-apart vector or null.
  circlePush(ax, az, ar, bx, bz, br) {
    const dx = bx - ax, dz = bz - az;
    const d2 = dx * dx + dz * dz;
    const rr = ar + br;
    if (d2 >= rr * rr || d2 === 0) return null;
    const d = Math.sqrt(d2);
    const push = (rr - d) / d;
    return { x: dx * push * 0.5, z: dz * push * 0.5 };
  },
  clampWorld(pos, margin) {
    const W = NV_CONFIG.world;
    pos.x = Math.max(-W.sizeX / 2 + margin, Math.min(W.sizeX / 2 - margin, pos.x));
    pos.z = Math.max(-W.sizeZ / 2 + margin, Math.min(W.sizeZ / 2 - margin, pos.z));
  },
  // Point inside an axis-aligned rect {minX,maxX,minZ,maxZ} — used by
  // the crew layer to test district bounds.
  insideRect(x, z, r) {
    return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  },
};
