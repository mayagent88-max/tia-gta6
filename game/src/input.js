// Keyboard and mouse state, tracked once and read by the game loop.
// Final-build note (re-record, 2026-11-19): this is the single input surface for
// every system the later rounds added — 1-4 weapons, Tab wheel, K keep-car, R radio,
// G garage, M mission, Z/X/C/B crew abilities — all read from here by the loop.
const NV_INPUT = {
  keys: {}, pressed: {}, mouseDX: 0, mouseDY: 0, clicked: false, mouseDown: false,
  pointerLocked: false,
  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      this.pressed[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    document.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true; this.clicked = true;
      if (e.button === 0 && !this.pointerLocked) canvas.requestPointerLock();
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    window.addEventListener('blur', () => { this.keys = {}; this.mouseDown = false; });
  },
  // WASD / arrows as a -1..1 pair, relative to the camera.
  moveAxis() {
    let x = 0, y = 0;
    if (this.keys.w || this.keys.arrowup) y += 1;
    if (this.keys.s || this.keys.arrowdown) y -= 1;
    if (this.keys.a || this.keys.arrowleft) x -= 1;
    if (this.keys.d || this.keys.arrowright) x += 1;
    return { x, y };
  },
  sprint() { return !!(this.keys.shift); },
  consume(code) {
    if (this.pressed[code]) { this.pressed[code] = false; return true; }
    return false;
  },
  endFrame() {
    this.pressed = {};
    this.mouseDX = 0; this.mouseDY = 0; this.clicked = false;
  },
};
