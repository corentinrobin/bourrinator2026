// Effets : particules (shader maison), explosions, traçantes, impacts au sol, secousses.
import * as THREE from 'three';

const VS = `
attribute float size; attribute float alpha; attribute vec3 pcolor;
varying vec3 vColor; varying float vAlpha;
uniform float uScale;
void main(){
  vColor = pcolor; vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / max(0.05, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
varying vec3 vColor; varying float vAlpha; uniform float uHard;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a = mix(1.0 - d * d, 1.0 - smoothstep(0.7, 1.0, d), uHard);
  gl_FragColor = vec4(vColor, vAlpha * a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const R = Math.random, rnd = (a = 1) => (R() - 0.5) * 2 * a;
const _c = new THREE.Color(), _base = new THREE.Color(), _white = new THREE.Color(0xffffff);

class Pool {
  constructor(scene, max, blending, hard) {
    this.max = max; this.n = 0; this.floorY = -3.5; this.fl = new Float32Array(max);
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.ml = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    const mk = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', mk(this.pos, 3)); g.setAttribute('pcolor', mk(this.col, 3));
    g.setAttribute('size', mk(this.size, 1)); g.setAttribute('alpha', mk(this.alpha, 1));
    g.setDrawRange(0, 0);
    this.uniforms = { uScale: { value: 500 }, uHard: { value: hard } };
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 3;
    this.geo = g;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, color, a0, grav, drag) {
    if (this.n >= this.max) return;
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = color.r; this.col[i3 + 1] = color.g; this.col[i3 + 2] = color.b;
    this.life[i] = this.ml[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0;
    this.grav[i] = grav; this.drag[i] = drag; this.size[i] = s0; this.alpha[i] = 0;
    this.fl[i] = y >= 0 ? 0.01 : this.floorY;
  }
  _copy(i, j) {
    const i3 = i * 3, j3 = j * 3;
    for (let k = 0; k < 3; k++) { this.pos[i3 + k] = this.pos[j3 + k]; this.vel[i3 + k] = this.vel[j3 + k]; this.col[i3 + k] = this.col[j3 + k]; }
    this.life[i] = this.life[j]; this.ml[i] = this.ml[j]; this.s0[i] = this.s0[j]; this.s1[i] = this.s1[j];
    this.a0[i] = this.a0[j]; this.fl[i] = this.fl[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.size[i] = this.size[j]; this.alpha[i] = this.alpha[j];
  }
  update(dt) {
    for (let i = 0; i < this.n;) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.n--; if (i !== this.n) this._copy(i, this.n); continue; }
      const i3 = i * 3, dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt; this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < this.fl[i]) { this.pos[i3 + 1] = this.fl[i]; this.vel[i3 + 1] *= -0.3; this.vel[i3] *= 0.7; this.vel[i3 + 2] *= 0.7; }
      const t = 1 - this.life[i] / this.ml[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * Math.min(1, t * 8) * (1 - t);
      i++;
    }
    const g = this.geo;
    g.attributes.position.needsUpdate = true; g.attributes.pcolor.needsUpdate = true;
    g.attributes.size.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
    g.setDrawRange(0, this.n);
  }
}

function canvasTex(draw, s = 128) {
  const c = document.createElement('canvas'); c.width = c.height = s;
  draw(c.getContext('2d'), s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.soft = new Pool(scene, 3500, THREE.NormalBlending, 0);
    this.glow = new Pool(scene, 3000, THREE.AdditiveBlending, 0.3);
    this.solid = new Pool(scene, 3500, THREE.NormalBlending, 1);
    this.pools = [this.soft, this.glow, this.solid];
    this.trauma = 0;
    this.lights = [];
    for (let i = 0; i < 2; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 18, 2); l.userData.t = 0; l.userData.d = 1; l.userData.i = 0;
      scene.add(l); this.lights.push(l);
    }
    this.li = 0;
    // traçantes
    const tg = new THREE.BoxGeometry(1, 1, 1); tg.translate(0, 0, 0.5);
    this.tracers = [];
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false; m.frustumCulled = false; m.userData.t = 0; scene.add(m); this.tracers.push(m);
    }
    this.ti = 0;
    // boules de feu + onde de choc
    this.balls = [];
    const bg = new THREE.SphereGeometry(1, 20, 14);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false; m.userData.t = 0; scene.add(m); this.balls.push(m);
    }
    this.rings = [];
    const rg = new THREE.RingGeometry(0.85, 1, 48); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false; m.userData.t = 0; scene.add(m); this.rings.push(m);
    }
    this.bi = 0;
    // décalques (sol / plafond)
    const hole = canvasTex((g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.25, 'rgba(20,18,15,.95)'); gr.addColorStop(0.45, 'rgba(60,55,50,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }, 64);
    const scorch = canvasTex((g, s) => {
      for (let i = 0; i < 40; i++) {
        const x = s / 2 + rnd(s * 0.18), y = s / 2 + rnd(s * 0.18), r = s * (0.15 + R() * 0.3);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(10,8,6,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
      }
    }, 256);
    this.decals = [];
    const pg = new THREE.PlaneGeometry(1, 1);
    const mkD = (tex, n, kind) => {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
        m.visible = false; m.userData.kind = kind; m.renderOrder = 1; scene.add(m); this.decals.push(m);
      }
    };
    mkD(hole, 90, 'hole'); mkD(scorch, 16, 'scorch');
    this.di = { hole: 0, scorch: 0 };
  }

  setScale(h, fov) {
    const s = h / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    for (const p of this.pools) p.uniforms.uScale.value = s;
  }

  clear() {
    for (const p of this.pools) { p.n = 0; p.geo.setDrawRange(0, 0); }
    for (const d of this.decals) d.visible = false;
    for (const t of this.tracers) t.visible = false;
    for (const b of this.balls) b.visible = false;
    for (const r of this.rings) r.visible = false;
    for (const l of this.lights) { l.intensity = 0; l.userData.t = 0; }
    this.trauma = 0;
  }

  shake(a) { this.trauma = Math.min(1, this.trauma + a); }

  burst(kind, p, color, k = 1) {
    const x = p.x, y = p.y, z = p.z;
    const col = color ? _base.copy(color) : _base.set(kind === 'dust' ? 0xbbb4a6 : 0xffffff);
    switch (kind) {
      case 'dust': {
        const n = Math.round(4 * k);
        for (let i = 0; i < n; i++) {
          const c = _c.copy(col).multiplyScalar(0.7 + R() * 0.25);
          this.soft.spawn(x + rnd(0.15), y + rnd(0.15), z + rnd(0.15), rnd(1.4), R() * 1.2, rnd(1.4), 0.6 + R() * 0.8, 0.12, 0.5 + R() * 0.4, c, 0.3, -0.25, 2.2);
        }
        break;
      }
      case 'chips': {
        const n = Math.round(8 * k);
        for (let i = 0; i < n; i++) {
          const c = _c.copy(col).multiplyScalar(0.6 + R() * 0.4);
          this.solid.spawn(x, y, z, rnd(4), 1 + R() * 4, rnd(4), 0.5 + R() * 0.6, 0.035, 0.03, c, 1, 12, 0.4);
        }
        break;
      }
      case 'sparks': {
        const n = Math.round(12 * k);
        for (let i = 0; i < n; i++) {
          _c.setHSL(0.08 + R() * 0.06, 1, 0.55 + R() * 0.3);
          this.glow.spawn(x, y, z, rnd(6), R() * 5, rnd(6), 0.2 + R() * 0.45, 0.05, 0.02, _c, 1.4, 11, 0.8);
        }
        break;
      }
      case 'glass': {
        const n = Math.round(14 * k);
        for (let i = 0; i < n; i++) {
          _c.setRGB(0.75 + R() * 0.25, 0.9, 1);
          this.glow.spawn(x + rnd(0.1), y + rnd(0.1), z + rnd(0.1), rnd(3.5), R() * 3, rnd(3.5), 0.35 + R() * 0.6, 0.035, 0.02, _c, 0.9, 10, 0.5);
        }
        break;
      }
      case 'confetti': {
        const n = Math.round(22 * k);
        for (let i = 0; i < n; i++) {
          if (R() < 0.6) _c.set(0xf4f1e8); else _c.copy(col);
          this.solid.spawn(x, y, z, rnd(3), 1 + R() * 3, rnd(3), 1.5 + R() * 1.5, 0.05, 0.05, _c, 1, 1.6, 2.8);
        }
        break;
      }
      case 'fluff': {
        const n = Math.round(12 * k);
        for (let i = 0; i < n; i++) {
          const c = _c.copy(col).lerp(_white, 0.4);
          this.soft.spawn(x, y, z, rnd(2), R() * 2, rnd(2), 1 + R(), 0.08, 0.14, c, 0.9, 0.6, 2.5);
        }
        break;
      }
      case 'splat': {
        const n = Math.round(14 * k);
        for (let i = 0; i < n; i++) {
          const c = _c.copy(col).multiplyScalar(0.8 + R() * 0.3);
          this.solid.spawn(x, y, z, rnd(3.5), R() * 3, rnd(3.5), 0.5 + R() * 0.5, 0.06, 0.04, c, 1, 12, 0.3);
        }
        break;
      }
      case 'smoke': {
        const n = Math.round(10 * k);
        for (let i = 0; i < n; i++) {
          const g = 0.12 + R() * 0.15; _c.setRGB(g, g, g);
          this.soft.spawn(x + rnd(0.3), y + rnd(0.3), z + rnd(0.3), rnd(1.2), 0.5 + R() * 1.5, rnd(1.2), 2 + R() * 2, 0.5, 2.4 + R() * 1.5, _c, 0.55, -0.5, 1.2);
        }
        break;
      }
      case 'fire': {
        const n = Math.round(30 * k);
        for (let i = 0; i < n; i++) {
          _c.setHSL(0.02 + R() * 0.1, 1, 0.45 + R() * 0.2);
          const s = 5 + R() * 6;
          const vx = rnd(1), vy = rnd(1), vz = rnd(1); const l = Math.hypot(vx, vy, vz) || 1;
          this.glow.spawn(x, y, z, vx / l * s, vy / l * s + 1, vz / l * s, 0.35 + R() * 0.45, 0.6, 1.8, _c, 1.3, -1, 4.5);
        }
        break;
      }
      case 'muzzle': {
        for (let i = 0; i < 4; i++) {
          _c.setRGB(0.5, 0.5, 0.5);
          this.soft.spawn(x, y, z, rnd(0.3), 0.3 + R() * 0.4, rnd(0.3), 0.6 + R() * 0.5, 0.05, 0.3, _c, 0.25, -0.3, 2);
        }
        break;
      }
      case 'splash': {
        const n = Math.round(18 * k);
        for (let i = 0; i < n; i++) {
          _c.setRGB(0.7 + R() * 0.3, 0.85 + R() * 0.15, 1);
          const a = R() * Math.PI * 2, sp = 0.6 + R() * 1.8;
          this.solid.spawn(x, y + 0.02, z, Math.cos(a) * sp, 2.5 + R() * 3.5 * k, Math.sin(a) * sp, 0.5 + R() * 0.5, 0.05, 0.03, _c, 1, 12, 0.3);
        }
        for (let i = 0; i < 4 * k; i++) {
          _c.setRGB(0.8, 0.9, 0.95);
          this.soft.spawn(x + rnd(0.2), y + 0.1, z + rnd(0.2), rnd(0.5), 0.4 + R() * 0.5, rnd(0.5), 0.6 + R() * 0.4, 0.2, 0.7, _c, 0.35, 0.3, 2);
        }
        break;
      }
      case 'trail': {
        _c.setHSL(0.07, 1, 0.6);
        this.glow.spawn(x, y, z, rnd(0.4), rnd(0.4), rnd(0.4), 0.15, 0.25, 0.08, _c, 1.2, 0, 1);
        const g = 0.35 + R() * 0.2; _c.setRGB(g, g, g);
        this.soft.spawn(x, y, z, rnd(0.3), 0.2 + rnd(0.2), rnd(0.3), 1 + R() * 0.8, 0.15, 0.9, _c, 0.35, -0.2, 1.5);
        break;
      }
    }
  }

  flash(p, color = 0xffaa55, intensity = 40, dur = 0.3, dist = 18) {
    const l = this.lights[this.li++ % this.lights.length];
    l.position.copy(p); l.color.set(color); l.distance = dist;
    l.userData.t = dur; l.userData.d = dur; l.userData.i = intensity; l.intensity = intensity;
  }

  tracer(a, b) {
    const m = this.tracers[this.ti++ % this.tracers.length];
    const len = a.distanceTo(b);
    if (len < 0.3) return;
    m.position.copy(a); m.lookAt(b);
    m.scale.set(0.012, 0.012, len);
    m.visible = true; m.userData.t = 0.06; m.material.opacity = 0.9;
  }

  decal(kind, point, normal, size) {
    if (Math.abs(normal.y) < 0.9) return;
    const list = this.decals.filter((d) => d.userData.kind === kind);
    const m = list[this.di[kind]++ % list.length];
    m.position.copy(point); m.position.y += normal.y > 0 ? 0.004 : -0.004;
    m.rotation.set(normal.y > 0 ? -Math.PI / 2 : Math.PI / 2, 0, R() * Math.PI * 2);
    m.scale.setScalar(size); m.visible = true;
  }

  explosion(p, r) {
    this.burst('fire', p, null, 1.6);
    this.burst('smoke', p, null, 2.6);
    this.burst('sparks', p, null, 3);
    this.burst('chips', p, new THREE.Color(0x333333), 2);
    this.flash(p, 0xff9a40, 90, 0.45, r * 6);
    const b = this.balls[this.bi % 3], ring = this.rings[this.bi % 3]; this.bi++;
    b.position.copy(p); b.visible = true; b.userData.t = 0; b.userData.r = r;
    ring.position.copy(p); ring.position.y = Math.max(0.05, p.y - 0.3); ring.visible = true; ring.userData.t = 0; ring.userData.r = r;
    if (p.y < 1.2 && !(this.noScorch && this.noScorch(p))) this.decal('scorch', new THREE.Vector3(p.x, 0, p.z), new THREE.Vector3(0, 1, 0), r * 1.3);
  }

  update(dt) {
    for (const p of this.pools) p.update(dt);
    for (const l of this.lights) {
      if (l.userData.t > 0) {
        l.userData.t -= dt;
        const k = Math.max(0, l.userData.t / l.userData.d);
        l.intensity = l.userData.i * k * k;
      } else l.intensity = 0;
    }
    for (const t of this.tracers) {
      if (!t.visible) continue;
      t.userData.t -= dt; t.material.opacity = Math.max(0, t.userData.t / 0.06) * 0.9;
      if (t.userData.t <= 0) t.visible = false;
    }
    for (const b of this.balls) {
      if (!b.visible) continue;
      b.userData.t += dt; const k = b.userData.t / 0.45;
      if (k >= 1) { b.visible = false; continue; }
      b.scale.setScalar(b.userData.r * (0.25 + 0.6 * Math.sqrt(k)));
      b.material.opacity = (1 - k) * 0.85;
      b.material.color.setHSL(0.1 - k * 0.08, 1, 0.6 - k * 0.3);
    }
    for (const r of this.rings) {
      if (!r.visible) continue;
      r.userData.t += dt; const k = r.userData.t / 0.5;
      if (k >= 1) { r.visible = false; continue; }
      r.scale.setScalar(r.userData.r * (0.3 + 1.6 * k));
      r.material.opacity = (1 - k) * 0.6;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
  }

  shakeOffset(time) {
    const s = this.trauma * this.trauma;
    return {
      x: s * 0.05 * (Math.sin(time * 37.1) + Math.sin(time * 71.3) * 0.5),
      y: s * 0.05 * (Math.sin(time * 41.7 + 1.3) + Math.sin(time * 63.1) * 0.5),
      z: s * 0.04 * Math.sin(time * 29.3 + 2.1),
    };
  }
}
