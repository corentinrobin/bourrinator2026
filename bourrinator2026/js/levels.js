import * as THREE from 'three';
// Les neuf terrains de jeu, construits pièce par pièce.
const R = Math.random, rr = (a, b) => a + R() * (b - a), pick = (a) => a[(R() * a.length) | 0];

// ------------------------------------------------------------------ outils
class Frame {
  constructor(b, x, z, rot) { this.b = b; this.x = x; this.z = z; this.rot = rot & 3; }
  tp(lx, lz) {
    switch (this.rot) {
      case 0: return [this.x + lx, this.z + lz];
      case 1: return [this.x + lz, this.z - lx];
      case 2: return [this.x - lx, this.z - lz];
      default: return [this.x - lz, this.z + lx];
    }
  }
  box(lx, y, lz, w, h, d, mat, color, o = {}) {
    const [x, z] = this.tp(lx, lz), odd = this.rot & 1;
    // disque (axe z) et roue (axe x) tournent avec le repère
    if (odd && (o.shape === 'disc' || o.shape === 'wheel')) o = { ...o, shape: o.shape === 'disc' ? 'wheel' : 'disc' };
    return this.b.box(x, y, z, odd ? d : w, h, odd ? w : d, mat, color, o);
  }
  cyl(lx, y, lz, dia, h, mat, color, o = {}) { return this.box(lx, y, lz, dia, h, dia, mat, color, { ...o, shape: 'cyl' }); }
  sub(lx, lz, rot = 0) { const [x, z] = this.tp(lx, lz); return new Frame(this.b, x, z, (this.rot + rot) & 3); }
}

export class Builder {
  constructor(world) { this.w = world; this.lights = []; this.y0 = 0; }
  // construit à une hauteur donnée (étage)
  at(y, fn) { const old = this.y0; this.y0 = y; fn(); this.y0 = old; }
  g() { return this.w.newGroup(); }
  f(x, z, rot = 0) { return new Frame(this, x, z, rot); }
  box(x, y, z, w, h, d, mat, color, o = {}) { return this.w.add({ x, y: y + this.y0, z, w, h, d, mat, color, ...o }); }
  light(x, y, z, color, intensity, distance, piece) { this.lights.push({ x, y: y + this.y0, z, color, intensity, distance, piece }); }
}

const PAL = {
  cereal: [0xe63946, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x457b9d, 0xffb703, 0x8ecae6, 0xd00000],
  bottle: [0x2d6a4f, 0x7f4f24, 0x9bd1e5, 0x6a040f, 0xe9f5db],
  can: [0xd62828, 0xc0c0c0, 0x1d4ed8, 0xfacc15, 0x16a34a, 0xf97316],
  pack: [0xff6b00, 0x00a6fb, 0xef233c, 0x70e000, 0xffd60a, 0x9d4edd],
  book: [0x7f1d1d, 0x1e3a8a, 0x14532d, 0x78350f, 0x4c1d95, 0xd4d4d8, 0x0f766e, 0xb45309, 0x111827],
  wine: [0x3b0a0a, 0x1f3d1a, 0x5a2a0a, 0x152238],
  liquor: [0xb45309, 0xd9f99d, 0x9a3412, 0xfde68a, 0x7dd3fc, 0x86198b, 0x14532d],
  jar: [0xb91c1c, 0xd97706, 0x65a30d, 0x7c2d12],
  binder: [0x1d4ed8, 0xdc2626, 0x111827, 0x16a34a, 0xf5f5f4, 0xf59e0b],
  fruit: [0xe63946, 0xffb703, 0x70e000, 0xfb8500, 0x9d0208],
};

// ------------------------------------------------------------------ objets en rayon
const ITEM = {
  cereal(F, x, y, z, mh, x1) { const w = 0.19, h = Math.min(0.3, mh - 0.02), d = 0.2; if (x + w > x1 || h < 0.12) return 0; F.box(x + w / 2, y, z, w, h, d, 'paper', pick(PAL.cereal), { cat: 'Marchandise' }); return w; },
  pack(F, x, y, z, mh, x1) { const w = 0.25, h = Math.min(0.27, mh - 0.02), d = 0.2; if (x + w > x1 || h < 0.12) return 0; F.box(x + w / 2, y, z, w, h, d, 'plastic', pick(PAL.pack), { cat: 'Marchandise' }); return w; },
  box(F, x, y, z, mh, x1) { const w = 0.3, h = Math.min(0.28, mh - 0.02), d = 0.28; if (x + w > x1 || h < 0.12) return 0; F.box(x + w / 2, y, z, w, h, d, 'paper', 0xb08050, { cat: 'Marchandise' }); return w; },
  bottle(F, x, y, z, mh, x1) { const w = 0.085, h = Math.min(0.31, mh - 0.02); if (x + w > x1 || h < 0.15) return 0; F.cyl(x + w / 2, y, z, w, h, 'bottle', pick(PAL.bottle), { cat: 'Bouteilles' }); return w; },
  water(F, x, y, z, mh, x1) { const w = 0.09, h = Math.min(0.32, mh - 0.02); if (x + w > x1 || h < 0.15) return 0; F.cyl(x + w / 2, y, z, w, h, 'bottle', 0xa9d6ec, { cat: 'Bouteilles' }); return w; },
  wine(F, x, y, z, mh, x1) { const w = 0.08, h = Math.min(0.31, mh - 0.02); if (x + w > x1 || h < 0.15) return 0; F.cyl(x + w / 2, y, z, w, h, 'bottle', pick(PAL.wine), { cat: 'Bouteilles' }); return w; },
  liquor(F, x, y, z, mh, x1) { const w = 0.09, h = Math.min(rr(0.22, 0.31), mh - 0.02); if (x + w > x1 || h < 0.15) return 0; F.cyl(x + w / 2, y, z, w, h, 'bottle', pick(PAL.liquor), { cat: 'Bouteilles' }); return w; },
  can(F, x, y, z, mh, x1) {
    const w = 0.075, h = 0.12; if (x + w > x1) return 0;
    const c = pick(PAL.can);
    F.cyl(x + w / 2, y, z, w, h, 'metal', c, { cat: 'Marchandise' });
    if (mh > 0.28) F.cyl(x + w / 2, y + h, z, w, h, 'metal', c, { cat: 'Marchandise' });
    return w;
  },
  jar(F, x, y, z, mh, x1) {
    const w = 0.09, h = 0.13; if (x + w > x1) return 0;
    const c = pick(PAL.jar);
    F.cyl(x + w / 2, y, z, w, h, 'bottle', c, { cat: 'Marchandise' });
    if (mh > 0.3) F.cyl(x + w / 2, y + h, z, w, h, 'bottle', c, { cat: 'Marchandise' });
    return w;
  },
  book(F, x, y, z, mh, x1) { const w = rr(0.03, 0.06), h = Math.min(rr(0.18, 0.3), mh - 0.02), d = rr(0.15, 0.22); if (x + w > x1 || h < 0.1) return 0; F.box(x + w / 2, y, z, w, h, d, 'paper', pick(PAL.book), { cat: 'Déco' }); return w; },
  binder(F, x, y, z, mh, x1) { const w = 0.065, h = Math.min(0.3, mh - 0.02), d = 0.25; if (x + w > x1 || h < 0.15) return 0; F.box(x + w / 2, y, z, w, h, d, 'paper', pick(PAL.binder), { cat: 'Paperasse' }); return w; },
  glasses(F, x, y, z, mh, x1) { const w = 0.075, h = 0.11; if (x + w > x1) return 0; F.cyl(x + w / 2, y, z, w, h, 'glass', 0xe0f2ff, { cat: 'Vaisselle' }); return w; },
  plates(F, x, y, z, mh, x1) {
    const w = 0.24; if (x + w > x1) return 0;
    const n = mh > 0.25 ? 6 : 3;
    for (let i = 0; i < n; i++) F.cyl(x + w / 2, y + i * 0.02, z, w, 0.02, 'ceramic', 0xf5f5f0, { cat: 'Vaisselle', vary: 0.01 });
    return w;
  },
  mug(F, x, y, z, mh, x1) { const w = 0.085; if (x + w > x1) return 0; F.cyl(x + w / 2, y, z, w, 0.095, 'ceramic', pick([0xffffff, 0xd62828, 0x1d4ed8, 0xf59e0b]), { cat: 'Vaisselle' }); return w; },
};

function fillRow(F, y, x0, x1, lz, mh, kind, gap = 0.012) {
  let x = x0, guard = 0;
  while (x < x1 - 0.05 && guard++ < 90) {
    const w = ITEM[kind](F, x, y, lz, mh, x1);
    if (!w) break;
    x += w + gap;
  }
}

// ------------------------------------------------------------------ murs
function cutIv(iv, a, b) {
  const out = [];
  for (const [s, e] of iv) {
    if (b <= s || a >= e) { out.push([s, e]); continue; }
    if (a > s + 0.02) out.push([s, a]);
    if (b < e - 0.02) out.push([b, e]);
  }
  return out;
}

function brickWall(b, axis, fixed, a0, a1, H, t, color, ops = [], o = {}) {
  const g = b.g(), rows = Math.max(1, Math.round(H / 0.4)), rh = H / rows, BW = 0.6;
  const put = (s, e, y, h, d, mat, col, extra) => {
    const m = (s + e) / 2, w = e - s;
    if (axis === 'x') b.box(m, y, fixed, w, h, d, mat, col, extra);
    else b.box(fixed, y, m, d, h, w, mat, col, extra);
  };
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    let iv = [[a0, a1]];
    for (const op of ops) if (y < op.y1 - 0.01 && y + rh > op.y0 + 0.01) iv = cutIv(iv, op.a0, op.a1);
    const col = o.band && o.band.rows.includes(r) ? o.band.color : color;
    for (const [s, e] of iv) {
      const pts = [s];
      let c = a0 + (r % 2 ? BW / 2 : 0);
      while (c <= s + 0.08) c += BW;
      while (c < e - 0.08) { pts.push(c); c += BW; }
      pts.push(e);
      for (let i = 0; i < pts.length - 1; i++) put(pts[i], pts[i + 1], y, rh, t, o.mat || 'plaster', col, { group: g, structural: true, cat: o.cat || 'Murs', vary: o.vary ?? 0.045 });
    }
  }
  for (const op of ops) openingFill(put, b, op, t, o.frame ?? 0xf2f2f2);
}

function openingFill(put, b, op, t, fc) {
  const g = b.g(), fw = 0.06, base = { group: g, mount: true, cat: 'Mobilier' };
  if (op.door) { put(op.a0 + 0.01, op.a1 - 0.01, op.y0, op.y1 - op.y0 - 0.01, 0.05, 'wood', op.door, base); return; }
  if (!op.glass) return;
  const hasSill = op.y0 > 0.01;
  const gy0 = op.y0 + (hasSill ? fw : 0), gy1 = op.y1 - fw;
  if (hasSill) put(op.a0, op.a1, op.y0, fw, t, 'wood', fc, base);
  put(op.a0, op.a1, gy1, fw, t, 'wood', fc, base);
  put(op.a0, op.a0 + fw, gy0, gy1 - gy0, t, 'wood', fc, base);
  put(op.a1 - fw, op.a1, gy0, gy1 - gy0, t, 'wood', fc, base);
  const span = op.a1 - op.a0 - 2 * fw;
  const nP = Math.max(1, Math.round(span / 1.3));
  const pw = (span - (nP - 1) * fw) / nP;
  for (let i = 0; i < nP; i++) {
    const p0 = op.a0 + fw + i * (pw + fw);
    put(p0, p0 + pw, gy0, gy1 - gy0, 0.025, 'glass', 0xcfe8ff, { group: g, mount: true, cat: 'Vitres', vary: 0 });
    if (i < nP - 1) put(p0 + pw, p0 + pw + fw, gy0, gy1 - gy0, t * 0.7, 'wood', fc, base);
  }
}

function perimeter(b, W, D, H, color, ops, o = {}) {
  const t = 0.22;
  brickWall(b, 'x', -D / 2 - t / 2, -W / 2 - t, W / 2 + t, H, t, color, ops.n || [], o);
  brickWall(b, 'x', D / 2 + t / 2, -W / 2 - t, W / 2 + t, H, t, color, ops.s || [], o);
  brickWall(b, 'z', -W / 2 - t / 2, -D / 2, D / 2, H, t, color, ops.w || [], o);
  brickWall(b, 'z', W / 2 + t / 2, -D / 2, D / 2, H, t, color, ops.e || [], o);
}

// ------------------------------------------------------------------ dalles, étage, escalier
// grille commune des dalles : elles débordent sur l'épaisseur des murs pour reposer dessus
function grid(W, D) {
  const t = 0.22, nx = Math.ceil(W + 2 * t), nz = Math.ceil(D + 2 * t);
  return { x0: -W / 2 - t, z0: -D / 2 - t, nx, nz, sx: (W + 2 * t) / nx, sz: (D + 2 * t) / nz };
}
function slab(b, W, D, y, layers, hole) {
  const G = grid(W, D), holes = hole ? [].concat(hole) : [];
  let yy = y;
  for (const L of layers) {
    const g = b.g();
    for (let i = 0; i < G.nx; i++) for (let k = 0; k < G.nz; k++) {
      if (holes.some((h) => i >= h.i0 && i <= h.i1 && k >= h.k0 && k <= h.k1)) continue;
      b.box(G.x0 + G.sx * (i + 0.5), yy, G.z0 + G.sz * (k + 0.5), G.sx, L.h, G.sz, L.mat, L.color, { group: g, cat: 'Plafond', vary: 0.012 });
    }
    yy += L.h;
  }
  return yy;
}
// dalle du rez-de-chaussée (30 cm) posée sur le vide sanitaire ; « steel » : zones blindées (sol du coffre)
// la cour : ~4 m tout autour du bâtiment, dans la continuité de la grille des dalles
export const YARD = 4;
export function plotOf(W, D) {
  const G = grid(W, D), mx = Math.round(YARD / G.sx), mz = Math.round(YARD / G.sz);
  return { x0: G.x0 - mx * G.sx, x1: -G.x0 + mx * G.sx, z0: G.z0 - mz * G.sz, z1: -G.z0 + mz * G.sz, nx: G.nx + 2 * mx, nz: G.nz + 2 * mz, sx: G.sx, sz: G.sz };
}
export function buildGround(b, W, D, steel = []) {
  const P = plotOf(W, D), g = b.g(), ge = b.g(), fx = W / 2 + 0.22, fz = D / 2 + 0.22;
  for (let i = 0; i < P.nx; i++) for (let k = 0; k < P.nz; k++) {
    const x = P.x0 + P.sx * (i + 0.5), z = P.z0 + P.sz * (k + 0.5);
    const inside = Math.abs(x) < fx && Math.abs(z) < fz;
    const armored = steel.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
    b.box(x, -0.3, z, P.sx, 0.3, P.sz, armored ? 'steel' : inside ? 'ground' : 'yard', armored ? 0x858c95 : 0xffffff,
      { group: g, cat: armored ? 'Coffre' : 'Sol', vary: armored ? 0.02 : 0.025, noSplit: true });
    // quatre couches de terre, de plus en plus sombres, jusqu'à la nappe phréatique
    for (let L = 0; L < EARTH.length; L++)
      b.box(x, -0.3 - (L + 1) * 0.6, z, P.sx, 0.6, P.sz, 'earth', EARTH[L], { group: ge, cat: 'Terre', vary: 0.06, noSplit: true, hp: 380 * (1 + L * 0.35) });
  }
}
const EARTH = [0x7a5a3c, 0x6a4c32, 0x5a4029, 0x4a3a2c];
export const UNDER = { water: -2.75, bottom: -3.6, rootY: -2.65 };

// toit cassable, posé sur les murs
function roof(b, W, D, y, color) { slab(b, W, D, y, [{ mat: 'ceiling', h: 0.2, color }]); }

// plancher de l'étage (plafond dessous, lames dessus) + trémie + escalier montant vers +x
// i0 : première colonne de dalles de la trémie ; north : escalier le long du mur nord (sinon sud)
// holes : trémies supplémentaires (atrium…), en indices de dalles
function upstairs(b, W, D, H, { i0, north = true, ceil, floor, stair = 0x6b4226, rail = 0x3e2618, holes = [] }) {
  const G = grid(W, D), R = H + 0.2;
  const nSteps = Math.ceil(R / 0.2), n = Math.ceil(nSteps * 0.26 / G.sx);
  const k = north ? 1 : G.nz - 2;
  const hole = { i0, i1: i0 + n - 1, k0: k, k1: k };
  slab(b, W, D, H, [{ mat: 'ceiling', h: 0.06, color: ceil }, { mat: 'floorboard', h: 0.14, color: floor }], [hole, ...holes]);
  const hx0 = G.x0 + hole.i0 * G.sx, hx1 = G.x0 + (hole.i1 + 1) * G.sx;
  const hz0 = G.z0 + k * G.sz, hz1 = hz0 + G.sz, zc = (hz0 + hz1) / 2;
  const run = (hx1 - hx0) / nSteps, rise = R / nSteps;
  for (let s = 0; s < nSteps; s++)
    b.box(hx0 + run * (s + 0.5), 0, zc, run, rise * (s + 1), hz1 - hz0 - 0.02, 'wood', stair, { cat: 'Mobilier', vary: 0.03 });
  // garde-corps côté pièce et en bas de trémie
  const g = b.g(), zr = north ? hz1 + 0.03 : hz0 - 0.03, o = { group: g, cat: 'Mobilier' };
  const np = Math.max(2, Math.round((hx1 - hx0) / 0.8));
  for (let i = 0; i <= np; i++) b.box(hx0 + (hx1 - hx0) * i / np, R, zr, 0.05, 0.9, 0.05, 'wood', rail, o);
  b.box((hx0 + hx1) / 2, R + 0.9, zr, hx1 - hx0 + 0.05, 0.06, 0.07, 'wood', rail, o);
  const g2 = b.g(), o2 = { group: g2, cat: 'Mobilier' };
  for (const z of [hz0 + 0.05, zc, hz1 - 0.05]) b.box(hx0 - 0.03, R, z, 0.05, 0.9, 0.05, 'wood', rail, o2);
  b.box(hx0 - 0.03, R + 0.9, zc, 0.07, 0.06, hz1 - hz0, 'wood', rail, o2);
  return { R, hx0, hx1, hz0, hz1 };
}

const win = (a0, a1, y0 = 0.8, y1 = 2.4) => ({ a0, a1, y0, y1, glass: true });
const door = (a0, a1, y1 = 2.4, color = null) => ({ a0, a1, y0: 0, y1, door: color });
const gdoor = (a0, a1, y1 = 2.4) => ({ a0, a1, y0: 0, y1, glass: true });

// ------------------------------------------------------------------ plafonniers
function neon(b, x, z, len, alongX, H, light) {
  const g = b.g(), w = alongX ? len : 0.16, d = alongX ? 0.16 : len;
  b.box(x, H - 0.05, z, w + 0.04, 0.05, d + 0.04, 'metal', 0xdddddd, { group: g, hang: true, cat: 'Luminaires' });
  const tube = b.box(x, H - 0.09, z, w, 0.04, d, 'neon', 0xffffff, { group: g, cat: 'Luminaires', vary: 0 });
  if (light) b.light(x, H - 0.5, z, light.c ?? 0xfff1dd, light.i ?? 16, light.d ?? 12, tube);
  return tube;
}
function panel(b, x, z, H, light) {
  const g = b.g();
  b.box(x, H - 0.04, z, 0.64, 0.04, 0.64, 'metal', 0xeeeeee, { group: g, hang: true, cat: 'Luminaires' });
  const p = b.box(x, H - 0.07, z, 0.58, 0.03, 0.58, 'neon', 0xffffff, { group: g, cat: 'Luminaires', vary: 0 });
  if (light) b.light(x, H - 0.5, z, 0xf2f6ff, light.i ?? 14, 13, p);
}
function pendant(b, x, z, H, drop, light, shadeColor = 0x1f1f1f) {
  const g = b.g();
  b.box(x, H - drop, z, 0.015, drop, 0.015, 'metal', 0x222222, { group: g, hang: true, shape: 'cyl', cat: 'Luminaires' });
  const shade = b.box(x, H - drop - 0.22, z, 0.36, 0.22, 0.36, 'metal', shadeColor, { group: g, shape: 'cyl', cat: 'Luminaires' });
  b.box(x, H - drop - 0.28, z, 0.1, 0.06, 0.1, 'neon', 0xffffff, { group: g, shape: 'cyl', cat: 'Luminaires', vary: 0 });
  if (light) b.light(x, H - drop - 0.5, z, light.c ?? 0xffc98a, light.i ?? 10, light.d ?? 9, shade);
}
function chandelier(b, x, z, H, light) {
  const g = b.g();
  b.box(x, H - 0.6, z, 0.03, 0.6, 0.03, 'metal', 0xc9a227, { group: g, hang: true, shape: 'cyl', cat: 'Luminaires' });
  const ring = b.box(x, H - 0.66, z, 0.8, 0.06, 0.8, 'metal', 0xc9a227, { group: g, shape: 'cyl', cat: 'Luminaires' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(x + Math.cos(a) * 0.32, H - 0.6, z + Math.sin(a) * 0.32, 0.06, 0.1, 0.06, 'neon', 0xfff0d0, { group: g, shape: 'cyl', cat: 'Luminaires', vary: 0 });
  }
  if (light) b.light(x, H - 0.9, z, 0xffc070, light.i ?? 12, 10, ring);
}

// ------------------------------------------------------------------ mobilier
function table(F, { w = 1.2, d = 0.8, h = 0.75, top = 'wood', tc = 0x8b5a2b, lm = 'wood', lc = tc, leg = 0.06, cat = 'Mobilier' } = {}) {
  const g = F.b.g(), t = 0.04;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * (w / 2 - leg / 2 - 0.03), 0, sz * (d / 2 - leg / 2 - 0.03), leg, h - t, leg, lm, lc, { group: g, cat });
  F.box(0, h - t, 0, w, t, d, top, tc, { group: g, cat });
  return h;
}
function chair(F, c = 0x6b4226, seat = null) {
  const g = F.b.g();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.19, 0, sz * 0.19, 0.04, 0.44, 0.04, 'wood', c, { group: g });
  F.box(0, 0.44, 0, 0.44, 0.04, 0.44, seat ? 'fabric' : 'wood', seat ?? c, { group: g });
  F.box(0, 0.48, 0.2, 0.44, 0.46, 0.04, 'wood', c, { group: g });
}
function officeChair(F, c = 0x1f2937) {
  const g = F.b.g();
  F.cyl(0, 0, 0, 0.55, 0.06, 'metal', 0x333333, { group: g });
  F.cyl(0, 0.06, 0, 0.06, 0.38, 'metal', 0x888888, { group: g });
  F.box(0, 0.44, 0, 0.5, 0.08, 0.5, 'fabric', c, { group: g });
  F.box(0, 0.52, 0.22, 0.48, 0.58, 0.06, 'fabric', c, { group: g });
}
function stool(F, c = 0x5a3520) {
  const g = F.b.g();
  F.cyl(0, 0, 0, 0.4, 0.04, 'metal', 0x2b2b2b, { group: g });
  F.cyl(0, 0.04, 0, 0.06, 0.68, 'metal', 0x999999, { group: g });
  F.cyl(0, 0.72, 0, 0.38, 0.06, 'wood', c, { group: g });
}
function shelfUnit(F, { w = 1.2, h = 2, d = 0.4, levels = 4, mat = 'wood', color = 0x6b4a2e, back = true } = {}) {
  const g = F.b.g(), t = 0.03, tops = [];
  F.box(-w / 2 + t / 2, 0, 0, t, h, d, mat, color, { group: g });
  F.box(w / 2 - t / 2, 0, 0, t, h, d, mat, color, { group: g });
  if (back) F.box(0, 0, d / 2 - 0.01, w - 2 * t, h, 0.02, mat, color, { group: g });
  for (let i = 0; i <= levels; i++) {
    const y = i === levels ? h - 0.03 : 0.05 + i * (h - 0.08) / levels;
    F.box(0, y, 0, w - 2 * t, 0.03, d, mat, color, { group: g });
    tops.push(y + 0.03);
  }
  return { tops, x0: -w / 2 + t + 0.02, x1: w / 2 - t - 0.02 };
}
function fillShelves(F, S, kinds, lz = 0, extraTop = false) {
  const n = extraTop ? S.tops.length : S.tops.length - 1;
  for (let i = 0; i < n; i++) {
    const mh = i < S.tops.length - 1 ? S.tops[i + 1] - 0.03 - S.tops[i] : 0.35;
    fillRow(F, S.tops[i], S.x0, S.x1, lz, mh, pick(kinds));
  }
}
function plant(F, big = true) {
  const s = big ? 1 : 0.6;
  F.cyl(0, 0, 0, 0.38 * s, 0.38 * s, 'ceramic', pick([0xb5542a, 0xe8e2d6, 0x2f2f2f]), { cat: 'Déco' });
  const top = 0.38 * s, g = F.b.g();
  F.box(0, top, 0, 0.12 * s, 0.5 * s, 0.12 * s, 'food', 0x3f6b2a, { group: g, cat: 'Déco' });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    F.box(Math.cos(a) * 0.14 * s, top + 0.2 * s + i * 0.08 * s, Math.sin(a) * 0.14 * s, 0.26 * s, 0.05, 0.14 * s, 'food', pick([0x2d6a4f, 0x40916c, 0x1b4332, 0x52b788]), { group: g, cat: 'Déco' });
  }
}
function fridge(F, { w = 0.75, h = 1.85, d = 0.7, c = 0xeef0f2 } = {}) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  F.box(0, 0, 0.03, w, h, d - 0.06, 'metal', c, o);
  F.box(0, 0.02, -d / 2 + 0.03, w, 1.15, 0.06, 'metal', c, o);
  F.box(0, 1.19, -d / 2 + 0.03, w, h - 1.19, 0.06, 'metal', c, o);
  F.box(w / 2 - 0.08, 0.6, -d / 2 - 0.02, 0.03, 0.45, 0.03, 'metal', 0x999999, o);
  F.box(w / 2 - 0.08, 1.3, -d / 2 - 0.02, 0.03, 0.3, 0.03, 'metal', 0x999999, o);
}
function displayFridge(F, w = 1.2, h = 2.1, d = 0.7) {
  const g = F.b.g(), body = 0xe8eaec, inner = 0xf7f7f7, o = { group: g, cat: 'Électroménager' };
  F.box(0, 0, 0, w, 0.15, d, 'metal', 0x2b2f36, o);
  F.box(-w / 2 + 0.03, 0.15, 0, 0.06, h - 0.15, d, 'metal', body, o);
  F.box(w / 2 - 0.03, 0.15, 0, 0.06, h - 0.15, d, 'metal', body, o);
  F.box(0, 0.15, d / 2 - 0.03, w - 0.12, h - 0.15, 0.06, 'metal', inner, o);
  F.box(0, h - 0.12, 0, w - 0.12, 0.12, d, 'metal', 0xd62828, o);
  const tops = [0.15];
  for (let k = 1; k <= 3; k++) { const y = 0.15 + k * 0.45; F.box(0, y, -0.01, w - 0.12, 0.02, d - 0.14, 'metal', inner, o); tops.push(y + 0.02); }
  F.box(0, 0.15, -d / 2 + 0.01, w - 0.12, h - 0.27, 0.02, 'glass', 0xd8f0ff, { group: g, cat: 'Vitres', vary: 0 });
  F.box(w / 2 - 0.14, 0.9, -d / 2 - 0.025, 0.03, 0.5, 0.03, 'metal', 0xaaaaaa, o);
  for (const y of tops) fillRow(F, y, -w / 2 + 0.09, w / 2 - 0.09, -0.08, 0.42, pick(['bottle', 'can', 'water', 'jar']));
}
function counter(F, w, d, h, body, topMat, top, cat = 'Mobilier') {
  const g = F.b.g();
  F.box(0, 0, 0.02, w, h - 0.04, d - 0.04, 'wood', body, { group: g, cat });
  F.box(0, h - 0.04, 0, w, 0.04, d, topMat, top, { group: g, cat });
  return h;
}
function sofa(F, c, w = 2.2) {
  const g = F.b.g(), o = { group: g };
  F.box(0, 0, 0, w, 0.42, 0.9, 'fabric', c, o);
  F.box(0, 0.42, 0.35, w - 0.4, 0.45, 0.2, 'fabric', c, o);
  F.box(-w / 2 + 0.1, 0.42, 0, 0.2, 0.22, 0.9, 'fabric', c, o);
  F.box(w / 2 - 0.1, 0.42, 0, 0.2, 0.22, 0.9, 'fabric', c, o);
  const n = w > 1.5 ? 3 : 1, cw = (w - 0.4) / n;
  for (let i = 0; i < n; i++) F.box(-w / 2 + 0.2 + cw * (i + 0.5), 0.42, -0.1, cw - 0.02, 0.12, 0.6, 'fabric', c, { cat: 'Déco', vary: 0.06 });
  if (w > 1.5) for (const s of [-1, 1]) F.box(s * (w / 2 - 0.45), 0.54, 0.15, 0.4, 0.35, 0.12, 'fabric', pick([0xe9c46a, 0xf4a261, 0xe76f51]), { cat: 'Déco' });
}
function tv(F, y, w = 1.3) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.box(0, y, 0, 0.35, 0.03, 0.22, 'plastic', 0x111111, o);
  F.box(0, y + 0.03, 0.02, 0.06, 0.12, 0.05, 'plastic', 0x111111, o);
  const h = w * 0.58;
  F.box(0, y + 0.15, 0.02, w, h, 0.05, 'plastic', 0x0d0d0d, o);
  F.box(0, y + 0.17, -0.013, w - 0.05, h - 0.04, 0.02, 'screen', 0x223a55, { ...o, vary: 0 });
}
function monitor(F, y) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.box(0, y, 0, 0.24, 0.02, 0.18, 'plastic', 0x1a1a1a, o);
  F.box(0, y + 0.02, 0.03, 0.04, 0.22, 0.04, 'plastic', 0x1a1a1a, o);
  F.box(0, y + 0.14, 0.03, 0.56, 0.34, 0.04, 'plastic', 0x111111, o);
  F.box(0, y + 0.16, 0.003, 0.52, 0.3, 0.015, 'screen', 0x2a5078, { ...o, vary: 0 });
}
function desk(F) {
  const h = table(F, { w: 1.4, d: 0.75, h: 0.74, top: 'wood', tc: 0xf1efe9, lm: 'metal', lc: 0x9aa0a6, leg: 0.05 });
  const M = F.sub(0, -0.2, 2); monitor(M, h);
  F.box(0, h, 0.12, 0.44, 0.025, 0.14, 'plastic', 0x2b2b2b, { cat: 'Électronique' });
  F.box(0.33, h, 0.14, 0.06, 0.03, 0.1, 'plastic', 0x2b2b2b, { cat: 'Électronique' });
  F.cyl(-0.5, h, 0.1, 0.085, 0.1, 'ceramic', pick([0xffffff, 0xd62828, 0x1d4ed8, 0xfacc15]), { cat: 'Vaisselle' });
  const px = rr(0.42, 0.5), n = 1 + ((R() * 3) | 0);
  for (let i = 0; i < n; i++) F.box(px, h + i * 0.04, -0.15, 0.3, 0.04, 0.21, 'paper', 0xf6f5f0, { cat: 'Paperasse', vary: 0.01 });
  if (R() < 0.4) F.cyl(-0.52, h, -0.2, 0.14, 0.14, 'ceramic', 0xe8e2d6, { cat: 'Déco' });
  officeChair(F.sub(rr(-0.1, 0.1), 0.62, 0));
}
function bookshelf(F, w = 1.4, h = 2) {
  const S = shelfUnit(F, { w, h, d: 0.34, levels: 5, color: 0x5c3d24 });
  fillShelves(F, S, ['book', 'book', 'book'], 0.02, false);
}
function floorLamp(F) {
  const g = F.b.g();
  F.cyl(0, 0, 0, 0.3, 0.03, 'metal', 0x222222, { group: g, cat: 'Luminaires' });
  F.cyl(0, 0.03, 0, 0.03, 1.47, 'metal', 0x333333, { group: g, cat: 'Luminaires' });
  const shade = F.cyl(0, 1.45, 0, 0.42, 0.3, 'fabric', 0xf1e3c6, { group: g, cat: 'Luminaires' });
  return shade;
}
function frame(F, y, w, h, c) {
  const g = F.b.g();
  F.box(0, y, 0, w, h, 0.03, 'wood', 0x3b2a1a, { group: g, mount: true, cat: 'Déco' });
  F.box(0, y + 0.04, -0.02, w - 0.08, h - 0.08, 0.01, 'fabric', c, { group: g, mount: true, cat: 'Déco' });
}

// ------------------------------------------------------------------ mobilier d'étage
function bed(F, { w = 1.6, c = 0x5c3317, sheet = 0xf5f5f0, duvet = 0x3d5a80 } = {}) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  F.box(0, 0, 0, w, 0.35, 2.0, 'wood', c, o);
  F.box(0, 0, 1.03, w, 1.0, 0.06, 'wood', c, o);
  F.box(0, 0.35, -0.02, w - 0.06, 0.2, 1.94, 'fabric', sheet, { cat: 'Mobilier', vary: 0.01 });
  F.box(0, 0.55, -0.3, w - 0.02, 0.07, 1.3, 'fabric', duvet, { cat: 'Déco' });
  const np = w > 1.2 ? 2 : 1;
  for (let i = 0; i < np; i++) F.box((np === 2 ? (i ? 0.38 : -0.38) : 0), 0.55, 0.7, 0.62, 0.14, 0.4, 'fabric', 0xffffff, { cat: 'Déco', vary: 0.02 });
}
function nightstand(F, lamp) {
  const g = F.b.g();
  F.box(0, 0, 0, 0.45, 0.5, 0.4, 'wood', 0x7a4a24, { group: g });
  if (!lamp) return null;
  const gl = F.b.g();
  F.cyl(0, 0.5, 0, 0.12, 0.22, 'ceramic', 0xe9d8a6, { group: gl, cat: 'Luminaires' });
  return F.cyl(0, 0.72, 0, 0.26, 0.18, 'fabric', 0xfff1d6, { group: gl, cat: 'Luminaires' });
}
function wardrobe(F, c = 0xe8e2d6) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  F.box(0, 0, 0.02, 1.4, 2.1, 0.56, 'wood', c, o);
  for (const s of [-1, 1]) {
    F.box(s * 0.35, 0.02, -0.27, 0.68, 2.05, 0.03, 'wood', c, o);
    F.box(s * 0.06, 1.0, -0.3, 0.03, 0.2, 0.03, 'metal', 0x999999, o);
  }
}
function dresser(F) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  F.box(0, 0, 0, 1.2, 0.85, 0.5, 'wood', 0x7a4a24, o);
  for (let k = 0; k < 3; k++) F.box(0, 0.08 + k * 0.26, -0.26, 1.1, 0.22, 0.02, 'wood', 0x8d5a2e, o);
  const gm = F.b.g();
  F.box(0, 0.85, 0.15, 0.8, 0.04, 0.12, 'wood', 0x5c3317, { group: gm, cat: 'Déco' });
  F.box(0, 0.89, 0.18, 0.72, 0.8, 0.02, 'glass', 0xe8f4ff, { group: gm, cat: 'Vitres', vary: 0 });
  F.cyl(-0.45, 0.85, -0.05, 0.1, 0.18, 'bottle', 0xf4a261, { cat: 'Déco' });
  F.cyl(0.45, 0.85, -0.05, 0.14, 0.12, 'ceramic', 0xffffff, { cat: 'Déco' });
}
function bathtub(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  F.box(0, 0, 0, 1.7, 0.1, 0.75, 'ceramic', 0xfafafa, o);
  for (const s of [-1, 1]) {
    F.box(0, 0.1, s * 0.335, 1.7, 0.45, 0.08, 'ceramic', 0xfafafa, o);
    F.box(s * 0.81, 0.1, 0, 0.08, 0.45, 0.59, 'ceramic', 0xfafafa, o);
  }
  F.box(0, 0.1, 0, 1.54, 0.3, 0.59, 'glass', 0x9ad7ff, { cat: 'Déco', vary: 0, hp: 8 });
  F.box(0.75, 0.55, 0.2, 0.05, 0.25, 0.05, 'metal', 0xc0c0c0, o);
}
function toilet(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  F.box(0, 0, -0.05, 0.38, 0.4, 0.5, 'ceramic', 0xfdfdfd, o);
  F.box(0, 0, 0.3, 0.42, 0.8, 0.2, 'ceramic', 0xfdfdfd, o);
  F.box(0, 0.4, -0.05, 0.4, 0.03, 0.48, 'plastic', 0xffffff, { cat: 'Déco' });
}
function washbasin(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  F.box(0, 0, 0.05, 0.2, 0.75, 0.2, 'ceramic', 0xfdfdfd, o);
  F.box(0, 0.75, 0, 0.6, 0.15, 0.45, 'ceramic', 0xfdfdfd, o);
  F.box(0, 0.9, 0.17, 0.04, 0.15, 0.04, 'metal', 0xc0c0c0, o);
}
function wallMirror(b, x, y, zWall, w, h, side) {
  const g = b.g(), z = side === 'n' ? zWall + 0.015 : zWall - 0.015;
  b.box(x, y, z, w, h, 0.03, 'glass', 0xe8f4ff, { group: g, mount: true, cat: 'Vitres', vary: 0 });
}
function wallMirrorX(b, xWall, y, z, w, h, side) {
  const g = b.g(), x = side === 'w' ? xWall + 0.015 : xWall - 0.015;
  b.box(x, y, z, 0.03, h, w, 'glass', 0xe8f4ff, { group: g, mount: true, cat: 'Vitres', vary: 0 });
}
function serverRack(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.box(0, 0, 0, 0.62, 2.0, 1.0, 'metal', 0x1f2329, o);
  for (let k = 0; k < 9; k++) {
    F.box(0, 0.15 + k * 0.2, -0.505, 0.5, 0.06, 0.01, 'screen', pick([0x2ecc71, 0x3498db, 0x1abc9c, 0xe74c3c]), { ...o, vary: 0 });
  }
}
function storageRack(F, kinds) {
  const S = shelfUnit(F, { w: 2.4, h: 2.4, d: 0.6, levels: 4, mat: 'metal', color: 0x2f6fb0, back: false });
  fillShelves(F, S, kinds, 0, true);
}
function cartonPallet(b, x, z, layers = 3) {
  b.box(x, 0, z, 1.2, 0.14, 1.0, 'wood', 0xb08850, {});
  for (let L = 0; L < layers; L++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++)
    b.box(x - 0.4 + i * 0.4, 0.14 + L * 0.32, z - 0.24 + j * 0.48, 0.39, 0.32, 0.47, 'paper', L % 2 ? 0xa87a4a : 0xb58755, { cat: 'Marchandise' });
}
function champagneTower(F, y, n = 4) {
  const s = 0.078;
  for (let L = 0; L < n; L++) {
    const m = n - L, off = -(m - 1) * s / 2;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++)
      F.cyl(off + i * s, y + L * 0.1, off + j * s, 0.07, 0.1, 'glass', 0xfff3c4, { cat: 'Vaisselle', vary: 0 });
  }
}
function gondola(F, len, h, levels, kinds) {
  const g = F.b.g(), mc = 0xd9dde2, dark = 0x3a3f47, o = { group: g };
  F.box(0, 0, 0, len, 0.12, 0.92, 'metal', dark, o);
  F.box(0, 0.12, 0, len, h - 0.12, 0.05, 'metal', mc, o);
  for (const s of [-1, 1]) F.box(s * (len / 2 - 0.02), 0.12, 0, 0.04, h - 0.12, 0.92, 'metal', mc, o);
  const sp = (h - 0.12) / levels, tops = [0.12];
  for (let i = 1; i < levels; i++) {
    const y = 0.12 + i * sp;
    for (const s of [-1, 1]) F.box(0, y, s * 0.245, len - 0.08, 0.025, 0.41, 'metal', mc, o);
    tops.push(y + 0.025);
  }
  for (let i = 0; i < tops.length; i++) {
    const y = tops[i], mh = (i < tops.length - 1 ? tops[i + 1] - 0.025 : h + 0.32) - y;
    for (const s of [-1, 1]) fillRow(F, y, -len / 2 + 0.07, len / 2 - 0.07, s * 0.26, Math.min(mh, 0.4), pick(kinds));
  }
}
function cart(F) {
  const g = F.b.g(), c = 0xb8bec6, o = { group: g, cat: 'Mobilier' };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.2, 0, sz * 0.35, 0.05, 0.1, 0.05, 'plastic', 0x222222, o);
  F.box(0, 0.1, 0, 0.5, 0.03, 0.8, 'metal', c, o);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.23, 0.13, sz * 0.38, 0.03, 0.8, 0.03, 'metal', c, o);
  F.box(0, 0.45, 0, 0.44, 0.02, 0.74, 'metal', c, o);
  for (const sx of [-1, 1]) F.box(sx * 0.235, 0.47, 0, 0.015, 0.45, 0.76, 'metal', c, o);
  F.box(0, 0.47, -0.385, 0.46, 0.45, 0.015, 'metal', c, o);
  F.box(0, 0.93, 0.4, 0.56, 0.035, 0.035, 'plastic', 0xd62828, o);
}
function checkout(F) {
  counter(F, 0.7, 1.9, 0.9, 0x3d4450, 'plastic', 0x151515);
  const g = F.b.g();
  F.box(0.05, 0.9, 0.55, 0.36, 0.1, 0.3, 'plastic', 0x2b2b2b, { group: g, cat: 'Électronique' });
  F.box(0.05, 1.0, 0.6, 0.06, 0.18, 0.06, 'metal', 0x777777, { group: g, cat: 'Électronique' });
  F.box(0.05, 1.18, 0.6, 0.28, 0.18, 0.03, 'screen', 0x9fd3ff, { group: g, cat: 'Électronique', vary: 0 });
  fillRow(F.sub(0, 0, 1), 0.9, -0.3, 0.6, 0, 0.35, pick(['cereal', 'bottle', 'can']));
  const S = shelfUnit(F.sub(0.55, -0.6, 3), { w: 0.6, h: 1.1, d: 0.3, levels: 3, mat: 'metal', color: 0xb8bec6, back: false });
  fillShelves(F.sub(0.55, -0.6, 3), S, ['can', 'jar', 'pack']);
}
function dressedTable(F, { w = 0.95, d = 0.95, tc = 0x4a2c1a, cloth = 0xf6f3ea, chairs = true, chairC = 0x3e2618, seat = 0x7a1f1f } = {}) {
  const h = table(F, { w, d, h: 0.75, tc });
  F.box(0, h, 0, w + 0.1, 0.01, d + 0.1, 'fabric', cloth, { cat: 'Déco', vary: 0.01 });
  return h + 0.01;
}
function place(F, lx, lz, y) {
  F.cyl(lx, y, lz, 0.26, 0.02, 'ceramic', 0xffffff, { cat: 'Vaisselle', vary: 0.01 });
}

// ------------------------------------------------------------------ MAGASIN
function buildShop(b) {
  const W = 24, D = 18, H = 3.6, H2 = 3.2;
  perimeter(b, W, D, H, 0xe9e5dc, {
    s: [win(-11, -2.6, 0.4, 2.8), gdoor(-1.2, 1.2, 2.8), win(2.6, 11, 0.4, 2.8)],
    e: [door(6.5, 7.7, 2.4, 0x6b7280)],
  }, { band: { rows: [5], color: 0xd62828 }, frame: 0x3a3f47 });
  const up = upstairs(b, W, D, H, { i0: 18, ceil: 0xf2f2ef, floor: 0x8d8f91, stair: 0x5b6068, rail: 0xd62828 });

  const kinds = [['cereal', 'pack', 'box'], ['bottle', 'water', 'can', 'jar'], ['cereal', 'can', 'bottle', 'pack'], ['jar', 'bottle', 'pack']];
  [-8.2, -5.0, -1.8, 1.4].forEach((x, i) => gondola(b.f(x, -1.8, 1), 5.5, 1.65, 4, kinds[i]));
  for (let i = 0; i < 8; i++) displayFridge(b.f(-11.2 + i * 1.22, -9 + 0.37, 2));
  for (const x of [-9.5, -6.8, -4.1]) checkout(b.f(x, 5.6, 0));

  // pyramide de conserves
  const px = 7, pz = -3.4, n = 6, sp = 0.1;
  b.box(px, 0, pz, n * sp + 0.25, 0.14, n * sp + 0.25, 'wood', 0xb08850, {});
  for (let L = 0; L < n; L++) {
    const m = n - L, off = -(m - 1) * sp / 2;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++)
      b.box(px + off + i * sp, 0.14 + L * 0.13, pz + off + j * sp, 0.095, 0.13, 0.095, 'metal', PAL.can[L % PAL.can.length], { shape: 'cyl', cat: 'Marchandise', vary: 0.02 });
  }
  for (const [x, z] of [[10.6, -4.6], [10.6, -2.4], [9.0, -4.6]]) {
    b.box(x, 0, z, 1.2, 0.14, 1.0, 'wood', 0xb08850, {});
    for (let L = 0; L < 3; L++) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++)
      b.box(x - 0.45 + i * 0.3, 0.14 + L * 0.26, z - 0.32 + j * 0.32, 0.29, 0.26, 0.31, 'plastic', L % 2 ? 0x8fc9ea : 0x6fb6e0, { cat: 'Marchandise' });
  }
  {
    const x = 7.4, z = 1.4;
    b.box(x, 0, z, 1.6, 0.14, 0.8, 'wood', 0xb08850, {});
    for (let L = 0; L < 4; L++) for (let i = 0; i < 7 - L; i++)
      b.box(x - 0.6 + L * 0.1 + i * 0.2, 0.14 + L * 0.3, z, 0.19, 0.3, 0.6, 'paper', pick(PAL.cereal), { cat: 'Marchandise' });
  }
  for (const z of [2.2, 3.5, 4.8]) cart(b.f(11.1, z, 1));
  {
    const F = b.f(-11.3, 2.6, 3);
    const S = shelfUnit(F, { w: 1.4, h: 1.3, d: 0.3, levels: 3, color: 0xe0e0e0, mat: 'metal' });
    for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) F.box(S.x0 + 0.12 + k * 0.26, S.tops[i], 0, 0.22, 0.3, 0.03, 'paper', pick(PAL.cereal), { cat: 'Paperasse' });
  }
  for (const z of [-6, -3, 0, 3, 6]) for (const x of [-10, -7.4, -4.8, -2.2, 0.4, 3, 5.6, 8.2, 10.8]) {
    const lit = (x === -7.4 || x === 3) && (z === -3 || z === 3) || (x === 8.2 && z === 6);
    neon(b, x, z, 1.3, true, H, lit ? { i: 20, d: 14 } : null);
  }
  for (const [x, z] of [[-6.6, -1.8], [-3.4, -1.8], [-0.2, -1.8], [7, -1]]) {
    const g = b.g();
    b.box(x, H - 0.8, z, 0.02, 0.8, 0.02, 'metal', 0x444444, { group: g, hang: true, shape: 'cyl', cat: 'Déco' });
    b.box(x, H - 1.28, z, 0.05, 0.48, 1.4, 'plastic', 0xffc300, { group: g, cat: 'Déco' });
    b.box(x, H - 1.2, z, 0.06, 0.32, 1.2, 'plastic', 0xd62828, { group: g, cat: 'Déco' });
  }
  plant(b.f(-11.4, 8.4, 0)); plant(b.f(11.4, 8.4, 0));

  // ---- étage : la réserve et le bureau du gérant
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xd9d6ce, {
      s: [win(-9, -5), win(-2, 2), win(5, 9)],
      w: [win(-2, 2)],
      n: [win(-6, -2)],
    }, { band: { rows: [0], color: 0x6b7280 }, frame: 0x3a3f47 });
    for (const z of [-4.6, -1.4, 1.8]) for (const x of [-9.2, -6.4, -3.6])
      storageRack(b.f(x, z, 0), pick([['box', 'box', 'pack'], ['box', 'cereal', 'pack'], ['water', 'box', 'bottle']]));
    for (const [x, z] of [[1.2, -4], [1.2, -1.2], [3.8, -4], [3.8, -1.2], [1.2, 1.6]]) cartonPallet(b, x, z, 2 + ((R() * 2) | 0));
    desk(b.f(8.2, 5.2, 0));
    for (let i = 0; i < 3; i++) {
      const F = b.f(10.2 + i * 0.55, 9 - 0.32, 2), g = b.g();
      F.box(0, 0, 0, 0.5, 1.32, 0.6, 'metal', 0x6b7280, { group: g, cat: 'Mobilier' });
      fillRow(F, 1.32, -0.23, 0.23, 0, 0.35, 'binder', 0.004);
    }
    {
      const g = b.g();
      b.box(11.4, 0, 3.2, 0.7, 0.9, 0.7, 'metal', 0x2b2f36, { group: g, cat: 'Électroménager', hp: 400 });
      b.box(11.04, 0.35, 3.2, 0.04, 0.15, 0.15, 'metal', 0xc9a227, { group: g, cat: 'Électroménager' });
    }
    sofa(b.f(5.4, 7.9, 0), 0x6b7280, 1.8);
    plant(b.f(11.3, 8.3, 0), false);
    frame(b.f(10.6, 9 - 0.02, 0), 1.5, 0.9, 0.6, 0xd62828);
    for (const [x, z, lit] of [[-6.4, -3, true], [-6.4, 3.2, false], [2.5, -2.6, false], [2.5, 3.2, true], [8.5, 3.5, true], [8.5, -3, false]])
      neon(b, x, z, 1.3, true, H2, lit ? { i: 16, d: 12 } : null);
    roof(b, W, D, H2, 0xeeeeea);
  });
  return { spawn: { x: 0, z: 7.6, yaw: 0 }, cam: { x: 9.5, y: 2.7, z: 7.8, tx: -3, ty: 0.8, tz: -2 } };
}

// ------------------------------------------------------------------ RESTAURANT
function buildResto(b) {
  const W = 20, D = 16, H = 3.2, H2 = 3.2;
  perimeter(b, W, D, H, 0x8c3b34, {
    s: [win(-9.4, -6.6), win(-5.4, -2.4), gdoor(-1, 1), win(2.4, 5.4), win(6.6, 9.4)],
    w: [win(-2.5, 1.5)],
    e: [door(3.5, 4.5, 2.4, 0x5a3520)],
  }, { band: { rows: [0, 1], color: 0x3e2618 }, frame: 0x3e2618 });
  const up = upstairs(b, W, D, H, { i0: 15, ceil: 0xe9dcc4, floor: 0x7a4a2a, stair: 0x4a2c1a, rail: 0xc9a227 });

  for (const x of [-7, -3.5, 0, 3.5]) for (const z of [-2.6, 0.9, 4.4]) {
    const F = b.f(x, z, 0);
    const y = dressedTable(F);
    for (const [lx, lz] of [[0, -0.3], [0, 0.3], [-0.3, 0], [0.3, 0]]) {
      place(F, lx, lz, y);
      F.cyl(lx * 0.55 - lz * 0.667, y, lz * 0.55 + lx * 0.667, 0.07, 0.13, 'glass', 0xe0f2ff, { cat: 'Vaisselle', vary: 0 });
    }
    F.cyl(0.02, y, 0.02, 0.08, 0.31, 'bottle', pick(PAL.wine), { cat: 'Bouteilles' });
    F.cyl(-0.12, y, -0.1, 0.05, 0.16, 'plastic', 0xfff8e7, { cat: 'Déco' });
    chair(F.sub(0, -0.72, 2), 0x3e2618, 0x7a1f1f); chair(F.sub(0, 0.72, 0), 0x3e2618, 0x7a1f1f);
    chair(F.sub(-0.72, 0, 3), 0x3e2618, 0x7a1f1f); chair(F.sub(0.72, 0, 1), 0x3e2618, 0x7a1f1f);
  }
  {
    const F = b.f(-5, -5.9, 2);
    counter(F, 7, 0.7, 1.1, 0x5a3520, 'stone', 0x1c1c1c);
    fillRow(F, 1.1, -3.3, -1.6, 0.05, 0.4, 'glasses', 0.06);
    fillRow(F, 1.1, 2.1, 3.3, 0.05, 0.4, 'liquor', 0.05);
    const g = b.g();
    for (const x of [-0.6, -0.3, 0]) F.cyl(x, 1.1, 0.15, 0.06, 0.3, 'metal', 0xd4af37, { group: g, cat: 'Mobilier' });
    F.box(0.9, 1.1, 0.1, 0.4, 0.22, 0.3, 'metal', 0x2b2b2b, { cat: 'Électronique' });
    for (let i = 0; i < 6; i++) stool(b.f(-8 + i * 1.2, -5.05, 0));
    const S = shelfUnit(b.f(-5, -8 + 0.18, 2), { w: 6.8, h: 2.3, d: 0.34, levels: 4, color: 0x3e2618 });
    fillShelves(b.f(-5, -8 + 0.18, 2), S, ['liquor', 'wine', 'liquor', 'wine', 'glasses'], -0.02, false);
  }
  {
    const F = b.f(1.8, -7.3, 2), g = b.g(), k = 0x0f0f0f, o = { group: g, cat: 'Mobilier' };
    F.box(0, 0, 0.1, 1.5, 1.25, 0.45, 'wood', k, o);
    F.box(0, 0.7, -0.25, 1.5, 0.06, 0.25, 'wood', k, o);
    F.box(0, 0.76, -0.28, 1.3, 0.025, 0.16, 'plastic', 0xf5f5f0, o);
    for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) F.box(-0.6 + i * 0.09, 0.785, -0.24, 0.02, 0.02, 0.08, 'plastic', 0x111111, o);
    for (const s of [-1, 1]) F.box(s * 0.7, 0, -0.33, 0.06, 0.7, 0.06, 'wood', k, o);
    F.box(0, 1.25, 0.1, 0.5, 0.35, 0.03, 'paper', 0xf2f0e6, { cat: 'Paperasse' });
    F.box(0, 0, -0.85, 0.8, 0.46, 0.35, 'wood', k, {});
    F.cyl(0.55, 1.25, 0.15, 0.12, 0.2, 'ceramic', 0xffffff, { cat: 'Déco' });
  }
  {
    const F = b.f(9.45, 0.2, 1), g = b.g();
    F.box(0, 0, 0, 1.4, 0.8, 0.5, 'wood', 0x3e2618, { group: g });
    const w = b.g();
    F.box(0, 0.8, 0, 1.4, 0.6, 0.5, 'glass', 0x9ad7ff, { group: w, cat: 'Déco', vary: 0, hp: 20 });
    for (let i = 0; i < 6; i++) F.box(rr(-0.5, 0.5), rr(0.95, 1.25), rr(-0.15, 0.15), 0.1, 0.05, 0.03, 'food', pick([0xff7b00, 0xffd000, 0xff006e]), { group: w, cat: 'Déco' });
  }
  plant(b.f(-9.4, 7.4, 0)); plant(b.f(9.4, 7.4, 0)); plant(b.f(9.3, -3.2, 0));
  {
    const F = b.f(-3, 7.4, 0), g = b.g();
    F.cyl(0, 0, 0, 0.4, 0.04, 'metal', 0x222222, { group: g });
    F.cyl(0, 0.04, 0, 0.05, 1.7, 'wood', 0x3e2618, { group: g });
    F.box(0, 1.5, 0, 0.5, 0.04, 0.05, 'wood', 0x3e2618, { group: g });
    F.box(0.15, 0.9, 0.06, 0.4, 0.62, 0.08, 'fabric', 0x1f2937, { group: g, cat: 'Déco' });
  }
  frame(b.f(-10 + 0.02, -5, 3), 1.0, 0.9, 1.2, 0x1a1a1a);
  frame(b.f(-10 + 0.02, 5, 3), 1.2, 1.1, 0.8, 0xc9a227);
  for (const x of [-5.25, -1.75, 1.75]) for (const z of [-0.85, 2.65]) chandelier(b, x, z, H, z < 0 && x !== -1.75 || z > 0 && x === -1.75 ? { i: 18 } : null);
  for (const x of [-7.5, -5, -2.5]) pendant(b, x, -5.9, H, 0.7, x === -5 ? { i: 9 } : null, 0x8a6d1e);

  // ---- étage : salle de réception
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xeadfc6, {
      s: [win(-9, -7), win(-1, 1), win(6, 8)],
      w: [win(-3, 1)],
      n: [win(-6, -2)],
    }, { band: { rows: [0, 1], color: 0x5a3520 }, frame: 0x5a3520 });
    for (const z of [-2.4, 1.6]) {
      const F = b.f(-2, z, 0);
      const y = dressedTable(F, { w: 5, d: 1.1, tc: 0x5a3520, cloth: 0xfaf7ee });
      for (const lx of [-2, -1, 0, 1, 2]) {
        chair(F.sub(lx, -0.82, 2), 0x5a3520, 0xc9a227); chair(F.sub(lx, 0.82, 0), 0x5a3520, 0xc9a227);
        for (const s of [-1, 1]) {
          place(F, lx, s * 0.3, y);
          F.cyl(lx + 0.2, y, s * 0.18, 0.06, 0.16, 'glass', 0xfff3c4, { cat: 'Vaisselle', vary: 0 });
        }
      }
      for (const lx of [-1.5, 0.5]) F.cyl(lx, y, 0, 0.08, 0.31, 'bottle', 0x1f3d1a, { cat: 'Bouteilles' });
      F.cyl(1.5, y, 0, 0.3, 0.14, 'ceramic', 0xffffff, { cat: 'Déco' });
    }
    {
      const F = b.f(6, 1.6, 0);
      const y = dressedTable(F, { w: 1.0, d: 1.0, cloth: 0xc9a227 });
      champagneTower(F, y, 5);
    }
    {
      const F = b.f(-9.55, -1, 3);
      counter(F, 4, 0.7, 0.9, 0x5a3520, 'stone', 0xe6e1d6);
      fillRow(F, 0.9, -1.8, -0.2, 0, 0.4, 'plates', 0.04);
      fillRow(F, 0.9, 0.2, 1.8, 0, 0.4, 'liquor', 0.05);
    }
    for (const x of [-4.4, 3.4]) {
      const F = b.f(x, 8 - 0.2, 0);
      const S = shelfUnit(F, { w: 3.6, h: 2.2, d: 0.34, levels: 5, color: 0x3e2618 });
      fillShelves(F, S, ['wine', 'wine', 'liquor'], 0, false);
    }
    sofa(b.f(7.2, 6.8, 0), 0x7a1f1f, 2.0);
    plant(b.f(-9.3, 7.3, 0)); plant(b.f(9.3, 7.3, 0)); plant(b.f(-9.3, -7.3, 0));
    frame(b.f(0, -8 + 0.02, 2), 1.2, 1.6, 1.0, 0x6d597a);
    chandelier(b, -3.2, -0.4, H2, { i: 16 });
    chandelier(b, 1.2, -0.4, H2, null);
    chandelier(b, 6, 1.6, H2, { i: 12 });
    roof(b, W, D, H2, 0xeadfc6);
  });
  return { spawn: { x: 0, z: 7.2, yaw: 0 }, cam: { x: 7.8, y: 2.3, z: 6.9, tx: -3, ty: 0.9, tz: -2 } };
}

// ------------------------------------------------------------------ BUREAU
function glassWallX(b, z, xs, skip, g) {
  const post = (x) => b.box(x, 0, z, 0.06, 2.7, 0.06, 'metal', 0x6b7280, { group: g, cat: 'Mobilier' });
  for (let i = 0; i < xs.length; i++) {
    post(xs[i]);
    if (i < xs.length - 1 && !skip.includes(i)) {
      const a = xs[i] + 0.03, c = xs[i + 1] - 0.03;
      b.box((a + c) / 2, 0, z, c - a, 0.06, 0.06, 'metal', 0x6b7280, { group: g });
      b.box((a + c) / 2, 0.06, z, c - a, 2.58, 0.025, 'glass', 0xd6ecff, { group: g, cat: 'Vitres', vary: 0 });
      b.box((a + c) / 2, 2.64, z, c - a, 0.06, 0.06, 'metal', 0x6b7280, { group: g });
    }
  }
}
function glassWallZ(b, x, zs, skip, g) {
  for (let i = 0; i < zs.length; i++) {
    b.box(x, 0, zs[i], 0.06, 2.7, 0.06, 'metal', 0x6b7280, { group: g, cat: 'Mobilier' });
    if (i < zs.length - 1 && !skip.includes(i)) {
      const a = zs[i] + 0.03, c = zs[i + 1] - 0.03;
      b.box(x, 0, (a + c) / 2, 0.06, 0.06, c - a, 'metal', 0x6b7280, { group: g });
      b.box(x, 0.06, (a + c) / 2, 0.025, 2.58, c - a, 'glass', 0xd6ecff, { group: g, cat: 'Vitres', vary: 0 });
      b.box(x, 2.64, (a + c) / 2, 0.06, 0.06, c - a, 'metal', 0x6b7280, { group: g });
    }
  }
}
function deskCluster(b, cx, cz) {
  for (const s of [-1, 1]) {
    desk(b.f(cx - 0.72, cz + s * 0.42, s > 0 ? 0 : 2));
    desk(b.f(cx + 0.72, cz + s * 0.42, s > 0 ? 0 : 2));
  }
  b.box(cx, 0, cz, 2.9, 1.25, 0.04, 'fabric', 0x51606e, { cat: 'Mobilier' });
}
function buildOffice(b) {
  const W = 24, D = 18, H = 3.2, H2 = 3.2;
  perimeter(b, W, D, H, 0xe4e6e8, {
    n: [win(-3, -0.8), win(0.2, 2.4), win(9, 11)],
    w: [win(-6, -3.8), win(-1.1, 1.1), win(3.8, 6)],
    s: [door(-1, 1, 2.4, null), win(-10, -8), win(8, 10)],
    e: [win(-1.2, 1.2)],
  }, { band: { rows: [0], color: 0x5b6770 }, frame: 0x5b6770 });
  const up = upstairs(b, W, D, H, { i0: 2, ceil: 0xf4f5f6, floor: 0x3f4a5a, stair: 0x9aa0a6, rail: 0x5b6770 });

  for (const [cx, cz] of [[-8, -2.3], [-3, -2.3], [1.8, -2.3], [-8, 3.2], [-3, 3.2], [1.8, 3.2], [7.5, 1.2]]) deskCluster(b, cx, cz);
  {
    const g = b.g();
    glassWallX(b, -4, [5, 6, 7, 8.25, 9.5, 10.75, 12], [1], g);
    glassWallZ(b, 5, [-9, -7.75, -6.5, -5.25, -4], [], g);
    const T = b.f(8.5, -6.5, 0);
    const h = table(T, { w: 3.2, d: 1.2, h: 0.75, tc: 0x2b2b2b, lm: 'metal', lc: 0x777777 });
    for (const lx of [-1, 0, 1]) {
      officeChair(T.sub(lx, -0.95, 2), 0x7a1f1f); officeChair(T.sub(lx, 0.95, 0), 0x7a1f1f);
      F_papers(T, lx, h);
    }
    T.cyl(0, h, 0, 0.3, 0.12, 'plastic', 0x111111, { cat: 'Électronique' });
    tvWall(b, 7, -9, 1.0, 1.7, 'n');
  }
  {
    const g = b.g();
    b.box(-6, 1.0, 9 - 0.02, 2.2, 1.2, 0.04, 'plastic', 0xfafafa, { group: g, mount: true, cat: 'Mobilier' });
    b.box(-6, 0.95, 9 - 0.06, 2.2, 0.05, 0.08, 'metal', 0xaaaaaa, { group: g, mount: true, cat: 'Mobilier' });
  }
  {
    const F = b.f(11.65, 5.6, 1);
    counter(F, 2.4, 0.6, 0.92, 0x5b6770, 'stone', 0xe6e6e6);
    const g = b.g();
    F.box(-0.7, 0.92, 0, 0.32, 0.42, 0.34, 'plastic', 0x151515, { group: g, cat: 'Électroménager' });
    F.box(-0.7, 1.12, -0.175, 0.2, 0.12, 0.01, 'screen', 0x3a7bd5, { group: g, cat: 'Électronique', vary: 0 });
    fillRow(F, 0.92, -0.4, 0.5, 0, 0.3, 'mug', 0.04);
    F.box(0.8, 0.92, 0, 0.5, 0.3, 0.35, 'metal', 0xdddddd, { cat: 'Électroménager' });
  }
  {
    const F = b.f(11.5, 3.3, 1), g = b.g();
    F.box(0, 0, 0, 0.32, 1.0, 0.32, 'plastic', 0xf0f0f0, { group: g, cat: 'Électroménager' });
    F.cyl(0, 1.0, 0, 0.28, 0.45, 'bottle', 0x7ec8f0, { group: g, cat: 'Bouteilles' });
  }
  {
    const F = b.f(-11.3, 6.6, 3);
    F.box(0, 0, 0, 0.7, 0.72, 0.55, 'metal', 0x9aa0a6, {});
    const g = b.g();
    F.box(0, 0.72, 0, 0.62, 0.42, 0.5, 'plastic', 0xe5e7eb, { group: g, cat: 'Électronique' });
    F.box(0, 1.14, 0.05, 0.5, 0.06, 0.35, 'plastic', 0x374151, { group: g, cat: 'Électronique' });
    F.box(0.1, 1.14, -0.02, 0.2, 0.06, 0.1, 'screen', 0x6ee7b7, { group: g, cat: 'Électronique', vary: 0 });
    F.box(0, 1.2, 0.05, 0.3, 0.05, 0.25, 'paper', 0xffffff, { cat: 'Paperasse' });
  }
  for (let i = 0; i < 4; i++) {
    const F = b.f(5.4 + i * 0.55, 9 - 0.32, 2), g = b.g();
    F.box(0, 0, 0, 0.5, 1.32, 0.6, 'metal', 0x6b7280, { group: g, cat: 'Mobilier' });
    for (let k = 0; k < 4; k++) F.box(0, 0.05 + k * 0.32, -0.31, 0.46, 0.28, 0.02, 'metal', 0x7d8591, { group: g, cat: 'Mobilier' });
    fillRow(F, 1.32, -0.23, 0.23, 0, 0.35, 'binder', 0.004);
  }
  {
    const F = b.f(-11.6, 1, 3);
    const S = shelfUnit(F, { w: 1.6, h: 0.85, d: 0.35, levels: 2, mat: 'metal', color: 0x9aa0a6 });
    fillShelves(F, S, ['binder'], 0, true);
  }
  plant(b.f(-11.3, 8.4, 0)); plant(b.f(11.3, -3.4, 0)); plant(b.f(1.5, 8.4, 0)); plant(b.f(-5.5, 0.45, 0), false);
  {
    const F = b.f(4, 7.3, 2);
    counter(F, 2.2, 0.7, 1.05, 0x2d6cdf, 'wood', 0xf1efe9);
    monitor(F.sub(0.5, 0.05, 2), 1.05);
    F.cyl(-0.6, 1.05, 0, 0.14, 0.2, 'ceramic', 0xffffff, { cat: 'Déco' });
    officeChair(F.sub(0.3, 0.9, 0));
  }
  for (const x of [-10, -6, -2, 2, 6, 10]) for (const z of [-6, -2.5, 1.5, 5.5]) {
    const lit = (x === -6 || x === 2) && (z === -2.5 || z === 5.5) || (x === 10 && z === -6);
    panel(b, x, z, H, lit ? { i: 13 } : null);
  }

  // ---- étage : la direction et la salle des serveurs
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xece8e0, {
      n: [win(-2, 2), win(4, 8)],
      s: [win(-8, -4), win(4, 8)],
      e: [win(-3, 3)],
      w: [win(2, 6)],
    }, { band: { rows: [0], color: 0x2d3a4a }, frame: 0x2d3a4a });
    {
      const F = b.f(7, -3, 2);
      const h = table(F, { w: 2.4, d: 1.1, h: 0.76, tc: 0x3b2314 });
      monitor(F.sub(-0.5, -0.25, 2), h); monitor(F.sub(0.5, -0.25, 2), h);
      F.box(0, h, 0.2, 0.44, 0.025, 0.14, 'plastic', 0x2b2b2b, { cat: 'Électronique' });
      F.cyl(-1.0, h, 0.2, 0.09, 0.1, 'ceramic', 0xffffff, { cat: 'Vaisselle' });
      F.box(0.9, h, 0.2, 0.3, 0.06, 0.22, 'paper', 0xf6f5f0, { cat: 'Paperasse' });
      F.cyl(0.95, h, -0.3, 0.07, 0.25, 'bottle', 0xb45309, { cat: 'Bouteilles' });
      officeChair(F.sub(0, 0.75, 0), 0x111111);
      for (const lx of [-0.6, 0.6]) chair(F.sub(lx, -0.95, 2), 0x3b2314, 0x7a1f1f);
      bookshelf(b.f(10.2, -9 + 0.17, 2), 2.4, 2.2);
    }
    sofa(b.f(8, 4.6, 0), 0x111111, 2.4);
    {
      const F = b.f(8, 3.2, 0), g = b.g();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.5, 0, sz * 0.25, 0.04, 0.38, 0.04, 'metal', 0x222222, { group: g });
      F.box(0, 0.38, 0, 1.1, 0.02, 0.6, 'glass', 0xcfe8ff, { group: g, cat: 'Vitres', vary: 0 });
      F.cyl(0.2, 0.4, 0, 0.12, 0.28, 'bottle', 0xb45309, { cat: 'Bouteilles' });
      for (let i = 0; i < 3; i++) F.cyl(-0.2 + i * 0.1, 0.4, 0.1, 0.07, 0.09, 'glass', 0xe0f2ff, { cat: 'Vaisselle', vary: 0 });
    }
    {
      const S = shelfUnit(b.f(11.8, -6.5, 1), { w: 1.6, h: 1.8, d: 0.35, levels: 4, color: 0x1f1f1f });
      fillShelves(b.f(11.8, -6.5, 1), S, ['liquor', 'glasses'], 0, true);
    }
    for (const z of [3.8, 6.4]) for (const x of [-10.2, -9.5, -8.8, -8.1, -7.4]) serverRack(b.f(x, z, z < 5 ? 0 : 2));
    {
      const T = b.f(-3, -1.5, 0);
      const h = table(T, { w: 2.4, d: 1.1, h: 0.75, tc: 0xf1efe9, lm: 'metal', lc: 0x777777 });
      for (const lx of [-0.6, 0.6]) { officeChair(T.sub(lx, -0.9, 2), 0x2d6cdf); officeChair(T.sub(lx, 0.9, 0), 0x2d6cdf); F_papers(T, lx, h); }
    }
    {
      const F = b.f(-11.5, -2.5, 1), g = b.g();
      F.box(0, 0, 0, 0.32, 1.0, 0.32, 'plastic', 0xf0f0f0, { group: g, cat: 'Électroménager' });
      F.cyl(0, 1.0, 0, 0.28, 0.45, 'bottle', 0x7ec8f0, { group: g, cat: 'Bouteilles' });
    }
    plant(b.f(11.3, 8.3, 0)); plant(b.f(3.5, -8.4, 0)); plant(b.f(-2, 8.4, 0), false);
    frame(b.f(0, 9 - 0.02, 0), 1.2, 1.4, 0.9, 0x2d6cdf);
    for (const [x, z, lit] of [[-8, -2, false], [-8, 5, true], [-2, 2, true], [4, -5, false], [7, -3, true], [7, 4, false]])
      panel(b, x, z, H2, lit ? { i: 13 } : null);
    roof(b, W, D, H2, 0xeeeeea);
  });
  return { spawn: { x: 0, z: 7.8, yaw: 0 }, cam: { x: -10.8, y: 2.5, z: 8, tx: 1, ty: 0.8, tz: -2 } };
}
function F_papers(T, lx, h) { T.box(lx, h, -0.3, 0.21, 0.02, 0.3, 'paper', 0xffffff, { cat: 'Paperasse', vary: 0 }); }
function tvWall(b, x, zWall, y, w, side) {
  const g = b.g(), hgt = w * 0.56, o = { group: g, mount: true, cat: 'Électronique' };
  const z = side === 'n' ? zWall + 0.03 : zWall - 0.03;
  b.box(x, y, z, w, hgt, 0.06, 'plastic', 0x0d0d0d, o);
  b.box(x, y + 0.03, z + (side === 'n' ? 0.035 : -0.035), w - 0.06, hgt - 0.06, 0.01, 'screen', 0x2a4a70, { ...o, vary: 0 });
}

// ------------------------------------------------------------------ MAISON
function buildHouse(b) {
  const W = 18, D = 14, H = 2.8, H2 = 2.8;
  perimeter(b, W, D, H, 0xeadfc6, {
    s: [door(-6.6, -5.6, 2.0, 0x6b3e1f), win(-4, -1.4, 0.8, 2.0), win(3.5, 6.5, 0.8, 2.0)],
    w: [win(-2, 1.5, 0.8, 2.0)],
    e: [win(-3.5, -1.5, 0.8, 2.0), win(2, 4, 0.8, 2.0)],
    n: [win(-7.5, -5.5, 0.8, 2.0), win(5, 6.2, 1.2, 2.0)],
  }, { band: { rows: [0], color: 0x7a5a3a }, frame: 0xf5f5f0 });
  brickWall(b, 'z', 2.2, -4.8, 7, H, 0.12, 0xdfe7da, [{ a0: -2, a1: -0.8, y0: 0, y1: 2.0 }, { a0: 2.4, a1: 4.4, y0: 0.8, y1: 2.0 }]);
  const up = upstairs(b, W, D, H, { i0: 8, ceil: 0xf7f1e5, floor: 0x8f6234, stair: 0x6b3e1f, rail: 0xf5f5f0 });

  // salon
  b.box(-4, 0, 0.5, 3.4, 0.015, 2.6, 'fabric', 0x8d3b2f, { cat: 'Déco', vary: 0 });
  sofa(b.f(-4, 2.7, 0), 0x3d5a80, 2.4);
  {
    const F = b.f(-4, 0.6, 0), g = b.g();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.5, 0.015, sz * 0.25, 0.04, 0.38, 0.04, 'metal', 0x222222, { group: g });
    F.box(0, 0.395, 0, 1.1, 0.02, 0.6, 'glass', 0xcfe8ff, { group: g, cat: 'Vitres', vary: 0 });
    F.cyl(-0.3, 0.415, 0, 0.14, 0.3, 'ceramic', 0x2a9d8f, { cat: 'Déco' });
    F.box(0.2, 0.415, 0.05, 0.3, 0.03, 0.22, 'paper', 0xe63946, { cat: 'Paperasse' });
  }
  {
    const F = b.f(-4, -6.7, 2), g = b.g();
    F.box(0, 0, 0, 1.8, 0.5, 0.45, 'wood', 0x2b2b2b, { group: g, cat: 'Mobilier' });
    tv(F, 0.5, 1.4);
    F.box(0.82, 0.5, 0.05, 0.14, 0.9, 0.14, 'plastic', 0x1a1a1a, { cat: 'Électronique' });
    F.box(-0.82, 0.5, 0.05, 0.14, 0.9, 0.14, 'plastic', 0x1a1a1a, { cat: 'Électronique' });
  }
  bookshelf(b.f(-8.8, -4, 3), 1.5, 2.1);
  bookshelf(b.f(-8.8, 4.5, 3), 1.2, 2.1);
  sofa(b.f(-7.2, 0.6, 3), 0x7a4b3a, 1.0);
  b.light(-7.7, 1.6, 2.8, 0xffc27a, 5, 7, floorLamp(b.f(-7.7, 2.8, 0)));
  plant(b.f(-8.3, 6.3, 0), false); plant(b.f(1.5, -4.2, 0));
  frame(b.f(-8.2, -7 + 0.02, 2), 1.3, 0.8, 0.6, 0x6d597a);
  frame(b.f(-2.5, -7 + 0.02, 2), 1.2, 0.7, 0.9, 0xe9c46a);
  frame(b.f(2.2 - 0.06 - 0.02, 5.8, 1), 1.4, 0.6, 0.5, 0x264653);
  {
    const F = b.f(1.6, -3.3, 1), g = b.g();
    F.box(0, 0, 0, 0.5, 1.9, 0.3, 'wood', 0x5c3317, { group: g, cat: 'Mobilier' });
    F.box(0, 1.35, -0.16, 0.34, 0.34, 0.02, 'glass', 0xfff7e0, { group: g, cat: 'Vitres', vary: 0 });
    F.box(0, 0.4, -0.16, 0.2, 0.7, 0.02, 'glass', 0xd4af37, { group: g, cat: 'Vitres', vary: 0 });
  }
  // salle à manger
  {
    const F = b.f(6, 2.5, 0);
    const h = table(F, { w: 1.8, d: 0.95, h: 0.76, tc: 0x7a4a24 });
    for (const lx of [-0.5, 0.5]) {
      chair(F.sub(lx, -0.75, 2), 0x7a4a24, 0xe9d8a6); chair(F.sub(lx, 0.75, 0), 0x7a4a24, 0xe9d8a6);
      for (const lz of [-0.28, 0.28]) {
        F.cyl(lx, h, lz, 0.26, 0.02, 'ceramic', 0xffffff, { cat: 'Vaisselle', vary: 0.01 });
        F.cyl(lx + 0.2, h, lz * 0.55, 0.07, 0.13, 'glass', 0xe0f2ff, { cat: 'Vaisselle', vary: 0 });
      }
    }
    F.cyl(0, h, 0, 0.32, 0.06, 'ceramic', 0xd4a373, { cat: 'Vaisselle' });
    for (let i = 0; i < 5; i++) F.box(rr(-0.08, 0.08), h + 0.06, rr(-0.08, 0.08), 0.08, 0.08, 0.08, 'food', pick(PAL.fruit), { cat: 'Déco', shape: 'cyl' });
    F.cyl(-0.8, h, 0, 0.08, 0.3, 'bottle', pick(PAL.wine), { cat: 'Bouteilles' });
  }
  // cuisine
  for (let i = 0; i < 7; i++) {
    const F = b.f(3.95 + i * 0.6, -7 + 0.3, 2);
    if (i === 2) {
      const g = b.g();
      F.box(0, 0, 0.02, 0.6, 0.86, 0.56, 'metal', 0xd9d9d9, { group: g, cat: 'Électroménager' });
      F.box(0, 0.15, -0.265, 0.5, 0.45, 0.02, 'screen', 0x151515, { group: g, cat: 'Électroménager', vary: 0 });
      F.box(0, 0.86, 0, 0.6, 0.04, 0.6, 'metal', 0x1a1a1a, { group: g, cat: 'Électroménager' });
      F.cyl(-0.12, 0.9, 0.05, 0.22, 0.16, 'metal', 0x9aa0a6, { cat: 'Vaisselle' });
    } else if (i === 4) counter(F, 0.6, 0.6, 0.9, 0xf5f5f0, 'metal', 0xc8ccd0);
    else {
      counter(F, 0.6, 0.6, 0.9, 0xf5f5f0, 'stone', 0x3a3a3a);
      if (i === 0) fillRow(F, 0.9, -0.28, 0.28, 0.05, 0.4, 'plates');
      if (i === 1) { const gm = b.g(); F.box(0, 0.9, 0.05, 0.5, 0.3, 0.36, 'metal', 0x2b2b2b, { group: gm, cat: 'Électroménager' }); F.box(0.06, 0.94, -0.135, 0.3, 0.22, 0.01, 'screen', 0x202020, { group: gm, cat: 'Électroménager', vary: 0 }); }
      if (i === 3) F.cyl(0, 0.9, 0.05, 0.16, 0.24, 'metal', 0xe63946, { cat: 'Électroménager' });
      if (i === 5 || i === 6) fillRow(F, 0.9, -0.25, 0.25, 0.1, 0.4, 'jar');
    }
  }
  for (const x of [3.95, 4.55, 6.95, 7.55]) {
    const g = b.g();
    b.box(x, 1.5, -7 + 0.18, 0.58, 0.7, 0.34, 'wood', 0xf5f5f0, { group: g, mount: true, cat: 'Mobilier' });
    b.box(x + 0.2, 1.55, -7 + 0.365, 0.03, 0.14, 0.03, 'metal', 0x999999, { group: g, mount: true, cat: 'Mobilier' });
  }
  fridge(b.f(8.5, -7 + 0.37, 2));
  plant(b.f(8.4, 6.3, 0));
  {
    const S = b.f(-7.8, 6.6, 2), g = b.g();
    S.box(0, 0, 0, 1.0, 0.45, 0.35, 'wood', 0x5c3317, { group: g });
    for (let i = 0; i < 4; i++) S.box(-0.35 + i * 0.23, 0.45, 0, 0.12, 0.1, 0.28, 'fabric', pick([0x111111, 0x7f1d1d, 0x1e3a8a]), { cat: 'Déco' });
  }
  pendant(b, -4, 0.6, H, 0.5, { i: 9 }, 0xe9d8a6);
  pendant(b, -4, -3.8, H, 0.5, { i: 7 }, 0xe9d8a6);
  pendant(b, 6, 2.5, H, 0.6, { i: 9 }, 0x2a9d8f);
  pendant(b, 5.8, -4.3, H, 0.5, { i: 8 }, 0xe9d8a6);

  // ---- étage : chambres et salle de bains
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xe9e4f0, {
      s: [win(-7, -5, 0.8, 2.0), win(-1, 1, 0.8, 2.0), win(5, 7, 0.8, 2.0)],
      n: [win(-7, -5, 0.8, 2.0)],
      w: [win(-2, 1, 0.8, 2.0)],
      e: [win(-1, 1, 0.8, 2.0), win(3, 5, 0.8, 2.0)],
    }, { band: { rows: [0], color: 0x7a5a3a }, frame: 0xf5f5f0 });
    brickWall(b, 'z', 4, -4.5, 7, H2, 0.12, 0xdde8f0, [{ a0: 0.2, a1: 1.2, y0: 0, y1: 2.0 }]);
    brickWall(b, 'x', 0, 4.06, 9, H2, 0.12, 0xf0e6d2, [{ a0: 5, a1: 6, y0: 0, y1: 2.0 }]);
    // chambre parentale
    b.box(-5, 0, 0.8, 3.2, 0.015, 2.4, 'fabric', 0x6d597a, { cat: 'Déco', vary: 0 });
    bed(b.f(-7.5, -0.6, 3), { duvet: 0x7a1f1f });
    const l1 = nightstand(b.f(-8.5, -1.95, 3), true);
    nightstand(b.f(-8.5, 0.75, 3), true);
    b.light(-8.5, 1.0, -1.95, 0xffc27a, 4, 6, l1);
    wardrobe(b.f(-4.2, -7 + 0.3, 2));
    dresser(b.f(-8.7, 4.8, 3));
    desk(b.f(-1.2, 5.8, 2));
    bookshelf(b.f(-2.6, -7 + 0.17, 2), 1.2, 2.0);
    plant(b.f(-8.3, 6.3, 0), false);
    frame(b.f(-3, 7 - 0.02, 0), 1.2, 1.0, 0.7, 0x2a9d8f);
    // salle de bains
    bathtub(b.f(7.4, -6.2, 0));
    toilet(b.f(8.6, -2.3, 1));
    washbasin(b.f(8.7, -3.8, 1));
    wallMirrorX(b, 9, 1.1, -3.8, 0.6, 0.8, 'e');
    {
      const S = shelfUnit(b.f(5, -0.3, 0), { w: 1.2, h: 1.6, d: 0.35, levels: 4, color: 0xf5f5f0 });
      fillShelves(b.f(5, -0.3, 0), S, ['jar', 'water', 'pack'], 0, false);
    }
    // chambre d'enfant
    bed(b.f(7.9, 4.6, 1), { w: 0.95, duvet: 0xf4a261 });
    {
      const F = b.f(5.2, 6.5, 0), g = b.g();
      F.box(0, 0, 0, 0.9, 0.5, 0.5, 'wood', 0xe63946, { group: g, cat: 'Mobilier' });
      for (let i = 0; i < 4; i++) F.box(-0.3 + i * 0.2, 0.5, rr(-0.1, 0.1), 0.14, 0.14, 0.14, 'plastic', pick(PAL.pack), { cat: 'Déco' });
    }
    {
      const S = shelfUnit(b.f(4.5, 3, 3), { w: 1.2, h: 1.4, d: 0.3, levels: 3, color: 0xf5f5f0 });
      fillShelves(b.f(4.5, 3, 3), S, ['book', 'book', 'pack'], 0, false);
    }
    pendant(b, -5, -0.6, H2, 0.45, { i: 8 }, 0xe9d8a6);
    pendant(b, 6.5, -3.5, H2, 0.45, { i: 7 }, 0xffffff);
    pendant(b, 6.5, 3.5, H2, 0.45, { i: 7 }, 0xf4a261);
    roof(b, W, D, H2, 0xf7f1e5);
  });
  return { spawn: { x: -6.1, z: 5.6, yaw: 0.35 }, cam: { x: -8.2, y: 2.2, z: 6.2, tx: 1, ty: 0.7, tz: -2 } };
}

// ------------------------------------------------------------------ BANQUE
const STEEL = 0x858c95, CASH = 0x5e8c4a, GOLD = 0xd4af37;
function cashStack(F, x, y, z, n = 3) {
  for (let i = 0; i < n; i++) F.box(x, y + i * 0.03, z, 0.16, 0.03, 0.07, 'paper', CASH, { cat: 'Billets', vary: 0.04 });
}
function atm(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.box(0, 0, 0, 0.8, 1.75, 0.6, 'metal', 0x2d3748, o);
  F.box(0, 1.0, -0.305, 0.42, 0.32, 0.01, 'screen', 0x4ade80, { ...o, vary: 0 });
  F.box(0, 0.86, -0.4, 0.34, 0.03, 0.2, 'plastic', 0x9aa0a6, o);
  F.box(0.25, 1.1, -0.31, 0.12, 0.03, 0.02, 'plastic', 0x111111, o);
  F.box(0, 1.52, -0.305, 0.7, 0.18, 0.01, 'plastic', 0xd62828, o);
}
function queuePosts(b, x0, x1, z) {
  const g = b.g(), n = Math.max(2, Math.round((x1 - x0) / 1.0)), o = { group: g, cat: 'Mobilier' };
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n;
    b.box(x, 0, z, 0.3, 0.03, 0.3, 'metal', 0xc9a227, { ...o, shape: 'cyl' });
    b.box(x, 0.03, z, 0.06, 0.95, 0.06, 'metal', 0xc9a227, { ...o, shape: 'cyl' });
    if (i < n) b.box(x + (x1 - x0) / n / 2, 0.84, z, (x1 - x0) / n - 0.06, 0.05, 0.05, 'fabric', 0x8b1a1a, o);
  }
}
function tellerCounter(F, n) {
  const w = n * 1.15;
  counter(F, w, 0.75, 1.05, 0x3b2a1f, 'stone', 0x2b2b2b);
  const g = F.b.g();
  for (let i = 0; i <= n; i++) F.box(-w / 2 + i * 1.15, 1.05, 0.08, 0.05, 1.1, 0.05, 'metal', 0xc9a227, { group: g, cat: 'Mobilier' });
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + 1.15 * (i + 0.5);
    // vitre blindée des guichets
    F.box(lx, 1.2, 0.08, 1.08, 0.95, 0.025, 'glass', 0xcfe8ff, { group: g, cat: 'Vitres', vary: 0, hp: 60 });
    F.box(lx, 1.05, 0.08, 1.08, 0.15, 0.05, 'metal', 0xc9a227, { group: g, cat: 'Mobilier' });
    monitor(F.sub(lx + 0.25, -0.18, 0), 1.05);
    cashStack(F, lx - 0.3, 1.05, -0.2, 2 + ((R() * 3) | 0));
    cashStack(F, lx - 0.3, 1.05, -0.08, 1 + ((R() * 3) | 0));
    officeChair(F.sub(lx, -0.95, 2), 0x1f2937);
    F.box(lx + 0.35, 1.05, 0.28, 0.2, 0.01, 0.12, 'paper', 0xffffff, { cat: 'Paperasse', vary: 0 });
  }
}
function vault(b) {
  // boîte d'acier : x -4.6..4.6, z -8.8..-4.0, murs de 40 cm, hauteur 2.8
  const o = { mat: 'steel', cat: 'Coffre', vary: 0.02 }, T = 0.4, VH = 2.8;
  brickWall(b, 'x', -4.2, -4.6, 4.6, VH, T, STEEL, [{ a0: -1.2, a1: 1.2, y0: 0, y1: 2.4 }], o);
  brickWall(b, 'x', -8.6, -4.6, 4.6, VH, T, STEEL, [], o);
  brickWall(b, 'z', -4.4, -8.4, -4.4, VH, T, STEEL, [], o);
  brickWall(b, 'z', 4.4, -8.4, -4.4, VH, T, STEEL, [], o);
  const gc = b.g();
  for (let i = 0; i < 10; i++) for (let k = 0; k < 5; k++)
    b.box(-4.6 + 0.92 * (i + 0.5), VH, -8.8 + 0.96 * (k + 0.5), 0.92, 0.3, 0.96, 'steel', STEEL, { group: gc, cat: 'Coffre', vary: 0.02 });
  // la porte : d'un seul bloc, blindée, et elle le sait
  const gd = b.g();
  b.box(0, 0, -4.2, 2.4, 2.4, 0.46, 'steel', 0x8a9099, { group: gd, mount: true, noSplit: true, hp: 3000, label: 'vault', value: 30000, cat: 'Coffre', vary: 0 });
  b.box(0, 0.15, -3.94, 2.1, 2.1, 0.06, 'metal', 0xb9bec6, { group: gd, shape: 'disc', cat: 'Coffre', vary: 0 });
  b.box(0, 0.8, -3.87, 0.8, 0.8, 0.08, 'metal', 0xd4d8de, { group: gd, shape: 'disc', cat: 'Coffre', vary: 0 });
  b.box(0, 1.15, -3.82, 0.9, 0.07, 0.06, 'metal', 0xc9a227, { group: gd, cat: 'Coffre' });
  b.box(0, 0.75, -3.82, 0.07, 0.9, 0.06, 'metal', 0xc9a227, { group: gd, cat: 'Coffre' });
  b.box(0, 1.1, -3.79, 0.2, 0.2, 0.06, 'metal', 0x2b2b2b, { group: gd, shape: 'disc', cat: 'Coffre' });
  for (const [x, y] of [[-0.85, 0.3], [0.85, 0.3], [-0.85, 2.0], [0.85, 2.0]]) b.box(x, y, -3.93, 0.12, 0.12, 0.08, 'metal', 0x9aa0a6, { group: gd, shape: 'disc', cat: 'Coffre' });

  // le trésor
  b.box(0, 0, -6.6, 1.3, 0.14, 0.9, 'wood', 0x8a6a40, {});
  for (let L = 0; L < 4; L++) {
    const nx = 4 - L, nz = 5 - L;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
      b.box((i - (nx - 1) / 2) * 0.27, 0.14 + L * 0.07, -6.6 + (k - (nz - 1) / 2) * 0.14, 0.25, 0.07, 0.12, 'metal', GOLD, { cat: 'Lingots', vary: 0.03 });
  }
  for (const x of [-2.8, 2.8]) {
    const F = b.f(x, -6.3, 1);
    const h = table(F, { w: 1.6, d: 0.8, h: 0.8, top: 'metal', tc: 0x9aa0a6, lm: 'metal', lc: 0x6b7280 });
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) cashStack(F, -0.6 + i * 0.3, h, -0.2 + k * 0.2, 2 + ((R() * 4) | 0));
  }
  for (const x of [-2.2, 2.2]) {
    const g = b.g(), o = { group: g, cat: 'Coffre' };
    b.box(x, 0, -8.18, 3.4, 2.2, 0.44, 'metal', 0x7d848d, { ...o, noSplit: true });
    for (let i = 0; i < 8; i++) for (let k = 0; k < 5; k++)
      b.box(x - 1.6 + 0.4 * (i + 0.5), 0.1 + k * 0.42, -7.945, 0.37, 0.38, 0.03, 'metal', 0xb0b5bb, { ...o, vary: 0.03 });
  }
  for (const [x, z] of [[-3.8, -5], [-3.75, -5.5], [3.8, -5], [3.8, -5.6], [-3.7, -7.3], [3.7, -7.3]])
    b.box(x, 0, z, 0.36, 0.42, 0.36, 'fabric', 0xc8b48a, { shape: 'cyl', cat: 'Billets' });
  neon(b, 0, -6.4, 1.3, true, VH, { i: 14, d: 8 });
}

function buildBank(b) {
  const W = 22, D = 18, H = 4.0, H2 = 3.2;
  perimeter(b, W, D, H, 0xe8e0d0, {
    s: [win(-9.5, -4, 0.8, 3.2), gdoor(-1.6, 1.6, 3.2), win(4, 9.5, 0.8, 3.2)],
    w: [win(-6.4, -4, 1.2, 3.2), win(4.4, 7.2, 1.2, 3.2)],
    e: [win(-6.4, -4, 1.2, 3.2), win(4.4, 7.2, 1.2, 3.2)],
  }, { band: { rows: [0], color: 0x3a3530 }, frame: 0x3a3530 });
  const up = upstairs(b, W, D, H, { i0: 16, north: false, ceil: 0xf1ece2, floor: 0x5a3a2a, stair: 0x3b2a1f, rail: 0xc9a227 });
  vault(b);

  for (const [x, z] of [[-7.8, -0.8], [7.8, -0.8], [-7.8, 4.2], [7.8, 4.2], [-3, 4.2], [3, 4.2]])
    b.box(x, 0, z, 0.6, H, 0.6, 'stone', 0xece6da, { cat: 'Murs', structural: true, vary: 0.01 });
  tellerCounter(b.f(-7.2, -2.6, 0), 4);
  tellerCounter(b.f(7.2, -2.6, 0), 4);
  queuePosts(b, -9, -5, 0.8);
  queuePosts(b, 4.5, 7.2, 0.8);
  queuePosts(b, -1.2, 1.2, -1.6);
  for (const z of [-1.5, -0.3, 0.9, 2.1]) atm(b.f(-10.65, z, 3));
  {
    const F = b.f(0, 2.4, 0);
    counter(F, 2.2, 0.8, 1.05, 0x3b2a1f, 'stone', 0x2b2b2b);
    monitor(F.sub(0.5, 0.15, 0), 1.05);
    F.box(-0.5, 1.05, 0, 0.3, 0.12, 0.2, 'plastic', 0x1a1a1a, { cat: 'Électronique' });
    for (let i = 0; i < 4; i++) F.box(-0.8 + i * 0.12, 1.05, -0.25, 0.1, 0.25, 0.02, 'paper', pick(PAL.binder), { cat: 'Paperasse' });
    officeChair(F.sub(0, -0.75, 2));
  }
  for (const z of [0.5, 3]) {
    desk(b.f(9.5, z, 1));
    chair(b.f(8.3, z - 0.3, 3), 0x3b2a1f, 0x1f3d5a); chair(b.f(8.3, z + 0.35, 3), 0x3b2a1f, 0x1f3d5a);
  }
  for (const x of [-6, 6]) {
    sofa(b.f(x, 6.1, 0), 0x1f3d5a, 2.2);
    const F = b.f(x, 4.9, 0), g = b.g();
    F.box(0, 0, 0, 0.9, 0.42, 0.5, 'wood', 0x3b2a1f, { group: g });
    F.box(-0.2, 0.42, 0, 0.21, 0.02, 0.3, 'paper', 0xd62828, { cat: 'Paperasse' });
    F.box(0.15, 0.42, 0.05, 0.21, 0.02, 0.3, 'paper', 0x1f3d5a, { cat: 'Paperasse' });
  }
  {
    const S = shelfUnit(b.f(-10.75, 6, 3), { w: 1.4, h: 1.5, d: 0.3, levels: 3, color: 0x3b2a1f });
    for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) b.f(-10.75, 6, 3).box(S.x0 + 0.12 + k * 0.26, S.tops[i], 0, 0.22, 0.3, 0.03, 'paper', pick([0x1f3d5a, 0xc9a227, 0xffffff]), { cat: 'Paperasse' });
  }
  plant(b.f(-10.3, 8.3, 0)); plant(b.f(10.3, 8.3, 0)); plant(b.f(-10.3, -8.3, 0)); plant(b.f(10.3, -8.3, 0));
  plant(b.f(-2.2, -3.4, 0), false); plant(b.f(2.2, -3.4, 0), false);
  frame(b.f(-8, -9 + 0.02, 2), 2.6, 0.7, 0.7, 0xf5f5f0);
  frame(b.f(8, -9 + 0.02, 2), 2.2, 1.6, 1.1, 0x1f3d5a);
  for (const [x, z] of [[-10.5, -8.5], [10.5, -8.5], [-10.5, 8.5], [10.5, 8.5], [0, -2.8]])
    b.box(x, H - 0.16, z, 0.14, 0.16, 0.14, 'plastic', 0x1a1a1a, { hang: true, cat: 'Électronique' });
  chandelier(b, -5, 2.5, H, { i: 20 });
  chandelier(b, 5, 2.5, H, { i: 20 });
  chandelier(b, 0, 6, H, null);
  for (const x of [-7.2, 7.2]) pendant(b, x, -2.6, H, 1.2, x < 0 ? { i: 10 } : null, 0xc9a227);

  // ---- étage : direction et salle de comptage
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xe8e0d0, {
      s: [win(-9, -5), win(-2, 2), win(4, 8)],
      n: [win(-6, -2), win(2, 6)],
      e: [win(-3, 3)],
      w: [win(-3, 3)],
    }, { band: { rows: [0], color: 0x3a3530 }, frame: 0x3a3530 });
    {
      const F = b.f(6.5, -5, 2);
      const h = table(F, { w: 2.4, d: 1.1, h: 0.76, tc: 0x3b2314 });
      monitor(F.sub(-0.4, -0.25, 2), h);
      F.cyl(0.9, h, -0.3, 0.07, 0.25, 'bottle', 0xb45309, { cat: 'Bouteilles' });
      cashStack(F, 0.4, h, 0.2, 4);
      officeChair(F.sub(0, 0.75, 0), 0x111111);
      for (const lx of [-0.6, 0.6]) chair(F.sub(lx, -0.95, 2), 0x3b2314, 0x1f3d5a);
      bookshelf(b.f(8.5, -9 + 0.17, 2), 2.4, 2.2);
    }
    for (const z of [-5.5, -2.8]) {
      const F = b.f(-6, z, 0);
      const h = table(F, { w: 2.2, d: 0.9, h: 0.78, tc: 0xf1efe9, lm: 'metal', lc: 0x777777 });
      for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) cashStack(F, -0.9 + i * 0.25, h, -0.25 + k * 0.2, 1 + ((R() * 4) | 0));
      const g = b.g();
      F.box(0.7, h, 0.2, 0.3, 0.2, 0.28, 'plastic', 0xd1d5db, { group: g, cat: 'Électronique' });
      F.box(0.7, h + 0.2, 0.08, 0.16, 0.06, 0.02, 'screen', 0x4ade80, { group: g, cat: 'Électronique', vary: 0 });
      officeChair(F.sub(0, 0.75, 0)); officeChair(F.sub(-0.6, -0.75, 2));
    }
    {
      const g = b.g();
      b.box(-10.55, 0, -7.6, 0.8, 1.3, 0.8, 'steel', STEEL, { group: g, hp: 700, cat: 'Coffre', noSplit: true });
      b.box(-10.13, 0.55, -7.6, 0.04, 0.2, 0.2, 'metal', GOLD, { group: g, cat: 'Coffre' });
    }
    {
      const T = b.f(0, 3, 0);
      const h = table(T, { w: 3.2, d: 1.2, h: 0.75, tc: 0x2b2b2b, lm: 'metal', lc: 0x777777 });
      for (const lx of [-1, 0, 1]) { officeChair(T.sub(lx, -0.95, 2), 0x1f3d5a); officeChair(T.sub(lx, 0.95, 0), 0x1f3d5a); F_papers(T, lx, h); }
    }
    {
      const F = b.f(-10.7, 5.5, 3);
      const S = shelfUnit(F, { w: 2.4, h: 2.2, d: 0.35, levels: 5, mat: 'metal', color: 0x9aa0a6 });
      fillShelves(F, S, ['binder'], 0, false);
    }
    {
      const F = b.f(10.6, 2, 1), g = b.g();
      F.box(0, 0, 0, 0.32, 1.0, 0.32, 'plastic', 0xf0f0f0, { group: g, cat: 'Électroménager' });
      F.cyl(0, 1.0, 0, 0.28, 0.45, 'bottle', 0x7ec8f0, { group: g, cat: 'Bouteilles' });
    }
    plant(b.f(10.3, 5.5, 0)); plant(b.f(-3.5, -8.3, 0)); plant(b.f(3, 8.3, 0), false);
    frame(b.f(0, -9 + 0.02, 2), 1.3, 1.4, 1.0, 0xc9a227);
    for (const [x, z, lit] of [[-6, -4, true], [6, -5, true], [0, 3, true], [-6, 4, false], [6, 3, false]])
      panel(b, x, z, H2, lit ? { i: 13 } : null);
    roof(b, W, D, H2, 0xf1ece2);
  });
  return { spawn: { x: 0, z: 7.6, yaw: 0 }, cam: { x: -8.6, y: 3.0, z: 7.4, tx: 1.5, ty: 1.2, tz: -3.8 }, steelFloor: [{ x0: -4.6, x1: 4.6, z0: -8.8, z1: -4.0 }] };
}

// ------------------------------------------------------------------ CINÉMA
const VELVET = 0x9b1b30;
// l'image projetée : un coucher de soleil de western, en gros pixels lumineux
function movieScreen(b, zWall, x0, y0, cols, rows, px) {
  const g = b.g(), c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
    const ridge = 0.34 + 0.1 * Math.sin(u * 8.5 + 1) + 0.05 * Math.sin(u * 23);
    if (v < 0.22) c.set(0x9a4a22).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06);
    else if (v < ridge) c.set(0x3b1f4a);
    else {
      c.set(0xffb347).lerp(c2.set(0x5b2a86), Math.min(1, (v - 0.3) / 0.7));
      const du = (u - 0.68) * cols, dv = (v - 0.46) * rows;
      if (du * du + dv * dv < 2.8) c.set(0xfff3b0);
    }
    // un cactus, bien sûr
    if ((i === 5 && j >= 1 && j <= 4) || (i === 4 && (j === 3 || j === 4)) || (i === 6 && (j === 2 || j === 3))) c.set(0x1f3d1a);
    b.box(x0 + px * (i + 0.5), y0 + px * j, zWall + 0.03, px, px, 0.04, 'movie', c.getHex(), { group: g, mount: true, cat: 'Électronique', vary: 0, noSplit: true, value: 180 });
  }
  // cadre noir autour de la toile
  const w = cols * px, h = rows * px, o = { group: g, mount: true, cat: 'Mobilier' };
  b.box(x0 + w / 2, y0 - 0.15, zWall + 0.05, w + 0.3, 0.15, 0.08, 'plastic', 0x0c0c0c, o);
  b.box(x0 + w / 2, y0 + h, zWall + 0.05, w + 0.3, 0.15, 0.08, 'plastic', 0x0c0c0c, o);
}
function cinemaSeat(b, x, y, z) {
  const g = b.g();
  b.box(x, y, z, 0.5, 0.32, 0.42, 'plastic', 0x1a1a1a, { group: g, cat: 'Mobilier' });
  b.box(x, y + 0.32, z - 0.03, 0.56, 0.12, 0.48, 'fabric', VELVET, { group: g, cat: 'Mobilier', vary: 0.05 });
  b.box(x, y + 0.32, z + 0.26, 0.56, 0.64, 0.1, 'fabric', VELVET, { group: g, cat: 'Mobilier', vary: 0.05 });
  if (Math.random() < 0.22) {
    b.box(x, y + 0.44, z - 0.05, 0.15, 0.2, 0.15, 'paper', 0xd62828, { cat: 'Marchandise' });
    b.box(x, y + 0.64, z - 0.05, 0.14, 0.05, 0.14, 'food', 0xffe08a, { cat: 'Marchandise' });
  }
}
function curtain(b, xa, xb, z, h) {
  const n = Math.round((xb - xa) / 0.3), w = (xb - xa) / n, g = b.g();
  for (let i = 0; i < n; i++)
    b.box(xa + w * (i + 0.5), 0, z + (i % 2 ? 0.06 : 0), w + 0.01, h, 0.1, 'fabric', i % 2 ? 0x7a1424 : VELVET, { group: g, cat: 'Déco', vary: 0.03 });
}
function standee(F, color) {
  const g = F.b.g();
  F.box(0, 0, 0, 0.5, 0.04, 0.3, 'paper', 0x7a5a3a, { group: g, cat: 'Déco' });
  F.box(0, 0.04, 0, 0.9, 1.8, 0.03, 'paper', color, { group: g, cat: 'Déco' });
  F.box(0, 1.3, -0.02, 0.5, 0.4, 0.01, 'paper', 0xffe08a, { group: g, cat: 'Déco' });
}
function arcade(F, color) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.box(0, 0, 0, 0.7, 1.75, 0.7, 'plastic', color, o);
  F.box(0, 1.05, -0.36, 0.5, 0.4, 0.02, 'screen', 0x4ade80, { ...o, vary: 0 });
  F.box(0, 0.85, -0.45, 0.6, 0.06, 0.25, 'plastic', 0x111111, o);
  F.box(0, 1.55, -0.36, 0.6, 0.16, 0.02, 'neon', 0xffffff, { ...o, vary: 0 });
}
function popcornMachine(F, lx, y) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  F.box(lx, y, 0, 0.7, 0.12, 0.5, 'metal', 0xc0271c, o);
  F.box(lx, y + 0.12, 0, 0.7, 0.7, 0.5, 'glass', 0xfff3c4, { ...o, cat: 'Vitres', vary: 0 });
  F.box(lx, y + 0.82, 0, 0.74, 0.1, 0.54, 'metal', 0xc0271c, o);
  F.box(lx, y + 0.92, 0, 0.5, 0.12, 0.36, 'metal', 0xffc300, o);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) for (let L = 0; L < 2; L++)
    F.box(lx - 0.24 + i * 0.16, y + 0.12 + L * 0.13, -0.16 + k * 0.16, 0.14, 0.13, 0.14, 'food', 0xffe08a, { group: g, cat: 'Marchandise', vary: 0.08 });
}
function platter(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.cyl(0, 0, 0, 0.12, 1.2, 'metal', 0x2b2b2b, o);
  for (const y of [0.45, 0.8, 1.15]) {
    F.cyl(0, y, 0, 0.95, 0.03, 'metal', 0x9aa0a6, o);
    F.cyl(0, y + 0.03, 0, 0.75, 0.05, 'plastic', 0x3a2a1a, { cat: 'Marchandise' });
  }
}
function projector(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électronique' };
  F.box(0, 0, 0, 0.45, 0.8, 0.45, 'metal', 0x2b2f36, o);
  F.box(0, 0.8, 0.05, 0.6, 0.5, 1.0, 'metal', 0x3d4148, o);
  F.box(0, 0.95, -0.5, 0.2, 0.2, 0.12, 'metal', 0x111111, o);
  F.box(0, 0.97, -0.565, 0.16, 0.16, 0.01, 'glass', 0xbfe6ff, { ...o, cat: 'Vitres', vary: 0 });
  F.box(0.2, 1.3, 0.2, 0.08, 0.3, 0.08, 'metal', 0x777777, o);
}

function buildCinema(b) {
  const W = 24, D = 20, H = 5.2, H2 = 3.2;
  perimeter(b, W, D, H, 0x6a3a40, {
    s: [win(-9.5, -5, 0.8, 2.8), gdoor(-1.6, 1.6, 2.8)],
  }, { band: { rows: [0, 6], color: 0xc9a227 }, frame: 0x1a1a1a });
  const up = upstairs(b, W, D, H, { i0: 15, north: false, ceil: 0x2a2226, floor: 0x4a3a3a, stair: 0x2a1a1f, rail: 0xc9a227 });
  // cloison entre le hall et la salle, avec deux entrées latérales
  brickWall(b, 'x', 0, -12, 12, H, 0.2, 0x8a4a52, [{ a0: -11.2, a1: -9.8, y0: 0, y1: 2.4 }, { a0: 9.8, a1: 11.2, y0: 0, y1: 2.4 }], { band: { rows: [0, 6], color: 0xc9a227 } });

  // ---- la salle : gradins, fauteuils, scène, écran
  for (let r = 1; r < 5; r++) {
    const zc = -6.4 + r * 1.2, z0 = zc - 0.6, z1 = r === 4 ? -0.1 : zc + 0.6;
    b.box(0, 0, (z0 + z1) / 2, 19, r * 0.35, z1 - z0, 'fabric', 0x2a1418, { cat: 'Mobilier', vary: 0.02 });
  }
  for (let r = 0; r < 5; r++) for (let i = 0; i < 27; i++) cinemaSeat(b, -8.06 + i * 0.62, r * 0.35, -6.4 + r * 1.2);
  b.box(0, 0, -9.35, 14, 0.5, 1.3, 'wood', 0x2a1a12, { cat: 'Mobilier' });
  movieScreen(b, -10, -6, 1.0, 24, 8, 0.5);
  curtain(b, -8.6, -6.3, -9.85, H - 0.4);
  curtain(b, 6.3, 8.6, -9.85, H - 0.4);
  for (const z of [-7.5, -3.5]) for (const s of [-1, 1])
    b.box(s * 11.88, 2.8, z, 0.2, 0.7, 0.45, 'plastic', 0x111111, { mount: true, cat: 'Électronique' });
  for (const x of [-10.5, 10.5]) b.box(x, 2.6, -0.14, 0.5, 0.2, 0.06, 'plastic', 0x16a34a, { mount: true, cat: 'Déco' });
  b.light(0, 3.2, -7.5, 0xffc98a, 14, 14, null);
  b.light(0, 3.5, -2.5, 0x8a6dd6, 8, 12, null);
  for (const x of [-5, 0, 5]) panel(b, x, -4, H, null);

  // ---- le hall
  {
    const F = b.f(-7.5, 3.2, 0);
    counter(F, 4.5, 0.7, 1.05, 0x2a1a1f, 'stone', 0x1c1c1c);
    for (const lx of [-1.4, 0, 1.4]) {
      monitor(F.sub(lx, -0.15, 0), 1.05);
      F.box(lx + 0.4, 1.05, 0.1, 0.12, 0.08, 0.12, 'paper', 0xfff3c4, { cat: 'Paperasse' });
      officeChair(F.sub(lx, -0.95, 2), VELVET);
    }
  }
  {
    const F = b.f(6.5, 3.2, 0);
    counter(F, 5, 0.75, 1.05, 0x2a1a1f, 'stone', 0x1c1c1c);
    popcornMachine(F, -1.6, 1.05);
    const g = b.g();
    F.box(0.4, 1.05, -0.05, 0.7, 0.55, 0.45, 'metal', 0xc0c0c0, { group: g, cat: 'Électroménager' });
    for (let i = 0; i < 3; i++) F.box(0.2 + i * 0.2, 1.35, -0.29, 0.05, 0.12, 0.04, 'metal', 0x333333, { group: g, cat: 'Électroménager' });
    for (let i = 0; i < 4; i++) for (let L = 0; L < 3; L++) F.cyl(1.3 + i * 0.12, 1.05 + L * 0.13, 0.1, 0.1, 0.13, 'paper', pick([0xd62828, 0x1d4ed8, 0xffffff]), { cat: 'Marchandise' });
    F.box(-0.5, 1.05, 0.15, 0.4, 0.05, 0.3, 'plastic', 0xffc300, { cat: 'Marchandise' });
    const S = shelfUnit(b.f(6.5, 0.1 + 0.18, 2), { w: 4.4, h: 2.0, d: 0.35, levels: 4, color: 0x2a1a1f });
    fillShelves(b.f(6.5, 0.1 + 0.18, 2), S, ['cereal', 'pack', 'can', 'bottle'], 0, false);
  }
  queuePosts(b, -3, 3, 5.2);
  queuePosts(b, -3, 3, 6.4);
  standee(b.f(-5, 7.3, 0), 0x1d4ed8);
  standee(b.f(-2.6, 8.6, 0), 0xd62828);
  standee(b.f(4.2, 6.8, 0), 0x16a34a);
  arcade(b.f(-11.4, 6.3, 3), 0x1d4ed8);
  arcade(b.f(-11.4, 7.3, 3), 0xd62828);
  sofa(b.f(-7.2, 9.4, 0), VELVET, 2.2);
  for (const z of [2.5, 4.5]) frame(b.f(-12 + 0.02, z, 3), 1.1, 1.0, 1.5, pick([0x1d4ed8, 0xd62828, 0xffc300, 0x16a34a]));
  for (const z of [2, 4, 6]) frame(b.f(12 - 0.02, z, 1), 1.1, 1.0, 1.5, pick([0x6d28d9, 0xd62828, 0xffc300, 0x0f766e]));
  plant(b.f(-11.3, 9.3, 0)); plant(b.f(11.3, 1, 0)); plant(b.f(-4.2, 1, 0), false);
  chandelier(b, -3, 5.8, H, { i: 45 });
  chandelier(b, 3, 5.8, H, { i: 45 });
  for (const x of [-7.5, 6.5]) pendant(b, x, 3.2, H, 1.9, { i: 22, c: 0xffe0a0 }, 0xc9a227);

  // ---- étage : cabine de projection et salle du personnel
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0x4a3a3a, {
      s: [win(-9, -5), win(-2, 2)],
      e: [win(-3, 1)],
      w: [win(-3, 1)],
    }, { band: { rows: [0], color: 0x1a1a1a }, frame: 0x1a1a1a });
    for (const x of [-5, 0, 5]) { projector(b.f(x, -1.5, 0)); platter(b.f(x + 1.4, -1.2, 0)); }
    {
      const F = b.f(-10, -6, 3);
      const S = shelfUnit(F, { w: 2.4, h: 2.0, d: 0.45, levels: 4, mat: 'metal', color: 0x6b7280 });
      for (let i = 0; i < S.tops.length - 1; i++) for (let k = 0; k < 5; k++) for (let L = 0; L < 3; L++)
        F.cyl(S.x0 + 0.22 + k * 0.45, S.tops[i] + L * 0.05, 0, 0.38, 0.05, 'metal', 0x9aa0a6, { cat: 'Marchandise' });
    }
    {
      const F = b.f(7.5, -6.5, 0);
      const h = table(F, { w: 1.4, d: 0.8, h: 0.76, tc: 0x3b2314 });
      F.cyl(-0.4, h, 0, 0.09, 0.1, 'ceramic', 0xffffff, { cat: 'Vaisselle' });
      F.box(0.3, h, 0, 0.3, 0.04, 0.22, 'paper', 0xfff3c4, { cat: 'Paperasse' });
      chair(F.sub(0, 0.65, 0), 0x3b2314, VELVET);
    }
    sofa(b.f(-6, 6, 0), 0x3d5a80, 2.2);
    {
      const F = b.f(-6, 4.6, 0), g = b.g();
      F.box(0, 0, 0, 1.0, 0.42, 0.55, 'wood', 0x3b2314, { group: g });
      F.cyl(-0.2, 0.42, 0, 0.08, 0.1, 'ceramic', 0xffffff, { cat: 'Vaisselle' });
      F.box(0.2, 0.42, 0, 0.14, 0.18, 0.14, 'paper', 0xd62828, { cat: 'Marchandise' });
    }
    fridge(b.f(-11.5, 8, 3));
    frame(b.f(5, 10 - 0.02, 0), 1.2, 1.4, 1.0, 0xc9a227);
    plant(b.f(11.3, -9.3, 0)); plant(b.f(-11.3, -9.3, 0), false);
    for (const [x, z, lit] of [[0, -3, true], [-6, 5, true], [6, 4, false], [6, -6, false]]) panel(b, x, z, H2, lit ? { i: 12 } : null);
    roof(b, W, D, H2, 0x2a2226);
  });
  return { spawn: { x: 0, z: 8.7, yaw: 0 }, cam: { x: 7.5, y: 3.8, z: -1.0, tx: -1, ty: 2.4, tz: -9 } };
}

// ------------------------------------------------------------------ HÔTEL DE LUXE
const MARBLE = 0xf0ece4, GOLDEN = 0xc9a227, LEATHER = 0x5a2e1a;
function fountain(b, x, z) {
  const g = b.g(), o = { group: g, cat: 'Déco' };
  b.box(x, 0, z - 1.35, 3, 0.5, 0.3, 'stone', MARBLE, o);
  b.box(x, 0, z + 1.35, 3, 0.5, 0.3, 'stone', MARBLE, o);
  b.box(x - 1.35, 0, z, 0.3, 0.5, 2.4, 'stone', MARBLE, o);
  b.box(x + 1.35, 0, z, 0.3, 0.5, 2.4, 'stone', MARBLE, o);
  b.box(x, 0, z, 2.4, 0.42, 2.4, 'bottle', 0x5fb3d9, { cat: 'Déco', vary: 0, hp: 30 });
  const gc = b.g();
  b.box(x, 0, z, 0.35, 1.72, 0.35, 'stone', MARBLE, { group: gc, shape: 'cyl', cat: 'Déco', noSplit: true });
  b.box(x, 1.72, z, 1.1, 0.15, 1.1, 'stone', MARBLE, { group: gc, shape: 'cyl', cat: 'Déco' });
  b.box(x, 1.87, z, 0.22, 0.32, 0.22, 'metal', GOLDEN, { group: gc, shape: 'cyl', cat: 'Déco' });
}
function grandPiano(F) {
  const g = F.b.g(), k = 0x0c0c0c, o = { group: g, cat: 'Mobilier' };
  for (const [lx, lz] of [[-0.6, -0.75], [0.6, -0.75], [0, 0.8]]) F.cyl(lx, 0, lz, 0.1, 0.68, 'wood', k, o);
  F.box(0, 0.68, 0, 1.5, 0.32, 1.9, 'wood', k, o);
  F.box(0, 1.0, 0.02, 1.45, 0.03, 1.85, 'wood', 0x161616, o);
  F.box(0, 0.72, -1.07, 1.5, 0.06, 0.25, 'wood', k, o);
  F.box(0, 0.78, -1.1, 1.3, 0.025, 0.16, 'plastic', 0xf5f5f0, o);
  for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) F.box(-0.6 + i * 0.09, 0.805, -1.06, 0.02, 0.02, 0.08, 'plastic', 0x111111, o);
  F.box(0, 0, -1.65, 0.85, 0.48, 0.38, 'wood', k, {});
  F.box(0, 1.03, 0.4, 0.45, 0.02, 0.32, 'paper', 0xf2f0e6, { cat: 'Paperasse' });
}
function luggageCart(F) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.42, 0, sz * 0.24, 0.08, 0.1, 0.08, 'plastic', 0x111111, o);
  F.box(0, 0.1, 0, 1.0, 0.05, 0.6, 'metal', GOLDEN, o);
  for (const sx of [-1, 1]) F.cyl(sx * 0.46, 0.15, 0, 0.045, 1.5, 'metal', GOLDEN, o);
  F.box(0, 1.65, 0, 0.97, 0.05, 0.05, 'metal', GOLDEN, o);
  F.box(0, 0.15, 0, 0.75, 0.45, 0.5, 'plastic', 0x6b3e1f, { cat: 'Déco' });
  F.box(0.05, 0.6, 0, 0.62, 0.38, 0.44, 'plastic', 0x8b1a1a, { cat: 'Déco' });
  F.box(-0.05, 0.98, 0, 0.5, 0.3, 0.36, 'plastic', 0x1e3a8a, { cat: 'Déco' });
  F.cyl(0.02, 1.28, 0, 0.3, 0.2, 'fabric', 0xe9d8a6, { cat: 'Déco' });
}
function pedestalVase(F, flower) {
  const g = F.b.g();
  F.cyl(0, 0, 0, 0.45, 1.0, 'stone', MARBLE, { group: g, cat: 'Déco' });
  F.cyl(0, 1.0, 0, 0.26, 0.36, 'ceramic', 0x1e3a8a, { cat: 'Déco' });
  const gf = F.b.g();
  for (let i = 0; i < 6; i++) { const a = i * 1.05; F.box(Math.cos(a) * 0.08, 1.36, Math.sin(a) * 0.08, 0.1, 0.12 + (i % 3) * 0.06, 0.1, 'food', i % 2 ? flower : 0x2d6a4f, { group: gf, cat: 'Déco' }); }
}
function elevator(b, x, zWall) {
  const g = b.g(), o = { group: g, mount: true, cat: 'Mobilier' }, z = zWall + 0.03;
  b.box(x, 0, z, 1.7, 2.7, 0.06, 'metal', GOLDEN, o);
  b.box(x - 0.36, 0.05, z + 0.045, 0.7, 2.5, 0.03, 'metal', 0xb9bec6, o);
  b.box(x + 0.36, 0.05, z + 0.045, 0.7, 2.5, 0.03, 'metal', 0xb9bec6, o);
  b.box(x + 1.05, 1.1, z, 0.14, 0.3, 0.06, 'metal', GOLDEN, o);
  b.box(x + 1.05, 1.15, z + 0.035, 0.06, 0.06, 0.01, 'neon', 0xffffff, { ...o, vary: 0 });
  b.box(x, 2.75, z, 0.8, 0.22, 0.06, 'plastic', 0x111111, o);
}
function wallClock(b, x, y, zWall) {
  const g = b.g(), o = { group: g, mount: true, cat: 'Déco' }, z = zWall + 0.03;
  b.box(x, y, z, 0.6, 0.6, 0.06, 'metal', GOLDEN, { ...o, shape: 'disc' });
  b.box(x, y + 0.04, z + 0.04, 0.52, 0.52, 0.02, 'ceramic', 0xfaf6ea, { ...o, shape: 'disc' });
  b.box(x, y + 0.3, z + 0.055, 0.03, 0.2, 0.01, 'metal', 0x111111, o);
  b.box(x + 0.07, y + 0.29, z + 0.06, 0.15, 0.025, 0.01, 'metal', 0x111111, o);
}
function canopyBed(b, x, z) {
  bed(b.f(x, z, 3), { w: 2.0, duvet: GOLDEN, sheet: 0xfaf6ea, c: 0x3b2314 });
  const g = b.g(), o = { group: g, cat: 'Mobilier' };
  for (const [px, pz] of [[x - 1.02, z - 1.02], [x - 1.02, z + 1.02], [x + 1.02, z - 1.02], [x + 1.02, z + 1.02]]) b.box(px, 0, pz, 0.08, 2.25, 0.08, 'wood', 0x3b2314, { ...o, shape: 'cyl' });
  b.box(x, 2.25, z, 2.14, 0.06, 2.14, 'fabric', 0x7a1f1f, o);
  for (const s of [-1, 1]) b.box(x + s * 1.02, 1.2, z, 0.04, 1.05, 2.0, 'fabric', 0x9b1b30, { group: g, cat: 'Déco' });
}

function buildHotel(b) {
  const W = 24, D = 18, H = 4.8, H2 = 3.2;
  perimeter(b, W, D, H, 0xefe6d2, {
    s: [win(-10, -4, 0.8, 3.6), gdoor(-1.8, 1.8, 3.2), win(4, 10, 0.8, 3.6)],
    e: [win(-5, -1, 0.8, 3.6), win(3, 7, 0.8, 3.6)],
    w: [win(4, 7, 0.8, 3.6)],
  }, { band: { rows: [0, 9], color: GOLDEN }, frame: 0x3b2314 });
  const up = upstairs(b, W, D, H, { i0: 9, ceil: 0xf3ecdc, floor: 0x7a1f1f, stair: 0xefe6d2, rail: GOLDEN });

  // ---- le hall
  for (const [x, z] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) b.box(x, 0, z, 0.6, H, 0.6, 'stone', MARBLE, { cat: 'Murs', structural: true, vary: 0.01 });
  b.box(0, 0, 5.8, 2.2, 0.015, 6.4, 'fabric', 0x9b1b30, { cat: 'Déco', vary: 0 });
  fountain(b, 0, 0.3);
  {
    const F = b.f(-9, -2, 1);
    counter(F, 4, 0.8, 1.1, 0x3b2314, 'stone', MARBLE);
    for (const lx of [-1, 1]) { monitor(F.sub(lx, -0.15, 0), 1.1); officeChair(F.sub(lx, -0.95, 2), LEATHER); }
    F.cyl(0.1, 1.1, 0.25, 0.09, 0.06, 'metal', GOLDEN, { cat: 'Déco' });
    F.box(-0.2, 1.1, 0.2, 0.34, 0.04, 0.24, 'paper', 0x7a1f1f, { cat: 'Paperasse' });
    F.cyl(1.7, 1.1, 0.1, 0.2, 0.3, 'ceramic', 0xffffff, { cat: 'Déco' });
    const g = b.g();
    b.box(-11.97, 1.4, -2, 0.04, 1.0, 2.0, 'wood', 0x3b2314, { group: g, mount: true, cat: 'Mobilier' });
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) b.box(-11.94, 1.55 + k * 0.28, -2.75 + i * 0.3, 0.02, 0.1, 0.04, 'metal', GOLDEN, { group: g, mount: true, cat: 'Déco' });
  }
  b.box(6, 0, 1.5, 4.2, 0.015, 3.4, 'fabric', 0x1f3d5a, { cat: 'Déco', vary: 0 });
  sofa(b.f(6, 3.1, 0), LEATHER, 2.2);
  sofa(b.f(6, -0.1, 2), LEATHER, 2.2);
  sofa(b.f(8.6, 1.5, 1), LEATHER, 1.0);
  {
    const F = b.f(6, 1.5, 0), g = b.g();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.5, 0.015, sz * 0.25, 0.04, 0.38, 0.04, 'metal', GOLDEN, { group: g });
    F.box(0, 0.395, 0, 1.1, 0.02, 0.6, 'glass', 0xcfe8ff, { group: g, cat: 'Vitres', vary: 0 });
    F.cyl(-0.3, 0.415, 0, 0.16, 0.34, 'ceramic', 0xffffff, { cat: 'Déco' });
    F.box(0.2, 0.415, 0.05, 0.3, 0.03, 0.22, 'paper', 0xc9a227, { cat: 'Paperasse' });
  }
  grandPiano(b.f(7.5, -4.5, 0));
  {
    const F = b.f(8.8, 6.9, 2);
    counter(F, 2.8, 0.6, 1.05, 0x3b2314, 'stone', 0x1c1c1c);
    champagneTower(F, 1.05, 4);
    F.cyl(0.95, 1.05, 0, 0.26, 0.24, 'metal', 0xc0c0c0, { cat: 'Vaisselle' });
    F.cyl(0.95, 1.29, 0, 0.08, 0.3, 'bottle', 0x1f3d1a, { cat: 'Bouteilles' });
    F.cyl(-1.0, 1.05, 0, 0.08, 0.31, 'bottle', 0x1f3d1a, { cat: 'Bouteilles' });
  }
  luggageCart(b.f(-5.2, 6, 0));
  pedestalVase(b.f(-2.8, 7.8, 0), 0xe63946);
  pedestalVase(b.f(2.8, 7.8, 0), 0xffb703);
  for (const x of [-7.5, 7.5]) elevator(b, x, -9);
  for (const x of [-10.2, -5, 5, 10.2]) wallClock(b, x, 3.1, -9);
  plant(b.f(-11.2, 8.2, 0)); plant(b.f(11.2, 8.2, 0)); plant(b.f(-11.2, -8.2, 0)); plant(b.f(11.2, -8.2, 0));
  chandelier(b, 0, -3.5, H, { i: 34 });
  chandelier(b, -6, 2, H, { i: 30 });
  chandelier(b, 6, 2, H, { i: 30 });
  chandelier(b, 0, 5.5, H, null);

  // ---- étage : la suite et sa salle de bains
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xf2e9d8, {
      s: [win(-9, -5), win(-2, 2), win(5, 9)],
      e: [win(4, 7)],
      w: [win(-3, 1)],
    }, { band: { rows: [0], color: GOLDEN }, frame: 0x3b2314 });
    brickWall(b, 'z', 2, -6, 9, H2, 0.12, 0xe8dcc4, [{ a0: 0, a1: 1.2, y0: 0, y1: 2.0 }]);
    b.box(-6, 0, 1, 4.2, 0.015, 4.2, 'fabric', 0x6d1f2a, { cat: 'Déco', vary: 0 });
    canopyBed(b, -8.9, 1);
    const l1 = nightstand(b.f(-10.2, -0.55, 3), true);
    nightstand(b.f(-10.2, 2.55, 3), true);
    b.light(-10.2, 1.0, -0.55, 0xffc27a, 5, 7, l1);
    {
      const F = b.f(-4.6, 1, 1), g = b.g();
      F.box(0, 0, 0, 1.8, 0.5, 0.45, 'wood', 0x3b2314, { group: g, cat: 'Mobilier' });
      tv(F, 0.5, 1.4);
    }
    wardrobe(b.f(-7, -9 + 0.3, 2), 0x3b2314);
    wardrobe(b.f(-9, -9 + 0.3, 2), 0x3b2314);
    sofa(b.f(-6, 6.2, 0), 0xe9d8a6, 2.2);
    dresser(b.f(-11.7, 6.3, 3));
    desk(b.f(-1.2, 7.8, 2));
    plant(b.f(0.9, -5, 0));
    // salle de bains et coin salon de l'autre côté de la cloison
    bathtub(b.f(8.5, -6.2, 0));
    bathtub(b.f(8.5, -4.2, 0));
    for (const z of [-1.2, 0.6]) washbasin(b.f(11.4, z, 1));
    wallMirrorX(b, 12, 1.1, -0.3, 2.2, 0.9, 'e');
    toilet(b.f(11.4, 3, 1));
    {
      const F = b.f(3.1, 7.2, 3), g = b.g(), o = { group: g, cat: 'Électroménager' };
      F.box(0, 0, 0.02, 0.55, 0.85, 0.5, 'metal', 0x2b2b2b, o);
      F.box(0, 0.03, -0.25, 0.5, 0.78, 0.02, 'glass', 0xd8f0ff, { group: g, cat: 'Vitres', vary: 0 });
      F.box(0.2, 0.45, -0.275, 0.03, 0.2, 0.03, 'metal', GOLDEN, o);
      F.cyl(-0.1, 0.85, 0, 0.08, 0.3, 'bottle', 0x1f3d1a, { cat: 'Bouteilles' });
      F.cyl(0.1, 0.85, 0, 0.07, 0.12, 'glass', 0xfff3c4, { cat: 'Vaisselle', vary: 0 });
    }
    {
      const F = b.f(5.5, 6.5, 0);
      const h = table(F, { w: 1.0, d: 1.0, h: 0.75, tc: 0x3b2314 });
      F.cyl(0, h, 0, 0.26, 0.24, 'metal', 0xc0c0c0, { cat: 'Vaisselle' });
      F.cyl(0, h + 0.24, 0, 0.08, 0.3, 'bottle', 0x1f3d1a, { cat: 'Bouteilles' });
      for (const lx of [-0.3, 0.3]) F.cyl(lx, h, 0.3, 0.06, 0.16, 'glass', 0xfff3c4, { cat: 'Vaisselle', vary: 0 });
      chair(F.sub(0, 0.7, 0), 0x3b2314, GOLDEN); chair(F.sub(0, -0.7, 2), 0x3b2314, GOLDEN);
    }
    plant(b.f(11.3, 8.3, 0)); plant(b.f(2.8, -5.5, 0), false);
    chandelier(b, -7, 1, H2, { i: 18 });
    pendant(b, 8.5, -5, H2, 0.5, { i: 9 }, 0xffffff);
    pendant(b, 6, 5, H2, 0.5, { i: 8 }, GOLDEN);
    roof(b, W, D, H2, 0xf3ecdc);
  });
  return { spawn: { x: 0, z: 8.4, yaw: 0 }, cam: { x: 9.5, y: 3.4, z: 7.6, tx: -2, ty: 1.3, tz: -3 } };
}

// ------------------------------------------------------------------ GARAGE
const TYRE = 0x161616, LIFT = 0xc0271c;
// voiture dans l'axe local z, capot vers -z ; y0 : bas des roues ; hood false : moteur à l'air
function car(F, color, { y0 = 0, hood = true, glass = true } = {}) {
  const g = F.b.g(), o = { group: g, cat: 'Véhicules' }, part = { group: g, cat: 'Pièces auto' };
  for (const sx of [-1, 1]) for (const lz of [-1.35, 1.35]) {
    F.box(sx * 0.82, y0, lz, 0.2, 0.62, 0.62, 'plastic', TYRE, { ...part, shape: 'wheel', hp: 60 });
    F.box(sx * 0.93, y0 + 0.19, lz, 0.02, 0.24, 0.24, 'metal', 0xc0c4c8, { ...part, shape: 'wheel' });
  }
  const yb = y0 + 0.28, yc = yb + 0.5, hc = 0.5;
  F.box(0, yb, 0, 1.8, 0.5, 4.3, 'metal', color, o);
  for (const s of [-1, 1]) {
    F.box(0, yb - 0.02, s * 2.19, 1.84, 0.2, 0.08, 'plastic', 0x222222, part);
    F.box(0, yb + 0.03, s * 2.24, 0.5, 0.11, 0.02, 'plastic', 0xf5f5f5, part);
    for (const sx of [-1, 1]) F.box(sx * 0.6, yb + 0.27, s * 2.16, 0.32, 0.12, 0.03, s < 0 ? 'neon' : 'plastic', s < 0 ? 0xfff6d8 : 0xc00000, { ...part, vary: 0 });
  }
  F.box(0, yb + 0.17, -2.16, 0.6, 0.15, 0.03, 'plastic', 0x111111, part);
  if (!hood) {
    F.box(0, yc, -1.5, 0.9, 0.24, 0.8, 'metal', 0x3a3a3a, part);
    F.box(0.55, yc, -1.75, 0.25, 0.2, 0.18, 'plastic', 0x1a1a1a, part);
    F.cyl(-0.2, yc + 0.24, -1.4, 0.3, 0.08, 'metal', 0x9aa0a6, part);
  }
  for (const lz of [-0.75, 1.25]) for (const sx of [-1, 1]) F.box(sx * 0.76, yc, lz, 0.08, hc, 0.08, 'metal', color, o);
  if (glass) {
    const gl = { group: g, cat: 'Vitres', vary: 0 };
    for (const lz of [-0.75, 1.25]) F.box(0, yc, lz, 1.44, hc, 0.04, 'glass', 0xbfd8e8, gl);
    for (const sx of [-1, 1]) F.box(sx * 0.76, yc, 0.25, 0.04, hc, 1.92, 'glass', 0xbfd8e8, gl);
  }
  F.box(0, yc + hc, 0.25, 1.6, 0.07, 2.1, 'metal', color, o);
  const gs = F.b.g();
  for (const sx of [-1, 1]) {
    F.box(sx * 0.4, yc, -0.05, 0.5, 0.14, 0.5, 'fabric', 0x2b2b2b, { group: gs });
    F.box(sx * 0.4, yc + 0.14, 0.17, 0.5, 0.34, 0.08, 'fabric', 0x2b2b2b, { group: gs });
  }
  F.box(0, yc, 0.85, 1.5, 0.16, 0.5, 'fabric', 0x2b2b2b, { group: gs });
  F.box(-0.4, yc, -0.62, 0.05, 0.22, 0.05, 'metal', 0x222222, o);
  F.box(-0.4, yc + 0.12, -0.6, 0.32, 0.32, 0.04, 'plastic', 0x111111, { ...part, shape: 'disc' });
}
// pont élévateur deux colonnes, voiture levée dessus
function carLift(F, color, y0 = 1.5) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' }, top = y0 + 0.28;
  for (const s of [-1, 1]) {
    F.box(s * 1.38, 0, 0, 0.6, 0.02, 0.6, 'metal', 0x3a3f47, o);
    F.box(s * 1.38, 0.02, 0, 0.3, 3.4, 0.36, 'metal', LIFT, o);
    for (const lz of [-0.9, 0.9]) F.box(s * 0.92, top - 0.1, lz, 0.62, 0.1, 0.12, 'metal', 0x9aa0a6, o);
    F.box(s * 1.3, top - 0.1, 0, 0.14, 0.1, 1.92, 'metal', 0x9aa0a6, o);
  }
  F.box(0, 3.42, 0, 3.06, 0.14, 0.2, 'metal', LIFT, o);
  F.box(-1.38, 1.2, -0.25, 0.22, 0.3, 0.12, 'plastic', 0xffc300, o);
  car(F, color, { y0 });
  // bac de vidange dessous
  const gd = F.b.g();
  F.cyl(0.2, 0, -1.2, 0.5, 0.9, 'metal', 0xffc300, { group: gd, cat: 'Mobilier' });
  F.cyl(0.2, 0.9, -1.2, 0.62, 0.08, 'metal', 0x2b2b2b, { group: gd, cat: 'Mobilier' });
}
// rideau métallique : lames d'acier fixées entre les tableaux de la baie
function rollerDoor(b, x0, x1, zWall, yTop, yFrom = 0) {
  const g = b.g(), n = Math.max(1, Math.round((yTop - yFrom) / 0.3)), rh = (yTop - yFrom) / n;
  for (let i = 0; i < n; i++)
    b.box((x0 + x1) / 2, yFrom + i * rh, zWall, x1 - x0, rh, 0.05, 'metal', i % 2 ? 0xc3c7cc : 0xb4b9bf, { group: g, mount: true, cat: 'Mobilier', vary: 0.01 });
  b.box((x0 + x1) / 2, yTop, zWall - 0.33, x1 - x0 + 0.2, 0.42, 0.42, 'metal', 0x6b7280, { group: g, mount: true, cat: 'Mobilier' });
}
function tyreStack(b, x, z, n = 4) {
  const g = b.g();
  for (let i = 0; i < n; i++) b.box(x, i * 0.21, z, 0.64, 0.21, 0.64, 'plastic', TYRE, { group: g, shape: 'cyl', cat: 'Pièces auto', hp: 45, vary: 0.02 });
}
function tyreRack(F, w = 3.2) {
  const S = shelfUnit(F, { w, h: 2.2, d: 0.6, levels: 3, mat: 'metal', color: 0x2f6fb0, back: false });
  for (let i = 0; i < S.tops.length - 1; i++)
    for (let x = S.x0 + 0.11; x < S.x1 - 0.1; x += 0.24) F.box(x, S.tops[i], 0, 0.21, 0.62, 0.62, 'plastic', TYRE, { shape: 'wheel', cat: 'Pièces auto', hp: 45, vary: 0.02 });
}
function drum(b, x, z, color, y = 0) {
  const g = b.g();
  b.box(x, y, z, 0.58, 0.88, 0.58, 'metal', color, { group: g, shape: 'cyl', cat: 'Marchandise' });
  b.box(x, y + 0.29, z, 0.6, 0.04, 0.6, 'metal', 0x2b2b2b, { group: g, shape: 'cyl', cat: 'Marchandise' });
}
function toolChest(F, color = LIFT) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.3, 0, sz * 0.17, 0.08, 0.1, 0.08, 'plastic', 0x111111, o);
  F.box(0, 0.1, 0, 0.78, 0.95, 0.48, 'metal', color, o);
  for (let k = 0; k < 6; k++) F.box(0, 0.16 + k * 0.15, -0.245, 0.7, 0.12, 0.02, 'metal', k % 2 ? 0xd9dde2 : color, o);
  F.box(0, 1.05, 0.02, 0.74, 0.35, 0.42, 'metal', color, o);
  F.box(0, 1.4, 0.02, 0.78, 0.03, 0.46, 'metal', 0xd9dde2, o);
  for (let i = 0; i < 3; i++) F.box(-0.25 + i * 0.22, 1.43, 0, 0.18, 0.04, 0.05, 'metal', pick([0x9aa0a6, 0x1d4ed8, 0xffc300]), { cat: 'Pièces auto' });
}
function workbench(F, w = 2.4) {
  const h = table(F, { w, d: 0.8, h: 0.9, top: 'wood', tc: 0x8a6a40, lm: 'metal', lc: 0x3a3f47, leg: 0.07 });
  const g = F.b.g();
  F.box(-w / 2 + 0.25, h, -0.25, 0.18, 0.14, 0.22, 'metal', 0x2f6fb0, { group: g, cat: 'Mobilier' });
  F.box(-w / 2 + 0.25, h + 0.14, -0.25, 0.26, 0.05, 0.08, 'metal', 0x6b7280, { group: g, cat: 'Mobilier' });
  for (let i = 0; i < 3; i++) F.cyl(0.2 + i * 0.12, h, 0.2, 0.09, 0.2, 'metal', pick([0xd62828, 0x16a34a, 0xffc300]), { cat: 'Marchandise' });
  F.box(-0.2, h, 0.05, 0.4, 0.03, 0.3, 'fabric', 0x9a3412, { cat: 'Déco' });
  F.box(w / 2 - 0.4, h, -0.1, 0.35, 0.15, 0.25, 'metal', 0x3a3a3a, { cat: 'Pièces auto' });
}
// panneau perforé au mur (nord : face +z), outils accrochés
function pegboard(b, x, zWall, w = 2.4) {
  const g = b.g(), z = zWall + 0.015, o = { group: g, mount: true, cat: 'Mobilier' };
  b.box(x, 1.2, z, w, 1.1, 0.03, 'wood', 0xc8a26a, o);
  for (let i = 0; i < 9; i++) {
    const lx = x - w / 2 + 0.2 + i * (w - 0.4) / 8, big = i % 3 === 0;
    b.box(lx, big ? 1.45 : 1.6, z + 0.03, big ? 0.07 : 0.04, big ? 0.6 : 0.35, 0.03, 'metal', pick([0x9aa0a6, 0xd62828, 0x1d4ed8, 0x3a3a3a]), { ...o, cat: 'Pièces auto' });
  }
}
function engineStand(F) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  F.box(0, 0, 0, 1.0, 0.06, 0.12, 'metal', LIFT, o);
  F.box(0, 0, 0, 0.12, 0.06, 0.8, 'metal', LIFT, o);
  F.box(0, 0.06, 0, 0.1, 0.8, 0.1, 'metal', LIFT, o);
  F.box(0, 0.86, 0, 0.9, 0.5, 0.6, 'metal', 0x3a3a3a, { group: g, cat: 'Pièces auto' });
  F.box(0, 1.36, 0, 0.7, 0.14, 0.4, 'metal', 0x9aa0a6, { group: g, cat: 'Pièces auto' });
}
function compressor(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  for (const lx of [-0.45, 0.45]) F.box(lx, 0, 0, 0.1, 0.15, 0.4, 'metal', 0x2b2b2b, o);
  F.box(0, 0.15, 0, 1.3, 0.5, 0.5, 'metal', LIFT, { ...o, shape: 'wheel' });
  F.box(0.2, 0.65, 0, 0.45, 0.3, 0.3, 'metal', 0x3a3f47, o);
  F.cyl(-0.3, 0.65, 0, 0.12, 0.12, 'metal', 0xc0c4c8, o);
}
function jack(F) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  F.box(0, 0, 0, 0.35, 0.16, 0.8, 'metal', LIFT, o);
  F.box(0, 0.16, -0.3, 0.2, 0.1, 0.2, 'metal', 0x9aa0a6, o);
  F.box(0, 0.16, 0.36, 0.05, 0.9, 0.05, 'metal', 0x2b2b2b, o);
}
function locker(F, n = 4) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  F.box(0, 0, 0.02, n * 0.4, 1.85, 0.46, 'metal', 0x6b7f96, o);
  for (let i = 0; i < n; i++) {
    const lx = -n * 0.2 + 0.2 + i * 0.4;
    F.box(lx, 0.04, -0.22, 0.36, 1.76, 0.02, 'metal', 0x7d93ab, o);
    for (let k = 0; k < 3; k++) F.box(lx, 1.45 + k * 0.07, -0.235, 0.22, 0.02, 0.01, 'metal', 0x3a3f47, o);
  }
}
function babyfoot(F) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(sx * 0.5, 0, sz * 0.26, 0.08, 0.6, 0.08, 'wood', 0x3b2314, o);
  F.box(0, 0.6, 0, 1.2, 0.3, 0.7, 'wood', 0x5c3317, o);
  F.box(0, 0.9, 0, 1.12, 0.01, 0.62, 'fabric', 0x2d8a3a, o);
  for (let r = 0; r < 8; r++) {
    const lx = -0.49 + r * 0.14, col = r % 2 ? 0x1d4ed8 : 0xd62828;
    F.box(lx, 0.98, 0, 0.025, 0.025, 1.1, 'metal', 0xc0c4c8, { ...o, shape: 'disc' });
    for (let k = 0; k < 3; k++) F.box(lx, 0.91, -0.2 + k * 0.2, 0.04, 0.12, 0.04, 'plastic', col, { group: g, cat: 'Déco' });
  }
}

function buildGarage(b) {
  const W = 24, D = 18, H = 4.6, H2 = 3.0, WALL = 0xd9d4c8, DARK = 0x3a3f47;
  perimeter(b, W, D, H, WALL, {
    s: [{ a0: -10.5, a1: -5.5, y0: 0, y1: 3.8 }, { a0: -3.5, a1: 1.5, y0: 0, y1: 3.8 }, win(3.3, 4.7, 1.0, 2.6), gdoor(5.2, 6.8, 2.4), win(7.6, 11.2, 1.0, 2.6)],
    w: [win(-6, -2, 2.4, 3.9), win(1, 5, 2.4, 3.9)],
    e: [win(-6, -2, 2.4, 3.9), win(5, 8, 1.0, 2.6)],
    n: [win(-3, 1, 2.6, 3.9)],
  }, { band: { rows: [0], color: DARK }, frame: DARK });
  const up = upstairs(b, W, D, H, { i0: 1, ceil: 0xe8e8e4, floor: 0x6b6f75, stair: 0x6b7280, rail: 0xffc300 });
  rollerDoor(b, -10.5, -5.5, D / 2 + 0.11, 3.8);
  rollerDoor(b, -3.5, 1.5, D / 2 + 0.11, 3.8, 2.6);

  // ---- baie 1 : voiture sur le pont ; baie 2 : voiture capot ouvert
  carLift(b.f(-8, 1, 0), 0xb91c1c);
  toolChest(b.f(-5.6, -1.4, 3));
  car(b.f(-1, 1.6, 0), 0x1d4ed8, { hood: false });
  jack(b.f(0.6, -1.2, 0));
  toolChest(b.f(1.4, 1.2, 1), 0x1d4ed8);
  engineStand(b.f(1.8, -3.4, 0));
  // établis et panneaux d'outils au mur nord
  for (const x of [-2.2, 1.8]) { workbench(b.f(x, -8.5, 2)); pegboard(b, x, -9); }
  toolChest(b.f(4.1, -8.6, 2));
  // pneus, fûts, compresseur côté ouest
  tyreRack(b.f(-11.6, -3.4, 3), 3.2);
  compressor(b.f(-10.6, -6.2, 0));
  for (const [x, z] of [[-11.5, 3.6], [-11.5, 4.3], [-10.8, 3.6], [-11.5, 5.0]]) drum(b, x, z, pick([0x1d4ed8, 0xd62828, 0x2b2b2b]));
  for (const [x, z, n] of [[-11.3, 7.4, 5], [-10.5, 7.9, 4], [-11.4, 8.3, 3], [-4.4, 6.9, 4], [-4.4, 7.7, 3]]) tyreStack(b, x, z, n);
  {
    const F = b.f(-11.55, 6.0, 3);
    const S = shelfUnit(F, { w: 1.2, h: 1.6, d: 0.45, levels: 3, mat: 'metal', color: 0x2f6fb0, back: false });
    fillShelves(F, S, ['can', 'jar', 'box'], 0, true);
  }
  // cabine de peinture vitrée, voiture fraîchement peinte dedans
  {
    const g = b.g();
    glassWallX(b, -3.6, [5.2, 6.3, 7.4, 8.5, 9.6, 10.7, 11.75], [2], g);
    glassWallZ(b, 5.2, [-8.95, -7.6, -6.2, -4.9, -3.6], [], g);
    b.box(8.475, 2.7, -6.275, 6.55, 0.08, 5.35, 'metal', 0xe5e7eb, { group: g, cat: 'Mobilier' });
    panel(b, 7, -6.2, 2.7, { i: 12 }); panel(b, 10, -6.2, 2.7, null);
    car(b.f(8.6, -6.3, 0), 0xffc300);
    for (const [x, z] of [[6, -8.4], [6.5, -8.4], [11.2, -4.3]]) {
      const g2 = b.g();
      b.box(x, 0, z, 0.3, 0.38, 0.3, 'metal', pick([0xd62828, 0x1d4ed8, 0xffc300, 0x16a34a]), { group: g2, shape: 'cyl', cat: 'Marchandise' });
    }
  }
  // l'accueil, derrière sa cloison vitrée
  brickWall(b, 'x', 3, 3.12, 12, H, 0.12, WALL, [win(4.8, 11, 1.0, 2.6)], { frame: DARK });
  brickWall(b, 'z', 3.06, 2.94, 9, H, 0.12, WALL, [{ a0: 5.9, a1: 7.0, y0: 0, y1: 2.3 }], { frame: DARK });
  {
    const F = b.f(9, 5.0, 0);
    counter(F, 3.2, 0.7, 1.05, 0x3a3f47, 'plastic', 0xd62828);
    monitor(F.sub(0.6, 0, 0), 1.05);
    F.box(-0.5, 1.05, 0, 0.3, 0.02, 0.22, 'paper', 0xffffff, { cat: 'Paperasse', vary: 0 });
    F.box(-1.1, 1.05, 0.1, 0.12, 0.2, 0.08, 'metal', 0x9aa0a6, { cat: 'Pièces auto' });
    officeChair(F.sub(0.6, -0.8, 2));
  }
  for (const z of [6.4, 7.0, 7.6, 8.2]) chair(b.f(11.5, z, 1), 0x3a3f47, 0xd62828);
  {
    const F = b.f(10.4, 7.3, 0), h = table(F, { w: 0.6, d: 0.6, h: 0.42, tc: 0x3a3f47 });
    for (let i = 0; i < 3; i++) F.box(-0.1 + i * 0.06, h + i * 0.012, 0, 0.21, 0.012, 0.28, 'paper', pick(PAL.cereal), { cat: 'Paperasse' });
  }
  vending(b.f(3.6, 8.3, 3));
  tyreStack(b, 4.0, 4.0, 4); tyreStack(b, 4.8, 3.9, 3);
  plant(b.f(11.4, 3.7, 0));
  // éclairage de l'atelier
  for (const x of [-8, -1]) for (const z of [-5, 0.5, 5.5]) neon(b, x, z, 2.4, false, H, z === 0.5 ? { i: 18, d: 14 } : null);
  neon(b, 2.5, -6, 2.4, true, H, { i: 14 });
  panel(b, 7.5, 6.2, H, { i: 12 });

  // ---- étage : bureau du patron, stock de pièces, salle de pause
  b.at(up.R, () => {
    perimeter(b, W, D, H2, WALL, {
      s: [win(-10, -7), win(-5, -2), win(1, 4), win(7, 10)],
      n: [win(-1, 3)],
      e: [win(-6, -2), win(6.5, 8.5)],
      w: [win(2, 6)],
    }, { band: { rows: [0], color: DARK }, frame: DARK });
    brickWall(b, 'x', -1, -12, -2.94, H2, 0.12, 0xece8de, [{ a0: -5.2, a1: -4.2, y0: 0, y1: 2.2 }]);
    brickWall(b, 'z', -3, -0.94, 9, H2, 0.12, 0xece8de, []);
    // bureau
    {
      const F = b.f(-7.5, 5.5, 2);
      const h = table(F, { w: 2.0, d: 0.9, h: 0.76, tc: 0x5c3d24 });
      monitor(F.sub(0.3, -0.2, 2), h);
      cashStack(F, -0.6, h, 0.1, 3);
      F.box(-0.2, h, 0.15, 0.3, 0.02, 0.22, 'paper', 0xffffff, { cat: 'Paperasse', vary: 0 });
      F.cyl(0.75, h, 0.25, 0.085, 0.1, 'ceramic', 0xd62828, { cat: 'Vaisselle' });
      officeChair(F.sub(0, 0.75, 0), 0x3b2314);
      chair(F.sub(-0.4, -0.95, 2), 0x3a3f47, 0xd62828); chair(F.sub(0.4, -0.95, 2), 0x3a3f47, 0xd62828);
    }
    {
      const F = b.f(-11.7, 3, 3), S = shelfUnit(F, { w: 2.4, h: 2.1, d: 0.35, levels: 5, mat: 'metal', color: 0x9aa0a6 });
      fillShelves(F, S, ['binder'], 0, false);
    }
    {
      const g = b.g();
      b.box(-11.6, 0, 7.8, 0.7, 1.1, 0.7, 'steel', STEEL, { group: g, hp: 600, cat: 'Coffre', noSplit: true });
      b.box(-11.23, 0.5, 7.8, 0.04, 0.16, 0.16, 'metal', GOLD, { group: g, cat: 'Coffre' });
    }
    sofa(b.f(-5, 8.3, 0), 0x3b2314, 2.0);
    frame(b.f(-6, 9 - 0.02, 0), 1.3, 1.0, 0.7, 0xffc300);
    frame(b.f(-7.5, -1 + 0.08, 2), 1.4, 0.8, 0.8, 0x1d4ed8);
    plant(b.f(-3.6, 1.5, 0));
    // stock de pièces détachées
    for (const x of [-9.5, -6.5]) storageRack(b.f(x, -3.5, 0), ['box', 'box', 'can', 'jar']);
    for (const x of [0.5, 3.5]) storageRack(b.f(x, -6.5, 0), ['box', 'pack', 'can']);
    for (let i = 0; i < 4; i++) b.box(1.8, 0.1 * i, -3.6, 2.2, 0.1, 0.1, 'metal', 0x9aa0a6, { shape: 'wheel', cat: 'Pièces auto' });
    for (let i = 0; i < 3; i++) b.box(0.4, 0.14 * i, -2.2 - i * 0.02, 1.8, 0.14, 0.3, 'plastic', pick([0xb91c1c, 0x1d4ed8, 0x2b2b2b]), { cat: 'Pièces auto' });
    for (const [x, z, n] of [[-1.5, -8.2, 5], [-2.2, -8.2, 4], [-1.8, -6, 3]]) tyreStack(b, x, z, n);
    cartonPallet(b, -1.2, 3, 2);
    cartonPallet(b, 1.2, 4.5, 3);
    // salle de pause et vestiaires
    locker(b.f(7, -8.7, 2), 5);
    locker(b.f(10.2, -8.7, 2), 4);
    babyfoot(b.f(8.5, -4.5, 0));
    {
      const F = b.f(8, 1, 0), h = table(F, { w: 1.6, d: 0.9, h: 0.75, tc: 0xe5e7eb, lm: 'metal', lc: 0x6b7280 });
      for (const lx of [-0.45, 0.45]) { chair(F.sub(lx, 0.7, 0), 0x6b7280); chair(F.sub(lx, -0.7, 2), 0x6b7280); }
      F.cyl(-0.3, h, 0, 0.085, 0.1, 'ceramic', 0xffffff, { cat: 'Vaisselle' });
      F.cyl(0.3, h, 0.1, 0.085, 0.1, 'ceramic', 0xd62828, { cat: 'Vaisselle' });
      F.box(0, h, -0.2, 0.34, 0.08, 0.26, 'paper', 0xffc300, { cat: 'Marchandise' });
    }
    {
      const F = b.f(11.6, 3.5, 1);
      counter(F, 2.4, 0.6, 0.9, 0xe5e7eb, 'plastic', 0x3a3f47);
      const g = b.g();
      F.box(-0.6, 0.9, 0, 0.5, 0.3, 0.36, 'metal', 0xf0f0f0, { group: g, cat: 'Électroménager' });
      F.box(-0.65, 0.95, -0.185, 0.3, 0.2, 0.01, 'glass', 0x333333, { group: g, cat: 'Vitres', vary: 0 });
      F.box(0.4, 0.9, 0.05, 0.28, 0.35, 0.28, 'plastic', 0x1a1a1a, { cat: 'Électroménager' });
    }
    fridge(b.f(11.6, 5.6, 1));
    sofa(b.f(8.5, 8.3, 0), 0x6b7280, 2.2);
    {
      const F = b.f(8.5, 6.2, 2), g = b.g();
      F.box(0, 0, 0, 1.4, 0.5, 0.4, 'wood', 0x3a3f47, { group: g });
      tv(F, 0.5, 1.2);
    }
    frame(b.f(4, -9 + 0.02, 2), 1.4, 0.8, 0.6, 0xd62828);
    for (const [x, z, lit] of [[-7.5, 4.5, true], [-8, -5, true], [-2, -5, false], [2, -4.5, true], [2, 4, false], [8.5, -5, true], [8.5, 3, true], [8.5, 7, false]])
      panel(b, x, z, H2, lit ? { i: 12 } : null);
    roof(b, W, D, H2, 0xe8e8e4);
  });
  return { spawn: { x: -2.5, z: 7.4, yaw: 0 }, cam: { x: 2.4, y: 3.4, z: 8.2, tx: -7, ty: 1.4, tz: -1 } };
}

// ------------------------------------------------------------------ MUSÉE
const BONE = 0xd8c9a8, BASALT = 0x2e2c2a, TERRA = 0xc2622d;
// squelette de sauropode dans l'axe x, tête vers +x ; le cou monte dans l'atrium
function dino(b, x0, z0) {
  const g = b.g(), o = { group: g, cat: 'Collections', vary: 0.03 };
  const bone = (x, y, z, w, h, d, c = BONE) => b.box(x0 + x, y, z0 + z, w, h, d, 'stone', c, o);
  b.box(x0, 0, z0, 9, 0.35, 2.6, 'stone', 0x4a4a4a, { cat: 'Déco', vary: 0.02 });
  const yS = (x) => 3.0 + (x + 1.6) * 0.6 / 3.4;
  const vx = [];
  for (let i = 0; i < 13; i++) vx.push(-1.9 + i * 0.33);
  for (const x of vx) bone(x, yS(x) - 0.175, 0, 0.36, 0.35, 0.3);
  // bassin, épaules, pattes
  for (const lx of [-1.6, 1.8]) {
    const top = yS(lx) - 0.175;
    bone(lx, top - 0.3, 0, 0.45, 0.3, 1.4);
    for (const s of [-1, 1]) {
      bone(lx, 0.35, s * 0.55, 0.26, top - 0.65, 0.26);
      bone(lx, 0.35 + (top - 0.65) * 0.45, s * 0.55, 0.34, 0.22, 0.34);
      bone(lx + 0.15, 0.35, s * 0.55, 0.5, 0.12, 0.34);
    }
  }
  // côtes
  for (let i = 2; i < vx.length - 2; i++) {
    const x = vx[i], top = yS(x) - 0.175, len = 1.15 - Math.abs(x - 0.1) * 0.25;
    bone(x, top - 0.06, 0, 0.08, 0.06, 1.0);
    for (const s of [-1, 1]) {
      bone(x, top - 0.06 - len, s * 0.47, 0.07, len, 0.07);
      bone(x, top - 0.06 - len, s * 0.3, 0.07, 0.07, 0.3);
    }
  }
  // le cou, jusque sous la verrière
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), s = 0.34 - 0.08 * t;
    bone(2.2 + 1.5 * Math.pow(t, 0.8), 3.55 + 4.6 * t, 0, s, 0.4, s);
  }
  bone(3.95, 8.1, 0, 0.8, 0.42, 0.42);
  bone(4.05, 7.95, 0, 0.6, 0.15, 0.3);
  for (const s of [-1, 1]) bone(4.1, 8.25, s * 0.2, 0.14, 0.12, 0.04, 0x3a3025);
  // la queue
  for (let i = 0; i < 16; i++) {
    const t = i / 15, s = 0.32 - 0.14 * t;
    bone(-2.0 - 2.5 * t, yS(-2.0) - 0.15 - 2.2 * Math.pow(t, 1.3), 0, s, s, s);
  }
  // cartel
  const gp = b.g();
  b.box(x0 + 0.5, 0, z0 + 1.75, 0.08, 0.8, 0.08, 'metal', 0x2b2b2b, { group: gp });
  b.box(x0 + 0.5, 0.8, z0 + 1.75, 0.6, 0.4, 0.04, 'paper', 0xf2ede0, { group: gp, cat: 'Paperasse' });
}
// verrière : le toit, avec des vitres à la place des dalles au-dessus de l'atrium
function skylight(b, W, D, y, color, hole) {
  const G = grid(W, D), g = b.g();
  for (let i = 0; i < G.nx; i++) for (let k = 0; k < G.nz; k++) {
    const x = G.x0 + G.sx * (i + 0.5), z = G.z0 + G.sz * (k + 0.5);
    if (i >= hole.i0 && i <= hole.i1 && k >= hole.k0 && k <= hole.k1) {
      b.box(x, y + 0.14, z, G.sx - 0.06, 0.04, G.sz - 0.06, 'glass', 0xd6ecff, { group: g, cat: 'Vitres', vary: 0 });
      b.box(x, y + 0.14, z - G.sz / 2 + 0.015, G.sx, 0.06, 0.03, 'metal', 0x3a3f47, { group: g, cat: 'Mobilier' });
      b.box(x - G.sx / 2 + 0.015, y + 0.14, z, 0.03, 0.06, G.sz, 'metal', 0x3a3f47, { group: g, cat: 'Mobilier' });
    } else b.box(x, y, z, G.sx, 0.2, G.sz, 'ceiling', color, { group: g, cat: 'Plafond', vary: 0.012 });
  }
}
// garde-corps vitré autour d'une trémie rectangulaire
function atriumRail(b, x0, x1, z0, z1) {
  const g = b.g(), h = 1.0, e = 0.045, M = { group: g, cat: 'Mobilier' };
  const side = (ax, fixed, a0, a1) => {
    const n = Math.max(1, Math.round((a1 - a0) / 1.5)), L = (a1 - a0) / n;
    const put = (a, y, len, hh, t, mat, col, o) => ax === 'x' ? b.box(a, y, fixed, len, hh, t, mat, col, o) : b.box(fixed, y, a, t, hh, len, mat, col, o);
    for (let i = 0; i < n; i++) put(a0 + L * (i + 0.5), 0, L - 0.06, h, 0.03, 'glass', 0xd6ecff, { group: g, cat: 'Vitres', vary: 0 });
    for (let i = 0; i <= n; i++) put(a0 + L * i, 0, 0.06, h + 0.05, 0.06, 'metal', 0x9aa0a6, M);
    put((a0 + a1) / 2, h + 0.05, a1 - a0 + 0.06, 0.05, 0.07, 'metal', 0x9aa0a6, M);
  };
  side('x', z0 - e, x0 - e, x1 + e); side('x', z1 + e, x0 - e, x1 + e);
  side('z', x0 - e, z0 - e, z1 + e); side('z', x1 + e, z0 - e, z1 + e);
}
// tableaux « pixel » : chaque case de toile est une pièce
const ART = {
  paysage: (i, j, c, r) => (i === c - 2 && j === r - 2 ? 0xffd166 : j > r * 0.55 ? pick([0x8ecae6, 0x9fd3ea, 0xa9d6ec]) : j === Math.floor(r * 0.5) ? 0x588157 : pick([0x3a5a40, 0x6a994e, 0xa3b18a])),
  nuit: (i, j, c, r) => (j === 0 ? 0x2b2d42 : i === 1 && j < r - 1 ? 0x1b4332 : R() < 0.18 ? pick([0xffd166, 0xf4e285]) : pick([0x1d3557, 0x274c77, 0x1b263b, 0x3d5a80])),
  mer: (i, j, c, r) => (i === 2 && j === 2 ? 0x7f4f24 : i === 2 && j === 3 ? 0xf5f5f0 : j >= 3 ? pick([0xbde0fe, 0xa2d2ff, 0xcfe8ff]) : pick([0x1d4e89, 0x00509d, 0x2a6f97])),
  mondrian: (i, j) => (i % 3 === 1 || j % 3 === 1 ? 0x111111 : pick([0xf5f5f0, 0xf5f5f0, 0xf5f5f0, 0xd62828, 0x1d4ed8, 0xffc300])),
  abstrait: () => pick([0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0xf4a261, 0x9d4edd]),
  tapisserie: (i, j, c, r) => (j === 0 || j === r - 1 ? 0xc9a227 : (i + j) % 4 === 0 ? 0xe9c46a : pick([0x7a1f1f, 0x9b1b30, 0x2d4a2b, 0x6b1d1d])),
  blanc: () => 0xf7f7f2,
  portrait: (i, j, c, r) => {
    const m = (c - 1) / 2;
    if (j >= r * 0.5 && j < r - 1 && Math.abs(i - m) < 1) return 0xd9a877;
    if (j >= r * 0.5 && Math.abs(i - m) < 2) return 0x2b1d12;
    if (j < r * 0.5 && Math.abs(i - m) < 2) return pick([0x7a1f1f, 0x3b2a1f]);
    return pick([0x3b3b2a, 0x4a4632, 0x2f2f22]);
  },
  // la dame au sourire, version 6×8
  joconde: (i, j) => {
    if (j >= 4 && j <= 6 && (i === 2 || i === 3)) return 0xd9a877;
    if (j === 3 && (i === 2 || i === 3)) return 0xc99a6a;
    if (j === 1 && (i === 2 || i === 3)) return 0xd9a877;
    if ((j >= 3 && j <= 6 && (i === 1 || i === 4)) || (j === 7 && (i === 2 || i === 3))) return 0x2b1d12;
    if (j <= 3 && i >= 1 && i <= 4) return 0x2b2418;
    return j >= 4 ? pick([0x6b7a4a, 0x5f6e44]) : pick([0x4a4a2f, 0x55553a]);
  },
};
function painting(F, y, c, r, cell, style, { gold = true, special = null } = {}) {
  const g = F.b.g(), w = c * cell, h = r * cell, fw = 0.08, fc = gold ? 0xc9a227 : 0x3b2a1a, o = { group: g, mount: true, cat: 'Déco' };
  F.box(0, y, 0, w + 2 * fw, fw, 0.05, 'wood', fc, o);
  F.box(0, y + fw + h, 0, w + 2 * fw, fw, 0.05, 'wood', fc, o);
  for (const s of [-1, 1]) F.box(s * (w / 2 + fw / 2), y + fw, 0, fw, h, 0.05, 'wood', fc, o);
  for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) {
    const sp = special && special.i === i && special.j === j ? special.o : {};
    F.box(-w / 2 + cell * (i + 0.5), y + fw + cell * j, -0.005, cell, cell, 0.02, 'fabric', ART[style](i, j, c, r), { group: g, mount: true, cat: 'Collections', vary: 0.03, ...sp });
  }
}
// accroche au mur : n, s, e, w (murs extérieurs) ; face : repère tourné vers la salle
function wallArt(b, W, D, wall, a, y, c, r, cell, style, opt) {
  const F = wall === 'n' ? b.f(a, -D / 2 + 0.025, 2) : wall === 's' ? b.f(a, D / 2 - 0.025, 0) : wall === 'w' ? b.f(-W / 2 + 0.025, a, 3) : b.f(W / 2 - 0.025, a, 1);
  painting(F, y, c, r, cell, style, opt);
}
function statue(F, { color = MARBLE, crown = null, socle = 0xd9d2c4 } = {}) {
  const g = F.b.g(), o = { group: g, cat: 'Collections' };
  F.box(0, 0, 0, 0.7, 0.8, 0.7, 'stone', socle, { group: g, cat: 'Déco' });
  for (const s of [-1, 1]) F.box(s * 0.1, 0.8, 0, 0.15, 0.78, 0.2, 'stone', color, o);
  F.box(0, 1.58, 0, 0.46, 0.6, 0.26, 'stone', color, o);
  for (const s of [-1, 1]) F.box(s * 0.29, 1.62, 0, 0.11, 0.54, 0.13, 'stone', color, o);
  F.box(0, 2.18, 0, 0.22, 0.27, 0.22, 'stone', color, o);
  if (crown) {
    F.box(0, 2.36, 0.02, 0.32, 0.2, 0.28, 'metal', crown, o);
    for (const s of [-1, 1]) F.box(s * 0.14, 2.02, 0.02, 0.06, 0.34, 0.2, 'plastic', 0x1e3a8a, o);
  }
}
function bust(F) {
  const g = F.b.g(), o = { group: g, cat: 'Collections' };
  F.box(0, 0, 0, 0.45, 1.1, 0.45, 'stone', 0x3a3530, { group: g, cat: 'Déco' });
  F.box(0, 1.1, 0, 0.44, 0.3, 0.24, 'stone', MARBLE, o);
  F.box(0, 1.4, 0, 0.11, 0.1, 0.11, 'stone', MARBLE, o);
  F.box(0, 1.5, 0, 0.22, 0.28, 0.24, 'stone', MARBLE, o);
}
function amphora(F, color = TERRA, pedestal = true) {
  const g = F.b.g(), y = pedestal ? 1.0 : 0;
  if (pedestal) F.box(0, 0, 0, 0.45, 1.0, 0.45, 'stone', 0xd9d2c4, { group: g, cat: 'Déco' });
  const ga = F.b.g(), o = { group: ga, cat: 'Collections' };
  F.cyl(0, y, 0, 0.16, 0.08, 'ceramic', color, o);
  F.cyl(0, y + 0.08, 0, 0.36, 0.42, 'ceramic', color, o);
  F.cyl(0, y + 0.5, 0, 0.14, 0.2, 'ceramic', color, o);
  F.cyl(0, y + 0.18, 0, 0.37, 0.08, 'ceramic', 0x1a1a1a, o);
  for (const s of [-1, 1]) F.box(s * 0.13, y + 0.46, 0, 0.05, 0.2, 0.04, 'ceramic', color, o);
}
// vitrine : socle, cinq vitres, et ce que fill y pose
function vitrine(F, fill) {
  const g = F.b.g(), gl = { group: g, cat: 'Vitres', vary: 0 };
  F.box(0, 0, 0, 1.1, 0.9, 0.6, 'wood', 0x3b2a1f, { group: g });
  for (const s of [-1, 1]) {
    F.box(0, 0.9, s * 0.29, 1.08, 0.5, 0.02, 'glass', 0xe0f0ff, gl);
    F.box(s * 0.54, 0.9, 0, 0.02, 0.5, 0.56, 'glass', 0xe0f0ff, gl);
  }
  F.box(0, 1.4, 0, 1.1, 0.02, 0.6, 'glass', 0xe0f0ff, gl);
  fill(F, 0.9);
}
const egyptFill = (F, y) => {
  F.cyl(-0.35, y, 0, 0.14, 0.26, 'ceramic', pick([0xd9c8a0, 0x5fa8a0]), { cat: 'Collections' });
  F.cyl(-0.12, y, 0.05, 0.12, 0.22, 'ceramic', 0xd9c8a0, { cat: 'Collections' });
  F.box(0.12, y, -0.05, 0.12, 0.05, 0.16, 'metal', GOLD, { cat: 'Collections' });
  F.box(0.35, y, 0.05, 0.22, 0.01, 0.3, 'paper', 0xd9c28a, { cat: 'Collections', vary: 0 });
};
const jewelFill = (F, y) => {
  const g = F.b.g(), o = { group: g, cat: 'Collections' };
  F.cyl(-0.2, y, 0, 0.26, 0.1, 'metal', GOLD, o);
  for (let i = 0; i < 5; i++) F.box(-0.2 + (i - 2) * 0.05, y + 0.1, i % 2 ? 0.1 : -0.1, 0.035, 0.08, 0.035, 'metal', GOLD, o);
  F.box(-0.2, y + 0.1, 0, 0.05, 0.05, 0.05, 'glass', 0xd62828, { group: g, cat: 'Collections', vary: 0 });
  F.box(0.25, y, 0, 0.3, 0.02, 0.22, 'fabric', 0x1f3d5a, { cat: 'Déco' });
  for (let i = 0; i < 4; i++) F.box(0.15 + i * 0.07, y + 0.02, 0, 0.04, 0.03, 0.04, 'glass', pick([0x1d4ed8, 0x16a34a, 0xd62828, 0xffffff]), { cat: 'Collections', vary: 0 });
};
function sarcophagus(F) {
  const g = F.b.g(), o = { group: g, cat: 'Collections' };
  F.box(0, 0, 0, 1.3, 0.3, 2.5, 'stone', 0x8a7a60, { group: g, cat: 'Déco' });
  F.box(0, 0.3, 0, 0.8, 0.55, 2.1, 'stone', 0xcdb88a, o);
  F.box(0, 0.85, 0, 0.74, 0.18, 2.0, 'metal', GOLD, o);
  F.box(0, 1.03, -0.7, 0.34, 0.08, 0.42, 'metal', 0xe0b84a, o);
  for (let k = 0; k < 4; k++) F.box(0, 1.03, -0.2 + k * 0.25, 0.7, 0.02, 0.08, 'plastic', 0x1e3a8a, o);
}
function standingSarcophagus(F) {
  const g = F.b.g(), o = { group: g, cat: 'Collections' };
  F.box(0, 0, 0, 0.9, 0.12, 0.6, 'stone', 0x8a7a60, { group: g, cat: 'Déco' });
  F.box(0, 0.12, 0, 0.8, 2.0, 0.5, 'wood', 0xc9a227, o);
  F.box(0, 1.5, -0.27, 0.36, 0.45, 0.04, 'metal', 0xe0b84a, o);
  for (let k = 0; k < 5; k++) F.box(0, 0.35 + k * 0.2, -0.27, 0.7, 0.06, 0.04, 'plastic', 0x1e3a8a, o);
}
function obelisk(b, x, z) {
  const g = b.g(), o = { group: g, cat: 'Collections' };
  b.box(x, 0, z, 1.1, 0.3, 1.1, 'stone', 0x8a7a60, { group: g, cat: 'Déco' });
  for (let i = 0; i < 5; i++) { const s = 0.7 - i * 0.07; b.box(x, 0.3 + i * 0.85, z, s, 0.85, s, 'stone', 0xc9a877, o); }
  b.box(x, 4.55, z, 0.34, 0.3, 0.34, 'metal', GOLD, o);
}
function armor(F) {
  const g = F.b.g(), o = { group: g, cat: 'Collections' }, S = 0xb9bec6;
  F.box(0, 0, 0, 0.6, 0.1, 0.5, 'stone', 0x3a3530, { group: g, cat: 'Déco' });
  for (const s of [-1, 1]) F.box(s * 0.1, 0.1, 0, 0.13, 0.8, 0.16, 'metal', S, o);
  F.box(0, 0.9, 0, 0.4, 0.2, 0.26, 'metal', S, o);
  F.box(0, 1.1, 0, 0.46, 0.55, 0.3, 'metal', S, o);
  for (const s of [-1, 1]) { F.box(s * 0.3, 1.5, 0, 0.18, 0.14, 0.26, 'metal', S, o); F.box(s * 0.3, 1.0, 0, 0.1, 0.5, 0.12, 'metal', S, o); }
  F.box(0, 1.65, 0, 0.1, 0.06, 0.1, 'metal', S, o);
  F.box(0, 1.71, 0, 0.26, 0.32, 0.28, 'metal', S, o);
  F.box(0, 1.8, -0.145, 0.2, 0.03, 0.01, 'metal', 0x1a1a1a, o);
  F.box(0, 2.03, 0.02, 0.06, 0.18, 0.2, 'fabric', 0x9b1b30, o);
  F.box(0.42, 0.1, -0.08, 0.04, 2.1, 0.04, 'wood', 0x5c3d24, o);
  F.box(0.42, 2.2, -0.08, 0.08, 0.2, 0.03, 'metal', S, o);
  F.box(0.36, 1.0, -0.08, 0.04, 0.04, 0.04, 'metal', S, o);
}
function museumBench(F, w = 1.8) {
  const g = F.b.g();
  for (const s of [-1, 1]) F.box(s * (w / 2 - 0.1), 0, 0, 0.06, 0.4, 0.44, 'metal', 0x2b2b2b, { group: g });
  F.box(0, 0.4, 0, w, 0.08, 0.5, 'fabric', 0x1f1f1f, { group: g });
}

function buildMuseum(b) {
  const W = 26, D = 20, H = 6.0, H2 = 3.4, WALL = 0xe6dfd0, TRIM = 0x8a7a60;
  const G = grid(W, D), atrium = { i0: 9, i1: 17, k0: 8, k1: 12 };
  const ax0 = G.x0 + atrium.i0 * G.sx, ax1 = G.x0 + (atrium.i1 + 1) * G.sx, az0 = G.z0 + atrium.k0 * G.sz, az1 = G.z0 + (atrium.k1 + 1) * G.sz;
  perimeter(b, W, D, H, WALL, {
    s: [win(-11, -7, 1.0, 4.6), gdoor(-2, 2, 3.6), win(7, 11, 1.0, 4.6)],
    w: [win(-2, 2, 3.4, 5.2)],
    e: [win(-2, 2, 3.4, 5.2)],
  }, { band: { rows: [0, 14], color: TRIM }, frame: 0x5a4a3a });
  const up = upstairs(b, W, D, H, { i0: 17, ceil: 0xf4f2ee, floor: 0x7a5a3a, stair: 0xd9d2c4, rail: GOLDEN, holes: [atrium] });

  // ---- le hall et son dinosaure
  dino(b, 0, 0);
  for (const [x, z] of [[-5.6, -3.4], [5.6, -3.4], [-5.6, 3.4], [5.6, 3.4]]) {
    b.box(x, 0, z, 0.9, 0.3, 0.9, 'stone', MARBLE, { cat: 'Murs', structural: true, vary: 0.01 });
    b.box(x, 0.3, z, 0.7, H - 0.3, 0.7, 'stone', MARBLE, { cat: 'Murs', structural: true, vary: 0.01 });
  }
  for (const [x, z, r] of [[-2.5, 4.4, 0], [2.5, 4.4, 0], [0, -4.2, 2]]) museumBench(b.f(x, z, r));
  // billetterie
  {
    const F = b.f(-5.2, 7.4, 1);
    counter(F, 2.4, 0.7, 1.05, 0x3b2a1f, 'stone', MARBLE);
    monitor(F.sub(0.5, 0, 0), 1.05);
    F.box(-0.3, 1.05, 0.1, 0.14, 0.12, 0.14, 'plastic', 0x1a1a1a, { cat: 'Électronique' });
    for (let i = 0; i < 4; i++) F.box(-0.8 + i * 0.1, 1.05, 0.15, 0.08, 0.2, 0.02, 'paper', pick(PAL.cereal), { cat: 'Paperasse' });
    officeChair(F.sub(0.3, -0.8, 2));
  }
  queuePosts(b, -4.2, -2.4, 6.0);
  // aile égyptienne
  obelisk(b, -8.3, -8.2);
  sarcophagus(b.f(-10.3, -6.0, 0));
  standingSarcophagus(b.f(-12.65, -2.0, 3));
  for (const z of [2.2, 5.2]) statue(b.f(-12.4, z, 3), { color: BASALT, crown: GOLD, socle: 0x8a7a60 });
  vitrine(b.f(-9.6, 1.0, 0), egyptFill);
  vitrine(b.f(-9.6, 3.6, 0), egyptFill);
  for (const x of [-10.8, -9.6, -8.4]) amphora(b.f(x, 8.6, 0), pick([0xd9c8a0, 0x5fa8a0, TERRA]));
  // aile grecque
  for (const z of [-6, -3, 3]) statue(b.f(12.4, z, 1));
  for (const z of [-6.8, -4.6]) bust(b.f(8.8, z, 1));
  for (const z of [0.2, 2.0]) amphora(b.f(9.2, z, 0), pick([TERRA, 0x1a1a1a]));
  {
    const g = b.g();
    b.box(10.8, 0, -1.2, 0.62, 1.3, 0.62, 'stone', MARBLE, { group: g, shape: 'cyl', cat: 'Collections' });
    b.box(11.2, 0, 0.2, 1.0, 0.56, 0.56, 'stone', MARBLE, { shape: 'wheel', cat: 'Collections' });
  }
  pedestalVase(b.f(7.4, -7.0, 0), 0xe63946);
  // boutique
  bookshelf(b.f(12.65, 6.8, 1), 2.4, 2.0);
  {
    const F = b.f(9.8, 6.0, 0), S = shelfUnit(F, { w: 1.8, h: 1.5, d: 0.45, levels: 3, mat: 'metal', color: 0xd9d2c4, back: false });
    fillShelves(F, S, ['pack', 'pack', 'cereal'], 0, true);
  }
  {
    const F = b.f(9.5, 8.3, 2);
    counter(F, 2.0, 0.6, 1.0, 0x3b2a1f, 'stone', MARBLE);
    monitor(F.sub(-0.4, 0, 0), 1.0);
    officeChair(F.sub(-0.4, -0.8, 2));
  }
  {
    const g = b.g(), o = { group: g, cat: 'Mobilier' };
    b.box(7.6, 0, 6.3, 0.4, 0.03, 0.4, 'metal', 0x2b2b2b, o);
    b.box(7.6, 0.03, 6.3, 0.05, 1.6, 0.05, 'metal', 0x9aa0a6, o);
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) b.box(7.6 + s * 0.07, 0.5 + k * 0.3, 6.3, 0.1, 0.14, 0.01, 'paper', pick(PAL.cereal), { group: g, cat: 'Paperasse' });
  }
  // mur nord : armures et tapisserie
  for (const x of [-5.5, -3.8, -2.1, -0.4, 1.3]) armor(b.f(x, -9.55, 2));
  wallArt(b, W, D, 'n', -2.1, 2.9, 12, 5, 0.25, 'tapisserie', { gold: false });
  wallArt(b, W, D, 'w', 5.6, 3.3, 5, 4, 0.25, 'paysage');
  for (const [x, z] of [[-12.6, -9.6], [12.6, 9.6], [-12.6, 9.6], [0, -2.9]]) b.box(x, H - 0.16, z, 0.14, 0.16, 0.14, 'plastic', 0x1a1a1a, { hang: true, cat: 'Électronique' });
  for (const [x, z, lit] of [[-10, -3, true], [-10, 4, true], [10, -3, true], [10, 4, true], [-4, 7.5, true], [4, 7.5, false], [-2, -7, false], [8, -7.5, true]])
    pendant(b, x, z, H, 1.6, lit ? { i: 16, d: 12 } : null, 0xc9a227);

  // ---- étage : la galerie autour de l'atrium
  b.at(up.R, () => {
    perimeter(b, W, D, H2, 0xf4f2ee, { s: [win(-3, 3)], e: [win(-2, 2)] }, { band: { rows: [0], color: TRIM }, frame: 0x5a4a3a });
    brickWall(b, 'z', -7, -D / 2, D / 2, H2, 0.12, 0xf4f2ee, [{ a0: -1.2, a1: 1.2, y0: 0, y1: 2.6 }]);
    atriumRail(b, ax0, ax1, az0, az1);
    // le chef-d'œuvre, sous vitre blindée
    wallArt(b, W, D, 'n', -3.2, 0.9, 6, 8, 0.16, 'joconde', { special: { i: 2, j: 5, o: { label: 'masterpiece', value: 40000 } } });
    b.box(-3.2, 0, -9.4, 1.8, 2.6, 0.04, 'glass', 0xd6ecff, { cat: 'Vitres', vary: 0, hp: 80 });
    queuePosts(b, -4.8, -1.6, -8.3);
    wallArt(b, W, D, 'n', -5.8, 1.1, 4, 5, 0.2, 'portrait');
    wallArt(b, W, D, 'n', -0.6, 1.1, 5, 4, 0.2, 'paysage');
    wallArt(b, W, D, 'n', 7.5, 1.2, 7, 4, 0.22, 'nuit');
    wallArt(b, W, D, 's', -5, 1.0, 5, 4, 0.2, 'mer');
    wallArt(b, W, D, 's', 5.5, 1.0, 5, 4, 0.22, 'paysage');
    wallArt(b, W, D, 's', 10, 1.0, 4, 5, 0.2, 'abstrait');
    wallArt(b, W, D, 'e', -6, 1.0, 4, 5, 0.2, 'portrait');
    wallArt(b, W, D, 'e', 5.5, 1.0, 6, 4, 0.2, 'nuit');
    painting(b.f(-6.94 + 0.025, -6, 3), 1.0, 5, 4, 0.2, 'paysage');
    painting(b.f(-6.94 + 0.025, 5.5, 3), 1.0, 5, 4, 0.2, 'mer');
    // joyaux
    for (const z of [-4.5, -1.5, 1.5, 4.5]) vitrine(b.f(9.5, z, 0), jewelFill);
    for (const [x, z] of [[-2.5, 5.6], [2.5, 5.6]]) museumBench(b.f(x, z, 0));
    museumBench(b.f(6.4, 0, 1));
    statue(b.f(0, 8.3, 0));
    pedestalVase(b.f(-5.6, -4.2, 0), 0xffb703);
    pedestalVase(b.f(5.6, -4.2, 0), 0x9d4edd);
    // salle d'art contemporain, derrière la cloison
    wallArt(b, W, D, 'w', -5, 0.9, 6, 5, 0.25, 'blanc', { gold: false });
    wallArt(b, W, D, 'w', 5, 0.9, 6, 6, 0.2, 'mondrian', { gold: false });
    painting(b.f(-7.06 - 0.025, 6, 1), 1.0, 5, 5, 0.2, 'abstrait', { gold: false });
    {
      // la banane scotchée : le prix d'une voiture
      const g = b.g();
      b.box(-12.975, 1.5, 0, 0.05, 0.06, 0.24, 'food', 0xf5d90a, { group: g, mount: true, cat: 'Collections', value: 12000 });
      b.box(-12.99, 1.49, 0, 0.02, 0.08, 0.07, 'paper', 0xcfcfc8, { group: g, mount: true, cat: 'Collections' });
      b.box(-12.99, 1.0, 0.45, 0.02, 0.12, 0.18, 'paper', 0xf2ede0, { mount: true, cat: 'Paperasse' });
    }
    {
      const g = b.g();
      b.box(-10.5, 0, -2.5, 0.6, 1.0, 0.6, 'stone', 0xf4f2ee, { group: g, cat: 'Déco' });
      b.box(-10.5, 1.0, -2.5, 0.42, 0.5, 0.36, 'ceramic', 0xfdfdfd, { group: g, cat: 'Collections', value: 9000 });
      b.box(-10.5, 1.3, -2.5, 0.3, 0.06, 0.26, 'ceramic', 0xeeeeee, { group: g, cat: 'Collections' });
    }
    {
      const g = b.g();
      for (let L = 0; L < 2; L++) for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++)
        b.box(-10.6 + i * 0.23, L * 0.07, 3.5 + k * 0.12, 0.22, 0.07, 0.11, 'stone', 0xa0522d, { group: g, cat: 'Collections', vary: 0.04 });
    }
    {
      const g = b.g(), o = { group: g, cat: 'Collections' };
      b.box(-9.3, 0, -7.2, 0.5, 0.9, 0.5, 'metal', 0xd62828, o);
      b.box(-9.1, 0.9, -7.1, 0.3, 1.1, 0.3, 'metal', 0xd62828, o);
      b.box(-9.0, 2.0, -7.1, 0.9, 0.2, 0.2, 'metal', 0xffc300, o);
    }
    for (const [x, c] of [[-11.5, 0xff4fa0], [-10.3, 0x3ee6ff], [-9.1, 0xffd23e]])
      b.box(x, 1.8, -9.985, 1.0, 0.06, 0.03, 'neon', c, { mount: true, cat: 'Luminaires', vary: 0 });
    museumBench(b.f(-10.8, 0.5, 1));
    for (const [x, z, lit] of [[-10, -5.5, true], [-10, 5, true], [-3.5, -6.5, true], [-3.5, 6.5, false], [4, -6.5, false], [4, 6.5, true], [10, -6.5, true], [10.5, 0, false], [10, 6.5, true]])
      panel(b, x, z, H2, lit ? { i: 13 } : null);
    skylight(b, W, D, H2, 0xf4f2ee, atrium);
  });
  return { spawn: { x: 0, z: 8.6, yaw: 0 }, cam: { x: -9.5, y: 3.6, z: 8.6, tx: 1, ty: 3.2, tz: -1 } };
}

// ------------------------------------------------------------------ la cour : décor extérieur cassable
function trashBin(b, x, z, color = 0x2f6b3a) {
  const g = b.g(), o = { group: g, cat: 'Mobilier' };
  b.box(x, 0, z, 0.5, 0.9, 0.5, 'plastic', color, { ...o, shape: 'cyl' });
  b.box(x, 0.9, z, 0.56, 0.07, 0.56, 'plastic', 0x1a1a1a, { ...o, shape: 'cyl' });
  if (Math.random() < 0.6) b.box(x + 0.05, 0.97, z, 0.18, 0.1, 0.14, 'paper', pick([0xd62828, 0xffffff, 0xb08050]), { cat: 'Paperasse' });
}
function bench(F, wood = 0x8a5a33) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  for (const s of [-1, 1]) F.box(s * 0.7, 0, 0.02, 0.06, 0.42, 0.42, 'metal', 0x2b2b2b, o);
  F.box(0, 0.42, 0, 1.7, 0.06, 0.44, 'wood', wood, o);
  for (const s of [-1, 1]) F.box(s * 0.7, 0.48, 0.2, 0.06, 0.42, 0.06, 'metal', 0x2b2b2b, o);
  F.box(0, 0.62, 0.2, 1.7, 0.24, 0.05, 'wood', wood, o);
}
function bollard(b, x, z, band = 0xffc300) {
  const g = b.g();
  b.box(x, 0, z, 0.16, 0.85, 0.16, 'metal', 0x2b2f36, { group: g, shape: 'cyl', cat: 'Mobilier' });
  b.box(x, 0.65, z, 0.17, 0.06, 0.17, 'plastic', band, { group: g, shape: 'cyl', cat: 'Mobilier' });
}
function planter(F, w, d, { box = 0x6b6b66, mat = 'stone', flowers = [0xe63946, 0xffb703, 0xf1faee], shrub = false } = {}) {
  const g = F.b.g();
  F.box(0, 0, 0, w, 0.5, d, mat, box, { group: g, cat: 'Déco' });
  F.box(0, 0.5, 0, w - 0.1, 0.04, d - 0.1, 'food', 0x4a3424, { group: g, cat: 'Déco' });
  const gp = F.b.g(), n = Math.max(2, Math.round(w / 0.25));
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + 0.15 + (w - 0.3) * (i / (n - 1));
    if (shrub) F.box(lx, 0.54, 0, 0.26, 0.5 + Math.random() * 0.2, Math.min(0.3, d - 0.2), 'food', pick([0x2d6a4f, 0x40916c, 0x1b4332]), { group: gp, cat: 'Déco' });
    else {
      F.box(lx, 0.54, 0, 0.12, 0.22, 0.12, 'food', 0x2d6a4f, { group: gp, cat: 'Déco' });
      F.box(lx, 0.76, 0, 0.14, 0.08, 0.14, 'food', pick(flowers), { group: gp, cat: 'Déco' });
    }
  }
}
function topiaryPlanter(F) {
  const g = F.b.g();
  F.box(0, 0, 0, 0.9, 0.8, 0.9, 'stone', 0xf0ece4, { group: g, cat: 'Déco' });
  F.box(0, 0.8, 0, 0.98, 0.08, 0.98, 'stone', 0xc9a227, { group: g, cat: 'Déco' });
  const gt = F.b.g();
  F.cyl(0, 0.88, 0, 0.1, 0.5, 'wood', 0x5c3317, { group: gt, cat: 'Déco' });
  F.box(0, 1.38, 0, 0.8, 0.8, 0.8, 'food', 0x2d6a4f, { group: gt, cat: 'Déco' });
  F.box(0, 2.18, 0, 0.5, 0.5, 0.5, 'food', 0x40916c, { group: gt, cat: 'Déco' });
}
function lampPost(b, x, z, color = 0x1a1a1a, fancy = false) {
  const g = b.g(), o = { group: g, cat: 'Luminaires' };
  b.box(x, 0, z, 0.3, 0.2, 0.3, 'metal', color, { ...o, shape: 'cyl' });
  b.box(x, 0.2, z, 0.1, 3.0, 0.1, 'metal', color, { ...o, shape: 'cyl' });
  b.box(x, 3.2, z, fancy ? 0.36 : 0.5, 0.35, fancy ? 0.36 : 0.3, 'metal', color, o);
  b.box(x, 3.25, z, fancy ? 0.28 : 0.4, 0.25, fancy ? 0.28 : 0.22, 'neon', 0xfff1d6, { group: g, cat: 'Luminaires', vary: 0 });
  if (fancy) b.box(x, 3.55, z, 0.16, 0.12, 0.16, 'metal', 0xc9a227, o);
}
function aFrame(F, color = 0x1a1a1a) {
  const g = F.b.g();
  F.box(0, 0, 0, 0.62, 0.05, 0.4, 'wood', 0x5c3317, { group: g, cat: 'Déco' });
  F.box(0, 0.05, 0, 0.6, 0.95, 0.04, 'wood', 0x5c3317, { group: g, cat: 'Déco' });
  F.box(0, 0.12, -0.03, 0.5, 0.8, 0.02, 'paper', color, { group: g, cat: 'Déco' });
}
function parasolTable(F, canopy = 0xd62828) {
  const h = table(F, { w: 0.8, d: 0.8, h: 0.74, top: 'metal', tc: 0xe6e6e6, lm: 'metal', lc: 0x2b2b2b });
  const g = F.b.g();
  F.cyl(0, h, 0, 0.05, 1.5, 'metal', 0xdddddd, { group: g, cat: 'Déco' });
  F.box(0, h + 1.5, 0, 2.0, 0.08, 2.0, 'fabric', canopy, { group: g, cat: 'Déco' });
  F.box(0, h + 1.58, 0, 1.2, 0.1, 1.2, 'fabric', 0xffffff, { group: g, cat: 'Déco' });
  F.cyl(0.2, h, 0.15, 0.07, 0.12, 'glass', 0xe0f2ff, { cat: 'Vaisselle', vary: 0 });
  chair(F.sub(0, -0.7, 2), 0x2b2b2b); chair(F.sub(0, 0.7, 0), 0x2b2b2b);
}
function posterStand(F, color) {
  const g = F.b.g(), o = { group: g, cat: 'Déco' };
  for (const s of [-1, 1]) F.box(s * 0.5, 0, 0, 0.06, 1.9, 0.06, 'metal', 0x1a1a1a, o);
  F.box(0, 0.5, 0, 1.06, 1.4, 0.05, 'metal', 0xc9a227, o);
  F.box(0, 0.55, -0.03, 0.96, 1.3, 0.01, 'paper', color, o);
}
function dumpster(F, color = 0x2f6b3a) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  for (const s of [-1, 1]) F.box(s * 0.8, 0, 0, 0.12, 0.15, 0.9, 'plastic', 0x111111, o);
  F.box(0, 0.15, 0, 2.0, 1.1, 1.1, 'metal', color, o);
  F.box(0, 1.25, 0.05, 2.02, 0.08, 1.12, 'plastic', 0x1a1a1a, o);
  if (Math.random() < 0.8) F.box(0.4, 1.33, 0, 0.5, 0.35, 0.4, 'paper', 0xb08050, { cat: 'Marchandise' });
}
function vending(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  F.box(0, 0, 0.15, 0.9, 1.85, 0.45, 'metal', 0xc0271c, o);
  F.box(0, 0, -0.22, 0.9, 0.5, 0.3, 'metal', 0xc0271c, o);
  F.box(0, 1.65, -0.22, 0.9, 0.2, 0.3, 'metal', 0xc0271c, o);
  F.box(-0.42, 0.5, -0.22, 0.06, 1.15, 0.3, 'metal', 0xc0271c, o);
  F.box(0.37, 0.5, -0.22, 0.16, 1.15, 0.3, 'metal', 0xa61f16, o);
  F.box(0.37, 0.9, -0.38, 0.12, 0.3, 0.02, 'screen', 0x4ade80, { ...o, vary: 0 });
  F.box(-0.05, 0.5, -0.36, 0.68, 1.15, 0.02, 'glass', 0xd8f0ff, { group: g, cat: 'Vitres', vary: 0 });
  for (let r = 0; r < 4; r++) {
    const y = 0.5 + r * 0.28;
    if (r > 0) F.box(-0.05, y - 0.02, -0.2, 0.68, 0.02, 0.28, 'metal', 0x9aa0a6, o);
    for (let c = 0; c < 4; c++) F.cyl(-0.3 + c * 0.16, y, -0.2, 0.07, 0.13, 'metal', pick(PAL.can), { cat: 'Marchandise' });
  }
}
function tree(b, x, z, s = 1) {
  const g = b.g();
  b.box(x, 0, z, 0.28 * s, 2.2 * s, 0.28 * s, 'wood', 0x5b3a1e, { group: g, shape: 'cyl', cat: 'Déco' });
  b.box(x, 2.2 * s, z, 2.0 * s, 1.3 * s, 2.0 * s, 'food', 0x3f6b2a, { group: g, cat: 'Déco' });
  b.box(x, 3.5 * s, z, 1.3 * s, 0.8 * s, 1.3 * s, 'food', 0x4f7f32, { group: g, cat: 'Déco' });
}
function flowerBed(b, x0, x1, z, d = 0.9) {
  const g = b.g();
  b.box((x0 + x1) / 2, 0, z, x1 - x0, 0.12, d, 'food', 0x4a3424, { group: g, cat: 'Déco', vary: 0.02 });
  const gf = b.g();
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.35) for (const dz of [-d / 4, d / 4]) {
    b.box(x, 0.12, z + dz, 0.14, 0.24, 0.14, 'food', 0x2d6a4f, { group: gf, cat: 'Déco' });
    b.box(x, 0.36, z + dz, 0.16, 0.1, 0.16, 'food', pick([0xe63946, 0xffb703, 0xc77dff, 0xffffff, 0xff6b9a]), { group: gf, cat: 'Déco' });
  }
}
function gnome(F) {
  const g = F.b.g(), o = { group: g, cat: 'Déco' };
  F.cyl(0, 0, 0, 0.26, 0.3, 'ceramic', 0x1d4ed8, o);
  F.cyl(0, 0.3, 0, 0.2, 0.16, 'ceramic', 0xf1c7a0, o);
  F.box(0, 0.3, -0.08, 0.14, 0.12, 0.06, 'ceramic', 0xffffff, o);
  F.cyl(0, 0.46, 0, 0.18, 0.1, 'ceramic', 0xd62828, o);
  F.cyl(0, 0.56, 0, 0.1, 0.14, 'ceramic', 0xd62828, o);
}
function mailbox(F) {
  const g = F.b.g(), o = { group: g, cat: 'Déco' };
  F.box(0, 0, 0, 0.1, 1.0, 0.1, 'wood', 0x5c3317, o);
  F.box(0, 1.0, 0, 0.3, 0.35, 0.45, 'metal', 0xf2c200, o);
  F.box(0.17, 1.2, -0.1, 0.03, 0.2, 0.05, 'metal', 0xd62828, o);
}
function bbq(F) {
  const g = F.b.g(), o = { group: g, cat: 'Électroménager' };
  for (const s of [-1, 1]) F.box(s * 0.2, 0, 0, 0.05, 0.6, 0.05, 'metal', 0x1a1a1a, o);
  F.cyl(0, 0.6, 0, 0.6, 0.3, 'metal', 0x111111, o);
  F.cyl(0, 0.9, 0, 0.62, 0.2, 'metal', 0x1a1a1a, o);
}
function flagPole(b, x, z, color) {
  const g = b.g(), o = { group: g, cat: 'Déco' };
  b.box(x, 0, z, 0.36, 0.2, 0.36, 'stone', 0xd9d2c4, o);
  b.box(x, 0.2, z, 0.08, 5.8, 0.08, 'metal', 0xdddddd, { ...o, shape: 'cyl' });
  b.box(x + 0.62, 4.9, z, 1.2, 0.8, 0.03, 'fabric', color, o);
}
function popcornCart(F) {
  const g = F.b.g(), o = { group: g, cat: 'Mobilier' };
  for (const s of [-1, 1]) F.cyl(s * 0.5, 0, 0.3, 0.1, 0.35, 'plastic', 0x111111, o);
  F.box(0, 0.35, 0, 1.2, 0.6, 0.7, 'metal', 0xc0271c, o);
  F.box(0, 0.95, 0, 1.0, 0.7, 0.6, 'glass', 0xfff3c4, { group: g, cat: 'Vitres', vary: 0 });
  F.box(0, 1.65, 0, 1.2, 0.1, 0.7, 'metal', 0xffc300, o);
  for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) F.box(-0.36 + i * 0.18, 0.95, -0.18 + k * 0.18, 0.16, 0.14, 0.16, 'food', 0xffe08a, { group: g, cat: 'Marchandise', vary: 0.08 });
}
function crowdRope(b, x0, x1, z) { queuePosts(b, x0, x1, z); }

// chaque niveau a sa cour : W, D = dimensions du bâtiment ; la cour fait ~4 m autour
function outdoorShop(b, W, D) {
  const zf = D / 2 + 0.22;
  for (const x of [6.3, 7.1, 7.9]) cart(b.f(x, zf + 2.2, 0));
  trashBin(b, -3, zf + 1.1); trashBin(b, 3.2, zf + 1.1, 0x1d4ed8);
  for (let x = -11; x <= 11; x += 2.2) if (Math.abs(x) > 2.4) bollard(b, x, zf + 3.3);
  bench(b.f(-7.5, zf + 2.2, 0));
  aFrame(b.f(-2.4, zf + 2.4, 0), 0xd62828);
  planter(b.f(-11.5, zf + 1.0, 0), 2.2, 0.7); planter(b.f(11.5, zf + 1.0, 0), 2.2, 0.7);
  vending(b.f(W / 2 + 1.1, 3, 1));
  vending(b.f(W / 2 + 1.1, 4.1, 1));
  dumpster(b.f(4, -zf - 1.4, 0)); dumpster(b.f(7, -zf - 1.4, 0), 0x1d4ed8);
  cartonPallet(b, -W / 2 - 2, -4, 2); cartonPallet(b, -W / 2 - 2, -1.5, 3);
  lampPost(b, -14.5, zf + 3.4); lampPost(b, 14.5, zf + 3.4);
}
function outdoorResto(b, W, D) {
  const zf = D / 2 + 0.22;
  for (const x of [-7.5, -4.2, 4.2, 7.5]) parasolTable(b.f(x, zf + 2, 0), pick([0xd62828, 0x1d4ed8, 0x2d6a4f]));
  aFrame(b.f(2.1, zf + 0.9, 0));
  for (const x of [-11.5, 11.5]) planter(b.f(x, zf + 1.2, 0), 2.0, 0.6, { box: 0x5c3317, mat: 'wood' });
  planter(b.f(W / 2 + 1.2, 0, 1), 3.0, 0.6, { box: 0x5c3317, mat: 'wood' });
  planter(b.f(-W / 2 - 1.2, 0, 1), 3.0, 0.6, { box: 0x5c3317, mat: 'wood' });
  trashBin(b, W / 2 + 1.5, -4); trashBin(b, W / 2 + 1.5, -4.8, 0x1d4ed8);
  dumpster(b.f(-5, -zf - 1.4, 0));
  for (let i = 0; i < 4; i++) {
    const F = b.f(2 + i * 0.5, -zf - 0.6, 0), g = b.g();
    F.box(0, 0, 0, 0.42, 0.28, 0.32, 'plastic', 0x2d6a4f, { group: g, cat: 'Marchandise' });
    fillRow(F, 0.28, -0.18, 0.18, 0, 0.35, 'wine', 0.01);
  }
  lampPost(b, -12.5, zf + 3.3, 0x2b2b2b, true); lampPost(b, 12.5, zf + 3.3, 0x2b2b2b, true);
}
function outdoorOffice(b, W, D) {
  const zf = D / 2 + 0.22;
  bench(b.f(-6.5, zf + 2.6, 0), 0x6b7280); bench(b.f(6.5, zf + 2.6, 0), 0x6b7280);
  trashBin(b, -3, zf + 1.1, 0x6b7280); trashBin(b, 3, zf + 1.1, 0x6b7280);
  for (const x of [-10, 10]) planter(b.f(x, zf + 1.1, 0), 2.4, 0.8, { shrub: true });
  for (const z of [-3, 3]) { planter(b.f(W / 2 + 1.3, z, 1), 2.4, 0.8, { shrub: true }); planter(b.f(-W / 2 - 1.3, z, 1), 2.4, 0.8, { shrub: true }); }
  {
    const F = b.f(-3.6, zf + 3.2, 0), g = b.g();
    F.box(0, 0, 0, 2.4, 1.3, 0.4, 'stone', 0x3a3f47, { group: g, cat: 'Déco' });
    F.box(0, 0.3, -0.21, 2.0, 0.7, 0.02, 'plastic', 0x2d6cdf, { group: g, cat: 'Déco' });
  }
  for (let x = -13; x <= 13; x += 2.6) if (Math.abs(x) > 2.5) bollard(b, x, zf + 3.6, 0xffffff);
  dumpster(b.f(-6, -zf - 1.4, 0), 0x6b7280);
  lampPost(b, -15.5, zf + 3.5); lampPost(b, 15.5, zf + 3.5);
}
function outdoorHouse(b, W, D) {
  const zf = D / 2 + 0.22;
  for (let z = zf + 0.5; z < zf + 3.8; z += 0.8) b.box(-6.1, 0, z, 0.7, 0.03, 0.6, 'stone', 0xb8b2a6, { cat: 'Déco', vary: 0.05 });
  flowerBed(b, -4.6, -0.5, zf + 0.6); flowerBed(b, 1.5, 7, zf + 0.6);
  mailbox(b.f(-4.9, zf + 3.4, 0));
  parasolTable(b.f(7.5, zf + 2.6, 0), 0xffb703);
  bbq(b.f(W / 2 + 1.3, 5, 0));
  gnome(b.f(-8.5, zf + 2.2, 0)); gnome(b.f(-9.3, zf + 3.1, 1));
  tree(b, W / 2 + 2, -D / 2 - 1.5); tree(b, -W / 2 - 2, -D / 2 - 1.8, 1.2); tree(b, -W / 2 - 2.2, 4, 0.9);
  trashBin(b, -W / 2 - 1.2, -2); trashBin(b, -W / 2 - 1.2, -2.8, 0xf2c200);
  flowerBed(b, -6, 6, -zf - 1.2, 1.2);
}
function outdoorBank(b, W, D) {
  const zf = D / 2 + 0.22;
  for (let x = -12; x <= 12; x += 1.8) if (Math.abs(x) > 2.4) bollard(b, x, zf + 1.6, 0xc9a227);
  bench(b.f(-8, zf + 3.1, 0), 0x3b2314); bench(b.f(8, zf + 3.1, 0), 0x3b2314);
  for (const x of [-5, 5]) planter(b.f(x, zf + 3.1, 0), 2.2, 0.7, { box: 0xd9d2c4, shrub: true });
  for (const [i, c] of [[0, 0x1d4ed8], [1, 0xffffff], [2, 0xd62828]]) flagPole(b, -W / 2 - 2.6, -2 + i * 1.8, c);
  atm(b.f(10.6, D / 2 + 0.22 + 0.32, 2));
  trashBin(b, 3.1, zf + 3.2, 0x2b2b2b);
  {
    const F = b.f(W / 2 + 1.8, -5, 1), g = b.g(), o = { group: g, cat: 'Mobilier' };
    F.box(0, 0, 0, 1.4, 2.3, 1.4, 'metal', 0x3a3f47, o);
    F.box(0, 1.1, -0.71, 1.0, 0.7, 0.02, 'glass', 0xcfe8ff, { group: g, cat: 'Vitres', vary: 0 });
  }
  lampPost(b, -14, zf + 3.4, 0x1a1a1a, true); lampPost(b, 14, zf + 3.4, 0x1a1a1a, true);
}
function outdoorCinema(b, W, D) {
  const zf = D / 2 + 0.22;
  trashBin(b, -3.2, zf + 1.2, 0x2b2b2b); trashBin(b, 3.2, zf + 1.2, 0x2b2b2b);
  for (const x of [-10, -6.5, 6.5, 10]) posterStand(b.f(x, zf + 2.6, 0), pick([0x1d4ed8, 0xd62828, 0xffc300, 0x6d28d9, 0x16a34a]));
  popcornCart(b.f(-13.5, zf + 2, 0));
  crowdRope(b, -2.6, 2.6, zf + 3.2);
  bench(b.f(13.5, zf + 2.6, 0), 0x2a1a1f);
  standee(b.f(-W / 2 - 1.6, 5, 1), 0xd62828);
  trashBin(b, W / 2 + 1.2, -3, 0x2b2b2b);
  dumpster(b.f(0, -zf - 1.4, 0), 0x2b2b2b);
  lampPost(b, -15.8, zf + 3.6, 0x1a1a1a, true); lampPost(b, 15.8, zf + 3.6, 0x1a1a1a, true);
}
function outdoorHotel(b, W, D) {
  const zf = D / 2 + 0.22;
  b.box(0, 0, zf + 2, 2.2, 0.015, 4, 'fabric', 0x9b1b30, { cat: 'Déco', vary: 0 });
  for (const x of [-4.2, 4.2, -9, 9, -13.5, 13.5]) topiaryPlanter(b.f(x, zf + 1.2, 0));
  {
    const F = b.f(2.7, zf + 1.3, 0), g = b.g();
    F.box(0, 0, 0, 0.6, 1.1, 0.5, 'wood', 0x3b2314, { group: g, cat: 'Mobilier' });
    F.box(0, 1.1, 0, 0.66, 0.04, 0.56, 'metal', 0xc9a227, { group: g, cat: 'Mobilier' });
    F.box(0, 1.14, 0, 0.3, 0.04, 0.24, 'paper', 0x7a1f1f, { cat: 'Paperasse' });
  }
  luggageCart(b.f(-6.5, zf + 3, 0));
  for (const x of [-11, 11]) bench(b.f(x, zf + 3.3, 0), 0x3b2314);
  lampPost(b, -2.2, zf + 3.4, 0x1a1a1a, true); lampPost(b, 2.2, zf + 3.4, 0x1a1a1a, true);
  for (const z of [-6, 0, 6]) { topiaryPlanter(b.f(W / 2 + 1.6, z, 0)); topiaryPlanter(b.f(-W / 2 - 1.6, z, 0)); }
}

function outdoorGarage(b, W, D) {
  const zf = D / 2 + 0.22;
  // voiture d'occasion à vendre, et l'épave du fond de cour
  car(b.f(8.2, zf + 2.2, 1), 0x16a34a);
  {
    const F = b.f(8.2, zf + 2.2, 0), g = b.g();
    F.box(0, 1.37, 0, 0.5, 0.3, 0.02, 'paper', 0xffc300, { group: g, cat: 'Paperasse' });
    F.box(0, 1.35, 0, 0.05, 0.02, 0.05, 'plastic', 0x111111, { group: g, cat: 'Paperasse' });
  }
  car(b.f(W / 2 + 2, -3.5, 0), 0x7a4a2a, { glass: false });
  for (const [x, z, n] of [[-13.6, zf + 1, 5], [-14.3, zf + 1.6, 4], [-13.5, zf + 2.3, 3], [W / 2 + 1.4, 4.5, 4], [W / 2 + 2.2, 4.5, 2]]) tyreStack(b, x, z, n);
  for (const [x, z] of [[-W / 2 - 1.2, -3], [-W / 2 - 1.2, -2.3], [-W / 2 - 1.9, -3]]) drum(b, x, z, pick([0x1d4ed8, 0xd62828, 0x2b2b2b]));
  dumpster(b.f(-4, -zf - 1.4, 0), 0x6b7280);
  cartonPallet(b, 2, -zf - 1.3, 2);
  {
    // l'enseigne sur la façade
    const g = b.g(), z = zf + 0.03;
    b.box(-4.5, 3.95, z, 13, 0.6, 0.06, 'plastic', 0xd62828, { group: g, mount: true, cat: 'Déco' });
    b.box(-4.5, 4.12, z + 0.04, 9, 0.24, 0.02, 'plastic', 0xf5f5f5, { group: g, mount: true, cat: 'Déco' });
  }
  {
    // totem au bord de la rue
    const g = b.g(), o = { group: g, cat: 'Déco' };
    b.box(-8, 0, zf + 3.4, 0.5, 0.3, 0.5, 'stone', 0x6b6b66, o);
    b.box(-8, 0.3, zf + 3.4, 0.14, 2.6, 0.14, 'metal', 0x3a3f47, o);
    b.box(-8, 2.9, zf + 3.4, 1.4, 1.0, 0.16, 'plastic', 0xd62828, o);
    b.box(-8, 3.2, zf + 3.3, 1.1, 0.35, 0.02, 'neon', 0xffffff, { group: g, cat: 'Luminaires', vary: 0 });
  }
  {
    // borne de gonflage
    const g = b.g(), o = { group: g, cat: 'Mobilier' };
    b.box(13.5, 0, zf + 2.5, 0.4, 1.2, 0.3, 'metal', 0x1d4ed8, o);
    b.box(13.5, 0.9, zf + 2.34, 0.26, 0.2, 0.02, 'screen', 0x9fd3ff, { ...o, vary: 0 });
  }
  for (let x = -14; x <= 14; x += 2.8) if (x > 2) bollard(b, x, zf + 3.6);
  lampPost(b, -15.5, zf + 3.5); lampPost(b, 15.5, zf + 3.5);
}
function outdoorMuseum(b, W, D) {
  const zf = D / 2 + 0.22;
  b.box(0, 0, zf + 0.7, 6, 0.15, 1.4, 'stone', MARBLE, { cat: 'Déco', vary: 0.02 });
  for (const [x, c] of [[-4.6, 0x9b1b30], [-6.2, 0x1f3d5a], [4.6, 0x9b1b30], [6.2, 0x1f3d5a]]) flagPole(b, x, zf + 2.4, c);
  for (const x of [-9.5, 9.5, -13.5, 13.5]) topiaryPlanter(b.f(x, zf + 1.2, 0));
  posterStand(b.f(-3.2, zf + 3.2, 0), 0x9b1b30);
  posterStand(b.f(3.2, zf + 3.2, 0), 0x1f3d5a);
  crowdRope(b, -2.6, 2.6, zf + 2.4);
  for (const x of [-11.5, 11.5]) bench(b.f(x, zf + 3.2, 0), 0x3b2314);
  trashBin(b, -8, zf + 3.4, 0x2b2b2b); trashBin(b, 8, zf + 3.4, 0x2b2b2b);
  {
    // sculpture monumentale dans la cour
    const g = b.g(), o = { group: g, cat: 'Collections' };
    b.box(-W / 2 - 2, 0, 3, 1.4, 0.3, 1.4, 'stone', 0x6b6b66, { group: g, cat: 'Déco' });
    b.box(-W / 2 - 2.2, 0.3, 3, 0.5, 2.2, 0.5, 'metal', 0xd62828, o);
    b.box(-W / 2 - 1.7, 2.5, 3, 1.4, 0.4, 0.4, 'metal', 0xd62828, o);
    b.box(-W / 2 - 1.2, 1.2, 3, 0.4, 1.3, 0.4, 'metal', 0xd62828, o);
  }
  for (const z of [-6, 0, 6]) topiaryPlanter(b.f(W / 2 + 1.6, z, 0));
  tree(b, -W / 2 - 2, -6); tree(b, -W / 2 - 2.2, -1, 0.9);
  dumpster(b.f(5, -zf - 1.4, 0), 0x2b2b2b);
  lampPost(b, -15.5, zf + 3.5, 0x1a1a1a, true); lampPost(b, 15.5, zf + 3.5, 0x1a1a1a, true);
}

// ------------------------------------------------------------------ catalogue
export const ENVS = [
  {
    id: 'magasin', name: 'Le Magasin', sub: 'Supérette « Prix Cassés »', W: 24, D: 18, H: 3.6, build: buildShop,
    outside: outdoorShop, fence: 'metal', yard: { type: 'pavers', a: '#9a9a94', b: '#8a8a84', size: 0.5 },
    desc: "Des rayons pleins à craquer, des frigos vitrés, une pyramide de conserves, et la réserve à l'étage. Tout est en promo : moins cent pour cent.",
    tags: ['Rayonnages', 'Réserve', 'Conserves'], fragile: 4,
    floor: { type: 'tiles', a: '#d8d8d2', b: '#c6c6bf', size: 0.6 }, ceil: '#f2f2ef',
    sky: 0x9db4c6, ground: 0x4a4d52, sun: 0xffffff, sunI: 1.3, hemi: [0xdfe9f3, 0x6b6b6b, 1.0], env: 0.5, scenery: 'city',
  },
  {
    id: 'restaurant', name: 'Le Restaurant', sub: 'Brasserie « Chez Raymond »', W: 20, D: 16, H: 3.2, build: buildResto,
    outside: outdoorResto, fence: 'metal', yard: { type: 'pavers', a: '#b59a7a', b: '#a58a6a', size: 0.4 },
    desc: "Nappes blanches, lustres dorés, un bar garni jusqu'au plafond, et une salle de banquet à l'étage avec sa pyramide de champagne.",
    tags: ['Vaisselle', 'Bar', 'Banquet'], fragile: 5,
    floor: { type: 'parquet', a: '#5b3a22', b: '#6e4629', size: 0.5 }, ceil: '#e9dcc4',
    sky: 0x1a2336, ground: 0x2a2c30, sun: 0xffd9a8, sunI: 0.9, hemi: [0x6a7aa0, 0x3a2a20, 0.7], env: 0.35, scenery: 'night',
  },
  {
    id: 'bureau', name: 'Le Bureau', sub: 'Open space « SynergiCorp »', W: 24, D: 18, H: 3.2, build: buildOffice,
    outside: outdoorOffice, fence: 'metal', yard: { type: 'pavers', a: '#a8aaad', b: '#989a9d', size: 0.6 },
    desc: "Vingt-huit postes de travail, une salle de réunion vitrée, et la direction à l'étage avec ses serveurs. Idéal pour poser sa démission.",
    tags: ['Écrans', 'Direction', 'Serveurs'], fragile: 3,
    floor: { type: 'carpet', a: '#5f6b78', b: '#56616d', size: 0.5 }, ceil: '#f4f5f6',
    sky: 0xb8c4cc, ground: 0x55585c, sun: 0xf4f8ff, sunI: 1.2, hemi: [0xe8eef5, 0x707070, 1.0], env: 0.5, scenery: 'city',
  },
  {
    id: 'maison', name: 'La Maison', sub: 'Pavillon de belle-maman', W: 18, D: 14, H: 2.8, build: buildHouse,
    outside: outdoorHouse, fence: 'picket', yard: { type: 'grass', a: '#5e8a3a', b: '#4f7a2f', size: 0.5 },
    desc: "Un salon cosy, une cuisine équipée, et à l'étage les chambres et la salle de bains. Tout ce qu'il faut pour un repas de famille mémorable.",
    tags: ['Cuisine', 'Chambres', 'Salle de bains'], fragile: 4,
    floor: { type: 'wood', a: '#a0703f', b: '#8f6234', size: 0.2 }, ceil: '#f7f1e5',
    sky: 0xf0a86a, ground: 0x4f6b35, sun: 0xffc48a, sunI: 1.3, hemi: [0xffd6b0, 0x4a5a3a, 0.9], env: 0.45, scenery: 'suburb',
  },
  {
    id: 'banque', name: 'La Banque', sub: 'Banque « Crédit Cassé »', W: 22, D: 18, H: 4.0, build: buildBank,
    outside: outdoorBank, fence: 'metal', yard: { type: 'pavers', a: '#c9c2b4', b: '#b9b2a4', size: 0.6 },
    desc: "Guichets blindés, distributeurs, colonnes de marbre et, au fond, le coffre-fort : quarante centimètres d'acier. Les armes de poing n'y feront pas grand-chose.",
    tags: ['Coffre-fort', 'Guichets', 'Lingots'], fragile: 2,
    floor: { type: 'tiles', a: '#e9e4da', b: '#d3cbbd', size: 0.8 }, ceil: '#f1ece2',
    sky: 0xa9bccb, ground: 0x55585c, sun: 0xfff6e8, sunI: 1.2, hemi: [0xe6ecf2, 0x6b6b6b, 1.0], env: 0.5, scenery: 'city',
  },
  {
    id: 'cinema', name: 'Le Cinéma', sub: 'Cinéma « Le Grand Fracas »', W: 24, D: 20, H: 5.2, build: buildCinema,
    outside: outdoorCinema, fence: 'metal', yard: { type: 'pavers', a: '#6e6a66', b: '#5e5a56', size: 0.5 },
    desc: "Un hall qui sent le pop-corn, une grande salle en gradins face à un écran géant, et la cabine de projection à l'étage. Silence, on casse.",
    tags: ['Écran géant', 'Gradins', 'Pop-corn'], fragile: 4,
    floor: { type: 'carpet', a: '#5a1f28', b: '#4e1a22', size: 0.5 }, ceil: '#2a2226',
    sky: 0x1a2336, ground: 0x2a2c30, sun: 0xffd9a8, sunI: 1.0, hemi: [0x9a90b0, 0x4a3a3a, 0.95], env: 0.45, scenery: 'night',
  },
  {
    id: 'hotel', name: "L'Hôtel", sub: 'Palace « Le Grand Standing »', W: 24, D: 18, H: 4.8, build: buildHotel,
    outside: outdoorHotel, fence: 'iron', yard: { type: 'cobble', a: '#d8cdb8', b: '#c8bca6', size: 0.5 },
    desc: "Sol de marbre veiné, fontaine, lustres, piano à queue et champagne au bar. À l'étage, la suite avec lit à baldaquin et jacuzzi. Cinq étoiles, pour l'instant.",
    tags: ['Fontaine', 'Piano', 'Suite'], fragile: 5,
    floor: { type: 'marble', a: '#e9dfcd', b: '#d8c9b0', size: 0.6, rough: 0.2 }, ceil: '#f3ecdc',
    sky: 0x8fb3d9, ground: 0x4a4d52, sun: 0xfff3e0, sunI: 1.2, hemi: [0xf0e8d8, 0x6b5a4a, 1.0], env: 0.5, scenery: 'city',
  },
  {
    id: 'garage', name: 'Le Garage', sub: 'Carrosserie « Tôle Froissée »', W: 24, D: 18, H: 4.6, build: buildGarage,
    outside: outdoorGarage, fence: 'metal', yard: { type: 'pavers', a: '#7d7f82', b: '#727477', size: 0.8 },
    desc: "Une voiture sur le pont, une autre capot ouvert, une troisième toute fraîche dans la cabine de peinture vitrée. À l'étage, le stock de pièces et le baby-foot. Le devis va piquer.",
    tags: ['Voitures', 'Pont élévateur', 'Pneus'], fragile: 2,
    floor: { type: 'tiles', a: '#9ea3a8', b: '#949a9f', size: 1.0 }, ceil: '#e8e8e4',
    sky: 0xb3c2cc, ground: 0x55585c, sun: 0xfff4e0, sunI: 1.25, hemi: [0xe0e8ef, 0x6b6b6b, 1.0], env: 0.5, scenery: 'suburb',
  },
  {
    id: 'musee', name: 'Le Musée', sub: 'Musée « des Beaux Dégâts »', W: 26, D: 20, H: 6.0, build: buildMuseum,
    outside: outdoorMuseum, fence: 'iron', yard: { type: 'cobble', a: '#d6cfc0', b: '#c7bfae', size: 0.5 },
    desc: "Un squelette de dinosaure qui passe la tête sous la verrière, des momies, des statues grecques et, à l'étage, la galerie avec son chef-d'œuvre sous vitre blindée. Défense de toucher.",
    tags: ['Dinosaure', 'Momies', "Chef-d'œuvre"], fragile: 5,
    floor: { type: 'marble', a: '#e6e0d4', b: '#d4ccbc', size: 0.8, rough: 0.25 }, ceil: '#f4f2ee',
    sky: 0x9dbad6, ground: 0x4a4d52, sun: 0xfff6e8, sunI: 1.2, hemi: [0xeef0f2, 0x6b6b6b, 1.0], env: 0.5, scenery: 'city',
  },
];
