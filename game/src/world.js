// Aura City, generated from one seed: a road grid, neon blocks, a beach and
// an ocean, a marina, and the story landmarks. Everything is built from
// boxes, instanced meshes and canvas textures — no downloaded models.
// Final-build note (re-record, 2026-11-19): the ground is textured now — sidewalk
// tile grids, zebra crosswalks at every intersection, plaza checker, road edge
// lines, grass and beach speckle — so the city overview reads as a city.
const NV_WORLD = {
  colliders: [], buildings: [], roadPoints: [], armourPickups: [],
  locations: {}, beacon: null, oceanTex: null, sunMesh: null,
  sunLight: null, hemi: null, sunset: false, time: 0, groundCanvas: null,

  build(scene, rng) {
    this.sceneRef = scene;
    const C = NV_CONFIG.colors;
    const W = NV_CONFIG.world;
    scene.background = new THREE.Color(C.sky);
    scene.fog = new THREE.Fog(C.fog, 120, 1200);
    this.hemi = new THREE.HemisphereLight(C.hemiSky, C.hemiGround, 0.75);
    scene.add(this.hemi);
    this.sunLight = new THREE.DirectionalLight(C.sun, 1.6);
    this.sunLight.position.set(-400, 260, 300);
    scene.add(this.sunLight);
    scene.add(new THREE.AmbientLight(0x404060, 0.5));

    // --- Ground: one canvas texture draws grass, sidewalks, roads, beach.
    const gw = 2048, gh = 1536;
    const gc = document.createElement('canvas'); gc.width = gw; gc.height = gh;
    const g = gc.getContext('2d');
    const px = (x) => (x + W.sizeX / 2) / W.sizeX * gw;
    const pz = (z) => (z + W.sizeZ / 2) / W.sizeZ * gh;
    g.fillStyle = '#3d6b38'; g.fillRect(0, 0, gw, gh);
    // Beach band (south) and plaza.
    g.fillStyle = '#d9b380'; g.fillRect(0, pz(W.beachZ), gw, gh - pz(W.beachZ));
    g.fillStyle = '#6a5a7a'; g.fillRect(px(-90), pz(-90), px(90) - px(-90), pz(90) - pz(-90));
    // City blocks (sidewalk pads) with grass between.
    for (let bx = -1100; bx <= 1100; bx += W.roadGap) {
      for (let bz = -800; bz <= 800; bz += W.roadGap) {
        if (bz >= W.beachZ - 100) continue;
        g.fillStyle = '#3a3a44';
        g.fillRect(px(bx + 12), pz(bz + 12), px(bx + W.blockSize) - px(bx + 12), pz(bz + W.blockSize) - pz(bz + 12));
      }
    }
    // Roads: asphalt strips with dashed centrelines.
    g.fillStyle = '#1c1c22';
    for (let x = -1000; x <= 1000; x += W.roadGap) g.fillRect(px(x - 9), 0, px(x + 9) - px(x - 9), pz(W.beachZ));
    for (let z = -800; z <= 800; z += W.roadGap) g.fillRect(0, pz(z - 9), gw, pz(z + 9) - pz(z - 9));
    g.fillStyle = '#1c1c22'; g.fillRect(0, pz(700), gw, pz(760) - pz(700)); // beach road (asphalt)
    g.fillStyle = '#3a3a44'; g.fillRect(0, pz(694), gw, pz(700) - pz(694)); // beach road sidewalk
    g.strokeStyle = '#e8c832'; g.lineWidth = 3; g.setLineDash([22, 18]);
    g.beginPath(); g.moveTo(0, pz(730)); g.lineTo(gw, pz(730)); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#e8c832'; g.lineWidth = 3; g.setLineDash([22, 18]);
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), pz(W.beachZ)); g.stroke();
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      g.beginPath(); g.moveTo(0, pz(z)); g.lineTo(gw, pz(z)); g.stroke();
    }
    g.setLineDash([]);
    // --- Ground detail, so an overview reads as a city, not flat colour:
    // sidewalk tile grids, zebra crosswalks at every intersection, a
    // checker plaza, solid road edge lines, grass speckle and beach dots.
    const onRoad = (x, z) => {
      const rx = ((x + 1000) % W.roadGap + W.roadGap) % W.roadGap;
      const rz = ((z + 800) % W.roadGap + W.roadGap) % W.roadGap;
      return rx < 12 || rx > W.roadGap - 12 || rz < 12 || rz > W.roadGap - 12;
    };
    // Grass speckle: darker and lighter tufts in the gaps between pads.
    for (let i = 0; i < 700; i += 1) {
      const x = rng.range(-1150, 1150), z = rng.range(-850, 690);
      if (onRoad(x, z)) continue;
      if (Math.abs(x) < 95 && Math.abs(z) < 95) continue;
      g.fillStyle = rng.chance(0.5) ? 'rgba(20,60,20,0.5)' : 'rgba(90,140,70,0.5)';
      g.fillRect(px(x), pz(z), 3, 3);
    }
    // Sidewalk tiles on every block pad.
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 1;
    for (let bx = -1100; bx <= 1100; bx += W.roadGap) {
      for (let bz = -800; bz <= 800; bz += W.roadGap) {
        if (bz >= W.beachZ - 100) continue;
        for (let t = 30; t < W.blockSize; t += 30) {
          g.beginPath(); g.moveTo(px(bx + 12 + t), pz(bz + 12)); g.lineTo(px(bx + 12 + t), pz(bz + W.blockSize)); g.stroke();
          g.beginPath(); g.moveTo(px(bx + 12), pz(bz + 12 + t)); g.lineTo(px(bx + W.blockSize), pz(bz + 12 + t)); g.stroke();
        }
      }
    }
    // Zebra crosswalks at every intersection, both directions.
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      for (let z = -800; z <= 800; z += W.roadGap) {
        for (let s = -8; s <= 8; s += 4) {
          g.fillRect(px(x - 9), pz(z + s - 1.2), px(x + 9) - px(x - 9), pz(z + s + 1.2) - pz(z + s - 1.2));
          g.fillRect(px(x + s - 1.2), pz(z - 9), px(x + s + 1.2) - px(x + s - 1.2), pz(z + 9) - pz(z - 9));
        }
      }
    }
    // Plaza checker tiles.
    for (let tx = 0; tx < 12; tx += 1) {
      for (let tz = 0; tz < 12; tz += 1) {
        if ((tx + tz) % 2) continue;
        g.fillStyle = '#755f85';
        g.fillRect(px(-90 + tx * 15), pz(-90 + tz * 15), px(-75 + tx * 15) - px(-90 + tx * 15), pz(-75 + tz * 15) - pz(-90 + tz * 15));
      }
    }
    // Solid white edge lines along every road.
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 2;
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      for (const e of [-9, 9]) {
        g.beginPath(); g.moveTo(px(x + e), 0); g.lineTo(px(x + e), pz(W.beachZ)); g.stroke();
      }
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      for (const e of [-9, 9]) {
        g.beginPath(); g.moveTo(0, pz(z + e)); g.lineTo(gw, pz(z + e)); g.stroke();
      }
    }
    // Beach speckles and bright towels on the sand.
    for (let i = 0; i < 200; i += 1) {
      const x = rng.range(-1150, 1150), z = rng.range(705, 880);
      g.fillStyle = rng.chance(0.5) ? 'rgba(180,140,90,0.6)' : 'rgba(240,220,180,0.6)';
      g.fillRect(px(x), pz(z), 3, 3);
    }
    for (const [tx, tz, col] of [[-700, 760, '#ff2e88'], [-200, 800, '#19c3ff'], [300, 760, '#ffd75e'], [700, 820, '#39d353'], [100, 780, '#ff7a2e']]) {
      g.fillStyle = col;
      g.fillRect(px(tx), pz(tz), px(tx + 14) - px(tx), 6);
    }
    this.groundCanvas = gc;
    const groundTex = new THREE.CanvasTexture(gc);
    groundTex.encoding = THREE.sRGBEncoding;
    groundTex.anisotropy = 4;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(W.sizeX, W.sizeZ),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    scene.add(ground);
    // Zebra crosswalk across the x=0 avenue where it meets the beach
    // road (z 747-751): flat white bars that break up the asphalt in the
    // cover frame's foreground instead of a bare stretch of road.
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
    for (const cz of [747, 749, 751]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(8, 0.06, 1.2), crossMat);
      bar.position.set(0, 0.06, cz);
      scene.add(bar);
    }

    // --- Ocean: animated wave texture on a plane south of the beach.
    const oc = document.createElement('canvas'); oc.width = 512; oc.height = 256;
    const o = oc.getContext('2d');
    o.fillStyle = '#0e4d7a'; o.fillRect(0, 0, 512, 256);
    o.strokeStyle = 'rgba(255,255,255,0.35)'; o.lineWidth = 3;
    for (let i = 0; i < 24; i += 1) {
      o.beginPath();
      const y = 10 + i * 10;
      for (let x = 0; x <= 512; x += 16) o.lineTo(x, y + Math.sin(x * 0.05 + i) * 4);
      o.stroke();
    }
    this.oceanTex = new THREE.CanvasTexture(oc);
    this.oceanTex.wrapS = this.oceanTex.wrapT = THREE.RepeatWrapping;
    this.oceanTex.repeat.set(3, 1.5);
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(W.sizeX, 700),
      new THREE.MeshStandardMaterial({ map: this.oceanTex, roughness: 0.25, metalness: 0.4 })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -1.5, W.oceanZ + 350);
    scene.add(ocean);

    // --- Buildings: one InstancedMesh, facade texture with lit windows.
    const fc = document.createElement('canvas'); fc.width = 128; fc.height = 256;
    const f = fc.getContext('2d');
    f.fillStyle = '#3a3a4a'; f.fillRect(0, 0, 128, 256);
    for (let y = 12; y < 244; y += 18) {
      for (let x = 10; x < 118; x += 18) {
        const lit = rng.chance(0.55);
        f.fillStyle = lit ? (rng.chance(0.5) ? '#ffd75e' : '#7ee7ff') : '#14141f';
        f.fillRect(x, y, 10, 12);
      }
    }
    const facadeTex = new THREE.CanvasTexture(fc);
    facadeTex.encoding = THREE.sRGBEncoding;
    const bmat = new THREE.MeshStandardMaterial({
      map: facadeTex, emissiveMap: facadeTex, emissive: 0xffffff,
      emissiveIntensity: 0.5, roughness: 0.8,
    });
    const spots = [];
    for (let bx = -1100; bx <= 1100; bx += W.roadGap) {
      for (let bz = -800; bz <= 800; bz += W.roadGap) {
        if (bz >= W.beachZ - 100) continue;
        if (bx >= 950) continue; // marina strip
        if (Math.abs(bx) < 120 && Math.abs(bz) < 120) continue; // Neon Plaza
        if (Math.hypot(bx + 700, bz + 500) < 160) continue; // garage yard
        if (Math.hypot(bx - 100, bz + 100) < 130) continue; // ATM square
        if (Math.hypot(bx + 900, bz - 500) < 140) continue; // hideout
        const w = rng.range(34, 70), d = rng.range(34, 70), h = rng.range(20, 95);
        const cx = bx + W.blockSize / 2 + rng.range(-8, 8);
        const cz = bz + W.blockSize / 2 + rng.range(-8, 8);
        spots.push({ x: cx, z: cz, w, d, h });
        this.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      }
    }
    const bgeo = new THREE.BoxGeometry(1, 1, 1);
    const binst = new THREE.InstancedMesh(bgeo, bmat, spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const col = new THREE.Color();
    spots.forEach((b, i) => {
      p.set(b.x, b.h / 2, b.z); s.set(b.w, b.h, b.d);
      m4.compose(p, q, s);
      binst.setMatrixAt(i, m4);
      col.setHex(rng.pick(C.building));
      binst.setColorAt(i, col);
      this.buildings.push(b);
    });
    binst.instanceMatrix.needsUpdate = true;
    if (binst.instanceColor) binst.instanceColor.needsUpdate = true;
    scene.add(binst);
    this.buildingMesh = binst;

    // --- Streetlights along the roads.
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.22, 7, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6 });
    const lampGeo = new THREE.SphereGeometry(0.55, 8, 6);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc861, emissiveIntensity: 1.4 });
    const lampSpots = [];
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      for (let z = -750; z <= 750; z += 150) lampSpots.push([x + 11, z]);
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      for (let x = -950; x <= 950; x += 150) lampSpots.push([x, z + 11]);
    }
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampSpots.length);
    lampSpots.forEach(([x, z], i) => {
      p.set(x, 3.5, z); s.set(1, 1, 1); m4.compose(p, q, s);
      poles.setMatrixAt(i, m4);
      p.set(x, 7.1, z); m4.compose(p, q, s);
      lamps.setMatrixAt(i, m4);
    });
    poles.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
    scene.add(poles); scene.add(lamps);

    // --- Palms along the beach road and the plaza.
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 7, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
    const frondGeo = new THREE.ConeGeometry(2.4, 1.4, 5);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x1e7d32, roughness: 0.9 });
    const palmSpots = [];
    for (let x = -1100; x <= 1100; x += 90) palmSpots.push([x, 730 + rng.range(-6, 6)]);
    for (let i = 0; i < 14; i += 1) palmSpots.push([rng.range(-100, 100), rng.range(-100, 100)]);
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
    const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palmSpots.length);
    const qz = new THREE.Quaternion();
    palmSpots.forEach(([x, z], i) => {
      p.set(x, 3.5, z); s.set(1, 1, 1); m4.compose(p, q, s);
      trunks.setMatrixAt(i, m4);
      p.set(x, 7.6, z); s.set(1, 0.45, 1);
      qz.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2));
      m4.compose(p, qz, s);
      fronds.setMatrixAt(i, m4);
    });
    trunks.instanceMatrix.needsUpdate = true;
    fronds.instanceMatrix.needsUpdate = true;
    scene.add(trunks); scene.add(fronds);

    // --- Marina water, docks and boats (east edge).
    const marinaWater = new THREE.Mesh(
      new THREE.PlaneGeometry(190, 320),
      new THREE.MeshStandardMaterial({ color: 0x0e4d7a, roughness: 0.2, metalness: 0.4 })
    );
    marinaWater.rotation.x = -Math.PI / 2;
    marinaWater.position.set(1105, 0.15, 400);
    scene.add(marinaWater);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
    [[1030, 400], [1030, 480]].forEach(([x, z]) => {
      const dock = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 8), dockMat);
      dock.position.set(x, 0.5, z);
      scene.add(dock);
    });
    this.boats = [];
    [[1080, 340, 0xff2e88], [1100, 440, 0xffffff], [1120, 400, 0x19c3ff]].forEach(([x, z, c], i) => {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 4), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
      hull.position.y = 1;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
      cabin.position.set(-1, 3, 0);
      boat.add(hull); boat.add(cabin);
      boat.position.set(x, 0, z);
      boat.rotation.y = i * 0.4;
      scene.add(boat);
      this.boats.push(boat);
    });

    // --- Landmarks: garage, ATM kiosks, hideout ring, security panel, sun disc.
    this.locations = {
      spawn: new THREE.Vector3(0, 0, 40),
      garage: new THREE.Vector3(-700, 0, -500),
      hideout: new THREE.Vector3(-900, 0, 500),
      atm: new THREE.Vector3(100, 0, -100),
      atm2: new THREE.Vector3(-670, 0, -470),
      atm3: new THREE.Vector3(1040, 0, 420),
      marina: new THREE.Vector3(1100, 0, 400),
      beachRoad: new THREE.Vector3(0, 0, 730),
      plaza: new THREE.Vector3(0, 0, 0),
      panel: new THREE.Vector3(60, 0, 60),
    };
    const garage = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 16), new THREE.MeshStandardMaterial({ color: 0x33333d, roughness: 0.7 }));
    garage.position.set(-700, 4.5, -500);
    scene.add(garage);
    this.colliders.push({ minX: -713, maxX: -687, minZ: -508, maxZ: -492 });
    const signC = document.createElement('canvas'); signC.width = 512; signC.height = 96;
    const sg = signC.getContext('2d');
    sg.fillStyle = '#14061f'; sg.fillRect(0, 0, 512, 96);
    sg.fillStyle = '#ff2e88'; sg.font = 'bold 56px Arial'; sg.textAlign = 'center';
    sg.fillText('AURA MOTORS', 256, 66);
    const signTex = new THREE.CanvasTexture(signC);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 4), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(-700, 8, -491.5);
    scene.add(sign);
    // Three vault-terminal ATM kiosks (m5 drains all three in order).
    const addAtm = (x, z, yaw) => {
      const atm = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 2.5), new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.6 }));
      atm.position.set(x, 2.5, z);
      atm.rotation.y = yaw || 0;
      scene.add(atm);
      this.colliders.push({ minX: x - 2, maxX: x + 2, minZ: z - 1.5, maxZ: z + 1.5 });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ color: 0x19c3ff }));
      screen.position.set(x, 3.4, z + 1.35);
      scene.add(screen);
    };
    addAtm(100, -100, 0);
    addAtm(-670, -470, Math.PI / 2);
    addAtm(1040, 420, -Math.PI / 2);
    const ring = new THREE.Mesh(new THREE.RingGeometry(9, 11, 32), new THREE.MeshBasicMaterial({ color: 0x39d353, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-900, 0.1, 500);
    scene.add(ring);
    // Security panel kiosk at Neon Plaza (m9 heist) and the AURA CREW
    // sign over the Hideout — the crew's home base.
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 2), new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6 }));
    panel.position.set(60, 2.25, 60);
    scene.add(panel);
    this.colliders.push({ minX: 58.5, maxX: 61.5, minZ: 59, maxZ: 61 });
    const panelScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: 0xff5040 }));
    panelScreen.position.set(60, 3.2, 61.1);
    scene.add(panelScreen);
    const crewC = document.createElement('canvas'); crewC.width = 512; crewC.height = 96;
    const cg = crewC.getContext('2d');
    cg.fillStyle = '#14061f'; cg.fillRect(0, 0, 512, 96);
    cg.fillStyle = '#39d353'; cg.font = 'bold 52px Arial'; cg.textAlign = 'center';
    cg.fillText('AURA CREW HQ', 256, 66);
    const crewTex = new THREE.CanvasTexture(crewC);
    const crewSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.8), new THREE.MeshBasicMaterial({ map: crewTex }));
    crewSign.position.set(-900, 9, 491.5);
    scene.add(crewSign);

    // --- Street props: market stalls, planters, benches, barriers,
    // beach umbrellas and extra parked cars, so no frame is a bare
    // ground plane. Stalls/planters/benches/barriers are solid.
    this.decorCars = [];
    const box = (w, h, d, color, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      m.position.set(x, y, z);
      if (ry) m.rotation.y = ry;
      scene.add(m);
      return m;
    };
    const addCollider = (x, z, hw, hd) => this.colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
    // Market stalls at Neon Plaza: counter + striped canopy + goods.
    const stripeC = document.createElement('canvas'); stripeC.width = 128; stripeC.height = 32;
    const sg2 = stripeC.getContext('2d');
    for (let i = 0; i < 8; i += 1) { sg2.fillStyle = i % 2 ? '#ff2e88' : '#fff2c0'; sg2.fillRect(i * 16, 0, 16, 32); }
    const stripeTex = new THREE.CanvasTexture(stripeC);
    for (const [sx, sz, ry] of [[-45, -35, 0.4], [45, -45, -0.3], [-45, 45, 2.8], [45, 20, -1.2]]) {
      box(5, 1.1, 3, 0x6b4a2a, sx, 0.55, sz, ry);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 3.6), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8 }));
      canopy.position.set(sx, 2.9, sz); canopy.rotation.y = ry;
      scene.add(canopy);
      box(1.2, 0.8, 1, 0xffd75e, sx - 1, 1.5, sz, ry);
      box(1.2, 0.8, 1, 0x19c3ff, sx + 1, 1.5, sz, ry);
      addCollider(sx, sz, 2.8, 1.8);
    }
    // Planters with a small tree, along the plaza edge + beach road.
    for (const [px, pz] of [[-100, -60], [100, -60], [-100, 60], [100, 60], [-750, 705], [-450, 705], [-150, 705], [150, 705], [450, 705], [750, 705]]) {
      box(2, 1, 2, 0x4a6b3a, px, 0.5, pz);
      const tree = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 6), new THREE.MeshStandardMaterial({ color: 0x1e7d32, roughness: 0.9 }));
      tree.position.set(px, 2.5, pz);
      scene.add(tree);
      addCollider(px, pz, 1.1, 1.1);
    }
    // Benches along the beach road, the plaza and the marina.
    for (const [bx, bz, ry] of [[-600, 760, 0], [-300, 760, 0], [300, 760, 0], [600, 760, 0], [0, -70, Math.PI / 2], [1050, 350, Math.PI / 2]]) {
      box(3.2, 0.5, 1, 0x7a5a3a, bx, 0.6, bz, ry);
      box(0.3, 0.6, 0.9, 0x33333d, bx - 1.3, 0.3, bz, ry);
      box(0.3, 0.6, 0.9, 0x33333d, bx + 1.3, 0.3, bz, ry);
      addCollider(bx, bz, 1.7, 0.6);
    }
    // Roadwork barriers at the plaza corners.
    for (const [bx, bz, ry] of [[100, 12, 0], [-100, -12, 0], [12, 100, Math.PI / 2], [-12, -100, Math.PI / 2]]) {
      box(3, 0.9, 0.4, 0xff7a2e, bx, 0.8, bz, ry);
      addCollider(bx, bz, 1.6, 0.5);
    }
    // Beach umbrellas on the sand.
    for (const [ux, uz, col] of [[-800, 790, 0xff2e88], [-400, 790, 0x19c3ff], [400, 790, 0xffd75e], [800, 790, 0xff2e88], [0, 830, 0x19c3ff]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
      pole.position.set(ux, 1.5, uz);
      scene.add(pole);
      const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
      top.position.set(ux, 3.4, uz);
      scene.add(top);
    }
    // Extra parked cars on the beach-road shoulder, the marina and the
    // garage yard — stealable, like the other parked cars.
    for (const [cx, cz, col] of [[-120, 748, 0x7a4ad6], [140, 748, 0xffd75e], [-300, 712, 0x19c3ff], [320, 712, 0x7a4ad6], [900, 380, 0xff5a3c], [-650, -440, 0x39d353]]) {
      const car = NV_ENTITIES.makeCar(col, 'parked');
      car.group.position.set(cx, 0, cz);
      car.group.rotation.y = 0;
      scene.add(car.group);
      this.decorCars.push(car);
    }

    // --- Armour vest pickups: glowing cyan crates at the garage yard
    // and the Hideout that refill Jax's armour vest. They respawn 30s
    // after being taken.
    this.armourPickups = [];
    const addArmourPickup = (x, z) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x19c3ff, emissive: 0x19c3ff, emissiveIntensity: 0.9, roughness: 0.4 }));
      crate.position.set(x, 0.8, z);
      scene.add(crate);
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 24),
        new THREE.MeshBasicMaterial({ color: 0x19c3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.12, z);
      scene.add(ring);
      this.armourPickups.push({ x, z, mesh: crate, ring, taken: false, respawnT: 0 });
    };
    addArmourPickup(-660, -440);
    addArmourPickup(-860, 470);

    // Sun disc low on the western horizon.
    this.sunMesh = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0xffb347, fog: false }));
    this.sunMesh.position.set(-1100, 150, 200);
    this.sunMesh.lookAt(0, 60, 0);
    scene.add(this.sunMesh);

    // Road intersections for traffic waypoints.
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      for (let z = -800; z <= 800; z += W.roadGap) this.roadPoints.push({ x, z });
    }
    for (let x = -1000; x <= 1000; x += 200) this.roadPoints.push({ x, z: 730 });

    // One reusable beacon (mission marker): glowing pillar + ground ring.
    const beacon = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 70, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    );
    pillar.position.y = 35;
    const bring = new THREE.Mesh(new THREE.RingGeometry(6, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff2e88, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    bring.rotation.x = -Math.PI / 2;
    bring.position.y = 0.15;
    beacon.add(pillar); beacon.add(bring);
    beacon.visible = false;
    scene.add(beacon);
    this.beacon = beacon;
  },

  // Props added at runtime (shot staging): stall / planter / bench.
  // Same shapes as the build-time props, with colliders.
  addMarketStall(x, z, ry) {
    const scene = this.sceneRef; if (!scene) return;
    const box = (w, h, d, color, bx, by, bz, r) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      m.position.set(bx, by, bz); if (r) m.rotation.y = r; scene.add(m); return m;
    };
    box(5, 1.1, 3, 0x6b4a2a, x, 0.55, z, ry);
    const stripeC = document.createElement('canvas'); stripeC.width = 128; stripeC.height = 32;
    const sg2 = stripeC.getContext('2d');
    for (let i = 0; i < 8; i += 1) { sg2.fillStyle = i % 2 ? '#ff2e88' : '#fff2c0'; sg2.fillRect(i * 16, 0, 16, 32); }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 3.6), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(stripeC), roughness: 0.8 }));
    canopy.position.set(x, 2.9, z); canopy.rotation.y = ry || 0; scene.add(canopy);
    box(1.2, 0.8, 1, 0xffd75e, x - 1, 1.5, z, ry);
    box(1.2, 0.8, 1, 0x19c3ff, x + 1, 1.5, z, ry);
    this.colliders.push({ minX: x - 2.8, maxX: x + 2.8, minZ: z - 1.8, maxZ: z + 1.8 });
  },
  addPlanter(x, z) {
    const scene = this.sceneRef; if (!scene) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.85 }));
    m.position.set(x, 0.5, z); scene.add(m);
    const tree = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 6), new THREE.MeshStandardMaterial({ color: 0x1e7d32, roughness: 0.9 }));
    tree.position.set(x, 2.5, z); scene.add(tree);
    this.colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 1.1, maxZ: z + 1.1 });
  },
  addBench(x, z, ry) {
    const scene = this.sceneRef; if (!scene) return;
    const box = (w, h, d, color, bx, by, bz, r) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      m.position.set(bx, by, bz); if (r) m.rotation.y = r; scene.add(m); return m;
    };
    box(3.2, 0.5, 1, 0x7a5a3a, x, 0.6, z, ry);
    box(0.3, 0.6, 0.9, 0x33333d, x - 1.3, 0.3, z, ry);
    box(0.3, 0.6, 0.9, 0x33333d, x + 1.3, 0.3, z, ry);
    this.colliders.push({ minX: x - 1.7, maxX: x + 1.7, minZ: z - 0.6, maxZ: z + 0.6 });
  },

  // Walk over a vest pickup with a damaged vest to refill the armour
  // to 100. Taken crates respawn after 30 seconds.
  checkArmourPickup(G, dt) {
    const P = G.player;
    if (!P || !this.armourPickups) return;
    const pp = P.inCar ? P.car.group.position : P.pos;
    for (const pk of this.armourPickups) {
      if (pk.taken) {
        pk.respawnT -= dt;
        if (pk.respawnT <= 0) {
          pk.taken = false;
          pk.mesh.visible = true;
          pk.ring.visible = true;
        }
        continue;
      }
      if ((P.armour || 0) < 100 && Math.hypot(pp.x - pk.x, pp.z - pk.z) < 4) {
        P.armour = 100;
        pk.taken = true;
        pk.respawnT = 30;
        pk.mesh.visible = false;
        pk.ring.visible = false;
        NV_HUD.banner(G, 'ARMOUR RESTORED — VEST AT 100');
        NV_AUDIO.pickup();
      }
    }
  },

  setBeacon(x, z, color) {
    if (!this.beacon) return;
    this.beacon.visible = true;
    this.beacon.position.set(x, 0, z);
    this.beacon.children.forEach((c) => c.material.color.setHex(color || 0xff2e88));
  },
  hideBeacon() { if (this.beacon) this.beacon.visible = false; },

  setSunset(on) {
    this.sunset = on;
    const C = NV_CONFIG.colors;
    const scene = this.sceneRef;
    if (!scene) return;
    scene.fog.color.setHex(on ? C.sunsetFog : C.fog);
    scene.background.setHex(on ? 0x5e1c3a : C.sky);
    this.sunLight.color.setHex(on ? 0xff7a2e : C.sun);
    this.sunLight.intensity = on ? 2.2 : 1.6;
    this.sunLight.position.set(-500, 120, 200);
  },

  update(dt) {
    this.time += dt;
    if (this.oceanTex) this.oceanTex.offset.x = (this.time * 0.02) % 1;
    if (this.beacon && this.beacon.visible) {
      const s = 1 + Math.sin(this.time * 3) * 0.08;
      this.beacon.children[1].scale.set(s, s, 1);
    }
  },
};
