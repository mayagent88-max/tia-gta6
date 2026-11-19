// Aura City, generated from one seed: a road grid, neon blocks, a beach and
// an ocean, a marina, and the story landmarks. Everything is built from
// boxes, instanced meshes and canvas textures — no downloaded models.
const NV_WORLD = {
  colliders: [], buildings: [], roadPoints: [],
  locations: {}, beacon: null, oceanTex: null, sunMesh: null,
  sunLight: null, hemi: null, sunset: false, time: 0,

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
    g.fillStyle = '#d9b380'; g.fillRect(0, pz(700), gw, pz(760) - pz(700)); // beach road
    g.strokeStyle = '#e8c832'; g.lineWidth = 3; g.setLineDash([22, 18]);
    for (let x = -1000; x <= 1000; x += W.roadGap) {
      g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), pz(W.beachZ)); g.stroke();
    }
    for (let z = -800; z <= 800; z += W.roadGap) {
      g.beginPath(); g.moveTo(0, pz(z)); g.lineTo(gw, pz(z)); g.stroke();
    }
    g.setLineDash([]);
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

    // --- Landmarks: garage, ATM kiosk, hideout ring, sun disc.
    this.locations = {
      spawn: new THREE.Vector3(0, 0, 40),
      garage: new THREE.Vector3(-700, 0, -500),
      hideout: new THREE.Vector3(-900, 0, 500),
      atm: new THREE.Vector3(100, 0, -100),
      marina: new THREE.Vector3(1100, 0, 400),
      beachRoad: new THREE.Vector3(0, 0, 730),
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
    const atm = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 2.5), new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.6 }));
    atm.position.set(100, 2.5, -100);
    scene.add(atm);
    this.colliders.push({ minX: 98, maxX: 102, minZ: -101.5, maxZ: -98.5 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ color: 0x19c3ff }));
    screen.position.set(100, 3.4, -98.6);
    scene.add(screen);
    const ring = new THREE.Mesh(new THREE.RingGeometry(9, 11, 32), new THREE.MeshBasicMaterial({ color: 0x39d353, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-900, 0.1, 500);
    scene.add(ring);

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
