// Tiny WebAudio synth: every sound is generated, no audio files, no network.
// Final-build note (re-record, 2026-11-19): the radio is three WebAudio stations
// (NEON FM, VICE 88, STATIC 99) with four named songs each, rotating every ~40s,
// so the HUD can show station + song like a real car radio; sirens and engine hum
// are synthesized too — the whole soundscape is generated, still no audio files.
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
  // Rank-up sting: a rising fifth for new respect, and a longer fanfare
  // when a crew member joins the AURA CREW.
  respect() {
    const notes = [392, 523, 659];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 'triangle', 0.16), i * 90));
  },
  crewJoin() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.2), i * 120));
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

  // --- Radio: three WebAudio synth stations, cycled with R. A 16-step
  // sequencer plays a quiet bass + lead pattern per station; the main loop
  // calls updateRadio(dt) every frame. Each station has its own playlist
  // (r1 style: "OMBO 98.4 — Island Pop"); the song turns over every
  // ~40 seconds of play.
  radio: {
    station: 0, step: 0, nextT: 0, songIdx: 0, songStart: 0, songLen: 40,
    stations: [
      { name: 'NEON FM', bpm: 112, wave: 'sawtooth', songs: ['Midnight Drive', 'Chrome Sunset', 'Palm Static', 'Neon Rain'], bass: [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 55, 0, 73.4, 0, 65.4, 0], lead: [220, 0, 0, 261.6, 0, 0, 329.6, 0, 0, 0, 392, 0, 329.6, 0, 261.6, 0] },
      { name: 'VICE 88', bpm: 100, wave: 'square', songs: ['Vice City Lights', 'Gold Chain', 'Turbo Heart', 'Night Pursuit'], bass: [82.4, 0, 98, 0, 82.4, 0, 110, 0, 82.4, 0, 98, 0, 123.5, 0, 98, 0], lead: [0, 0, 164.8, 0, 0, 196, 0, 0, 0, 0, 164.8, 0, 0, 246.9, 0, 0] },
      { name: 'STATIC 99', bpm: 84, wave: 'triangle', songs: ['Island Pop', 'Beach Static', 'Low Tide', 'Salt Air'], bass: [65.4, 0, 0, 0, 98, 0, 0, 0, 82.4, 0, 0, 0, 110, 0, 98, 0], lead: [130.8, 0, 164.8, 0, 196, 0, 164.8, 0, 130.8, 0, 196, 0, 246.9, 0, 220, 0] },
    ],
  },
  radioName() { return this.radio.stations[this.radio.station].name; },
  currentSong() {
    const st = this.radio.stations[this.radio.station];
    return st.songs[this.radio.songIdx % st.songs.length];
  },
  radioLine() { return this.radioName() + ' — ' + this.currentSong(); },
  cycleRadio() {
    this.radio.station = (this.radio.station + 1) % this.radio.stations.length;
    this.radio.step = 0;
    this.radio.nextT = 0;
    this.radio.songIdx = 0;
    this.radio.songStart = 0;
    return this.radioName();
  },
  updateRadio() {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const st = this.radio.stations[this.radio.station];
    const now = this.ctx.currentTime;
    // Turn the song over after songLen seconds of play (init the clock
    // on the first running tick so a suspended context never skips).
    if (!this.radio.songStart) { this.radio.songStart = now; }
    else if (now - this.radio.songStart > this.radio.songLen) {
      this.radio.songIdx = (this.radio.songIdx + 1) % st.songs.length;
      this.radio.songStart = now;
    }
    const stepDur = 60 / st.bpm / 4;
    if (this.radio.nextT < now - 0.2) this.radio.nextT = now + 0.05;
    let guard = 0;
    while (this.radio.nextT < now + 0.12 && guard < 8) {
      guard += 1;
      const i = this.radio.step % 16;
      const b = st.bass[i], l = st.lead[i];
      if (b) this.toneAt(b, stepDur * 0.9, st.wave, 0.045, this.radio.nextT);
      if (l) this.toneAt(l, stepDur * 0.9, 'sine', 0.03, this.radio.nextT);
      this.radio.step += 1;
      this.radio.nextT += stepDur;
    }
  },
  toneAt(freq, dur, type, vol, when) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(vol || 0.05, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(this.master);
    o.start(when); o.stop(when + dur + 0.02);
  },
};
