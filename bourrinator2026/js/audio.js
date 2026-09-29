// Tout le son est synthétisé en direct (Web Audio) : aucun fichier à charger.

const BASS = [
  [0, null, 0, null, 3, null, 0, null, 5, null, 3, null, 0, null, -2, null],
  [0, null, 0, 12, 3, null, 0, null, 7, null, 5, null, 3, null, 5, null],
  [-4, null, -4, null, 0, null, -4, null, 3, null, 0, null, -4, null, -2, null],
  [-5, null, -5, 7, -5, null, 2, null, 3, null, 2, null, 0, null, -2, -1],
];

const SFX = {
  pistol: { gap: 0.04, max: 2, fn(o, t) {
    this._n(o, t, 0.16, { type: 'bandpass', f: 2600, f1: 700, q: 0.8, v: 1.1 });
    this._n(o, t, 0.35, { type: 'lowpass', f: 900, f1: 120, q: 0.5, v: 0.7 });
    this._t(o, t, 0.14, { f: 160, f1: 42, v: 1.0 });
    this._t(o, t + 0.01, 0.04, { type: 'square', f: 2400, f1: 900, v: 0.06 });
  } },
  rocket: { fn(o, t) {
    this._n(o, t, 0.25, { type: 'lowpass', f: 2500, f1: 400, v: 0.9 });
    this._t(o, t, 0.2, { f: 120, f1: 40, v: 0.9 });
    this._n(o, t + 0.03, 0.9, { type: 'bandpass', f: 900, f1: 300, q: 1.2, v: 0.45, a: 0.06 });
  } },
  explosion: { gap: 0.05, max: 3, fn(o, t) {
    this._n(o, t, 2.2, { type: 'lowpass', f: 2200, f1: 50, q: 0.7, v: 1.6 });
    this._t(o, t, 1.4, { f: 75, f1: 22, v: 1.5 });
    this._n(o, t, 0.25, { type: 'highpass', f: 2500, v: 0.6 });
    for (let i = 0; i < 7; i++) this._n(o, t + 0.15 + Math.random() * 0.9, 0.12, { type: 'bandpass', f: 600 + Math.random() * 2500, q: 2, v: 0.22 });
  } },
  swing: { fn(o, t) { this._n(o, t, 0.2, { type: 'bandpass', f: 450, f1: 1800, q: 1.6, v: 0.45, a: 0.07 }); } },
  swingHeavy: { fn(o, t) { this._n(o, t, 0.32, { type: 'bandpass', f: 280, f1: 1000, q: 1.4, v: 0.6, a: 0.14 }); } },
  thump: { gap: 0.03, max: 2, fn(o, t, v) {
    this._t(o, t, 0.2, { f: 110, f1: 38, v: 1.0 * v });
    this._n(o, t, 0.12, { type: 'lowpass', f: 700, v: 0.8 * v });
  } },
  imp_plaster: { fn(o, t, v) {
    this._n(o, t, 0.35, { type: 'lowpass', f: 900, f1: 150, v: 0.9 * v });
    this._t(o, t, 0.18, { f: 95, f1: 45, v: 0.5 * v });
    this._n(o, t + 0.05, 0.4, { type: 'highpass', f: 1500, v: 0.08 * v, a: 0.05 });
  } },
  imp_wood: { fn(o, t, v) {
    this._n(o, t, 0.1, { type: 'bandpass', f: 900 + Math.random() * 400, q: 2.5, v: 0.9 * v });
    this._t(o, t, 0.12, { type: 'triangle', f: 240, f1: 150, v: 0.45 * v });
    this._n(o, t, 0.04, { type: 'highpass', f: 3000, v: 0.4 * v });
  } },
  imp_metal: { fn(o, t, v) {
    const f = 280 + Math.random() * 500;
    this._t(o, t, 0.9, { f, v: 0.26 * v });
    this._t(o, t, 0.55, { f: f * 2.76, v: 0.15 * v });
    this._t(o, t, 0.3, { f: f * 5.4, v: 0.09 * v });
    this._n(o, t, 0.05, { type: 'bandpass', f: 3500, q: 1, v: 0.5 * v });
  } },
  imp_glass: { max: 3, fn(o, t, v) {
    this._n(o, t, 0.3, { type: 'highpass', f: 3500, v: 0.7 * v });
    this._n(o, t, 0.08, { type: 'bandpass', f: 2000, q: 1, v: 0.5 * v });
    for (let i = 0; i < 7; i++) this._t(o, t + Math.random() * 0.18, 0.2 + Math.random() * 0.5, { f: 2400 + Math.random() * 4500, v: 0.07 * v });
  } },
  imp_ceramic: { fn(o, t, v) {
    this._n(o, t, 0.18, { type: 'highpass', f: 2200, v: 0.6 * v });
    for (let i = 0; i < 4; i++) this._t(o, t + Math.random() * 0.08, 0.15 + Math.random() * 0.2, { f: 1300 + Math.random() * 2200, v: 0.09 * v });
  } },
  imp_plastic: { fn(o, t, v) {
    this._n(o, t, 0.06, { type: 'bandpass', f: 1400, q: 3, v: 0.7 * v });
    this._t(o, t, 0.05, { type: 'square', f: 520, f1: 260, v: 0.07 * v });
  } },
  imp_soft: { fn(o, t, v) { this._n(o, t, 0.14, { type: 'lowpass', f: 450, v: 0.9 * v }); } },
  imp_paper: { fn(o, t, v) {
    this._n(o, t, 0.22, { type: 'bandpass', f: 3200, q: 0.6, v: 0.35 * v, a: 0.02 });
    this._n(o, t + 0.06, 0.18, { type: 'highpass', f: 4000, v: 0.2 * v, a: 0.02 });
  } },
  imp_splat: { fn(o, t, v) {
    this._n(o, t, 0.16, { type: 'bandpass', f: 700, f1: 250, q: 1.5, v: 0.8 * v });
    this._t(o, t, 0.08, { f: 180, f1: 60, v: 0.3 * v });
  } },
  imp_electric: { fn(o, t, v) {
    SFX.imp_glass.fn.call(this, o, t, v * 0.7);
    this._t(o, t, 0.35, { type: 'sawtooth', f: 110, f1: 60, v: 0.1 * v });
    for (let i = 0; i < 5; i++) this._n(o, t + Math.random() * 0.3, 0.03, { type: 'bandpass', f: 5000, q: 2, v: 0.3 * v });
  } },
  zap: { fn(o, t) {
    this._t(o, t, 0.3, { type: 'sawtooth', f: 180, f1: 50, v: 0.15 });
    for (let i = 0; i < 6; i++) this._n(o, t + Math.random() * 0.25, 0.03, { type: 'bandpass', f: 4500, q: 2, v: 0.35 });
  } },
  collapse: { gap: 0.3, max: 1, fn(o, t, v) {
    this._n(o, t, 1.4, { type: 'lowpass', f: 500, f1: 80, v: 0.9 * v, a: 0.05 });
    for (let i = 0; i < 8; i++) this._n(o, t + Math.random() * 0.9, 0.15, { type: 'bandpass', f: 300 + Math.random() * 900, q: 1.5, v: 0.35 * v });
  } },
  ricochet: { fn(o, t) {
    this._t(o, t, 0.25, { f: 3000 + Math.random() * 1500, f1: 1200, v: 0.06 });
    this._n(o, t, 0.05, { type: 'highpass', f: 3000, v: 0.35 });
  } },
  beep: { gap: 0.02, max: 6, fn(o, t, v) { this._t(o, t, 0.06, { type: 'square', f: 1900, v: 0.1 * v }); } },
  mine_arm: { fn(o, t) {
    this._n(o, t, 0.04, { type: 'bandpass', f: 2200, q: 3, v: 0.5 });
    this._t(o, t + 0.05, 0.12, { type: 'square', f: 900, f1: 1800, v: 0.08 });
  } },
  minigun: { gap: 0.03, max: 2, fn(o, t) {
    this._n(o, t, 0.06, { type: 'bandpass', f: 2800, f1: 900, q: 0.9, v: 0.55 });
    this._t(o, t, 0.05, { f: 130, f1: 55, v: 0.45 });
  } },
  fuse: { gap: 0.06, max: 1, fn(o, t, v) {
    this._n(o, t, 0.07, { type: 'highpass', f: 4200, v: 0.14 * v });
    if (Math.random() < 0.4) this._n(o, t + 0.02, 0.02, { type: 'bandpass', f: 6000, q: 3, v: 0.2 * v });
  } },
  fuse_light: { fn(o, t) {
    this._n(o, t, 0.3, { type: 'bandpass', f: 1800, f1: 3500, q: 1, v: 0.45, a: 0.03 });
    this._t(o, t, 0.12, { type: 'triangle', f: 500, f1: 900, v: 0.08 });
  } },
  bigboom: { gap: 0.3, max: 1, fn(o, t) {
    this._n(o, t, 4.5, { type: 'lowpass', f: 1800, f1: 35, q: 0.7, v: 2.0, a: 0.01 });
    this._t(o, t, 3.0, { f: 55, f1: 16, v: 2.0 });
    this._t(o, t, 1.2, { type: 'sawtooth', f: 90, f1: 25, v: 0.5 });
    this._n(o, t, 0.5, { type: 'highpass', f: 2000, v: 0.9 });
    for (let i = 0; i < 16; i++) this._n(o, t + 0.2 + Math.random() * 2.5, 0.15, { type: 'bandpass', f: 300 + Math.random() * 2500, q: 2, v: 0.3 });
  } },
  splash: { gap: 0.05, max: 3, fn(o, t, v) {
    this._n(o, t, 0.35, { type: 'lowpass', f: 1400, f1: 250, v: 0.7 * v, a: 0.005 });
    this._n(o, t, 0.12, { type: 'highpass', f: 2500, v: 0.25 * v });
    for (let i = 0; i < 4; i++) this._t(o, t + 0.05 + Math.random() * 0.25, 0.06, { f: 500 + Math.random() * 700, f1: 1200 + Math.random() * 800, v: 0.07 * v });
  } },
  dig: { gap: 0.05, max: 2, fn(o, t) {
    this._n(o, t, 0.08, { type: 'bandpass', f: 2600, q: 2, v: 0.35 });
    this._n(o, t + 0.03, 0.35, { type: 'lowpass', f: 900, f1: 200, v: 0.8, a: 0.02 });
    this._n(o, t + 0.12, 0.25, { type: 'bandpass', f: 500, q: 0.8, v: 0.35, a: 0.05 });
  } },
  empty: { fn(o, t) { this._t(o, t, 0.02, { type: 'square', f: 1800, v: 0.15 }); } },
  reload: { fn(o, t) {
    this._n(o, t, 0.05, { type: 'bandpass', f: 2500, q: 3, v: 0.4 });
    this._t(o, t, 0.02, { type: 'square', f: 1200, v: 0.1 });
    this._n(o, t + 0.4, 0.06, { type: 'bandpass', f: 1800, q: 3, v: 0.5 });
    this._t(o, t + 0.41, 0.03, { type: 'square', f: 900, v: 0.12 });
  } },
  switch: { fn(o, t) {
    this._n(o, t, 0.08, { type: 'bandpass', f: 1800, q: 2, v: 0.35 });
    this._t(o, t + 0.05, 0.03, { type: 'square', f: 700, v: 0.08 });
  } },
  ui_hover: { gap: 0.03, max: 1, fn(o, t) { this._t(o, t, 0.05, { type: 'triangle', f: 1200, f1: 1500, v: 0.07 }); } },
  ui_click: { fn(o, t) {
    this._t(o, t, 0.09, { type: 'square', f: 320, f1: 160, v: 0.1 });
    this._n(o, t, 0.06, { type: 'lowpass', f: 1400, v: 0.4 });
  } },
  ui_back: { fn(o, t) { this._t(o, t, 0.1, { type: 'triangle', f: 500, f1: 250, v: 0.12 }); } },
  whoosh: { fn(o, t) { this._n(o, t, 0.5, { type: 'bandpass', f: 200, f1: 2200, q: 1, v: 0.35, a: 0.25 }); } },
  cash: { fn(o, t) {
    this._n(o, t, 0.06, { type: 'highpass', f: 3000, v: 0.4 });
    this._t(o, t + 0.05, 0.8, { f: 2093, v: 0.14 });
    this._t(o, t + 0.05, 0.8, { f: 2637, v: 0.11 });
    this._t(o, t + 0.05, 1.0, { f: 3136, v: 0.08 });
  } },
  stamp: { fn(o, t) {
    this._n(o, t, 0.2, { type: 'lowpass', f: 400, v: 1.1 });
    this._t(o, t, 0.25, { f: 90, f1: 40, v: 0.9 });
  } },
  type: { gap: 0.025, max: 1, fn(o, t) { this._n(o, t, 0.015, { type: 'bandpass', f: 3500, q: 4, v: 0.1 }); } },
  combo: { gap: 0.05, max: 1, fn(o, t, v) {
    const f = 330 * Math.pow(2, Math.min(v, 14) / 12);
    this._t(o, t, 0.12, { type: 'square', f, v: 0.06 });
    this._t(o, t + 0.07, 0.2, { type: 'square', f: f * 1.5, v: 0.06 });
  } },
  announce: { fn(o, t) {
    this._t(o, t, 0.5, { type: 'sawtooth', f: 110, f1: 55, v: 0.15 });
    this._n(o, t, 0.4, { type: 'lowpass', f: 600, v: 0.5 });
  } },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { sfx: 0.8, music: 0.5 };
    this.lp = { x: 0, y: 1.6, z: 0, yaw: 0 };
    this.stamps = {};
    this.musOn = false;
    this.intensity = 0;
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.connect(this.master);
    this.verb = c.createConvolver(); this.verb.buffer = this._impulse(1.4, 2.6);
    this.verbSend = c.createGain(); this.verbSend.gain.value = 0.2;
    this.verbSend.connect(this.verb); this.verb.connect(this.sfx);
    const len = c.sampleRate * 2;
    const nb = c.createBuffer(1, len, c.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.setVolumes(this.vol.sfx, this.vol.music);
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  _impulse(sec, decay) {
    const c = this.ctx, len = Math.floor(sec * c.sampleRate), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  setVolumes(sfx, music) {
    this.vol.sfx = sfx; this.vol.music = music;
    if (this.ctx) { this.sfx.gain.value = sfx; this.mus.gain.value = music * 0.5; }
  }

  listener(pos, yaw) { this.lp.x = pos.x; this.lp.y = pos.y; this.lp.z = pos.z; this.lp.yaw = yaw; }

  _throttle(k, gap, max) {
    const now = this.ctx.currentTime;
    let s = this.stamps[k];
    if (!s) s = this.stamps[k] = { t: -1, n: 0 };
    if (now - s.t > gap) { s.t = now; s.n = 1; return true; }
    if (s.n < max) { s.n++; return true; }
    return false;
  }

  _bus(pos, vol) {
    const c = this.ctx;
    const g = c.createGain();
    let v = vol, pan = 0;
    if (pos) {
      const dx = pos.x - this.lp.x, dy = pos.y - this.lp.y, dz = pos.z - this.lp.z;
      const dist = Math.hypot(dx, dy, dz);
      v *= 1 / (1 + dist * 0.14);
      const rx = Math.cos(this.lp.yaw), rz = -Math.sin(this.lp.yaw);
      pan = dist > 0.3 ? (dx * rx + dz * rz) / dist : 0;
    }
    g.gain.value = v;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan * 0.75));
      g.connect(p); p.connect(this.sfx); p.connect(this.verbSend);
    } else { g.connect(this.sfx); g.connect(this.verbSend); }
    return g;
  }

  _n(out, t, dur, { type = 'lowpass', f = 1000, f1, q = 1, v = 1, a = 0.002 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + a + dur);
    fl.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, v), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * 1.5);
    s.stop(t + a + dur + 0.05);
  }

  _t(out, t, dur, { type = 'sine', f = 440, f1, v = 0.5, a = 0.002 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, v), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + a + dur + 0.05);
  }

  play(name, pos = null, vol = 1) {
    if (!this.ctx) return;
    const s = SFX[name];
    if (!s) return;
    if (!this._throttle(name, s.gap ?? 0.035, s.max ?? 3)) return;
    const t = this.ctx.currentTime + 0.005;
    s.fn.call(this, this._bus(pos, name === 'combo' ? 1 : vol), t, vol);
  }

  impact(kind, pos, vol = 1) { this.play('imp_' + kind, pos, vol); }

  // moteur deux-temps de la tronçonneuse : 0 = coupé, ~0.3 = ralenti, 1 = plein régime
  saw(level) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (level > 0.01 && !this.sw) {
      const o1 = c.createOscillator(); o1.type = 'sawtooth';
      const o2 = c.createOscillator(); o2.type = 'square';
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
      const g = c.createGain(); g.gain.value = 0;
      const lfo = c.createOscillator(); lfo.type = 'square';
      const lg = c.createGain(); lfo.connect(lg); lg.connect(g.gain);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx);
      o1.start(); o2.start(); lfo.start();
      this.sw = { o1, o2, f, g, lfo, lg };
    }
    if (!this.sw) return;
    const { o1, o2, f, g, lfo, lg } = this.sw;
    if (level <= 0.01) {
      g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.03);
      o1.stop(t + 0.2); o2.stop(t + 0.2); lfo.stop(t + 0.2);
      this.sw = null; return;
    }
    o1.frequency.setTargetAtTime(48 + level * 120, t, 0.05);
    o2.frequency.setTargetAtTime(97 + level * 243, t, 0.05);
    f.frequency.setTargetAtTime(500 + level * 3200, t, 0.05);
    lfo.frequency.setTargetAtTime(14 + level * 30, t, 0.05);
    const base = 0.04 + level * 0.1;
    g.gain.setTargetAtTime(base, t, 0.05);
    lg.gain.setTargetAtTime(base * 0.45, t, 0.05);
  }

  // moteur de la minigun : un sifflement qui monte avec la rotation
  spinner(level) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (level > 0.01 && !this.sp) {
      const o1 = c.createOscillator(); o1.type = 'sawtooth';
      const o2 = c.createOscillator(); o2.type = 'square';
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
      const g = c.createGain(); g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx);
      o1.start(); o2.start();
      this.sp = { o1, o2, f, g };
    }
    if (!this.sp) return;
    if (level <= 0.01) {
      const { o1, o2, g } = this.sp;
      g.gain.setTargetAtTime(0, t, 0.03); o1.stop(t + 0.2); o2.stop(t + 0.2);
      this.sp = null; return;
    }
    const { o1, o2, f, g } = this.sp;
    o1.frequency.setTargetAtTime(40 + level * 110, t, 0.03);
    o2.frequency.setTargetAtTime(80 + level * 220, t, 0.03);
    f.frequency.setTargetAtTime(300 + level * 1500, t, 0.03);
    g.gain.setTargetAtTime(0.16 * level, t, 0.03);
  }

  // ---------- musique : groove de polar, ré mineur, un peu chaloupé
  startMusic() {
    if (!this.ctx || this.musOn) return;
    this.musOn = true; this.mStep = 0; this.mT = this.ctx.currentTime + 0.1;
    this.mTimer = setInterval(() => this._msched(), 25);
  }
  stopMusic() { this.musOn = false; clearInterval(this.mTimer); }
  _msched() {
    const c = this.ctx, spb = 60 / 98 / 4;
    while (this.mT < c.currentTime + 0.15) {
      this._mstep(this.mStep, this.mT);
      this.mT += spb * (this.mStep % 2 === 0 ? 1.14 : 0.86);
      this.mStep++;
    }
  }
  _mstep(s, t) {
    const o = this.mus, st = s % 16, bar = Math.floor(s / 16) % 4, I = this.intensity;
    if (st === 0 || st === 7 || st === 8 || (st === 10 && bar % 2)) {
      this._t(o, t, 0.28, { f: 140, f1: 42, v: 0.9 });
      this._n(o, t, 0.02, { type: 'lowpass', f: 3000, v: 0.2 });
    }
    if (st === 4 || st === 12 || (st === 15 && bar === 3)) {
      const v = st === 15 ? 0.25 : 0.5;
      this._n(o, t, 0.16, { type: 'bandpass', f: 1900, q: 0.8, v });
      this._t(o, t, 0.07, { type: 'triangle', f: 220, f1: 160, v: v * 0.6 });
    }
    if (st % 2 === 0 || I > 0.5) this._n(o, t, st === 14 ? 0.18 : 0.035, { type: 'highpass', f: 7500, v: st % 4 === 2 ? 0.16 : 0.08 });
    const n = BASS[bar][st];
    if (n !== null && n !== undefined) this._bass(o, t, 73.42 * Math.pow(2, n / 12), 0.2);
    if ((bar === 3 && st === 0) || (I > 0.5 && bar === 1 && st === 8)) {
      for (const f of [293.66, 349.23, 440]) this._stab(o, t, f);
    }
  }
  _bass(o, t, f, dur) {
    const c = this.ctx;
    const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 4;
    fl.frequency.setValueAtTime(1100, t); fl.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    os.connect(fl); fl.connect(g); g.connect(o); os.start(t); os.stop(t + dur + 0.1);
  }
  _stab(o, t, f) {
    const c = this.ctx;
    const os = c.createOscillator(); os.type = 'square'; os.frequency.value = f;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    os.connect(fl); fl.connect(g); g.connect(o); os.start(t); os.stop(t + 0.45);
  }
}
