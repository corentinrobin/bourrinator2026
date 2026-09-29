// Monde destructible : chaque objet est un assemblage de « pièces » (boîtes / cylindres)
// rendues en InstancedMesh. Les pièces statiques forment un graphe de supports ;
// quand un appui saute, tout ce qui n'est plus relié au sol tombe.
import * as THREE from 'three';

export const STATIC = 0, DYN = 1, DEAD = 2;

export const MATS = {
  plaster: { hp: 55, rough: 0.92, metal: 0.0, sound: 'plaster', fx: 'dust', noShadow: true },
  ceiling: { hp: 45, rough: 0.95, metal: 0.0, sound: 'plaster', fx: 'dust', noShadow: true },
  // dalle du rez-de-chaussée : texturée avec le motif du niveau (carrelage, parquet…)
  ground:  { hp: 80, rough: 0.6, metal: 0.0, sound: 'plaster', fx: 'dust', noShadow: true },
  // revêtement de la cour (pavés, pelouse…), texturé lui aussi
  yard:    { hp: 80, rough: 0.85, metal: 0.0, sound: 'plaster', fx: 'dust', noShadow: true },
  // toile d'écran de cinéma : chaque pièce brille de sa propre couleur (l'image projetée)
  movie:   { hp: 18, rough: 0.9, metal: 0.0, sound: 'soft', fx: 'fluff', noShadow: true, selfLit: 0.9 },
  earth:   { hp: 60, rough: 1.0, metal: 0.0, sound: 'soft', fx: 'dust', noShadow: true, chunks: 4 },
  floorboard: { hp: 55, rough: 0.7, metal: 0.0, sound: 'wood', fx: 'splinter', noShadow: true },
  stone:   { hp: 95, rough: 0.4, metal: 0.0, sound: 'plaster', fx: 'dust' },
  wood:    { hp: 42, rough: 0.66, metal: 0.0, sound: 'wood', fx: 'splinter' },
  // acier blindé : encaisse, et ne craint vraiment que les explosifs
  steel:   { hp: 1500, rough: 0.28, metal: 0.9, sound: 'metal', fx: 'sparks', resist: 0.25 },
  metal:   { hp: 110, rough: 0.35, metal: 0.8, sound: 'metal', fx: 'sparks' },
  plastic: { hp: 16, rough: 0.45, metal: 0.0, sound: 'plastic', fx: 'dust' },
  fabric:  { hp: 26, rough: 1.0, metal: 0.0, sound: 'soft', fx: 'fluff' },
  paper:   { hp: 4, rough: 0.9, metal: 0.0, sound: 'paper', fx: 'confetti' },
  food:    { hp: 4, rough: 0.55, metal: 0.0, sound: 'splat', fx: 'splat', fragile: true },
  ceramic: { hp: 7, rough: 0.18, metal: 0.0, sound: 'ceramic', fx: 'shards', shatter: true, fragile: true },
  glass:   { hp: 4, rough: 0.04, metal: 0.1, sound: 'glass', fx: 'glass', shatter: true, fragile: true, transparent: true, opacity: 0.26 },
  bottle:  { hp: 4, rough: 0.08, metal: 0.1, sound: 'glass', fx: 'glass', shatter: true, fragile: true, transparent: true, opacity: 0.8 },
  screen:  { hp: 10, rough: 0.2, metal: 0.4, sound: 'electric', fx: 'electric', shatter: true, fragile: true, emissive: 0x1b3a5c, ei: 1.0 },
  neon:    { hp: 3, rough: 0.3, metal: 0.0, sound: 'glass', fx: 'electric', shatter: true, fragile: true, emissive: 0xfff2dc, ei: 2.4 },
};

// valeur de base en € et volume de référence (m³)
export const CATS = {
  'Murs':           { base: 22, ref: 0.05, label: 'Maçonnerie' },
  'Plafond':        { base: 18, ref: 0.05, label: 'Plafond' },
  'Sol':            { base: 20, ref: 0.1, label: 'Sol' },
  'Terre':          { base: 4, ref: 0.5, label: 'Terrassement' },
  'Vitres':         { base: 160, ref: 0.02, label: 'Vitrerie' },
  'Mobilier':       { base: 70, ref: 0.05, label: 'Mobilier' },
  'Électronique':   { base: 420, ref: 0.01, label: 'Électronique' },
  'Électroménager': { base: 480, ref: 0.3, label: 'Électroménager' },
  'Vaisselle':      { base: 18, ref: 0.001, label: 'Vaisselle' },
  'Bouteilles':     { base: 22, ref: 0.002, label: 'Bouteilles' },
  'Marchandise':    { base: 9, ref: 0.004, label: 'Marchandise' },
  'Paperasse':      { base: 3, ref: 0.002, label: 'Paperasse' },
  'Déco':           { base: 55, ref: 0.01, label: 'Décoration' },
  'Luminaires':     { base: 130, ref: 0.01, label: 'Luminaires' },
  'Billets':        { base: 320, ref: 0.0002, label: 'Billets de banque' },
  'Lingots':        { base: 1500, ref: 0.0015, label: 'Lingots d\'or' },
  'Coffre':         { base: 120, ref: 0.1, label: 'Coffre-fort' },
  'Véhicules':      { base: 650, ref: 0.3, label: 'Véhicules' },
  'Pièces auto':    { base: 45, ref: 0.02, label: 'Pièces détachées' },
  'Collections':    { base: 380, ref: 0.02, label: 'Pièces de collection' },
};

const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const _ax = new THREE.Vector3();
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

class Piece {
  constructor() {
    this.pos = new THREE.Vector3(); this.size = new THREE.Vector3(); this.quat = new THREE.Quaternion();
    this.vel = new THREE.Vector3(); this.ang = new THREE.Vector3();
    this.min = new THREE.Vector3(); this.max = new THREE.Vector3();
    this.color = new THREE.Color(); this.base = new THREE.Color();
    this.out = []; this.state = STATIC; this.fade = 1; this.life = Infinity;
    this.sleeping = false; this.sleepT = 0; this._s = 0; this._r = 0; this.li = -1; this.b = null; this.slot = -1;
    this.value = 0; this.counted = false; this.group = 0;
  }
  vol() { return this.size.x * this.size.y * this.size.z; }
  maxDim() { return Math.max(this.size.x, this.size.y, this.size.z); }
}

export class World {
  constructor(scene, fx, audio) {
    this.scene = scene; this.fx = fx; this.audio = audio;
    this.geos = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14), disc: new THREE.CylinderGeometry(0.5, 0.5, 1, 28).rotateX(Math.PI / 2),
      // roue : le même disque, mais d'axe x
      wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 24).rotateZ(Math.PI / 2) };
    this.materials = {};
    for (const [k, m] of Object.entries(MATS)) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: m.rough, metalness: m.metal });
      if (m.transparent) { mat.transparent = true; mat.opacity = m.opacity; mat.depthWrite = false; }
      if (m.emissive) { mat.emissive = new THREE.Color(m.emissive); mat.emissiveIntensity = m.ei; }
      if (m.selfLit) mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * ${m.selfLit.toFixed(2)};`);
      };
      this.materials[k] = mat;
    }
    // sol intérieur et cour : textures du niveau, projetées en coordonnées monde (x, z)
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
    const worldMapped = (mat) => {
      const U = { uFloorMap: { value: white }, uFloorScale: { value: 1 } };
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec2 vFloorUV;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 fw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            fw = instanceMatrix * fw;
          #endif
          vFloorUV = (modelMatrix * fw).xz;`);
        sh.fragmentShader = 'uniform sampler2D uFloorMap;\nuniform float uFloorScale;\nvarying vec2 vFloorUV;\n' +
          sh.fragmentShader.replace('#include <map_fragment>', 'diffuseColor *= texture2D(uFloorMap, vFloorUV * uFloorScale);');
      };
      return U;
    };
    this.floorU = worldMapped(this.materials.ground);
    this.yardU = worldMapped(this.materials.yard);
    this.rootY = 0.04; this.pitY = 0;
    this.batches = new Map();
    this.maxDyn = 1100; this.maxChunks = 12;
    this.onScore = null; this.onCollapse = null;
    this.room = { x0: -5, x1: 5, z0: -5, z1: 5, h: 3.2 };
    this.clear();
  }

  clear() {
    for (const b of this.batches.values()) { b.mesh.count = 0; b.slots.length = 0; b.dirtyM = b.dirtyC = true; }
    this.statics = []; this.dyns = []; this.ageQ = [];
    this.cells = new Map(); this.stamp = 0; this.bfs = 0;
    this.nextId = 1; this.groups = 0; this.time = 0;
    this.totalValue = 0; this.destroyedValue = 0; this.initialCount = 0;
    this.lightLinks = []; this.structDirty = false; this.fxBudget = 30; this.mortal = 0; this.shock = null;
    this._tmp = []; this._tmp2 = [];
  }

  newGroup() { return ++this.groups; }

  // ------------------------------------------------------------ instancing
  _batch(mat, shape) {
    const key = mat + '|' + shape;
    let b = this.batches.get(key);
    if (!b) {
      const cap = 8000;
      const mesh = new THREE.InstancedMesh(this.geos[shape], this.materials[mat], cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0; mesh.frustumCulled = false;
      mesh.castShadow = !MATS[mat].transparent && mat !== 'neon' && !MATS[mat].noShadow;
      mesh.receiveShadow = !MATS[mat].transparent;
      if (MATS[mat].transparent) mesh.renderOrder = 2;
      this.scene.add(mesh);
      b = { mesh, slots: [], cap, dirtyM: false, dirtyC: false };
      this.batches.set(key, b);
    }
    return b;
  }
  _bAdd(p) {
    const b = this._batch(p.mat, p.shape);
    if (b.mesh.count >= b.cap) return false;
    p.b = b; p.slot = b.mesh.count++; b.slots[p.slot] = p;
    this._writeM(p); this._writeC(p);
    return true;
  }
  _bRemove(p) {
    const b = p.b; if (!b) return;
    const last = b.mesh.count - 1, lp = b.slots[last];
    if (lp !== p) { b.slots[p.slot] = lp; lp.slot = p.slot; this._writeM(lp); this._writeC(lp); }
    b.slots[last] = null; b.mesh.count--; b.dirtyM = b.dirtyC = true; p.b = null;
  }
  _writeM(p) {
    _s.copy(p.size); if (p.fade < 1) _s.multiplyScalar(p.fade);
    _m.compose(p.pos, p.quat, _s);
    p.b.mesh.setMatrixAt(p.slot, _m); p.b.dirtyM = true;
  }
  _writeC(p) { p.b.mesh.setColorAt(p.slot, p.color); p.b.dirtyC = true; }

  // ------------------------------------------------------------ construction
  add(o) {
    // les grandes pièces sont découpées en segments solidaires : la casse devient plus fine
    if (!o._seg && !o.noSplit && !MATS[o.mat].shatter && (o.shape || 'box') === 'box') {
      const nx = Math.ceil(o.w / 1.0 - 0.05), nz = Math.ceil(o.d / 1.0 - 0.05), ny = o.h > 1.4 ? Math.ceil(o.h / 1.0 - 0.05) : 1;
      if (nx * ny * nz > 1) {
        const group = o.group || this.newGroup();
        const col = new THREE.Color(o.color ?? 0xffffff); col.offsetHSL(0, 0, rnd(o.vary ?? 0.035));
        const w = o.w / nx, h = o.h / ny, d = o.d / nz;
        let first = null;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
          const q = this.add({ ...o, _seg: true, group, color: col.getHex(), vary: 0.012, hp: o.hp,
            x: o.x - o.w / 2 + w * (i + 0.5), y: o.y + h * j, z: o.z - o.d / 2 + d * (k + 0.5), w, h, d });
          first = first || q;
        }
        return first;
      }
    }
    const p = new Piece();
    p.id = this.nextId++; p.mat = o.mat; p.shape = o.shape || 'box'; p.cat = o.cat || 'Mobilier';
    p.size.set(o.w, o.h, o.d); p.pos.set(o.x, o.y + o.h / 2, o.z);
    p.base.set(o.color ?? 0xffffff);
    const vary = o.vary ?? 0.035;
    if (vary) p.base.offsetHSL(0, 0, rnd(vary));
    p.color.copy(p.base);
    const vol = o.w * o.h * o.d, M = MATS[p.mat];
    p.maxHp = p.hp = o.hp ?? M.hp * (0.6 + Math.min(vol * 8, 2.2));
    const c = CATS[p.cat];
    p.value = o.value ?? Math.round(c.base * clamp(vol / c.ref, 0.4, 3));
    p.group = o.group || 0; p.mount = !!o.mount; p.anchor = !!o.anchor; p.structural = !!o.structural; p.hang = !!o.hang; p.label = o.label || null;
    p.min.set(o.x - o.w / 2, o.y, o.z - o.d / 2); p.max.set(o.x + o.w / 2, o.y + o.h, o.z + o.d / 2);
    if (!this._bAdd(p)) return null;
    p.li = this.statics.length; this.statics.push(p);
    const x0 = Math.floor(p.min.x), x1 = Math.floor(p.max.x), z0 = Math.floor(p.min.z), z1 = Math.floor(p.max.z);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = (ix + 1000) * 4000 + (iz + 1000);
      let cell = this.cells.get(k); if (!cell) this.cells.set(k, (cell = []));
      cell.push(p);
    }
    return p;
  }

  query(x0, z0, x1, z1, out) {
    out.length = 0;
    const s = ++this.stamp;
    const ax = Math.floor(x0), bx = Math.floor(x1), az = Math.floor(z0), bz = Math.floor(z1);
    for (let ix = ax; ix <= bx; ix++) for (let iz = az; iz <= bz; iz++) {
      const cell = this.cells.get((ix + 1000) * 4000 + (iz + 1000));
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        const p = cell[i];
        if (p.state === STATIC && p._s !== s) { p._s = s; out.push(p); }
      }
    }
    return out;
  }

  finalize() {
    const eps = 0.035, tmp = [];
    for (const a of this.statics) {
      this.query(a.min.x - eps, a.min.z - eps, a.max.x + eps, a.max.z + eps, tmp);
      for (const b of tmp) {
        if (b.id <= a.id) continue;
        const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
        const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
        const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
        if (ox < -eps || oy < -eps || oz < -eps) continue;
        if (a.group && a.group === b.group) { a.out.push(b); b.out.push(a); continue; }
        if (ox > 0.002 && oz > 0.002) {
          if (b.hang && Math.abs(b.max.y - a.min.y) < eps) { a.out.push(b); continue; }
          if (a.hang && Math.abs(a.max.y - b.min.y) < eps) { b.out.push(a); continue; }
        }
        if (ox > 0.005 && oz > 0.005) {
          if (Math.abs(b.min.y - a.max.y) < eps) { a.out.push(b); continue; }
          if (Math.abs(a.min.y - b.max.y) < eps) { b.out.push(a); continue; }
        }
        if (b.mount && a.structural) a.out.push(b);
        else if (a.mount && b.structural) b.out.push(a);
      }
    }
    const r = this._reach();
    const loose = this.statics.filter((p) => p._r !== r);
    if (loose.length) {
      console.warn('[Bourrinator] pièces sans appui à la construction :', loose.length,
        loose.slice(0, 6).map((p) => `${p.mat}/${p.cat} @ ${p.pos.x.toFixed(2)},${p.min.y.toFixed(2)},${p.pos.z.toFixed(2)}`));
      for (const p of loose) p.anchor = true;
    }
    this.totalValue = 0;
    for (const p of this.statics) this.totalValue += p.value;
    this.initialCount = this.statics.length;
    this._flush();
  }

  // bottom : fond sous l'eau ; water : nappe phréatique ; rootY : sous cette hauteur, tout est ancré
  setFloor(tex, scale, { bottom, water, rootY, yardTex, yardScale, plot }) {
    this.floorU.uFloorMap.value = tex; this.floorU.uFloorScale.value = scale;
    if (yardTex) { this.yardU.uFloorMap.value = yardTex; this.yardU.uFloorScale.value = yardScale; }
    this.pitY = bottom; this.waterY = water; this.rootY = rootY; this.wetOnce = false;
    this.plot = plot || null;
  }
  // hauteur du « fond » : vide sanitaire sous le bâtiment, terrain dehors
  baseY(x, z) {
    const P = this.plot || { x0: this.room.x0 - 0.22, x1: this.room.x1 + 0.22, z0: this.room.z0 - 0.22, z1: this.room.z1 + 0.22 };
    return this.pitY < 0 && x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1 ? this.pitY : 0;
  }

  linkLight(piece, light) { this.lightLinks.push({ piece, light, base: light.intensity, on: true }); }

  // ------------------------------------------------------------ états
  _listRemove(arr, p) {
    const i = p.li, last = arr.pop();
    if (last !== p) { arr[i] = last; last.li = i; }
    p.li = -1;
  }
  _toDyn(p) {
    if (p.state !== STATIC) return;
    this._listRemove(this.statics, p);
    p.state = DYN; p.li = this.dyns.length; this.dyns.push(p);
    p.sleeping = false; p.sleepT = 0; this.ageQ.push(p);
    this.structDirty = true;
  }
  kill(p) {
    if (p.state === DEAD) return;
    this._bRemove(p);
    if (p.life !== Infinity) this.mortal--;
    if (p.state === STATIC) { this._listRemove(this.statics, p); this.structDirty = true; }
    else this._listRemove(this.dyns, p);
    p.state = DEAD;
  }
  _spawn(mat, shape, sx, sy, sz, pos, quat, color) {
    const p = new Piece();
    p.id = this.nextId++; p.mat = mat; p.shape = shape; p.cat = 'Débris';
    p.size.set(sx, sy, sz); p.pos.copy(pos); p.quat.copy(quat);
    p.base.copy(color); p.color.copy(color);
    const vol = sx * sy * sz;
    p.maxHp = p.hp = MATS[mat].hp * 0.5 * (0.6 + Math.min(vol * 8, 2.2));
    p.counted = true; p.value = 0; p.state = DYN;
    if (!this._bAdd(p)) return null;
    p.li = this.dyns.length; this.dyns.push(p); this.ageQ.push(p);
    return p;
  }
  _count(p, how) {
    if (p.counted) return;
    p.counted = true;
    this.destroyedValue += p.value;
    if (this.onScore) this.onScore(p, how);
  }

  // ------------------------------------------------------------ dégâts
  _impulse(p, dir, force) {
    const inv = 1 / (0.6 + Math.min(p.vol() * 25, 4));
    p.vel.addScaledVector(dir, force * inv);
    p.vel.y += force * inv * 0.25;
    const sp = p.vel.length(); if (sp > 26) p.vel.multiplyScalar(26 / sp);
    p.ang.x += rnd(force * 1.4 * inv); p.ang.y += rnd(force * inv); p.ang.z += rnd(force * 1.4 * inv);
    p.sleeping = false; p.sleepT = 0;
  }

  applyDamage(p, dmg, point, dir, force, explosive = false) {
    if (p.state === DEAD) return false;
    if (!explosive && MATS[p.mat].resist) dmg *= MATS[p.mat].resist;
    p.hp -= dmg;
    if (p.hp <= 0) { this.breakPiece(p, point, dir, force); return true; }
    if (p.state === STATIC) {
      const k = 0.45 + 0.55 * Math.max(0, p.hp / p.maxHp);
      p.color.copy(p.base).multiplyScalar(k); this._writeC(p);
      if (p.vol() < 0.006 && force > 2.5 && !p.structural && !p.anchor) {
        this._toDyn(p); this._count(p, 'knock'); this._impulse(p, dir, force);
        this.wakeAround(p.pos, 0.6);
      }
    } else this._impulse(p, dir, force);
    return false;
  }

  breakPiece(p, point, dir, force) {
    if (p.state === DEAD) return;
    const M = MATS[p.mat], wasStatic = p.state === STATIC;
    this._count(p, 'break');
    this._breakFx(p, M);
    const md = p.maxDim();
    if (M.shatter) { this._shatter(p, point, dir, force); this.kill(p); }
    else if (md > 0.34) { this._split(p, point, dir, force, 0); this.kill(p); }
    else if (wasStatic) {
      this._toDyn(p); p.hp = p.maxHp * 0.5;
      p.color.copy(p.base).multiplyScalar(0.7); this._writeC(p);
      this._impulse(p, dir, force);
    } else if (md < 0.17 || this.dyns.length > this.maxDyn) this.kill(p);
    else { this._split(p, point, dir, force, 2); this.kill(p); }
    if (wasStatic) this.structDirty = true;
    this.wakeAround(p.pos, md * 0.5 + 0.8);
  }

  _chunkVel(c, src, point, dir, force) {
    _v.subVectors(c.pos, point); const d = _v.length() + 0.001; _v.multiplyScalar(1 / d);
    const fall = 1 / (1 + d * 2.2);
    const inv = 1 / (0.6 + Math.min(c.vol() * 25, 4));
    c.vel.copy(src.vel)
      .addScaledVector(dir, force * (0.3 + Math.random() * 0.6) * fall * inv)
      .addScaledVector(_v, force * 0.5 * Math.random() * fall * inv);
    c.vel.x += rnd(0.8); c.vel.z += rnd(0.8); c.vel.y += Math.random() * force * 0.2 * fall;
    c.ang.set(rnd(7), rnd(7), rnd(7)).multiplyScalar(0.3 + fall);
  }

  _split(p, point, dir, force, forceN) {
    const S = p.size;
    let nx = 1, ny = 1, nz = 1;
    if (forceN === 2) {
      if (S.x >= S.y && S.x >= S.z) nx = 2; else if (S.y >= S.z) ny = 2; else nz = 2;
    } else if (p.shape === 'cyl') {
      ny = clamp(Math.ceil(S.y / 0.3), 2, 6);
    } else {
      nx = Math.ceil(S.x / 0.3); ny = Math.ceil(S.y / 0.3); nz = Math.ceil(S.z / 0.3);
      const cap = Math.min(this.maxChunks, MATS[p.mat].chunks || 99);
      while (nx * ny * nz > cap) {
        if (nx >= ny && nx >= nz) nx--; else if (ny >= nz) ny--; else nz--;
      }
    }
    const cw = S.x / nx, ch = S.y / ny, cd = S.z / nz;
    const col = new THREE.Color();
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      _v2.set(((i + 0.5) / nx - 0.5) * S.x, ((j + 0.5) / ny - 0.5) * S.y, ((k + 0.5) / nz - 0.5) * S.z)
        .applyQuaternion(p.quat).add(p.pos);
      col.copy(p.base).multiplyScalar(0.72 + Math.random() * 0.2);
      const j1 = 0.88 + Math.random() * 0.1;
      const c = this._spawn(p.mat, p.shape === 'cyl' && nx === 1 && nz === 1 ? 'cyl' : 'box', cw * j1, ch * j1, cd * j1, _v2, p.quat, col);
      if (!c) return;
      this._chunkVel(c, p, point, dir, force);
    }
  }

  _shatter(p, point, dir, force) {
    const S = p.size, M = MATS[p.mat];
    const dims = [S.x, S.y, S.z].sort((a, b) => b - a);
    const area = dims[0] * dims[1];
    const n = clamp(Math.round(area * 26 + 4), 4, 18);
    const glassy = p.mat === 'glass' || p.mat === 'neon' || p.mat === 'screen';
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      let sx, sy, sz;
      if (glassy && dims[2] < 0.06) {
        const t = clamp(dims[2], 0.008, 0.03);
        const a = 0.03 + Math.random() * Math.min(0.2, dims[0] * 0.45), b = 0.03 + Math.random() * Math.min(0.2, dims[1] * 0.45);
        // on garde l'orientation de la vitre : l'axe fin reste l'axe fin
        if (S.x === dims[2]) { sx = t; sy = a; sz = b; } else if (S.y === dims[2]) { sx = a; sy = t; sz = b; } else { sx = a; sy = b; sz = t; }
      } else {
        sx = 0.02 + Math.random() * Math.min(0.08, S.x * 0.5);
        sy = 0.02 + Math.random() * Math.min(0.08, S.y * 0.5);
        sz = 0.02 + Math.random() * Math.min(0.08, S.z * 0.5);
      }
      _v2.set(rnd(S.x * 0.45), rnd(S.y * 0.45), rnd(S.z * 0.45)).applyQuaternion(p.quat).add(p.pos);
      _q.setFromEuler(new THREE.Euler(rnd(0.4), rnd(0.4), rnd(0.4))).premultiply(p.quat);
      col.copy(p.base).multiplyScalar(0.85 + Math.random() * 0.25);
      const c = this._spawn(p.mat, 'box', sx, sy, sz, _v2, _q, col);
      if (!c) return;
      c.life = 2.5 + Math.random() * 3; c.isShard = true; c.hp = 1; this.mortal++;
      this._chunkVel(c, p, point, dir, force * 1.1);
      c.vel.x += rnd(1.2); c.vel.z += rnd(1.2);
      c.ang.multiplyScalar(2);
    }
  }

  _breakFx(p, M) {
    const vol = p.vol();
    const loud = clamp(0.35 + vol * 18, 0.35, 1.2);
    this.audio.impact(M.sound, p.pos, loud);
    if (this.fxBudget <= 0) return;
    this.fxBudget--;
    const k = clamp(vol * 60, 0.35, 2.2);
    const fx = this.fx, pos = p.pos, c = p.base;
    switch (M.fx) {
      case 'dust': fx.burst('dust', pos, c, k); fx.burst('chips', pos, c, k * 0.6); break;
      case 'splinter': fx.burst('chips', pos, c, k); fx.burst('dust', pos, c, k * 0.4); break;
      case 'sparks': fx.burst('sparks', pos, null, k); fx.burst('dust', pos, c, k * 0.3); break;
      case 'fluff': fx.burst('fluff', pos, c, k); break;
      case 'confetti': fx.burst('confetti', pos, c, Math.max(1, k)); break;
      case 'splat': fx.burst('splat', pos, c, Math.max(1, k)); break;
      case 'shards': fx.burst('glass', pos, c, k); fx.burst('dust', pos, c, k * 0.3); break;
      case 'glass': fx.burst('glass', pos, c, Math.max(0.8, k)); break;
      case 'electric': fx.burst('glass', pos, c, k); fx.burst('sparks', pos, null, Math.max(0.8, k)); fx.burst('smoke', pos, null, 0.3); break;
    }
  }

  wakeAround(c, r) {
    const r2 = r * r;
    for (const p of this.dyns) {
      if (p.sleeping && p.pos.distanceToSquared(c) < r2) { p.sleeping = false; p.sleepT = 0; }
    }
  }

  _closest(p, c, out) {
    if (p.state === STATIC) {
      out.set(clamp(c.x, p.min.x, p.max.x), clamp(c.y, p.min.y, p.max.y), clamp(c.z, p.min.z, p.max.z));
      return out.distanceTo(c);
    }
    out.copy(p.pos);
    return Math.max(0, p.pos.distanceTo(c) - p.maxDim() * 0.4);
  }

  _gather(center, radius, exclude) {
    const list = [];
    this.query(center.x - radius, center.z - radius, center.x + radius, center.z + radius, this._tmp2);
    for (const s of this._tmp2) {
      if (s === exclude) continue;
      const pt = new THREE.Vector3();
      const d = this._closest(s, center, pt);
      if (d <= radius) list.push({ p: s, d, pt });
    }
    for (const p of this.dyns) {
      if (p === exclude) continue;
      const pt = new THREE.Vector3();
      const d = this._closest(p, center, pt);
      if (d <= radius) list.push({ p, d, pt });
    }
    return list;
  }

  // coup direct + éclaboussure de dégâts autour
  // tronçonneuse : dégâts selon le matériau, et une pièce qui cède est coupée en deux, net
  sawPiece(p, point, dir, dmg, mult, cutN) {
    if (p.state === DEAD) return false;
    const M = MATS[p.mat];
    let d = dmg * (mult[p.mat] ?? 1);
    if (M.resist) d *= M.resist;
    p.hp -= d;
    if (p.hp > 0) {
      if (p.state === STATIC) { p.color.copy(p.base).multiplyScalar(0.45 + 0.55 * Math.max(0, p.hp / p.maxHp)); this._writeC(p); }
      else { p.vel.addScaledVector(dir, 0.4); p.sleeping = false; p.sleepT = 0; }
      return false;
    }
    if (!this.cutPiece(p, point, cutN)) this.breakPiece(p, point, dir, 3);
    return true;
  }
  cutPiece(p, point, cutN) {
    const M = MATS[p.mat];
    if (M.shatter || p.shape !== 'box' || p.maxDim() < 0.2) return false;
    _qi.copy(p.quat).invert();
    const n = cutN.clone().applyQuaternion(_qi);
    const ax = Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z) ? 'x' : Math.abs(n.y) >= Math.abs(n.z) ? 'y' : 'z';
    const S = p.size[ax];
    if (S < 0.12) return false;
    const lp = point.clone().sub(p.pos).applyQuaternion(_qi);
    const t = clamp(lp[ax] / S + 0.5, 0.2, 0.8);
    const wasStatic = p.state === STATIC;
    this._count(p, 'break');
    this.audio.impact(M.sound, point, 0.6);
    if (this.fxBudget > 0) { this.fxBudget--; this.fx.burst('chips', point, p.base, 1.2); this.fx.burst('dust', point, p.base, 0.5); }
    this.kill(p);
    const axisW = new THREE.Vector3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0).applyQuaternion(p.quat);
    for (const [len, off, sgn] of [[S * t, -S / 2 + S * t / 2, -1], [S * (1 - t), S / 2 - S * (1 - t) / 2, 1]]) {
      const sz = p.size.clone(); sz[ax] = len;
      const pos = p.pos.clone().addScaledVector(axisW, off);
      const c = this._spawn(p.mat, 'box', sz.x, sz.y, sz.z, pos, p.quat, p.base);
      if (!c) continue;
      c.vel.copy(p.vel).addScaledVector(axisW, sgn * 0.7);
      c.ang.set(rnd(0.8), rnd(0.4), rnd(0.8));
      c.cutT = this.time;
    }
    if (wasStatic) this.structDirty = true;
    this.wakeAround(p.pos, p.maxDim() * 0.5 + 0.8);
    return true;
  }

  // dig : multiplicateurs par matériau (la pelle) ; ce qui est creusé part en poussière, proprement
  hitPiece(p, point, dir, dmg, radius, force, dig = null) {
    const spill = radius > 0 ? this._gather(point, radius, p) : [];
    const hit = (q, d, pt, dv, fo) => {
      const k = dig && dig[q.mat];
      if (!k) return this.applyDamage(q, d, pt, dv, fo);
      if (q.state === DEAD) return false;
      q.hp -= d * k;
      if (q.hp > 0) { if (q.state === STATIC) { q.color.copy(q.base).multiplyScalar(0.45 + 0.55 * Math.max(0, q.hp / q.maxHp)); this._writeC(q); } return false; }
      this._count(q, 'dig');
      if (this.fxBudget > 0) { this.fxBudget--; this.fx.burst('dust', q.pos, q.base, 1.2); this.fx.burst('chips', q.pos, q.base, 0.8); }
      this.wakeAround(q.pos, 1.2);
      this.kill(q);
      return true;
    };
    let broke = hit(p, dmg, point, dir, force) ? 1 : 0;
    for (const e of spill) {
      const f = 1 - e.d / radius;
      _v.subVectors(e.pt, point).normalize().multiplyScalar(0.5).add(dir).normalize();
      if (hit(e.p, dmg * 0.6 * f, e.pt, _v.clone(), force * 0.7 * f)) broke++;
    }
    return broke;
  }


  // l'acier blindé fait écran : ce qui est derrière n'encaisse rien
  _shielded(c, t, shields) {
    const dx = t.x - c.x, dy = t.y - c.y, dz = t.z - c.z;
    const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
    for (const s of shields) {
      let t1 = (s.min.x - c.x) * ix, t2 = (s.max.x - c.x) * ix;
      let lo = Math.min(t1, t2), hi = Math.max(t1, t2);
      t1 = (s.min.y - c.y) * iy; t2 = (s.max.y - c.y) * iy;
      lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
      t1 = (s.min.z - c.z) * iz; t2 = (s.max.z - c.z) * iz;
      lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
      if (hi >= lo && lo > 0.001 && lo < 0.97) return true;
    }
    return false;
  }

  areaDamage(center, radius, dmg, force, explosion = true) {
    const list = this._gather(center, radius, null);
    const shields = list.filter((e) => e.p.state === STATIC && e.p.mat === 'steel').map((e) => e.p);
    let broke = 0;
    for (const e of list) {
      const f = 1 - e.d / radius;
      if (shields.length && e.p.mat !== 'steel' && this._shielded(center, e.p.state === STATIC ? e.pt : e.p.pos, shields)) continue;
      const k = 1;
      const dirv = new THREE.Vector3().subVectors(e.p.state === STATIC ? e.pt : e.p.pos, center);
      if (dirv.lengthSq() < 1e-6) dirv.set(rnd(), 1, rnd());
      dirv.normalize();
      if (explosion) { dirv.y += 0.35; dirv.normalize(); }
      if (this.applyDamage(e.p, dmg * (0.25 + 0.75 * f) * k, e.pt, dirv, force * (0.3 + 0.7 * f) * k, explosion)) broke++;
    }
    this.wakeAround(center, radius + 1);
    return broke;
  }

  // ------------------------------------------------------------ bombinette
  // rase les éléments les plus proches jusqu'à « share » de la valeur totale du niveau,
  // via une onde de choc qui avance depuis le centre ; renvoie le rayon atteint
  nuke(center, share) {
    const c = center.clone(), pt = new THREE.Vector3();
    const arr = this.statics.map((p) => ({ p, d: this._closest(p, c, pt) })).sort((a, b) => a.d - b.d);
    const target = this.totalValue * share;
    let acc = 0, n = 0;
    while (n < arr.length && acc < target) { acc += arr[n].p.value; n++; }
    const R = (n ? arr[n - 1].d : 2) + 0.4;
    const list = arr.slice(0, n);
    for (const p of this.dyns) { const d = p.pos.distanceTo(c); if (d <= R) list.push({ p, d }); }
    list.sort((a, b) => a.d - b.d);
    this.shock = { c, list, idx: 0, t: 0, R, speed: Math.max(12, R / 0.9), spawn: 260 };
    return { R, n };
  }
  _shockStep(dt) {
    const S = this.shock;
    S.t += dt;
    const front = S.t * S.speed, dir = new THREE.Vector3();
    while (S.idx < S.list.length && S.list[S.idx].d <= front) {
      const { p, d } = S.list[S.idx++];
      if (p.state === DEAD) continue;
      dir.subVectors(p.pos, S.c); if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0); dir.normalize(); dir.y += 0.4; dir.normalize();
      // la couronne extérieure vole en morceaux, le cœur est vaporisé
      if (d > S.R * 0.72 && S.spawn > 0 && !MATS[p.mat].shatter) { S.spawn--; this.breakPiece(p, S.c, dir, 16); continue; }
      this._count(p, 'nuke');
      if (this.fxBudget > 0 && Math.random() < 0.3) { this.fxBudget--; this.fx.burst('dust', p.pos, p.base, 0.8); }
      this.kill(p);
    }
    if (S.idx >= S.list.length) { this.shock = null; this.wakeAround(S.c, S.R + 3); }
  }

  // ------------------------------------------------------------ requêtes
  raycast(o, d, maxT, skipDyn = null) {
    let best = maxT, hit = null, nAx = 0, nSg = 0;
    const ix = 1 / (d.x || 1e-9), iy = 1 / (d.y || 1e-9), iz = 1 / (d.z || 1e-9);
    for (let i = 0; i < this.statics.length; i++) {
      const s = this.statics[i];
      let t1 = (s.min.x - o.x) * ix, t2 = (s.max.x - o.x) * ix;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0, sg = t1 < t2 ? -1 : 1;
      t1 = (s.min.y - o.y) * iy; t2 = (s.max.y - o.y) * iy;
      let a = Math.min(t1, t2), b = Math.max(t1, t2);
      if (a > tmin) { tmin = a; ax = 1; sg = t1 < t2 ? -1 : 1; }
      if (b < tmax) tmax = b;
      t1 = (s.min.z - o.z) * iz; t2 = (s.max.z - o.z) * iz;
      a = Math.min(t1, t2); b = Math.max(t1, t2);
      if (a > tmin) { tmin = a; ax = 2; sg = t1 < t2 ? -1 : 1; }
      if (b < tmax) tmax = b;
      if (tmax < Math.max(tmin, 0)) continue;
      const t = tmin < 0 ? 0 : tmin;
      if (t < best) { best = t; hit = s; nAx = ax; nSg = sg; }
    }
    const lo = new THREE.Vector3(), ld = new THREE.Vector3();
    let dynHit = null, dN = null;
    for (let i = 0; i < this.dyns.length; i++) {
      const p = this.dyns[i];
      if (p.isShard || (skipDyn && skipDyn(p))) continue;
      _v.subVectors(o, p.pos);
      const r = p.maxDim() * 0.9;
      // pré-test sphère
      const bb = _v.dot(d), cc = _v.lengthSq() - r * r;
      if (cc > 0 && bb > 0) continue;
      if (bb * bb - cc < 0) continue;
      _qi.copy(p.quat).invert();
      lo.copy(_v).applyQuaternion(_qi); ld.copy(d).applyQuaternion(_qi);
      const hx = p.size.x / 2, hy = p.size.y / 2, hz = p.size.z / 2;
      const jx = 1 / (ld.x || 1e-9), jy = 1 / (ld.y || 1e-9), jz = 1 / (ld.z || 1e-9);
      let t1 = (-hx - lo.x) * jx, t2 = (hx - lo.x) * jx;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0, sg = t1 < t2 ? -1 : 1;
      t1 = (-hy - lo.y) * jy; t2 = (hy - lo.y) * jy;
      let a = Math.min(t1, t2), b = Math.max(t1, t2);
      if (a > tmin) { tmin = a; ax = 1; sg = t1 < t2 ? -1 : 1; }
      if (b < tmax) tmax = b;
      t1 = (-hz - lo.z) * jz; t2 = (hz - lo.z) * jz;
      a = Math.min(t1, t2); b = Math.max(t1, t2);
      if (a > tmin) { tmin = a; ax = 2; sg = t1 < t2 ? -1 : 1; }
      if (b < tmax) tmax = b;
      if (tmax < Math.max(tmin, 0)) continue;
      const t = tmin < 0 ? 0 : tmin;
      if (t < best) {
        best = t; hit = p; dynHit = p;
        dN = new THREE.Vector3(ax === 0 ? sg : 0, ax === 1 ? sg : 0, ax === 2 ? sg : 0).applyQuaternion(p.quat);
      }
    }
    let surface = hit ? 'piece' : null;
    const normal = new THREE.Vector3();
    if (hit && hit !== dynHit) normal.set(nAx === 0 ? nSg : 0, nAx === 1 ? nSg : 0, nAx === 2 ? nSg : 0);
    else if (hit) normal.copy(dN);
    if (d.y < -1e-6) {
      let t = -o.y / d.y;
      const by = this.baseY(o.x + d.x * t, o.z + d.z * t);
      if (by !== 0) t = (by - o.y) / d.y;
      if (t >= 0 && t < best) { best = t; hit = null; surface = 'floor'; normal.set(0, 1, 0); }
    }
    if (!surface) return null;
    return { piece: hit, surface, t: best, point: new THREE.Vector3().copy(o).addScaledVector(d, best), normal };
  }

  _covered(s, list) {
    for (const t of list) {
      if (t === s || t.state !== STATIC || Math.abs(t.min.y - s.max.y) > 0.03) continue;
      if (t.max.x > s.min.x + 0.02 && t.min.x < s.max.x - 0.02 && t.max.z > s.min.z + 0.02 && t.min.z < s.max.z - 0.02) return true;
    }
    return false;
  }

  collidePlayer(pos, r, h, step) {
    const tmp = this._tmp;
    this.query(pos.x - r - 0.1, pos.z - r - 0.1, pos.x + r + 0.1, pos.z + r + 0.1, tmp);
    let ground = this.baseY(pos.x, pos.z);
    this.headY = Infinity; this.touchWall = false;
    for (let it = 0; it < 2; it++) {
      for (const s of tmp) {
        if (s.state !== STATIC) continue;
        const cx = clamp(pos.x, s.min.x, s.max.x), cz = clamp(pos.z, s.min.z, s.max.z);
        const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
        if (s.max.y <= pos.y + step) {
          // une rangée de mur surmontée d'une autre n'est pas une marche, ni un rebord de fenêtre : on n'escalade pas les murs
          if (d2 < r * r * 0.5 && s.max.y > ground && !s.mount && !(s.structural && this._covered(s, tmp))) ground = s.max.y;
          continue;
        }
        if (s.min.y >= pos.y + h) continue;
        if (s.min.y > pos.y + h - 0.4) { if (d2 < r * r && s.min.y < this.headY) this.headY = s.min.y; continue; }
        if (d2 < r * r) {
          this.touchWall = true;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            pos.x += (dx / d) * (r - d); pos.z += (dz / d) * (r - d);
          } else {
            const l = pos.x - s.min.x, rr = s.max.x - pos.x, n = pos.z - s.min.z, f = s.max.z - pos.z;
            const m = Math.min(l, rr, n, f);
            if (m === l) pos.x = s.min.x - r; else if (m === rr) pos.x = s.max.x + r;
            else if (m === n) pos.z = s.min.z - r; else pos.z = s.max.z + r;
          }
        }
      }
    }
    return ground;
  }

  // ------------------------------------------------------------ structure
  _reach() {
    const s = ++this.bfs, q = [];
    for (const p of this.statics) if (p.anchor || p.min.y < this.rootY || (p.structural && p.min.y < 0.04)) { p._r = s; q.push(p); }
    while (q.length) {
      const p = q.pop();
      for (const o of p.out) if (o.state === STATIC && o._r !== s) { o._r = s; q.push(o); }
    }
    return s;
  }
  _structure() {
    const s = this._reach();
    const fall = [];
    for (const p of this.statics) if (p._r !== s) fall.push(p);
    for (const p of fall) {
      this._toDyn(p);
      p.vel.set(rnd(0.3), 0, rnd(0.3));
      p.ang.set(rnd(0.6), rnd(0.3), rnd(0.6));
      this._count(p, 'fall');
    }
    if (fall.length > 6) {
      this.audio.play('collapse', fall[0].pos, Math.min(1.5, fall.length / 20));
      if (this.onCollapse) this.onCollapse(fall.length);
    }
  }

  // ------------------------------------------------------------ simulation
  update(dt) {
    this.time += dt;
    this.fxBudget = 30;
    if (this.shock) this._shockStep(dt);
    if (this.structDirty) { this.structDirty = false; this._structure(); }
    const breaks = [];
    const tmp = this._tmp;
    for (let i = this.dyns.length - 1; i >= 0; i--) {
      const p = this.dyns[i];
      if (p.life !== Infinity) {
        p.life -= dt;
        if (p.life <= 0) { this.kill(p); continue; }
        if (p.life < 0.5) { p.fade = Math.max(0.001, p.life / 0.5); if (p.sleeping) this._writeM(p); }
      }
      if (p.sleeping) continue;

      p.vel.y -= 15 * dt;
      // la nappe phréatique : gerbe à l'entrée, puis ça coule doucement
      if (this.waterY !== undefined && p.pos.y < this.waterY && this.baseY(p.pos.x, p.pos.z) < 0) {
        if (!p.wet) {
          p.wet = true;
          if (!p.isShard && this.fxBudget > 0) {
            this.fxBudget--;
            const s = { x: p.pos.x, y: this.waterY, z: p.pos.z };
            this.fx.burst('splash', s, null, clamp(p.vol() * 40 + Math.abs(p.vel.y) * 0.08, 0.3, 1.6));
            this.audio.play('splash', s, clamp(0.3 + p.vol() * 10, 0.3, 1.2));
            if (!this.wetOnce) { this.wetOnce = true; if (this.onWater) this.onWater(); }
          }
        }
        p.vel.y += 11 * dt;
        const k = Math.max(0, 1 - 2.5 * dt);
        p.vel.multiplyScalar(k); p.ang.multiplyScalar(k);
      }
      const y0 = p.pos.y;
      p.pos.addScaledVector(p.vel, dt);
      const w = p.ang;
      if (w.x * w.x + w.y * w.y + w.z * w.z > 1e-6) {
        _q.set(w.x * dt * 0.5, w.y * dt * 0.5, w.z * dt * 0.5, 0).multiply(p.quat);
        p.quat.x += _q.x; p.quat.y += _q.y; p.quat.z += _q.z; p.quat.w += _q.w; p.quat.normalize();
      }
      const q = p.quat, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
      const r00 = 1 - 2 * (qy * qy + qz * qz), r01 = 2 * (qx * qy - qz * qw), r02 = 2 * (qx * qz + qy * qw);
      const r10 = 2 * (qx * qy + qz * qw), r11 = 1 - 2 * (qx * qx + qz * qz), r12 = 2 * (qy * qz - qx * qw);
      const r20 = 2 * (qx * qz - qy * qw), r21 = 2 * (qy * qz + qx * qw), r22 = 1 - 2 * (qx * qx + qy * qy);
      const hx = p.size.x / 2, hy = p.size.y / 2, hz = p.size.z / 2;
      const ex = Math.abs(r00) * hx + Math.abs(r01) * hy + Math.abs(r02) * hz;
      const ey = Math.abs(r10) * hx + Math.abs(r11) * hy + Math.abs(r12) * hz;
      const ez = Math.abs(r20) * hx + Math.abs(r21) * hy + Math.abs(r22) * hz;
      let contact = false, impact = 0;

      const by = this.baseY(p.pos.x, p.pos.z);
      if (p.pos.y - ey < by) {
        p.pos.y = by + ey;
        if (p.vel.y < 0) { impact = -p.vel.y; p.vel.y *= -0.22; if (p.vel.y < 0.7) p.vel.y = 0; }
        contact = true;
      }
      this.query(p.pos.x - ex, p.pos.z - ez, p.pos.x + ex, p.pos.z + ez, tmp);
      for (let k = 0; k < tmp.length; k++) {
        const s = tmp[k];
        const px = Math.min(p.pos.x + ex, s.max.x) - Math.max(p.pos.x - ex, s.min.x); if (px <= 0) continue;
        const pz = Math.min(p.pos.z + ez, s.max.z) - Math.max(p.pos.z - ez, s.min.z); if (pz <= 0) continue;
        // venait d'au-dessus et a franchi le dessus pendant l'image : on se pose, même en tombant vite
        if (p.vel.y <= 0 && y0 - ey >= s.max.y - 0.05 && p.pos.y - ey < s.max.y) {
          p.pos.y = s.max.y + ey;
          impact = Math.max(impact, -p.vel.y); p.vel.y *= -0.2; if (Math.abs(p.vel.y) < 0.7) p.vel.y = 0;
          contact = true;
          continue;
        }
        const py = Math.min(p.pos.y + ey, s.max.y) - Math.max(p.pos.y - ey, s.min.y); if (py <= 0) continue;
        if (py <= px && py <= pz) {
          const up = p.pos.y > (s.min.y + s.max.y) / 2, n = up ? 1 : -1;
          p.pos.y += n * py;
          if (p.vel.y * n < 0) { impact = Math.max(impact, Math.abs(p.vel.y)); p.vel.y *= -0.2; if (Math.abs(p.vel.y) < 0.7) p.vel.y = 0; }
          if (up) contact = true;
        } else if (px <= pz) {
          const n = p.pos.x > (s.min.x + s.max.x) / 2 ? 1 : -1;
          p.pos.x += n * px;
          if (p.vel.x * n < 0) { impact = Math.max(impact, Math.abs(p.vel.x)); p.vel.x *= -0.3; }
        } else {
          const n = p.pos.z > (s.min.z + s.max.z) / 2 ? 1 : -1;
          p.pos.z += n * pz;
          if (p.vel.z * n < 0) { impact = Math.max(impact, Math.abs(p.vel.z)); p.vel.z *= -0.3; }
        }
      }

      if (contact) {
        const fr = Math.max(0, 1 - 7 * dt);
        p.vel.x *= fr; p.vel.z *= fr;
        const sp = p.vel.lengthSq();
        if (sp < 3) {
          // on remet la pièce à plat, sur sa face la plus proche
          const ax = Math.abs(r10), ay = Math.abs(r11), az = Math.abs(r12);
          let sgn;
          if (ay >= ax && ay >= az) { _ax.set(r01, r11, r21); sgn = Math.sign(r11); }
          else if (ax >= az) { _ax.set(r00, r10, r20); sgn = Math.sign(r10); }
          else { _ax.set(r02, r12, r22); sgn = Math.sign(r12); }
          _v.set(0, sgn || 1, 0);
          _q2.setFromUnitVectors(_ax.normalize(), _v).multiply(p.quat);
          p.quat.slerp(_q2, Math.min(1, 9 * dt));
          p.ang.multiplyScalar(Math.max(0, 1 - 9 * dt));
        }
        if (sp < 0.06 && p.ang.lengthSq() < 0.08) {
          p.sleepT += dt;
          if (p.sleepT > 0.35) { p.sleeping = true; p.vel.set(0, 0, 0); p.ang.set(0, 0, 0); }
        } else p.sleepT = 0;
      }
      if (impact > 5.5 && MATS[p.mat].fragile && !p.isShard) breaks.push(p);
      else if (impact > 4 && p.vol() > 0.004 && !p.isShard) this.audio.impact(MATS[p.mat].sound, p.pos, Math.min(0.5, impact * 0.05));
      if (p.pos.y < -20 || Math.abs(p.pos.x) > 150 || Math.abs(p.pos.z) > 150) { this.kill(p); continue; }
      this._writeM(p);
    }
    for (const p of breaks) if (p.state === DYN) this.breakPiece(p, p.pos, _up, 1.5);

    // plafond de débris : les plus vieux s'effacent
    let excess = this.dyns.length - this.mortal - this.maxDyn;
    while (excess > 0 && this.ageQ.length) {
      const p = this.ageQ.shift();
      if (p.state === DYN && p.life === Infinity) { p.life = 0.6; this.mortal++; excess--; }
    }
    if (this.ageQ.length > this.maxDyn * 4) this.ageQ = this.ageQ.filter((p) => p.state === DYN);

    for (const L of this.lightLinks) {
      if (!L.on) continue;
      if (L.piece.state !== STATIC) {
        L.on = false; L.light.intensity = 0;
        this.fx.burst('sparks', L.piece.pos, null, 1.2);
        this.audio.play('zap', L.piece.pos);
      } else if (L.piece.hp < L.piece.maxHp) {
        L.light.intensity = L.base * (Math.random() < 0.12 ? 0.15 : 1);
      }
    }
    this._flush();
  }

  _flush() {
    for (const b of this.batches.values()) {
      if (b.dirtyM) { b.mesh.instanceMatrix.needsUpdate = true; b.dirtyM = false; }
      if (b.dirtyC) { b.mesh.instanceColor.needsUpdate = true; b.dirtyC = false; }
    }
  }

  get pct() { return this.totalValue ? this.destroyedValue / this.totalValue : 0; }
}
