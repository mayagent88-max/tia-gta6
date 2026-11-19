// Keyboard and mouse state, tracked once and read by the game loop.
// Also carries one-shot presses (E to enter a car, M for missions, R to
// reload) so a single key-down fires exactly one action.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.canvas = canvas;
    this.onKey = (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(key);
      this.keys.add(key);
    };
    this.onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };
    this.onMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    };
    this.onMouseDown = (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      }
    };
    this.onMouseUp = (event) => {
      if (event.button === 0) this.mouseDown = false;
    };
    this.onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
  }

  down(key) {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  // Movement axes: x right, y down, from WASD or the arrow keys.
  axes() {
    const x = (this.down('d') || this.down('arrowright') ? 1 : 0) - (this.down('a') || this.down('arrowleft') ? 1 : 0);
    const y = (this.down('s') || this.down('arrowdown') ? 1 : 0) - (this.down('w') || this.down('arrowup') ? 1 : 0);
    return { x, y };
  }

  // Call once per frame, after the game has read the presses.
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
