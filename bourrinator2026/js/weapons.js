// Armes : définitions, modèles 3D (vue à la 1re personne) et logique de tir.
import * as THREE from 'three';
import { MATS } from './world.js';

export const WEAPONS = [
  { id: 'masse', name: 'La Masse', nick: '« L\'argument massue »', kind: 'melee', dmg: 170, radius: 0.9, range: 2.9, force: 9, rate: 1.0, hitDelay: 0.3, mag: Infinity, shake: 0.5, ch: 'melee',
    stats: { deg: 5, cad: 1, por: 1, bor: 4 }, desc: 'Lente, lourde, définitive. Chaque coup est une réforme structurelle.' },
  { id: 'batte', name: 'La Batte', nick: '« La diplomate »', kind: 'melee', dmg: 80, radius: 0.5, range: 2.6, force: 15, rate: 0.48, hitDelay: 0.14, mag: Infinity, shake: 0.28, ch: 'melee',
    stats: { deg: 3, cad: 3, por: 1, bor: 3 }, desc: 'Rapide et joueuse. Envoie les bibelots faire un tour en orbite.' },
  { id: 'pelle', name: 'La Pelle', nick: '« La terrassière »', kind: 'melee', dmg: 80, radius: 0.5, range: 2.8, force: 12, rate: 0.55, hitDelay: 0.2, mag: Infinity, shake: 0.3, ch: 'melee',
    dig: { ground: 8, earth: 14 },
    stats: { deg: 3, cad: 3, por: 1, bor: 3 }, desc: 'Imbattable pour creuser : dalle et terre partent à chaque coup. Pour le reste, elle tape comme une batte.' },
  { id: 'minigun', name: 'La Minigun', nick: '« La moissonneuse »', kind: 'hitscan', dmg: 30, radius: 0.24, range: 90, force: 4, rate: 0.035, auto: true, spin: 0.5, mag: 150, reload: 3.2, spread: 0.03, shake: 0.045, ch: 'gun', snd: 'minigun',
    stats: { deg: 3, cad: 5, por: 4, bor: 5 }, desc: 'Six canons qui tournent, trente balles à la seconde. Le temps qu\'elle démarre, faites vos prières.' },
  { id: 'tronconneuse', name: 'La Tronçonneuse', nick: '« La débiteuse »', kind: 'saw', dmg: 36, range: 2.1, force: 2.5, rate: 0.07, auto: true, mag: Infinity, shake: 0.05, ch: 'drill',
    mult: { wood: 3, fabric: 3, plastic: 2.5, paper: 3, food: 3, movie: 3, floorboard: 2.5, ground: 0.7, earth: 0.35, plaster: 1, ceiling: 1, stone: 0.5, glass: 1, bottle: 1, ceramic: 0.8, screen: 1, neon: 1, metal: 0.3, steel: 0.02 },
    stats: { deg: 4, cad: 5, por: 1, bor: 4 }, desc: 'Coupe net tout ce qui est en bois, en tissu ou en plastique. Le métal, elle le chatouille ; le coffre, elle n\'y touche pas.' },
  { id: 'mine', name: 'La Mine', nick: '« Le compte à rebours »', kind: 'mine', dmg: 450, radius: 3.3, force: 18, range: 3.5, rate: 0.6, auto: false, mag: Infinity, fuse: 4, shake: 0.35, ch: 'drill',
    stats: { deg: 5, cad: 2, por: 2, bor: 5 }, desc: 'Posez-la où vous voulez, reculez, comptez jusqu\'à quatre. Enfin, trois et demi, par prudence.' },
  { id: 'roquette', name: 'Le Lance-Roquette', nick: '« Le point final »', kind: 'rocket', dmg: 420, radius: 3.4, force: 17, rate: 0.9, auto: false, mag: 1, reload: 1.3, speed: 34, shake: 0.35, ch: 'rocket',
    stats: { deg: 5, cad: 1, por: 5, bor: 5 }, desc: 'Pour les discussions qui ont assez duré. Reculez un peu, quand même.' },
  { id: 'bombinette', name: 'La Bombinette', nick: '« Le sourire qui rase »', kind: 'bomb', share: 0.3, range: 3.5, rate: 1, auto: false, mag: 1, reload: 25, fuse: 5, radius: 6, shake: 1, ch: 'drill',
    stats: { deg: 5, cad: 1, por: 2, bor: 5 }, desc: 'Petite, ronde, souriante. Posez-la, filez, et trente pour cent du bâtiment partent en fumée. Une nouvelle toutes les 25 secondes.' },
];

const PEN = new Set(['glass', 'bottle', 'paper', 'neon', 'ceramic', 'food']);

// ---------------------------------------------------------------- modèles
const std = (color, metal = 0, rough = 0.6) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
const MT = {
  gun: std(0x2a2c30, 0.75, 0.38), gun2: std(0x3d4148, 0.7, 0.45), steel: std(0x8d949c, 0.9, 0.3), dark: std(0x3a3d42, 0.85, 0.35),
  wood: std(0x7b4a26, 0, 0.55), woodL: std(0xd9a36a, 0, 0.45), black: std(0x141414, 0, 0.85), yellow: std(0xd9a200, 0.2, 0.6),
  olive: std(0x4d5a2c, 0.3, 0.6), orange: std(0xf26b1d, 0.1, 0.5), white: std(0xcfc9bf, 0.05, 0.6), bomb: std(0x0e0e0e, 0.25, 0.4), fuse: std(0xc9a46a, 0, 0.9), red: std(0xc0271c, 0.2, 0.5), tape: std(0x222222, 0, 0.95),
};
const LED = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
// place les maillons de la chaîne autour du guide, décalés de « off » (en mètres)
function chainAt(head, off) {
  const { per, L, rr, links } = head.userData;
  links.forEach((m, k) => {
    let s = ((k / links.length) * per + off) % per; if (s < 0) s += per;
    if (s < L) { m.position.set(0, rr, -s); m.rotation.x = 0; }
    else if (s < L + Math.PI * rr) { const a = (s - L) / rr; m.position.set(0, rr * Math.cos(a), -L - rr * Math.sin(a)); m.rotation.x = -a; }
    else { m.position.set(0, -rr, -L + (s - L - Math.PI * rr)); m.rotation.x = Math.PI; }
  });
}
const EMBER = new THREE.MeshBasicMaterial({ color: 0xffa030 });
let _smiley = null;
function smileyMat() {
  if (_smiley) return _smiley;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffd21f'; x.strokeStyle = '#1a1a1a'; x.lineWidth = 10;
  x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.fill(); x.stroke();
  x.fillStyle = '#1a1a1a';
  x.beginPath(); x.ellipse(88, 98, 14, 24, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(168, 98, 14, 24, 0, 0, Math.PI * 2); x.fill();
  x.lineWidth = 14; x.lineCap = 'round';
  x.beginPath(); x.arc(128, 132, 64, 0.18 * Math.PI, 0.82 * Math.PI); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  _smiley = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, roughness: 0.45 });
  return _smiley;
}
const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Cy = (rt, rb, h, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s);
function part(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
}

let flashTex = null;
function muzzleFlash() {
  if (!flashTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.2, 'rgba(255,210,120,.9)'); gr.addColorStop(0.5, 'rgba(255,120,30,.35)'); gr.addColorStop(1, 'rgba(255,80,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,230,160,.8)'; g.lineWidth = 6;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); g.stroke(); }
    flashTex = new THREE.CanvasTexture(c); flashTex.colorSpace = THREE.SRGBColorSpace;
  }
  const grp = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const pg = new THREE.PlaneGeometry(1, 1);
  part(grp, pg, mat, 0, 0, 0);
  part(grp, pg, mat, 0, 0, -0.3, 0, Math.PI / 2, 0).scale.set(1.4, 0.7, 1);
  part(grp, pg, mat, 0, 0, -0.3, Math.PI / 2, 0, Math.PI / 2).scale.set(1.4, 0.7, 1);
  grp.visible = false;
  return grp;
}

export function buildModel(id) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const muzzle = new THREE.Object3D(); let flash = null, head = null;
  switch (id) {
    case 'masse':
      part(g, Cy(0.02, 0.024, 0.95), MT.wood, 0, 0.36, 0);
      part(g, Cy(0.027, 0.027, 0.22), MT.tape, 0, 0.0, 0);
      part(g, Bx(0.11, 0.11, 0.3), MT.dark, 0, 0.84, -0.02);
      part(g, Cy(0.062, 0.062, 0.03), MT.steel, 0, 0.84, -0.18, Math.PI / 2, 0, 0);
      part(g, Cy(0.062, 0.062, 0.03), MT.steel, 0, 0.84, 0.14, Math.PI / 2, 0, 0);
      muzzle.position.set(0, 0.84, -0.2);
      break;
    case 'pelle':
      part(g, Cy(0.018, 0.02, 1.0), MT.wood, 0, 0.4, 0);
      part(g, Cy(0.014, 0.014, 0.16), MT.black, 0, -0.1, 0, 0, 0, Math.PI / 2);
      part(g, Cy(0.014, 0.014, 0.08), MT.black, 0, -0.06, 0);
      part(g, new THREE.ConeGeometry(0.03, 0.1, 10), MT.dark, 0, 0.93, 0, Math.PI, 0, 0);
      part(g, Bx(0.24, 0.3, 0.018), MT.steel, 0, 1.12, 0.012, 0.18, 0, 0);
      muzzle.position.set(0, 1.25, 0);
      break;
    case 'batte':
      part(g, Cy(0.038, 0.017, 0.86, 20), MT.woodL, 0, 0.4, 0);
      part(g, Cy(0.019, 0.019, 0.24), MT.tape, 0, 0.04, 0);
      part(g, Cy(0.03, 0.026, 0.025), MT.woodL, 0, -0.085, 0);
      part(g, new THREE.SphereGeometry(0.038, 16, 10), MT.woodL, 0, 0.83, 0).scale.set(1, 0.5, 1);
      muzzle.position.set(0, 0.75, 0);
      break;
    case 'minigun': {
      part(g, Bx(0.13, 0.13, 0.32), MT.gun, 0, 0, 0.02);
      part(g, Cy(0.075, 0.075, 0.1, 20), MT.gun2, 0, 0, -0.18, Math.PI / 2, 0, 0);
      head = new THREE.Group(); head.position.set(0, 0, -0.23); g.add(head);
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        part(head, Cy(0.013, 0.013, 0.5, 10), MT.dark, Math.cos(a) * 0.035, Math.sin(a) * 0.035, -0.25, Math.PI / 2, 0, 0);
      }
      part(head, Cy(0.058, 0.058, 0.03, 20), MT.gun2, 0, 0, -0.2, Math.PI / 2, 0, 0);
      part(head, Cy(0.058, 0.058, 0.025, 20), MT.gun2, 0, 0, -0.47, Math.PI / 2, 0, 0);
      part(g, Bx(0.03, 0.05, 0.22), MT.black, 0, 0.11, -0.02);
      part(g, Bx(0.03, 0.06, 0.03), MT.black, 0, 0.08, -0.1);
      part(g, Bx(0.03, 0.06, 0.03), MT.black, 0, 0.08, 0.06);
      part(g, Bx(0.035, 0.12, 0.05), MT.black, 0, -0.12, 0.1, -0.25, 0, 0);
      part(g, Bx(0.14, 0.15, 0.2), MT.olive, -0.15, -0.05, 0.05);
      part(g, Bx(0.08, 0.025, 0.06), MT.yellow, -0.07, 0.035, -0.02, 0, 0, -0.5);
      muzzle.position.set(0, 0, -0.74);
      flash = muzzleFlash(); flash.scale.setScalar(0.22);
      break;
    }
    case 'tronconneuse': {
      part(g, Bx(0.13, 0.16, 0.3), MT.orange, 0, 0, 0);
      part(g, Bx(0.136, 0.07, 0.2), MT.white, 0, 0.105, 0.03);
      part(g, Bx(0.02, 0.1, 0.14), MT.black, 0.072, -0.005, 0.03);
      part(g, Cy(0.048, 0.048, 0.022, 18), MT.white, -0.075, 0, 0.05, 0, 0, Math.PI / 2);
      part(g, Bx(0.042, 0.042, 0.16), MT.white, 0, 0.035, 0.22);
      part(g, Bx(0.036, 0.1, 0.036), MT.black, 0, -0.02, 0.29);
      part(g, Bx(0.042, 0.035, 0.12), MT.orange, 0, -0.065, 0.235);
      part(g, Bx(0.2, 0.026, 0.026), MT.black, 0, 0.2, -0.07);
      part(g, Bx(0.026, 0.16, 0.026), MT.black, -0.09, 0.12, -0.07);
      part(g, Bx(0.026, 0.16, 0.026), MT.black, 0.09, 0.12, -0.07);
      part(g, Bx(0.15, 0.12, 0.012), MT.black, 0, 0.14, -0.13);
      const bar = new THREE.Group(); bar.position.set(0, -0.02, -0.15); g.add(bar);
      part(bar, Bx(0.018, 0.075, 0.6), MT.steel, 0, 0, -0.3);
      part(bar, Cy(0.0375, 0.0375, 0.018, 16), MT.steel, 0, 0, -0.6, 0, 0, Math.PI / 2);
      // la chaîne : des maillons qui défilent autour du guide
      head = new THREE.Group(); bar.add(head);
      const L = 0.6, rr = 0.043, per = 2 * L + Math.PI * rr, N = 30;
      head.userData = { per, L, rr, links: [] };
      for (let k = 0; k < N; k++) { const m = part(head, Bx(0.024, 0.016, 0.028), MT.dark, 0, 0, 0); head.userData.links.push(m); }
      chainAt(head, 0);
      muzzle.position.set(0, -0.02, -0.79);
      break;
    }
    case 'mine':
      part(g, Cy(0.09, 0.098, 0.045, 28), MT.olive, 0, 0, 0);
      part(g, Cy(0.072, 0.072, 0.012, 28), MT.dark, 0, 0.028, 0);
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; part(g, Cy(0.007, 0.007, 0.01, 8), MT.steel, Math.cos(a) * 0.082, 0.024, Math.sin(a) * 0.082); }
      part(g, Bx(0.05, 0.01, 0.022), MT.steel, 0.035, 0.036, 0);
      head = part(g, Cy(0.015, 0.015, 0.016, 12), LED, -0.02, 0.04, 0.02); head.name = 'led';
      muzzle.position.set(0, 0.05, 0);
      break;
    case 'bombinette': {
      part(g, new THREE.SphereGeometry(0.11, 28, 20), MT.bomb, 0, 0, 0);
      part(g, new THREE.SphereGeometry(0.1112, 24, 16, Math.PI / 2 - 0.75, 1.5, Math.PI / 2 - 0.72, 1.44), smileyMat(), 0, 0, 0);
      part(g, Cy(0.036, 0.04, 0.05, 16), MT.dark, 0, 0.115, 0);
      const fuse = new THREE.Group(); fuse.name = 'fuse'; fuse.position.set(0, 0.138, 0); g.add(fuse);
      part(fuse, Cy(0.0075, 0.0075, 0.06, 8), MT.fuse, 0.008, 0.03, 0, 0, 0, -0.25);
      part(fuse, Cy(0.0075, 0.0075, 0.05, 8), MT.fuse, 0.03, 0.074, 0, 0, 0, -0.7);
      const tip = new THREE.Object3D(); tip.name = 'tip'; tip.position.set(0.048, 0.09, 0); fuse.add(tip);
      const ember = part(fuse, new THREE.SphereGeometry(0.014, 10, 8), EMBER, 0.048, 0.09, 0); ember.name = 'ember'; ember.visible = false;
      muzzle.position.set(0, 0.2, 0);
      break;
    }
    case 'roquette':
      part(g, Cy(0.068, 0.068, 1.0, 22), MT.olive, 0, 0, -0.18, Math.PI / 2, 0, 0);
      part(g, Cy(0.09, 0.07, 0.12, 22), MT.olive, 0, 0, 0.37, Math.PI / 2, 0, 0);
      part(g, Cy(0.074, 0.074, 0.05, 22), MT.dark, 0, 0, -0.66, Math.PI / 2, 0, 0);
      part(g, Cy(0.074, 0.074, 0.04, 22), MT.dark, 0, 0, 0.05, Math.PI / 2, 0, 0);
      part(g, Bx(0.035, 0.12, 0.05), MT.black, 0, -0.11, -0.05, -0.2, 0, 0);
      part(g, Bx(0.035, 0.11, 0.05), MT.black, 0, -0.1, -0.35, 0.1, 0, 0);
      part(g, Bx(0.04, 0.06, 0.12), MT.dark, -0.08, 0.07, -0.2);
      part(g, Bx(0.02, 0.02, 0.02), MT.red, -0.08, 0.11, -0.16);
      head = new THREE.Group(); g.add(head);
      part(head, new THREE.ConeGeometry(0.055, 0.2, 18), MT.red, 0, 0, -0.78, -Math.PI / 2, 0, 0);
      part(head, Cy(0.055, 0.055, 0.05, 18), MT.gun2, 0, 0, -0.66, Math.PI / 2, 0, 0);
      muzzle.position.set(0, 0, -0.72);
      flash = muzzleFlash(); flash.scale.setScalar(0.5);
      break;
  }
  g.add(muzzle);
  if (flash) { flash.position.copy(muzzle.position); flash.position.z -= 0.02; g.add(flash); }
  return { root, g, muzzle, flash, head };
}

// ---------------------------------------------------------------- poses & animations
export const POSE = {
  masse: { p: [0.3, -0.6, -0.72], r: [0.15, 0.25, -0.15] },
  batte: { p: [0.28, -0.52, -0.62], r: [-0.3, 0.2, -0.5] },
  pelle: { p: [0.24, -0.2, -0.12], r: [-1.62, 0.18, 0.1] },
  minigun: { p: [0.2, -0.24, -0.42], r: [0, 0.03, 0] },
  tronconneuse: { p: [0.2, -0.28, -0.78], r: [0.1, 0.45, 0.05] },
  mine: { p: [0.13, -0.19, -0.74], r: [0.55, 0, 0.2] },
  roquette: { p: [0.28, -0.24, -0.34], r: [0, 0.03, 0] },
  bombinette: { p: [0.17, -0.15, -0.72], r: [0.12, -0.4, 0] },
};
const KEYS = {
  masse: [[0, 0, 0, 0, 0, 0, 0], [0.24, 0.02, 0.18, 0.12, 1.0, 0, 0.1], [0.32, -0.08, -0.14, -0.2, -1.35, 0.05, -0.15], [0.55, -0.08, -0.12, -0.18, -1.2, 0.05, -0.15], [1.0, 0, 0, 0, 0, 0, 0]],
  pelle: [[0, 0, 0, 0, 0, 0, 0], [0.12, 0.02, 0.06, 0.12, 0.35, 0, 0.05], [0.2, -0.02, -0.08, -0.3, -0.25, 0, -0.05], [0.36, 0.02, 0.06, -0.12, 0.35, 0.05, 0.1], [0.55, 0, 0, 0, 0, 0, 0]],
  batte: [[0, 0, 0, 0, 0, 0, 0], [0.1, 0.1, 0.05, 0.05, 0.2, 0.4, -0.9], [0.18, -0.25, 0.36, -0.15, -0.2, -0.4, 2.0], [0.3, -0.25, 0.26, -0.1, -0.1, -0.3, 1.8], [0.48, 0, 0, 0, 0, 0, 0]],
};
const smooth = (t) => t * t * (3 - 2 * t);
function sampleKeys(keys, t, out) {
  if (t <= 0 || t >= keys[keys.length - 1][0]) { out.fill(0); return; }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const k = smooth((t - a[0]) / (b[0] - a[0]));
      for (let j = 0; j < 6; j++) out[j] = a[j + 1] + (b[j + 1] - a[j + 1]) * k;
      return;
    }
  }
}

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _fw = new THREE.Vector3();
const anim6 = new Array(6).fill(0);

export class WeaponSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = new THREE.Group(); ctx.vmScene.add(this.root);
    this.models = WEAPONS.map((w) => { const m = buildModel(w.id); m.root.visible = false; m.root.rotation.order = 'YXZ'; this.root.add(m.root); return m; });
    this.ammo = WEAPONS.map((w) => w.mag);
    this.spin = 0; this.rev = 0; this.chainOff = 0; this.bombCD = 0; this.cur = 0; this.cool = 0; this.reloadT = -1; this.switchT = 1;
    this.swingT = -1; this.hitDone = true; this.recoil = 0; this.flashT = 0;
    this.fireHeld = false; this.firePressed = false; this.mines = [];
    this.bobT = 0; this.swayX = 0; this.swayY = 0; this.spreadK = 0; this.rockets = [];
    this.rocketProto = this._rocketMesh();
    this.mineProto = buildModel('mine').g;
    this.bombProto = buildModel('bombinette').g;
    this.select(0, true);
    this.ready = true;
  }
  get w() { return WEAPONS[this.cur]; }

  _rocketMesh() {
    const g = new THREE.Group();
    part(g, Cy(0.05, 0.05, 0.4, 14), MT.olive, 0, 0, 0, Math.PI / 2, 0, 0);
    part(g, new THREE.ConeGeometry(0.05, 0.16, 14), MT.red, 0, 0, -0.28, -Math.PI / 2, 0, 0);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb040, blending: THREE.AdditiveBlending, transparent: true }));
    glow.position.z = 0.24; g.add(glow);
    return g;
  }

  resetAmmo() { this.ammo = WEAPONS.map((w) => w.mag); this.reloadT = -1; this.bombCD = 0; this.spin = 0; this.ctx.audio.spinner(0); this.rev = 0; this.ctx.audio.saw(0); this.clearRockets(); }
  clearRockets() {
    for (const r of this.rockets) this.ctx.scene.remove(r.mesh);
    for (const m of this.mines) this.ctx.scene.remove(m.mesh);
    this.rockets = []; this.mines = [];
  }

  select(i, instant = false) {
    if (i < 0 || i >= WEAPONS.length) return;
    if (i === this.cur && !instant) return;
    this.models[this.cur].root.visible = false;
    this.cur = i;
    this.models[i].root.visible = true;
    this.switchT = instant ? 1 : 0;
    this.reloadT = -1; this.swingT = -1; this.hitDone = true; this.cool = instant ? 0 : 0.25;
    const m = this.models[i];
    if (m.head && this.w.kind === 'rocket') m.head.visible = this.ammo[i] > 0;
    this.spin = 0; this.ctx.audio.spinner(0); this.rev = 0; this.ctx.audio.saw(0);
    if (!instant) this.ctx.audio.play('switch');
    if (this.ready && this.ctx.onSwitch) this.ctx.onSwitch(this.w, instant);
  }

  trigger(down) {
    if (down) { this.fireHeld = true; this.firePressed = true; } else { this.fireHeld = false; }
  }

  reload() {
    const w = this.w;
    if (w.kind === 'bomb') return; // la bombinette a son propre compte à rebours
    if (w.mag === Infinity || this.reloadT >= 0 || this.ammo[this.cur] === w.mag) return;
    this.reloadT = 0; this.ctx.audio.play('reload');
  }

  _aimDir(spread) {
    const cam = this.ctx.camera;
    _fw.set((Math.random() - 0.5) * 2 * spread, (Math.random() - 0.5) * 2 * spread, -1).normalize().applyQuaternion(cam.quaternion);
    return _fw.clone();
  }
  _muzzleWorld() {
    const m = this.models[this.cur];
    m.muzzle.updateWorldMatrix(true, false);
    _v.setFromMatrixPosition(m.muzzle.matrixWorld);
    return this.ctx.camera.localToWorld(_v.clone());
  }

  update(dt, player, look) {
    const w = this.w, ctx = this.ctx;
    this.cool -= dt;
    this.switchT = Math.min(1, this.switchT + dt / 0.3);
    if (this.bombCD > 0) {
      this.bombCD -= dt;
      if (this.bombCD <= 0) {
        this.bombCD = 0;
        const bi = WEAPONS.findIndex((x) => x.kind === 'bomb');
        this.ammo[bi] = 1;
        if (this.cur === bi) { this.switchT = 0; ctx.audio.play('switch'); }
        if (ctx.onBombReady) ctx.onBombReady();
      }
    }
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      if (this.reloadT >= w.reload) {
        this.reloadT = -1; this.ammo[this.cur] = w.mag;
        const m = this.models[this.cur]; if (m.head && w.kind === 'rocket') m.head.visible = true;
      }
    }
    let want = w.auto ? this.fireHeld : this.firePressed;
    if (w.kind === 'saw') {
      // ralenti quand on l'a en main, plein régime quand on appuie
      const target = this.switchT >= 1 ? (this.fireHeld ? 1 : 0.3) : 0.3;
      this.rev += (target - this.rev) * Math.min(1, dt * (target > this.rev ? 6 : 3));
      ctx.audio.saw(this.rev);
      if (this.rev < 0.6) want = false;
    }
    if (w.spin) {
      // la minigun doit lancer ses canons avant de cracher
      const spinning = this.fireHeld && this.reloadT < 0 && this.switchT >= 1;
      this.spin = Math.max(0, Math.min(1, this.spin + (spinning ? dt / w.spin : -dt / 0.9)));
      if (this.spin < 1) want = false;
      ctx.audio.spinner(this.spin);
      const m = this.models[this.cur]; if (m.head) m.head.rotation.z += this.spin * dt * 45;
    }
    this.firePressed = false;
    const ready = this.cool <= 0 && this.reloadT < 0 && this.switchT >= 1 && this.swingT < 0;
    if (want && ready) {
      if (w.mag !== Infinity && this.ammo[this.cur] <= 0) {
        ctx.audio.play('empty'); this.cool = 0.25; this.reload();
        if (w.kind === 'bomb') { if (ctx.onBombWait) ctx.onBombWait(this.bombCD); } else if (ctx.onEmpty) ctx.onEmpty();
      } else this._fire(w);
    }
    if (this.swingT >= 0) {
      this.swingT += dt;
      if (!this.hitDone && this.swingT >= w.hitDelay) { this.hitDone = true; this._melee(w); }
      if (this.swingT >= KEYS[w.id][KEYS[w.id].length - 1][0]) this.swingT = -1;
    }
    this.spreadK = Math.max(0, this.spreadK - dt * 3);
    this._updateRockets(dt);
    this._updateMines(dt);
    this._animate(dt, player, look);
  }

  _fire(w) {
    const ctx = this.ctx;
    this.cool = w.rate;
    if (w.mag !== Infinity) this.ammo[this.cur]--;
    if (ctx.onShot) ctx.onShot(w);
    switch (w.kind) {
      case 'melee':
        this.swingT = 0; this.hitDone = false;
        ctx.audio.play(w.id === 'batte' ? 'swing' : 'swingHeavy');
        break;
      case 'hitscan': this._hitscan(w); break;
      case 'mine': case 'bomb': this._mine(w); break;
      case 'rocket': this._rocket(w); break;
      case 'saw': this._saw(w); break;
    }
    if (w.kind === 'bomb') { this.bombCD = w.reload; return; }
    if (w.mag !== Infinity && this.ammo[this.cur] <= 0) {
      const m = this.models[this.cur]; if (m.head && w.kind === 'rocket') m.head.visible = false;
      setTimeout(() => { if (this.w === w && this.ammo[this.cur] <= 0) this.reload(); }, w.kind === 'rocket' ? 250 : 120);
    }
  }

  _impactFx(h, dir, strong) {
    const { fx, audio } = this.ctx;
    if (h.piece) {
      const M = MATS[h.piece.mat];
      if (this.ctx.onHitPiece) this.ctx.onHitPiece(h.piece);
      audio.impact(M.sound, h.point, strong ? 1.1 : 0.45);
      if (M.fx === 'sparks' || M.fx === 'electric') fx.burst('sparks', h.point, null, strong ? 1.2 : 0.5);
      fx.burst('dust', h.point, h.piece.base, strong ? 1 : 0.35);
      fx.burst('chips', h.point, h.piece.base, strong ? 0.8 : 0.3);
    } else {
      fx.burst('sparks', h.point, null, 0.5);
      fx.burst('dust', h.point, null, 0.5);
      fx.decal('hole', h.point, h.normal, 0.12 + Math.random() * 0.05);
      audio.play('ricochet', h.point);
    }
  }

  _hitscan(w) {
    const { world, fx, audio, camera } = this.ctx;
    const spread = w.spread * (1 + this.spreadK * 2.5);
    this.spreadK = Math.min(1, this.spreadK + (w.auto ? 0.12 : 0.35));
    const dir = this._aimDir(spread);
    const origin = camera.position.clone();
    let o = origin.clone(), dmg = w.dmg, end = null, hitSomething = false;
    for (let pen = 0; pen < 4; pen++) {
      const h = world.raycast(o, dir, w.range);
      if (!h) break;
      end = h.point;
      this._impactFx(h, dir, false);
      if (h.piece) {
        hitSomething = true;
        const mat = h.piece.mat;
        world.hitPiece(h.piece, h.point, dir, dmg, w.radius, w.force);
        if (PEN.has(mat)) { o = h.point.clone().addScaledVector(dir, 0.03); dmg *= 0.75; continue; }
      }
      break;
    }
    const mz = this._muzzleWorld();
    fx.tracer(mz, end || origin.clone().addScaledVector(dir, 60));
    fx.flash(mz, 0xffc070, w.id === 'minigun' ? 7 : 5, 0.06, 6);
    fx.burst('muzzle', mz, null, 1);
    audio.play(w.snd);
    fx.shake(w.shake);
    this.recoil = Math.min(1.4, this.recoil + (w.id === 'minigun' ? 0.3 : 0.45));
    this.flashT = 0.05;
    if (this.ctx.onHit) this.ctx.onHit(hitSomething);
  }

  _meleeRay(w) {
    const { world, camera } = this.ctx;
    let best = null;
    for (const a of [0, 0.12, -0.12, 0.24]) {
      _v2.set(Math.sin(a), a === 0.24 ? -0.15 : 0, -Math.cos(a)).normalize().applyQuaternion(camera.quaternion);
      const h = world.raycast(camera.position, _v2, w.range);
      if (h && (!best || h.t < best.t)) { best = h; best.dir = _v2.clone(); }
    }
    return best;
  }

  _melee(w) {
    const { world, fx, audio } = this.ctx;
    const h = this._meleeRay(w);
    if (!h) { if (this.ctx.onHit) this.ctx.onHit(false); return; }
    if (h.piece) world.hitPiece(h.piece, h.point, h.dir, w.dmg, w.radius, w.force, w.dig);
    const digging = w.dig && h.piece && w.dig[h.piece.mat];
    if (digging) { audio.play('dig', h.point); fx.burst('dust', h.point, h.piece.base, 0.8); }
    else this._impactFx(h, h.dir, true);
    audio.play('thump', h.point, w.id === 'masse' ? 1.2 : digging ? 0.5 : 0.8);
    fx.shake(w.shake);
    if (this.ctx.hitstop) this.ctx.hitstop(w.id === 'masse' ? 0.08 : 0.045);
    if (this.ctx.onHit) this.ctx.onHit(!!h.piece);
  }

  _mine(w) {
    const { world, audio, camera, scene } = this.ctx;
    const fwd = this._aimDir(0);
    let h = world.raycast(camera.position, fwd, w.range);
    if (!h) {
      // rien à portée : on la pose au sol, devant soi
      const p = camera.position.clone().addScaledVector(fwd, w.range);
      p.y = Math.max(p.y, 0.3);
      h = world.raycast(p, DOWN, 60) || { point: new THREE.Vector3(p.x, 0, p.z), normal: UP.clone(), piece: null };
    }
    const bomb = w.kind === 'bomb', sc = bomb ? 1.8 : 1.4, off = bomb ? 0.11 * sc : 0.02;
    const mesh = (bomb ? this.bombProto : this.mineProto).clone(true);
    mesh.scale.setScalar(sc);
    mesh.position.copy(h.point).addScaledVector(h.normal, off);
    if (bomb && h.normal.y > 0.7) mesh.rotation.set(0, Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z), 0);
    else mesh.quaternion.setFromUnitVectors(UP, h.normal);
    scene.add(mesh);
    const entry = { mesh, led: mesh.getObjectByName('led'), piece: h.piece, t: w.fuse, vel: new THREE.Vector3(), stuck: true, beepT: 0, w, off };
    if (bomb) {
      entry.fuse = mesh.getObjectByName('fuse'); entry.tip = mesh.getObjectByName('tip'); entry.ember = mesh.getObjectByName('ember');
      entry.ember.visible = true;
      if (this.ctx.onBombArmed) this.ctx.onBombArmed();
    }
    this.mines.push(entry);
    audio.play(bomb ? 'fuse_light' : 'mine_arm', mesh.position);
    this.switchT = 0.35; this.recoil = 0.5;
  }

  _updateMines(dt) {
    const { world, audio } = this.ctx;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i], pos = m.mesh.position;
      m.t -= dt;
      // le support a cassé ou bougé : la mine tombe
      if (m.stuck && m.piece && m.piece.state !== 0) { m.stuck = false; m.piece = null; }
      if (!m.stuck) {
        m.vel.y -= 15 * dt;
        const step = -m.vel.y * dt + 0.03;
        const h = world.raycast(pos, DOWN, step);
        if (h) {
          pos.copy(h.point).addScaledVector(h.normal, m.off);
          if (!m.fuse) m.mesh.quaternion.setFromUnitVectors(UP, h.normal);
          m.stuck = true; m.piece = h.piece; m.vel.set(0, 0, 0);
          audio.play('imp_metal', pos, 0.3);
        } else pos.y += m.vel.y * dt;
      }
      if (m.fuse) {
        // la mèche se consume en crépitant
        const k = Math.max(0.12, m.t / m.w.fuse);
        m.fuse.scale.y = k;
        m.ember.scale.setScalar(0.8 + Math.random() * 0.8);
        m.tip.getWorldPosition(_v2);
        this.ctx.fx.burst('sparks', _v2, null, 0.18);
        audio.play('fuse', pos, 0.7);
      } else {
        // bips de plus en plus rapprochés
        const interval = Math.max(0.07, 0.55 * m.t / m.w.fuse);
        m.beepT -= dt;
        if (m.beepT <= 0) { m.beepT = interval; audio.play('beep', pos, m.t < 1 ? 1.2 : 0.8); }
        if (m.led) m.led.visible = m.beepT > interval - 0.07;
      }
      if (m.t <= 0) {
        this.ctx.scene.remove(m.mesh);
        this.mines.splice(i, 1);
        this.explode(pos.clone().add(new THREE.Vector3(0, 0.12, 0)), m.w);
      }
    }
  }

  _saw(w) {
    const { world, fx, audio, camera } = this.ctx;
    fx.shake(w.shake);
    const dir = this._aimDir(0.012);
    // la lame ignore un instant les morceaux qu'elle vient de trancher : elle avance dans la matière
    const h = world.raycast(camera.position, dir, w.range, (p) => p.cutT !== undefined && world.time - p.cutT < 0.5);
    if (!h) { if (this.ctx.onHit) this.ctx.onHit(false); return; }
    if (h.piece) {
      const M = MATS[h.piece.mat], k = w.mult[h.piece.mat] ?? 1;
      if (this.ctx.onHitPiece) this.ctx.onHitPiece(h.piece);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      world.sawPiece(h.piece, h.point, dir, w.dmg, w.mult, right);
      if (k < 0.6 || M.fx === 'sparks') { fx.burst('sparks', h.point, null, 0.5); if (Math.random() < 0.4) audio.play('ricochet', h.point); }
      else { fx.burst('chips', h.point, h.piece.base, 0.5); if (Math.random() < 0.3) fx.burst('dust', h.point, h.piece.base, 0.3); }
      if (Math.random() < 0.25) audio.impact(M.sound, h.point, 0.3);
    } else {
      fx.burst('sparks', h.point, null, 0.4);
    }
    this.cutting = 0.12;
    if (this.ctx.onHit) this.ctx.onHit(!!h.piece);
  }

  _rocket(w) {
    const { world, fx, audio, camera, scene } = this.ctx;
    const fwd = this._aimDir(0);
    const aim = world.raycast(camera.position, fwd, 200);
    const target = aim ? aim.point : camera.position.clone().addScaledVector(fwd, 200);
    const spawn = camera.localToWorld(new THREE.Vector3(0.24, -0.16, -0.9));
    const dir = target.clone().sub(spawn);
    if (dir.lengthSq() < 0.5) dir.copy(fwd); dir.normalize();
    const mesh = this.rocketProto.clone();
    mesh.position.copy(spawn);
    mesh.lookAt(spawn.clone().sub(dir));
    scene.add(mesh);
    this.rockets.push({ mesh, pos: spawn.clone(), dir, speed: w.speed * 0.6, life: 4, w });
    audio.play('rocket', spawn);
    fx.burst('smoke', spawn, null, 0.6);
    fx.flash(spawn, 0xffa040, 12, 0.12, 8);
    fx.shake(w.shake);
    this.recoil = 2.2; this.flashT = 0.08;
  }

  _updateRockets(dt) {
    const { world, fx } = this.ctx;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.speed = Math.min(r.w.speed * 1.5, r.speed + 60 * dt);
      const step = r.speed * dt;
      const h = world.raycast(r.pos, r.dir, step);
      r.life -= dt;
      if (h || r.life <= 0) {
        const p = h ? h.point.clone().addScaledVector(r.dir, -0.15) : r.pos.clone();
        this.ctx.scene.remove(r.mesh);
        this.rockets.splice(i, 1);
        this.explode(p, r.w);
        continue;
      }
      r.pos.addScaledVector(r.dir, step);
      r.mesh.position.copy(r.pos);
      const n = Math.ceil(step / 0.25);
      for (let k = 0; k < n; k++) fx.burst('trail', _v.copy(r.pos).addScaledVector(r.dir, -k * 0.25 - 0.25), null, 1);
    }
  }

  _bigBoom(p, w) {
    const { world, fx, audio, camera } = this.ctx;
    const { R, n } = world.nuke(p, w.share);
    for (const m of this.mines) if (m.mesh.position.distanceTo(p) < R) m.t = Math.min(m.t, 0.2 + Math.random() * 0.5);
    fx.explosion(p, Math.min(R, 9));
    for (let i = 0; i < 6; i++) {
      const q = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * R, Math.random() * 2.5, (Math.random() - 0.5) * R));
      setTimeout(() => fx.explosion(q, 3 + Math.random() * 3), 80 + i * 90);
    }
    for (let i = 0; i < 5; i++) fx.burst('smoke', p.clone().add(new THREE.Vector3(0, 1 + i * 1.2, 0)), null, 3);
    fx.flash(p, 0xfff0d0, 400, 1.4, R * 5);
    audio.play('bigboom', p, 1.6);
    audio.play('collapse', p, 1.5);
    fx.shake(1);
    if (this.ctx.onExplosion) this.ctx.onExplosion(n, p, { ...w, radius: Math.min(R, 10) });
  }

  explode(p, w) {
    if (w.kind === 'bomb') { this._bigBoom(p, w); return; }
    const { world, fx, audio, camera } = this.ctx;
    const n = world.areaDamage(p, w.radius, w.dmg, w.force, true);
    for (const m of this.mines) if (m.mesh.position.distanceTo(p) < w.radius) m.t = Math.min(m.t, 0.12 + Math.random() * 0.15);
    fx.explosion(p, w.radius);
    audio.play('explosion', p, 1.3);
    const d = camera.position.distanceTo(p);
    fx.shake(Math.max(0.25, 1.1 - d / 14));
    if (this.ctx.onExplosion) this.ctx.onExplosion(n, p, w);
  }

  _animate(dt, player, look) {
    const w = this.w, m = this.models[this.cur], P = POSE[w.id];
    const g = m.root;
    let px = P.p[0], py = P.p[1], pz = P.p[2], rx = P.r[0], ry = P.r[1], rz = P.r[2];
    // balancement de marche
    this.bobT += dt * player.speed * 1.9;
    const bob = player.bobAmt;
    px += Math.sin(this.bobT) * 0.014 * bob;
    py += -Math.abs(Math.cos(this.bobT)) * 0.012 * bob - player.land * 0.05;
    // inertie à la souris
    this.swayX += (-look.x * 0.0006 - this.swayX) * Math.min(1, dt * 10);
    this.swayY += (look.y * 0.0006 - this.swayY) * Math.min(1, dt * 10);
    px += Math.max(-0.05, Math.min(0.05, this.swayX)); py += Math.max(-0.05, Math.min(0.05, this.swayY));
    ry += this.swayX * 1.5;
    // recul
    this.recoil = Math.max(0, this.recoil - dt * (w.kind === 'rocket' ? 4 : 10));
    const rc = this.recoil;
    pz += rc * (w.kind === 'rocket' ? 0.09 : 0.05); rx += rc * (w.kind === 'rocket' ? 0.12 : 0.1); py += rc * 0.01;
    // mêlée
    if (this.swingT >= 0 && KEYS[w.id]) {
      sampleKeys(KEYS[w.id], this.swingT, anim6);
      px += anim6[0]; py += anim6[1]; pz += anim6[2]; rx += anim6[3]; ry += anim6[4]; rz += anim6[5];
    }
    // tronçonneuse : ça vibre, et plus fort quand ça mord
    if (w.kind === 'saw') {
      this.cutting = Math.max(0, (this.cutting || 0) - dt);
      const v = this.rev * 0.004 + (this.cutting > 0 ? 0.01 : 0);
      px += (Math.random() - 0.5) * v; py += (Math.random() - 0.5) * v; rx += (Math.random() - 0.5) * v * 2;
      if (this.cutting > 0) pz -= 0.02;
      this.chainOff += this.rev * dt * (this.fireHeld ? 5 : 0.6);
      if (m.head) chainAt(m.head, this.chainOff);
    }
    // rechargement
    if (this.reloadT >= 0) {
      const k = Math.sin(Math.PI * Math.min(1, this.reloadT / w.reload));
      py -= 0.14 * k; rx -= 0.5 * k; rz += 0.35 * k;
    }
    // changement d'arme
    const s = 1 - smooth(this.switchT);
    py -= s * 0.45; rx -= s * 0.8;
    g.position.set(px, py, pz); g.rotation.set(rx, ry, rz);
    g.visible = !(w.kind === 'bomb' && this.ammo[this.cur] <= 0);
    // flash
    this.flashT -= dt;
    if (m.flash) { m.flash.visible = this.flashT > 0; if (m.flash.visible) m.flash.rotation.z = Math.random() * Math.PI; }
  }
}
