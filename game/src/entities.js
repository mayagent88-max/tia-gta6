// Entity factories and movement: low-poly cars, people and the news
// helicopter, built from boxes. Driving is arcade physics with sub-step
// integration; the player walks, drives, steals and exits cars here.
// Owned cars (car.owned) carry their own upgrades and a crew name.
const NV_ENTITIES = {
  // A car from boxes: body, cabin, four wheels, lights and a neon underglow.
  makeCar(color, kind) {
    const group = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
    // The gold heist car glows warm: a little emissive keeps it reading
    // gold under the purple night sky instead of washing out to tan.
    if (kind === 'gold') { paint.emissive = new THREE.Color(0x8a6d00); paint.emissiveIntensity = 0.7; }
    const dark = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.4, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 2.0), paint);
    body.position.y = 0.62;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.75, 1.75), dark);
    cabin.position.set(-0.25, 1.35, 0);
    group.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const wheels = [];
    [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.42, z);
      group.add(w);
      wheels.push(w);
    });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffedb0, emissiveIntensity: 1.6 });
    [[2.21, 0.6], [2.21, -0.6]].forEach(([x, z]) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), headMat);
      h.position.set(x, 0.7, z);
      group.add(h);
    });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 1.2 });
    [[-2.21, 0.6], [-2.21, -0.6]].forEach(([x, z]) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), tailMat);
      t.position.set(x, 0.7, z);
      group.add(t);
    });
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 2.4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.07;
    group.add(glow);
    const car = {
      group, wheels, glow, kind: kind || 'traffic', color, yaw: 0, speed: 0, steer: 0,
      hp: 100, driver: null, wrecked: false, lightRed: null, lightBlue: null,
      // Stashed materials so a respawned traffic car gets its paint back
      // after an explosion darkened every part.
      paintMat: paint, darkMat: dark, wheelMat, headMat, tailMat, glowMat: glow.material,
    };
    if (kind === 'police') {
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.2), dark);
      barBase.position.set(-0.25, 1.85, 0);
      group.add(barBase);
      const redMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x2040ff, emissiveIntensity: 2 });
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.5), redMat);
      red.position.set(-0.25, 2.0, 0.32);
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.5), blueMat);
      blue.position.set(-0.25, 2.0, -0.32);
      group.add(red); group.add(blue);
      car.lightRed = redMat; car.lightBlue = blueMat;
    }
    return car;
  },

  // A person from boxes, with swinging limbs for the walk cycle.
  makePerson(shirt, pants) {
    const group = new THREE.Group();
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.5), shirtMat);
    torso.position.y = 1.15;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skinMat);
    head.position.y = 1.98;
    group.add(head);
    const mkLimb = (mat, w, h, x, y) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h / 2;
      pivot.add(m);
      group.add(pivot);
      return pivot;
    };
    const legL = mkLimb(pantsMat, 0.34, 0.9, 0.24, 0.62);
    const legR = mkLimb(pantsMat, 0.34, 0.9, -0.24, 0.62);
    const armL = mkLimb(shirtMat, 0.26, 0.85, 0.58, 1.6);
    const armR = mkLimb(shirtMat, 0.26, 0.85, -0.58, 1.6);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.55), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    gun.position.set(0, -0.85, 0.25);
    armR.add(gun);
    return { group, legL, legR, armL, armR };
  },

  // News helicopter: body, tail, spinning rotor and a searchlight.
  makeHeli(scene) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.7, 2.2), bodyMat);
    group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 0.7), bodyMat);
    tail.position.set(-4.4, 0.3, 0);
    group.add(tail);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.9), new THREE.MeshStandardMaterial({ color: 0x0a2a3a, roughness: 0.2, metalness: 0.6 }));
    glass.position.set(2.2, 0.2, 0);
    group.add(glass);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.08, 0.9), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rotor.position.y = 1.1;
    group.add(rotor);
    const light = new THREE.SpotLight(0xfff2c0, 2.5, 220, 0.35, 0.5, 1.2);
    light.position.set(0, -0.8, 0);
    group.add(light);
    light.target.position.set(0, -60, 0);
    group.add(light.target);
    scene.add(group);
    return { group, rotor, light, yaw: 0, angle: 0 };
  },

  // Arcade driving: accel/brake/steer with drift, 2 sub-steps, wall and
  // car collision. Returns the distance driven this frame. Garage tuning
  // (car.upg) raises the top speed; Shift fires the nitro boost when owned.
  // Mira's crew bonus (car.topMul) adds 12% top speed to cars Jax drives.
  updateCar(car, input, dt, colliders, others) {
    const C = NV_CONFIG.car;
    const upg = car.upg || { engine: 0, armor: 0, nitro: 0 };
    const topSpeed = C.maxSpeed * (1 + 0.08 * upg.engine) * (car.topMul || 1);
    const handbrake = !!input.keys[' '];
    const grip = handbrake ? C.driftGrip : C.grip;
    const targetSteer = (input.keys.a || input.keys.arrowleft ? 1 : 0) - (input.keys.d || input.keys.arrowright ? 1 : 0);
    const steerTarget = targetSteer * C.steerMax * (handbrake ? 1.4 : 1);
    const accelIn = (input.keys.w || input.keys.arrowup ? 1 : 0) - (input.keys.s || input.keys.arrowdown ? 1 : 0);
    let driven = 0;
    const steps = 2;
    const h = dt / steps;
    for (let s = 0; s < steps; s += 1) {
      car.steer += (steerTarget - car.steer) * Math.min(1, 8 * h);
      if (accelIn > 0) car.speed += C.accel * h;
      else if (accelIn < 0) car.speed -= (car.speed > 0.5 ? C.brake : C.accel * 0.7) * h;
      else car.speed -= car.speed * 1.2 * h;
      // Nitro: hold Shift while driving with a charged meter. Mira's
      // NITRO SURGE (car.surgeT) fires the same boost without an owned
      // nitro upgrade, and never drains the meter while it lasts.
      const surging = (car.surgeT || 0) > 0;
      if (surging) car.surgeT = Math.max(0, car.surgeT - h);
      let cap = topSpeed;
      if ((upg.nitro > 0 || surging) && input.keys.shift && car.nitro > 0 && accelIn > 0) {
        cap = topSpeed * 1.45;
        if (!surging) car.nitro = Math.max(0, car.nitro - 34 * h);
        car.boosting = true;
      } else {
        car.boosting = false;
        car.nitro = Math.min(100, (car.nitro || 0) + 9 * h);
      }
      car.speed = Math.max(-C.reverseSpeed, Math.min(cap, car.speed));
      const spd = Math.abs(car.speed);
      const turn = car.steer * (spd / topSpeed) * (car.speed >= 0 ? 1 : -1) * (spd > 0.5 ? 1 : 0);
      car.yaw += turn * (grip / C.grip) * 2.2 * h * (spd / 10 + 0.4);
      const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw);
      const oldX = car.group.position.x, oldZ = car.group.position.z;
      const nx = oldX + fx * car.speed * h, nz = oldZ + fz * car.speed * h;
      const blocked = NV_PHYSICS.move(car.group.position, C.radius, nx - oldX, nz - oldZ, colliders);
      if (blocked) car.speed *= 0.55;
      driven += Math.hypot(car.group.position.x - oldX, car.group.position.z - oldZ);
      // Car vs car push-apart. A heavy roadblock car does not move — the
      // player bounces off it and loses speed instead.
      for (const o of others) {
        if (o === car || o.wrecked) continue;
        const push = NV_PHYSICS.circlePush(
          car.group.position.x, car.group.position.z, C.radius,
          o.group.position.x, o.group.position.z, C.radius
        );
        if (push) {
          if (o.heavy) {
            // A roadblock cruiser barely budges: ramming shoves it a little
            // and costs the player speed — keep hitting it to force through.
            car.group.position.x -= push.x * 1.75; car.group.position.z -= push.z * 1.75;
            o.group.position.x += push.x * 0.25; o.group.position.z += push.z * 0.25;
            car.speed *= 0.6;
          } else {
            car.group.position.x -= push.x; car.group.position.z -= push.z;
            o.group.position.x += push.x; o.group.position.z += push.z;
            car.speed *= 0.9; o.speed *= 0.9;
          }
        }
      }
      NV_PHYSICS.clampWorld(car.group.position, 8);
    }
    car.group.rotation.y = car.yaw;
    car.wheels.forEach((w, i) => {
      w.rotation.z = car.speed * 0.06;
      if (i < 2) w.rotation.y = car.steer * 0.5;
    });
    return driven;
  },

  // Simple chase steering for AI cars: steer toward a target point.
  driveToward(car, tx, tz, dt, topSpeed, colliders, others) {
    const dx = tx - car.group.position.x, dz = tz - car.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4) return dist;
    const wantYaw = Math.atan2(-dz, dx);
    let dy = wantYaw - car.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    car.steer = Math.max(-0.5, Math.min(0.5, dy * 1.4));
    car.speed = Math.min(topSpeed, car.speed + NV_CONFIG.car.accel * dt);
    const fx = Math.cos(car.yaw), fz = -Math.sin(car.yaw);
    const oldX = car.group.position.x, oldZ = car.group.position.z;
    const blocked = NV_PHYSICS.move(car.group.position, NV_CONFIG.car.radius, fx * car.speed * dt, fz * car.speed * dt, colliders);
    if (blocked) { car.speed *= 0.4; car.yaw += 0.6; }
    car.yaw += car.steer * 1.6 * dt * (car.speed > 1 ? 1 : 0);
    car.group.rotation.y = car.yaw;
    car.wheels.forEach((w) => { w.rotation.z = car.speed * 0.06; });
    NV_PHYSICS.clampWorld(car.group.position, 8);
    return dist;
  },

  // Display name for the speedo: owned cars carry their garage name,
  // mission and police cars have their own names, street cars take one
  // from the config list by paint colour.
  carDisplayName(car) {
    if (car.owned) return car.owned.name;
    const names = {
      prototype: 'AURA GT', gold: 'GOLD STREAKER', boss: 'SYNDICATE LIMO',
      payoff: 'PAYOFF TRUCK', police: 'KPD CRUISER', courier: 'COURIER VAN',
      rival: 'RIVAL GT',
    };
    if (names[car.kind]) return names[car.kind];
    const list = NV_CONFIG.carNames;
    return list[Math.abs(car.color || 0) % list.length];
  },

  // Walk a person mesh with a swing cycle; pos is a THREE.Vector3.
  walkPerson(p, pos, yaw, speed, dt) {
    p.group.position.copy(pos);
    p.group.rotation.y = yaw;
    const swing = Math.min(1, speed / 8) * Math.sin(p.phase || 0);
    p.phase = (p.phase || 0) + dt * speed * 1.4;
    p.legL.rotation.x = swing * 0.7;
    p.legR.rotation.x = -swing * 0.7;
    p.armL.rotation.x = -swing * 0.5;
    p.armR.rotation.x = swing * 0.5;
  },
};
