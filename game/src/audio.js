// Tiny WebAudio synth: every sound is generated, no audio files, no network.
const NV_AUDIO = {
  ctx: null, master: null, muted: false, siren: null, engine: null,
  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, cutoff) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  shot() { this.noise(0.12, 0.25, 2500); this.tone(180, 0.08, 'square', 0.12, 60); },
  enemyShot() { this.noise(0.1, 0.12, 1800); },
  reload() { this.tone(500, 0.05, 'square', 0.08); setTimeout(() => this.tone(700, 0.05, 'square', 0.08), 90); },
  explosion() { this.noise(0.6, 0.4, 500); this.tone(90, 0.5, 'sine', 0.25, 30); },
  click() { this.tone(800, 0.04, 'square', 0.08); },
  pickup() { this.tone(660, 0.08, 'sine', 0.15); this.tone(990, 0.12, 'sine', 0.15); },
  jingle() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.18), i * 110));
  },
  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.siren) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 750;
      lfo.type = 'square'; lfo.frequency.value = 0.8;
      lg.gain.value = 180;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.value = 0.045;
      o.connect(g); g.connect(this.master);
      o.start(); lfo.start();
      this.siren = { o, lfo, g };
    } else if (!on && this.siren) {
      try { this.siren.o.stop(); this.siren.lfo.stop(); } catch (e) {}
      this.siren = null;
    }
  },
  setEngine(speed01) {
    if (!this.ctx) return;
    if (!this.engine) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 50;
      f.type = 'lowpass'; f.frequency.value = 400;
      g.gain.value = 0.0;
      o.connect(f); f.connect(g); g.connect(this.master);
      o.start();
      this.engine = { o, g };
    }
    const t = this.ctx.currentTime;
    this.engine.o.frequency.setTargetAtTime(45 + speed01 * 160, t, 0.1);
    this.engine.g.gain.setTargetAtTime(this.muted ? 0 : 0.03 + speed01 * 0.05, t, 0.1);
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },
};
