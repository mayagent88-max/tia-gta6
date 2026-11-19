// Tiny WebAudio synth: every sound is generated, no audio files, no
// network. All calls are safe before the first user gesture — the context
// is created lazily and every method guards a missing context.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sirenNodes = null;
    this.engineNodes = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
    } catch {
      return false;
    }
    return true;
  }

  unlock() {
    if (this.ensure() && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  tone(freq, seconds, type, gain, slideTo) {
    if (this.muted || !this.ensure()) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + seconds);
      amp.gain.setValueAtTime(gain || 0.08, t);
      amp.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      osc.connect(amp).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + seconds + 0.02);
    } catch {
      // Sound is garnish; a failure never stops the game.
    }
  }

  noise(seconds, gain, lowpass) {
    if (this.muted || !this.ensure()) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(gain || 0.15, t);
      amp.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      src.connect(filter).connect(amp).connect(this.ctx.destination);
      src.start(t);
    } catch {
      // Sound is garnish; a failure never stops the game.
    }
  }

  shoot() {
    this.noise(0.09, 0.22, 2400);
    this.tone(180, 0.08, 'square', 0.06, 60);
  }

  enemyShoot() {
    this.noise(0.08, 0.1, 1800);
  }

  hit() {
    this.tone(120, 0.12, 'sawtooth', 0.1, 70);
  }

  crash() {
    this.noise(0.25, 0.25, 500);
    this.tone(90, 0.2, 'sawtooth', 0.12, 40);
  }

  pickup() {
    this.tone(660, 0.09, 'sine', 0.1);
    this.tone(990, 0.14, 'sine', 0.1);
  }

  missionStart() {
    this.tone(392, 0.12, 'triangle', 0.1);
    this.tone(523, 0.12, 'triangle', 0.1);
    this.tone(659, 0.2, 'triangle', 0.1);
  }

  missionComplete() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'triangle', 0.11), i * 110);
    });
  }

  missionFail() {
    this.tone(330, 0.25, 'sawtooth', 0.09, 220);
    this.tone(220, 0.4, 'sawtooth', 0.09, 150);
  }

  // Two-tone police siren that loops while the player is wanted.
  setSiren(on) {
    if (!this.ensure()) return;
    if (on && !this.sirenNodes) {
      try {
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 700;
        amp.gain.value = 0.0;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.6;
        const lfoAmp = this.ctx.createGain();
        lfoAmp.gain.value = 180;
        lfo.connect(lfoAmp).connect(osc.frequency);
        osc.connect(amp).connect(this.ctx.destination);
        amp.gain.linearRampToValueAtTime(this.muted ? 0 : 0.035, this.ctx.currentTime + 0.5);
        osc.start();
        lfo.start();
        this.sirenNodes = { osc, lfo, amp };
      } catch {
        this.sirenNodes = null;
      }
    } else if (!on && this.sirenNodes) {
      try {
        const { osc, lfo, amp } = this.sirenNodes;
        amp.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          try {
            osc.stop();
            lfo.stop();
          } catch {
            // Already stopped.
          }
        }, 400);
      } catch {
        // Ignore.
      }
      this.sirenNodes = null;
    }
  }

  // Engine hum whose pitch follows the driven car's speed.
  setEngine(running, speedRatio) {
    if (!this.ensure()) return;
    if (running && !this.engineNodes) {
      try {
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 60;
        amp.gain.value = 0.0;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        osc.connect(filter).connect(amp).connect(this.ctx.destination);
        amp.gain.linearRampToValueAtTime(this.muted ? 0 : 0.04, this.ctx.currentTime + 0.3);
        osc.start();
        this.engineNodes = { osc, amp };
      } catch {
        this.engineNodes = null;
      }
    } else if (!running && this.engineNodes) {
      try {
        const { osc, amp } = this.engineNodes;
        amp.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        setTimeout(() => {
          try {
            osc.stop();
          } catch {
            // Already stopped.
          }
        }, 300);
      } catch {
        // Ignore.
      }
      this.engineNodes = null;
    }
    if (this.engineNodes) {
      try {
        this.engineNodes.osc.frequency.value = 55 + speedRatio * 140;
        this.engineNodes.amp.gain.value = this.muted ? 0 : 0.03 + speedRatio * 0.03;
      } catch {
        // Ignore.
      }
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.sirenNodes) this.sirenNodes.amp.gain.value = this.muted ? 0 : 0.035;
    if (this.engineNodes) this.engineNodes.amp.gain.value = this.muted ? 0 : 0.04;
    return this.muted;
  }
}
