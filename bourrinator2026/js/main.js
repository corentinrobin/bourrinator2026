import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World, CATS, STATIC } from './world.js';
import { Builder, ENVS, buildGround, UNDER, plotOf } from './levels.js';
import { FX } from './fx.js';
import { Audio } from './audio.js';
import { Player } from './player.js';
import { WEAPONS, WeaponSystem, buildModel, POSE } from './weapons.js';
import { Q, pick } from './quotes.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const setLoad = (p, t) => { $('#load-fill').style.width = (p * 100) + '%'; if (t) $('#load-text').textContent = t; };

// ------------------------------------------------------------------ réglages
const DEF = { sens: 1, fov: 80, sfx: 0.8, music: 0.45, quality: 'haute', voice: false, invertY: false };
const S = { ...DEF };
try { Object.assign(S, JSON.parse(localStorage.getItem('bourrinator.settings') || '{}')); } catch (e) { /* stockage indisponible */ }
const saveSettings = () => { try { localStorage.setItem('bourrinator.settings', JSON.stringify(S)); } catch (e) { /* ignoré */ } };

// ------------------------------------------------------------------ rendu
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
$('#game').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(S.fov, innerWidth / innerHeight, 0.05, 400);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 10);

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
vmScene.environment = envTex;
vmScene.environmentIntensity = 0.8;
vmScene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const vmSun = new THREE.DirectionalLight(0xffffff, 1.6); vmSun.position.set(2, 3, 1); vmScene.add(vmSun);

const hemi = new THREE.HemisphereLight(0xffffff, 0x555555, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun); scene.add(sun.target);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const vmPass = new RenderPass(vmScene, vmCam); vmPass.clear = false; vmPass.clearDepth = true;
composer.addPass(vmPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.45, 0.4, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function applyQuality() {
  const q = S.quality;
  renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'haute' ? 1.5 : q === 'moyenne' ? 1.0 : 0.75));
  renderer.shadowMap.enabled = q !== 'basse';
  sun.castShadow = q !== 'basse';
  world.maxDyn = q === 'haute' ? 1300 : q === 'moyenne' ? 900 : 550;
  world.maxChunks = q === 'basse' ? 6 : 12;
  onResize();
  scene.traverse((o) => { if (o.material && o.isMesh) o.material.needsUpdate = true; });
}
function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h);
  camera.aspect = vmCam.aspect = w / h; camera.fov = S.fov;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  fx.setScale(h * renderer.getPixelRatio(), S.fov);
}
addEventListener('resize', onResize);

// ------------------------------------------------------------------ systèmes
const audio = new Audio();
audio.setVolumes(S.sfx, S.music);
const fx = new FX(scene);
const world = new World(scene, fx, audio);
const player = new Player();
player.sens = S.sens; player.invertY = S.invertY;

const G = {
  state: 'loading', env: ENVS[0].id, weapon: 0, mode: 'chrono', time: 180, elapsed: 0,
  score: 0, shown: 0, raw: 0, combo: 0, comboT: 0, bestMult: 1, bestCombo: 0, nukeT: 0, cats: {},
  shots: 0, hits: 0, pieces: 0, quoteCD: 0, idle: 0, milestones: new Set(), firsts: new Set(),
  timeScale: 1, slowT: 0, stop: 0, gainAcc: 0, gainT: 0, feed: new Map(), lastExplosion: 0,
  locked: false, spawn: { x: 0, z: 0, yaw: 0 }, menuT: 0, attractT: 3, info: null,
};

const weapons = new WeaponSystem({
  world, fx, audio, camera, scene, vmScene,
  onShot: () => { G.shots++; },
  onHit: (hit) => { if (hit) { G.hits++; hitmarker(); } },
  onEmpty: () => { if (G.state === 'playing' && Math.random() < 0.3) say(pick(Q.empty)); },
  onSwitch: (w, instant) => { hudWeapon(); if (!instant && G.state === 'playing' && !G.firsts.has('w_' + w.id)) { G.firsts.add('w_' + w.id); say(Q.weapon[w.id]); } },
  hitstop: (t) => { G.stop = Math.max(G.stop, t); },
  onBombWait: (cd) => { if (G.state === 'playing') say('Patience. La prochaine bombinette arrive dans ' + Math.ceil(cd) + ' secondes. On ne fabrique pas de la dentelle.'); },
  onBombReady: () => { if (G.state === 'playing') { announce('Bombinette', 'prête à servir'); } },
  onBombArmed: () => { if (G.state === 'playing' && !G.firsts.has('bombArmed')) { G.firsts.add('bombArmed'); say(pick(Q.bombArmed), true); } },
  onHitPiece: (p) => {
    if (G.state === 'playing' && p.mat === 'steel' && !G.firsts.has('steel')) { G.firsts.add('steel'); say(pick(Q.steel), true); }
  },
  onExplosion: (n, p, w) => {
    if (G.state !== 'playing') return;
    if (n > 0) { G.hits++; hitmarker(); }
    const d = camera.position.distanceTo(p);
    if (d < w.radius + 0.5) {
      const k = (1 - d / (w.radius + 0.5)) * 9;
      const dir = new THREE.Vector3(player.pos.x - p.x, 0, player.pos.z - p.z).normalize();
      player.push(dir.x * k, k * 0.6, dir.z * k);
    }
    if (w.kind === 'bomb') {
      G.nukeT = 4; G.combo = 0;
      announce('Bombinette', 'Trente pour cent du bâtiment en moins', 2200);
      setTimeout(() => say(pick(Q.bomb), true), 900);
      G.slowT = 1.1; $('#slowmo').classList.add('on');
    }
    if (d < 9 || w.kind === 'bomb') { $('#flash').classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => $('#flash').classList.remove('on'))); }
    if (n >= 25) { G.slowT = 0.7; $('#slowmo').classList.add('on'); }
    if (n >= 15 && performance.now() - G.lastExplosion > 8000) { G.lastExplosion = performance.now(); say(pick(Q.explosion)); }
  },
});

world.onScore = (p, how) => onBreak(p, how);
world.onWater = () => { if (G.state === 'playing') say(pick(Q.water), true); };
world.onCollapse = (n) => { if (G.state === 'playing' && n > 12 && !G.firsts.has('collapse')) { G.firsts.add('collapse'); say(pick(Q.collapse)); } };

// ------------------------------------------------------------------ textures du lieu
function floorTexture(f) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = f.a; g.fillRect(0, 0, 512, 512);
  if (f.type === 'tiles') {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 ? f.a : f.b; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
    }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  } else if (f.type === 'pavers') {
    // dalles de trottoir en quinconce
    for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) {
      const x = c * 128 + (r % 2 ? 64 : 0), y = r * 128;
      g.fillStyle = shade(Math.random() < 0.5 ? f.a : f.b, Math.random() * 10 - 5); g.fillRect(x + 2, y + 2, 124, 124);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(x + Math.random() * 124, y + Math.random() * 124, 2, 2); }
    }
    g.fillStyle = 'rgba(40,38,34,.55)';
    for (let r = 0; r <= 4; r++) g.fillRect(0, r * 128 - 2, 512, 4);
    for (let r = 0; r < 4; r++) for (let c = -1; c <= 4; c++) g.fillRect(c * 128 + (r % 2 ? 64 : 0) - 2, r * 128, 4, 128);
  } else if (f.type === 'grass') {
    const img = g.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 34; img.data[i] += n * 0.6; img.data[i + 1] += n; img.data[i + 2] += n * 0.4; }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < 1400; k++) {
      g.strokeStyle = Math.random() < 0.5 ? 'rgba(40,70,20,.5)' : 'rgba(140,180,80,.35)'; g.lineWidth = 1;
      const x = Math.random() * 512, y = Math.random() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y - 4 - Math.random() * 6); g.stroke();
    }
  } else if (f.type === 'cobble') {
    // pavés anciens, arrondis, joints sombres
    g.fillStyle = '#6b6258'; g.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 8; c++) {
      const x = c * 64 + (r % 2 ? 32 : 0) + 4, y = r * 64 + 4;
      g.fillStyle = shade(Math.random() < 0.5 ? f.a : f.b, Math.random() * 14 - 7);
      g.beginPath(); g.roundRect ? g.roundRect(x, y, 56, 56, 12) : g.rect(x, y, 56, 56); g.fill();
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 8, y + 6, 30, 8);
    }
  } else if (f.type === 'marble') {
    // grandes dalles de marbre veiné (2 × 2 par texture), joints fins
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x0 = i * 256, y0 = j * 256;
      g.save(); g.beginPath(); g.rect(x0, y0, 256, 256); g.clip();
      const gr = g.createLinearGradient(x0, y0, x0 + 256, y0 + 256);
      gr.addColorStop(0, shade(f.a, Math.random() * 8 - 4)); gr.addColorStop(1, shade(f.b, Math.random() * 8 - 4));
      g.fillStyle = gr; g.fillRect(x0, y0, 256, 256);
      // nuages laiteux
      for (let k = 0; k < 14; k++) {
        const cx = x0 + Math.random() * 256, cy = y0 + Math.random() * 256, r = 30 + Math.random() * 70;
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        rg.addColorStop(0, 'rgba(255,255,255,.18)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(x0, y0, 256, 256);
      }
      // veines : longues, fines, qui bifurquent ; quelques-unes dorées
      const veins = 5 + ((Math.random() * 4) | 0);
      for (let v = 0; v < veins; v++) {
        const gold = Math.random() < 0.45;
        let x = x0 - 20 + Math.random() * 60, y = y0 + Math.random() * 256;
        const ang = -0.6 + Math.random() * 1.2;
        const pts = [[x, y]];
        for (let s = 0; s < 14; s++) {
          x += Math.cos(ang) * 22 + (Math.random() - 0.5) * 18; y += Math.sin(ang) * 22 + (Math.random() - 0.5) * 26;
          pts.push([x, y]);
        }
        const col = gold ? [184, 146, 70] : [120, 112, 104];
        // un halo diffus sous la veine, puis le trait fin : du veinage, pas des fissures
        for (const [lw, al] of [[7, 0.07], [2.5, 0.12], [0.8 + Math.random() * 0.8, gold ? 0.55 : 0.32]]) {
          g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${al})`; g.lineWidth = lw; g.lineCap = 'round';
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          for (let s = 1; s < pts.length; s++) g.quadraticCurveTo(pts[s - 1][0], pts[s - 1][1], (pts[s - 1][0] + pts[s][0]) / 2, (pts[s - 1][1] + pts[s][1]) / 2);
          g.stroke();
        }
      }
      g.restore();
    }
    g.strokeStyle = 'rgba(120,110,95,.55)'; g.lineWidth = 2;
    for (const p of [0, 256, 512]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
  } else if (f.type === 'wood' || f.type === 'parquet') {
    const rows = f.type === 'wood' ? 8 : 16;
    const h = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -Math.random() * 300;
      while (x < 512) {
        const w = 160 + Math.random() * 200;
        const l = Math.random() * 18 - 9;
        g.fillStyle = shade(Math.random() < 0.5 ? f.a : f.b, l);
        g.fillRect(x, r * h, w - 2, h - 2);
        g.globalAlpha = 0.08; g.fillStyle = '#000';
        for (let k = 0; k < 6; k++) g.fillRect(x, r * h + Math.random() * h, w, 1);
        g.globalAlpha = 1;
        x += w;
      }
    }
  } else {
    const img = g.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function shade(hex, l) {
  const c = new THREE.Color(hex); c.offsetHSL(0, 0, l / 255);
  return '#' + c.getHexString();
}
function windowsTexture(night) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = night ? '#15171d' : '#8a8f96'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 256; y += 24) for (let x = 8; x < 128; x += 20) {
    const lit = Math.random() < (night ? 0.45 : 0.1);
    g.fillStyle = lit ? (night ? '#ffd58a' : '#dfe7ef') : (night ? '#0b0c10' : '#5b6572');
    g.fillRect(x, y, 12, 14);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let envRoot = null, levelLights = [], floorTex = null, yardTex = null, waterMesh = null;
function waterTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9fc9d6'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.2})`; g.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * 128, y = Math.random() * 128;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 4, x + 16 + Math.random() * 10, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function disposeTree(o) {
  o.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) { const ms = Array.isArray(n.material) ? n.material : [n.material]; for (const m of ms) { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); } }
  });
}

function loadEnv(id) {
  const E = ENVS.find((e) => e.id === id);
  world.clear(); fx.clear(); weapons.clearRockets();
  if (envRoot) { scene.remove(envRoot); disposeTree(envRoot); }
  for (const l of levelLights) scene.remove(l);
  levelLights = [];
  envRoot = new THREE.Group(); scene.add(envRoot);

  const b = new Builder(world);
  const info = E.build(b);
  if (E.outside) E.outside(b, E.W, E.D);
  buildGround(b, E.W, E.D, info.steelFloor);
  world.room = { x0: -E.W / 2, x1: E.W / 2, z0: -E.D / 2, z1: E.D / 2, h: E.H };
  // la dalle du sol est cassable (pièces du monde) : elle reprend la texture du niveau
  if (floorTex) floorTex.dispose();
  floorTex = floorTexture(E.floor);
  if (yardTex) yardTex.dispose();
  yardTex = floorTexture(E.yard || { type: 'pavers', a: '#9a9a94', b: '#8a8a84', size: 0.5 });
  const plot = plotOf(E.W, E.D);
  world.setFloor(floorTex, 1 / (E.floor.size * 4), { ...UNDER, yardTex, yardScale: 1 / ((E.yard ? E.yard.size : 0.5) * 4), plot });
  world.materials.ground.roughness = E.floor.rough ?? 0.6;
  world.materials.yard.roughness = E.yard && E.yard.type === 'cobble' ? 0.6 : 0.9;
  world.finalize();
  for (const L of b.lights) {
    const pl = new THREE.PointLight(L.color, L.intensity * 0.45, L.distance, 2);
    pl.position.set(L.x, L.y, L.z); scene.add(pl); levelLights.push(pl);
    if (L.piece) world.linkLight(L.piece, pl);
  }
  // terrain extérieur percé à l'emplacement du bâtiment, et vide sanitaire dessous
  const hw = world.plot.x1, hd = world.plot.z1, PIT = UNDER.bottom - 0.1;
  const shape = new THREE.Shape([new THREE.Vector2(-200, -200), new THREE.Vector2(200, -200), new THREE.Vector2(200, 200), new THREE.Vector2(-200, 200)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-hw, -hd), new THREE.Vector2(-hw, hd), new THREE.Vector2(hw, hd), new THREE.Vector2(hw, -hd)]));
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: E.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; ground.receiveShadow = true; envRoot.add(ground);
  const pm = new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 1, side: THREE.BackSide });
  const pit = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, -PIT, hd * 2), [pm, pm, new THREE.MeshBasicMaterial({ visible: false }), pm, pm, pm]);
  pit.position.y = PIT / 2; pit.receiveShadow = true; envRoot.add(pit);
  // la nappe phréatique, trouble, qu'on n'atteint qu'en creusant
  const wm = new THREE.MeshStandardMaterial({ color: 0x2f7489, map: waterTexture(), transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.2, emissive: 0x06202a, depthWrite: false });
  wm.map.repeat.set(hw / 2, hd / 2);
  waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hd * 2), wm);
  waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.y = UNDER.water; envRoot.add(waterMesh);
  const murk = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hd * 2), new THREE.MeshBasicMaterial({ color: 0x0b2430 }));
  murk.rotation.x = -Math.PI / 2; murk.position.y = UNDER.bottom; envRoot.add(murk);
  buildScenery(E);
  buildFence(E.fence || 'metal', world.plot);

  scene.background = new THREE.Color(E.sky);
  scene.fog = new THREE.Fog(E.sky, 30, 140);
  fx.noScorch = (p) => world.baseY(p.x, p.z) < 0;
  scene.environmentIntensity = E.env * 0.6;
  hemi.color.set(E.hemi[0]); hemi.groundColor.set(E.hemi[1]); hemi.intensity = E.hemi[2] * 0.5;
  sun.color.set(E.sun); sun.intensity = E.sunI * 0.75;
  sun.position.set(9, 26, 12); sun.target.position.set(0, 0, 0);
  const sc = sun.shadow.camera, ext = Math.max(E.W, E.D) / 2 + 3;
  sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 60; sc.updateProjectionMatrix();
  sun.shadow.needsUpdate = true;
  G.env = id; G.builtEnv = id; G.spawn = info.spawn; G.info = info; G.E = E;
  return E;
}

function buildFence(style, P) {
  const parts = new Map(); // couleur → liste de boîtes
  const add = (color, x, y, z, w, h, d) => { if (!parts.has(color)) parts.set(color, []); parts.get(color).push([x, y, z, w, h, d]); };
  const sides = [[P.x0, P.z0, P.x1, P.z0], [P.x1, P.z0, P.x1, P.z1], [P.x1, P.z1, P.x0, P.z1], [P.x0, P.z1, P.x0, P.z0]];
  for (const [ax, az, bx, bz] of sides) {
    const len = Math.hypot(bx - ax, bz - az), alongX = az === bz, n = Math.ceil(len / 2.2);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (style === 'picket') add(0xf4f1ea, x, 0.6, z, 0.12, 1.2, 0.12);
      else if (style === 'iron') { add(0x1a1a1a, x, 0.9, z, 0.14, 1.8, 0.14); add(0xc9a227, x, 1.88, z, 0.2, 0.16, 0.2); }
      else add(0x9aa0a6, x, 1.0, z, 0.06, 2.0, 0.06);
      if (i === n) break;
      const L = len / n, cx = x + (bx - ax) / n / 2, cz = z + (bz - az) / n / 2, w = alongX ? L : 0.05, d = alongX ? 0.05 : L;
      if (style === 'picket') {
        for (let k = 0; k < 7; k++) { const u = (k + 0.5) / 7 - 0.5; add(0xf4f1ea, cx + (alongX ? u * L : 0), 0.5, cz + (alongX ? 0 : u * L), alongX ? 0.12 : 0.04, 1.0, alongX ? 0.04 : 0.12); }
        add(0xe8e4da, cx, 0.3, cz, w, 0.08, d); add(0xe8e4da, cx, 0.8, cz, w, 0.08, d);
      } else if (style === 'iron') {
        for (let k = 0; k < 9; k++) { const u = (k + 0.5) / 9 - 0.5; add(0x1a1a1a, cx + (alongX ? u * L : 0), 0.85, cz + (alongX ? 0 : u * L), 0.03, 1.6, 0.03); add(0xc9a227, cx + (alongX ? u * L : 0), 1.7, cz + (alongX ? 0 : u * L), 0.06, 0.1, 0.06); }
        add(0x1a1a1a, cx, 0.12, cz, w, 0.06, d); add(0x1a1a1a, cx, 1.55, cz, w, 0.06, d);
        add(0x2d6a4f, cx + (alongX ? 0 : 0.35), 0.55, cz + (alongX ? 0.35 : 0), alongX ? L : 0.5, 1.1, alongX ? 0.5 : L);
      } else {
        // barrières de chantier : cadre + grillage + plots de béton
        add(0xb8bec6, cx, 1.95, cz, w, 0.05, d); add(0xb8bec6, cx, 0.12, cz, w, 0.05, d);
        add(0x8f959c, cx, 1.03, cz, alongX ? L : 0.012, 1.8, alongX ? 0.012 : L);
        add(0x9a968e, x + (bx - ax) / n, 0.08, z + (bz - az) / n, 0.6, 0.16, 0.25);
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4();
  for (const [color, list] of parts) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: color === 0x8f959c ? 0.4 : 0.1, transparent: color === 0x8f959c, opacity: color === 0x8f959c ? 0.45 : 1 });
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, y, z, w, h, d], i) => { m4.makeScale(w, h, d).setPosition(x, y, z); im.setMatrixAt(i, m4); });
    im.castShadow = color !== 0x8f959c; im.receiveShadow = true; envRoot.add(im);
  }
}

function buildScenery(E) {
  const night = E.scenery === 'night';
  const mat = new THREE.MeshStandardMaterial({ map: windowsTexture(night), roughness: 0.8, emissive: night ? 0xffffff : 0x000000, emissiveIntensity: night ? 0.35 : 0 });
  if (night) mat.emissiveMap = mat.map;
  const rng = (a, b) => a + Math.random() * (b - a);
  if (E.scenery === 'suburb') {
    const trunk = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 1 });
    const leaves = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 1 });
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = rng(16, 60);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = rng(3, 7);
      if (Math.abs(x) < world.plot.x1 + 3 && Math.abs(z) < world.plot.z1 + 3) continue;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, h * 0.4, 8), trunk); t.position.set(x, h * 0.2, z); envRoot.add(t);
      const l = new THREE.Mesh(new THREE.ConeGeometry(h * 0.3, h * 0.8, 10), leaves); l.position.set(x, h * 0.75, z); l.castShadow = false; envRoot.add(l);
    }
    for (const [x, z] of [[-35, -30], [30, -34], [40, 20], [-40, 25]]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), new THREE.MeshStandardMaterial({ color: pick([0xe8dcc0, 0xd9c8a9, 0xf0e6d2]), roughness: 0.9 }));
      h.position.set(x, 2.5, z); envRoot.add(h);
      const r = new THREE.Mesh(new THREE.ConeGeometry(7.5, 3, 4), new THREE.MeshStandardMaterial({ color: 0x8a3b2a, roughness: 0.9 }));
      r.position.set(x, 6.5, z); r.rotation.y = Math.PI / 4; envRoot.add(r);
    }
    return;
  }
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, world.plot.z1 + 7.5); envRoot.add(road);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(400, 3.5), new THREE.MeshStandardMaterial({ color: 0x8d8d88, roughness: 0.95 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.004, world.plot.z1 + 1.9); envRoot.add(walk);
  const bg = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 46; i++) {
    const side = i % 4;
    let x, z;
    if (side === 0) { x = rng(-90, 90); z = E.D / 2 + rng(22, 40); }
    else if (side === 1) { x = rng(-90, 90); z = -E.D / 2 - rng(18, 40); }
    else if (side === 2) { x = E.W / 2 + rng(18, 40); z = rng(-60, 60); }
    else { x = -E.W / 2 - rng(18, 40); z = rng(-60, 60); }
    const w = rng(8, 18), d = rng(8, 16), h = rng(10, 42);
    const m = new THREE.Mesh(bg, mat.clone());
    m.material.map = mat.map; if (night) m.material.emissiveMap = mat.map;
    m.material.map.repeat.set(1, 1);
    m.scale.set(w, h, d); m.position.set(x, h / 2, z); envRoot.add(m);
  }
  const lamp = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
  const bulb = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: night ? 3 : 0.2 });
  for (let x = -40; x <= 40; x += 16) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), lamp); p.position.set(x, 3, world.plot.z1 + 3.4); envRoot.add(p);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), bulb); h.position.set(x, 6, world.plot.z1 + 3.7); envRoot.add(h);
  }
}

// ------------------------------------------------------------------ captures pour les menus
function snapshot(sc, cam, w, h, fmtType = 'image/jpeg') {
  const pr = renderer.getPixelRatio();
  const ow = innerWidth, oh = innerHeight;
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  renderer.render(sc, cam);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(canvas, 0, 0, w, h);
  renderer.setPixelRatio(pr); renderer.setSize(ow, oh, false);
  return c.toDataURL(fmtType, 0.86);
}
const THUMBS = { env: {}, weapon: {} };
function makeWeaponThumbs() {
  const sc = new THREE.Scene();
  sc.environment = envTex; sc.environmentIntensity = 1;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(1, 2, 3); sc.add(d);
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.01, 20);
  renderer.setClearColor(0x000000, 0);
  for (const w of WEAPONS) {
    const m = buildModel(w.id);
    const g = m.root;
    if (w.id === 'masse' || w.id === 'batte' || w.id === 'pelle') g.rotation.set(0, 0, -1.25);
    else if (w.id === 'mine') g.rotation.set(0.55, 0.3, 0);
    else if (w.id === 'bombinette') g.rotation.set(0.1, -0.35, 0);
    else g.rotation.set(0, -Math.PI / 2, 0);
    if (m.flash) m.flash.visible = false;
    sc.add(g);
    const box = new THREE.Box3().setFromObject(g);
    const ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y / 0.5625) * 0.5;
    const dist = r / Math.tan(THREE.MathUtils.degToRad(15)) * 0.72;
    cam.position.set(ctr.x + dist * 0.12, ctr.y + dist * 0.18, ctr.z + dist); cam.lookAt(ctr);
    THUMBS.weapon[w.id] = snapshot(sc, cam, 480, 270, 'image/png');
    sc.remove(g);
  }
  renderer.setClearColor(0x000000, 1);
}
function makeEnvThumb(E) {
  const c = G.info.cam;
  const cam = new THREE.PerspectiveCamera(70, 1.6, 0.05, 300);
  cam.position.set(c.x, c.y, c.z); cam.lookAt(c.tx, c.ty, c.tz);
  THUMBS.env[E.id] = snapshot(scene, cam, 640, 400);
}

// ------------------------------------------------------------------ écrans
function show(id) {
  for (const s of $$('.screen')) s.classList.toggle('active', s.id === id);
}
function setHud(on) { $('#hud').classList.toggle('active', on); }

function buildEnvCards() {
  const box = $('#env-cards'); box.innerHTML = '';
  ENVS.forEach((E, i) => {
    const el = document.createElement('button');
    el.className = 'env-card' + (E.id === G.env ? ' sel' : '');
    el.dataset.id = E.id;
    el.innerHTML = `<div class="shot" style="background-image:url(${THUMBS.env[E.id]})"><span class="num">0${i + 1}</span><span class="sel-badge">Sélectionné</span><h3>${E.name}</h3></div>
      <div class="body"><div class="sub">${E.sub}</div><p>${E.desc}</p>
      <div class="tags">${E.tags.map((t) => `<span>${t}</span>`).join('')}</div>
      <div class="fragile">Fragilité <b>${'■'.repeat(E.fragile)}${'□'.repeat(5 - E.fragile)}</b></div></div>`;
    el.addEventListener('mouseenter', () => audio.play('ui_hover'));
    el.addEventListener('click', () => {
      audio.play('ui_click');
      if (G.env !== E.id) { G.env = E.id; loadEnv(E.id); G.menuT = 0; }
      $$('.env-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === E.id));
    });
    el.addEventListener('dblclick', () => goWeapon());
    box.appendChild(el);
  });
}
function buildWeaponCards() {
  const box = $('#weapon-cards'); box.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const el = document.createElement('button');
    el.className = 'w-card' + (i === G.weapon ? ' sel' : '');
    el.innerHTML = `<span class="k">${i + 1}</span><img src="${THUMBS.weapon[w.id]}" alt=""><h4>${w.name}</h4><small>${w.nick}</small>`;
    el.addEventListener('mouseenter', () => { audio.play('ui_hover'); weaponDetail(i); });
    el.addEventListener('mouseleave', () => weaponDetail(G.weapon));
    el.addEventListener('click', () => { audio.play('ui_click'); G.weapon = i; $$('.w-card').forEach((c, k) => c.classList.toggle('sel', k === i)); weaponDetail(i); });
    el.addEventListener('dblclick', () => startGame());
    box.appendChild(el);
  });
  weaponDetail(G.weapon);
}
function weaponDetail(i) {
  const w = WEAPONS[i];
  const bar = (n) => `<div class="bar">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''} ${k <= n && n >= 5 ? 'hot' : ''}"></i>`).join('')}</div>`;
  $('#weapon-detail').innerHTML = `<div class="step">Arme ${i + 1}</div><h3>${w.name}</h3><div class="nick">${w.nick}</div>
    <p class="desc">${w.desc}</p>
    <div class="stat"><span>Dégâts</span>${bar(w.stats.deg)}</div>
    <div class="stat"><span>Cadence</span>${bar(w.stats.cad)}</div>
    <div class="stat"><span>Portée</span>${bar(w.stats.por)}</div>
    <div class="stat"><span>Bordel</span>${bar(w.stats.bor)}</div>
    <blockquote>${Q.weapon[w.id]}</blockquote>`;
}

const SETTINGS_UI = [
  { k: 'sens', label: 'Sensibilité souris', type: 'range', min: 0.2, max: 3, step: 0.05, f: (v) => v.toFixed(2) },
  { k: 'fov', label: 'Champ de vision', type: 'range', min: 60, max: 105, step: 1, f: (v) => v + '°' },
  { k: 'sfx', label: 'Volume des effets', type: 'range', min: 0, max: 1, step: 0.05, f: (v) => Math.round(v * 100) },
  { k: 'music', label: 'Volume de la musique', type: 'range', min: 0, max: 1, step: 0.05, f: (v) => Math.round(v * 100) },
  { k: 'quality', label: 'Qualité graphique', sub: 'Haute : halo lumineux · Moyenne : ombres · Basse : ni l\'un ni l\'autre', type: 'seg', opts: [['basse', 'Basse'], ['moyenne', 'Moyenne'], ['haute', 'Haute']] },
  { k: 'voice', label: 'Voix du narrateur', sub: 'Synthèse vocale du navigateur', type: 'seg', opts: [[false, 'Non'], [true, 'Oui']] },
  { k: 'invertY', label: 'Inverser la souris', type: 'seg', opts: [[false, 'Non'], [true, 'Oui']] },
];
function buildSettings() {
  const box = $('#settings'); box.innerHTML = '';
  for (const d of SETTINGS_UI) {
    const row = document.createElement('div'); row.className = 'set-row';
    row.innerHTML = `<label>${d.label}${d.sub ? `<small>${d.sub}</small>` : ''}</label>`;
    if (d.type === 'range') {
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = d.min; inp.max = d.max; inp.step = d.step; inp.value = S[d.k];
      const out = document.createElement('output'); out.textContent = d.f(S[d.k]);
      inp.addEventListener('input', () => { S[d.k] = parseFloat(inp.value); out.textContent = d.f(S[d.k]); applySettings(); });
      row.append(inp, out);
    } else {
      const seg = document.createElement('div'); seg.className = 'seg';
      for (const [v, l] of d.opts) {
        const bt = document.createElement('button'); bt.textContent = l; bt.classList.toggle('on', S[d.k] === v);
        bt.addEventListener('click', () => { S[d.k] = v; [...seg.children].forEach((c) => c.classList.toggle('on', c === bt)); audio.play('ui_click'); applySettings(d.k === 'quality'); });
        seg.appendChild(bt);
      }
      row.appendChild(seg);
    }
    box.appendChild(row);
  }
}
function applySettings(quality) {
  player.sens = S.sens; player.invertY = S.invertY;
  audio.setVolumes(S.sfx, S.music);
  camera.fov = S.fov; camera.updateProjectionMatrix(); fx.setScale(innerHeight * renderer.getPixelRatio(), S.fov);
  if (quality) applyQuality();
  if (!S.voice && window.speechSynthesis) speechSynthesis.cancel();
  saveSettings();
}

// ------------------------------------------------------------------ navigation
let settingsReturn = 'scr-menu';
function goTitle() { G.state = 'title'; show('scr-title'); $('#title-tagline').textContent = pick(Q.taglines); }
function goMenu() {
  G.state = 'menu'; show('scr-menu'); setHud(false); lockHint(false);
  $('#menu-quote').textContent = pick(Q.taglines);
  audio.intensity = 0; audio.startMusic();
}
function goEnv() { if (world.destroyedValue > 0 || world.dyns.length) loadEnv(G.env); G.state = 'env'; show('scr-env'); buildEnvCards(); }
function goWeapon() { audio.play('ui_click'); G.state = 'weapon'; show('scr-weapon'); buildWeaponCards(); }
function goSettings(from) { settingsReturn = from; G.state = 'settings'; show('scr-settings'); buildSettings(); }

function startGame() {
  audio.play('whoosh');
  if (!(G.builtEnv === G.env && world.destroyedValue === 0 && world.dyns.length === 0)) loadEnv(G.env);
  fx.clear();
  player.reset(G.spawn);
  weapons.resetAmmo();
  weapons.select(G.weapon, true);
  Object.assign(G, {
    state: 'playing', time: G.mode === 'chrono' ? 180 : Infinity, elapsed: 0, score: 0, shown: 0, raw: 0, combo: 0, comboT: 0,
    bestMult: 1, bestCombo: 0, nukeT: 0, cats: {}, shots: 0, hits: 0, pieces: 0, quoteCD: 0, idle: 0, timeScale: 1, slowT: 0, stop: 0,
  });
  G.milestones = new Set(); G.firsts = new Set(['w_' + WEAPONS[G.weapon].id]);
  G.feed.clear(); $('#hud-feed').innerHTML = ''; $('#popups').innerHTML = '';
  show(''); setHud(true); hudWeapon(); hudSlots();
  setText('#hud-score', '0 €');
  $('#hud-env').textContent = G.E.name + ' · ' + (G.mode === 'chrono' ? 'Chrono' : 'Défouloir libre');
  audio.intensity = 1;
  requestLock();
  setTimeout(() => { if (G.state === 'playing') say(pick(Q.intro[G.env]), true); }, 700);
  setTimeout(() => { if (G.state === 'playing') announce(G.E.name, 'Tout doit disparaître'); }, 150);
}
function pauseGame() {
  if (G.state !== 'playing') return;
  G.state = 'paused'; show('scr-pause'); lockHint(false);
  weapons.trigger(false); weapons.spin = 0; audio.spinner(0); weapons.rev = 0; audio.saw(0); player.keys.clear();
  $('#pause-quote').textContent = '« ' + pick([...Q.combo, ...Q.idle]) + ' »';
}
function resumeGame() {
  if (G.state !== 'paused' && G.state !== 'settings') return;
  G.state = 'playing'; show(''); setHud(true);
  requestLock();
}
function endGame(reason) {
  if (G.state !== 'playing' && G.state !== 'paused') return;
  G.state = 'results';
  weapons.trigger(false); weapons.spin = 0; audio.spinner(0); weapons.rev = 0; audio.saw(0);
  if (document.pointerLockElement) document.exitPointerLock();
  lockHint(false);
  if (reason === 'time') { say(pick(Q.timeUp), true); announce('Terminé', 'L\'addition arrive'); }
  setTimeout(() => showResults(), reason === 'time' ? 1800 : 100);
}

function requestLock() {
  try {
    const p = canvas.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => { try { const p2 = canvas.requestPointerLock(); if (p2 && p2.catch) p2.catch(() => lockHint(true)); } catch (e) { lockHint(true); } });
  } catch (e) { lockHint(true); }
}
function lockHint(on) { $('#lock-hint').classList.toggle('on', on); }
document.addEventListener('pointerlockchange', () => {
  G.locked = document.pointerLockElement === canvas;
  if (G.locked) lockHint(false);
  else if (G.state === 'playing') pauseGame();
});
$('#lock-hint').addEventListener('click', () => { if (G.state === 'playing') requestLock(); });

// boutons
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act],[data-mode]');
  if (!b) return;
  if (b.dataset.mode) {
    G.mode = b.dataset.mode; audio.play('ui_click');
    $$('.toggle').forEach((t) => t.classList.toggle('on', t === b));
    return;
  }
  const a = b.dataset.act;
  const scr = b.closest('.screen')?.id;
  if (a !== 'back') audio.play('ui_click'); else audio.play('ui_back');
  switch (a) {
    case 'play': goEnv(); break;
    case 'settings': goSettings(scr === 'scr-pause' ? 'scr-pause' : 'scr-menu'); break;
    case 'howto': G.state = 'howto'; show('scr-howto'); break;
    case 'credits': G.state = 'credits'; show('scr-credits'); break;
    case 'next': goWeapon(); break;
    case 'start': startGame(); break;
    case 'back':
      if (scr === 'scr-weapon') goEnv();
      else if (scr === 'scr-settings' && settingsReturn === 'scr-pause') { G.state = 'paused'; show('scr-pause'); }
      else goMenu();
      break;
    case 'resume': resumeGame(); break;
    case 'restart': startGame(); break;
    case 'finish': G.state = 'playing'; endGame('quit'); break;
    case 'quit': setHud(false); loadEnv(G.env); goMenu(); break;
    case 'again': startGame(); break;
    case 'other': setHud(false); loadEnv(G.env); goEnv(); break;
    case 'menu': setHud(false); loadEnv(G.env); goMenu(); break;
  }
});
document.addEventListener('mouseover', (e) => { const b = e.target.closest('.menu button, .btn, .toggle'); if (b && !b.contains(e.relatedTarget)) audio.play('ui_hover'); });

// ------------------------------------------------------------------ entrées
const look = { x: 0, y: 0 };
addEventListener('keydown', (e) => {
  audio.init();
  if (G.state === 'title') { goMenu(); return; }
  if (G.state === 'playing') {
    player.keys.add(e.code);
    if (e.code.startsWith('Digit')) { const n = parseInt(e.code.slice(5), 10) - 1; if (n >= 0 && n < WEAPONS.length) { weapons.select(n); hudSlots(); } }
    if (e.code === 'KeyR') weapons.reload();
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.code === 'KeyP' || (e.code === 'Escape' && !G.locked)) pauseGame();
  } else if (e.code === 'Escape') {
    if (G.state === 'paused') resumeGame();
    else if (['env', 'howto', 'credits'].includes(G.state)) goMenu();
    else if (G.state === 'weapon') goEnv();
    else if (G.state === 'settings') { if (settingsReturn === 'scr-pause') { G.state = 'paused'; show('scr-pause'); } else goMenu(); }
  } else if (e.code === 'Enter') {
    if (G.state === 'env') goWeapon(); else if (G.state === 'weapon') startGame();
  }
});
addEventListener('keyup', (e) => player.keys.delete(e.code));
addEventListener('mousedown', (e) => {
  audio.init();
  if (G.state === 'title') { goMenu(); return; }
  if (G.state !== 'playing') return;
  if (!G.locked) { requestLock(); return; }
  if (e.button === 0) weapons.trigger(true);
});
addEventListener('mouseup', (e) => { if (e.button === 0) weapons.trigger(false); });
addEventListener('mousemove', (e) => {
  if (G.state === 'playing' && G.locked) { player.look(e.movementX, e.movementY); look.x += e.movementX; look.y += e.movementY; }
});
addEventListener('wheel', (e) => {
  if (G.state !== 'playing') return;
  const n = (weapons.cur + (e.deltaY > 0 ? 1 : -1) + WEAPONS.length) % WEAPONS.length;
  weapons.select(n); hudSlots();
}, { passive: true });
addEventListener('blur', () => { player.keys.clear(); weapons.trigger(false); });
addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------------------------------------------------------ score, combos, répliques
const LABELS = { 'Murs': 'Mur', 'Vitres': 'Vitre', 'Mobilier': 'Mobilier', 'Électronique': 'Électronique', 'Électroménager': 'Électroménager', 'Vaisselle': 'Vaisselle', 'Bouteilles': 'Bouteille', 'Marchandise': 'Marchandise', 'Paperasse': 'Paperasse', 'Déco': 'Déco', 'Luminaires': 'Luminaire', 'Véhicules': 'Véhicule', 'Pièces auto': 'Pièce auto', 'Collections': 'Œuvre' };
function mult() { return Math.min(10, 1 + Math.floor(Math.sqrt(G.combo / 6))); }
function onBreak(p, how) {
  if (G.state !== 'playing') return;
  // ce que la bombinette vaporise est facturé au prix coûtant : pas de multiplicateur
  const nuke = how === 'nuke' || G.nukeT > 0;
  const m = nuke ? 1 : mult();
  const gain = p.value * m;
  G.score += gain; G.raw += p.value; G.pieces++;
  const c = G.cats[p.cat] || (G.cats[p.cat] = { n: 0, v: 0 });
  c.n++; c.v += p.value;
  const before = mult();
  if (!nuke) { G.combo++; G.comboT = 1.8; }
  G.idle = 0;
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  const after = mult();
  if (after > before) {
    G.bestMult = Math.max(G.bestMult, after);
    audio.play('combo', null, after);
    if (after >= 4) announce('×' + after, Q.comboLabels[after]);
    if ((after === 5 || after === 8 || after === 10) && Math.random() < 0.8) say(pick(Q.combo));
  }
  G.gainAcc += gain;
  const f = G.feed.get(p.cat);
  if (f) { f.n++; f.v += gain; f.t = 1.6; f.dirty = true; } else G.feed.set(p.cat, { n: 1, v: gain, t: 1.6, dirty: true, el: null });
  if (p.label === 'vault') {
    G.firsts.add('vault');
    setTimeout(() => { announce('Le coffre', 'est ouvert'); say(pick(Q.vault), true); audio.play('cash'); }, 250);
    fx.shake(0.6);
  }
  if (p.label === 'masterpiece') {
    G.firsts.add('masterpiece');
    setTimeout(() => { announce('Le chef-d\'œuvre', 'n\'est plus'); say(pick(Q.masterpiece), true); audio.play('cash'); }, 250);
    fx.shake(0.3);
  }
  if (p.cat === 'Véhicules' && !G.firsts.has('car')) { G.firsts.add('car'); setTimeout(() => say(pick(Q.car)), 300); }
  if (p.cat === 'Vitres' && !G.firsts.has('glass')) { G.firsts.add('glass'); setTimeout(() => say(pick(Q.glass)), 300); }
  if (p.cat === 'Électronique' && p.mat === 'screen' && !G.firsts.has('screen')) { G.firsts.add('screen'); setTimeout(() => say(pick(Q.screen)), 300); }
  if (p.cat === 'Murs' && G.cats['Murs'].n === 25 && !G.firsts.has('wall')) { G.firsts.add('wall'); say(pick(Q.wall)); }
}

let typeTimer = null;
function say(text, force) {
  if (!text) return;
  if (G.quoteCD > 0 && !force) return;
  G.quoteCD = 7;
  const box = $('#hud-quote'), el = $('#q-text');
  box.classList.add('on');
  clearInterval(typeTimer);
  let i = 0; el.textContent = '';
  typeTimer = setInterval(() => {
    i += 2; el.textContent = text.slice(0, i);
    if (i % 6 === 0) audio.play('type');
    if (i >= text.length) { clearInterval(typeTimer); el.textContent = text; }
  }, 22);
  clearTimeout(say.hide); say.hide = setTimeout(() => box.classList.remove('on'), 4200 + text.length * 30);
  if (S.voice && window.speechSynthesis) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 0.98; u.pitch = 0.75;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('fr'));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* voix indisponible */ }
  }
}
function announce(big, small, hold = 0) {
  if (performance.now() < (announce.lock || 0) && !hold) return;
  if (hold) announce.lock = performance.now() + hold;
  const a = $('#announce');
  a.innerHTML = `<div class="a">${big}${small ? `<small>${small}</small>` : ''}</div>`;
  audio.play('announce');
}
function hitmarker() { const h = $('#hitmarker'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); }
function popup(text, big) {
  const el = document.createElement('div');
  el.className = 'pop' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = (Math.random() * 120 - 60) + 'px';
  el.style.top = (-40 - Math.random() * 40) + 'px';
  $('#popups').appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ------------------------------------------------------------------ HUD
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function hudWeapon() {
  const w = weapons.w;
  setText('#w-name', w.name); setText('#w-nick', w.nick);
  $('#crosshair').className = 'ch-' + w.ch;
  hudSlots();
}
function hudSlots() {
  $('#w-slots').innerHTML = WEAPONS.map((w, i) => `<div class="w-slot ${i === weapons.cur ? 'on' : ''}">${i + 1}</div>`).join('');
}
function updateHud(dt) {
  // chrono
  if (G.time !== Infinity) {
    const t = Math.max(0, G.time), m = Math.floor(t / 60), s = Math.floor(t % 60);
    setText('#hud-timer', `${m}:${String(s).padStart(2, '0')}`);
    $('#hud-timer').classList.toggle('low', t < 15);
  } else {
    const t = G.elapsed, m = Math.floor(t / 60), s = Math.floor(t % 60);
    setText('#hud-timer', `${m}:${String(s).padStart(2, '0')}`);
  }
  // score qui roule
  const prev = Math.round(G.shown);
  G.shown += (G.score - G.shown) * Math.min(1, dt * 7);
  if (G.score - G.shown < 1) G.shown = G.score;
  const cur = Math.round(G.shown);
  if (cur !== prev) setText('#hud-score', fmt(cur) + ' €');
  // démolition
  const pct = Math.min(100, world.pct * 100);
  setText('#hud-pct', Math.floor(pct) + ' %');
  $('#hud-pctbar').style.width = pct + '%';
  for (const ms of [25, 50, 75, 90]) {
    if (pct >= ms && !G.milestones.has(ms)) {
      G.milestones.add(ms);
      announce(ms + ' %', ms === 90 ? 'Presque rasé' : ms === 75 ? 'Chantier avancé' : ms === 50 ? 'À moitié rasé' : 'Ça commence');
      say(Q.milestone[ms], true);
    }
  }
  // combo
  const m = mult();
  $('#hud-combo').classList.toggle('on', G.combo >= 6);
  setText('#combo-mult', '×' + m);
  setText('#combo-label', Q.comboLabels[m] || '');
  $('#combo-fill').style.width = (Math.max(0, G.comboT) / 1.8 * 100) + '%';
  // popups de gains
  G.gainT -= dt;
  if (G.gainAcc > 0 && G.gainT <= 0) {
    popup('+' + fmt(G.gainAcc) + ' €', G.gainAcc > 2000);
    const sc = $('#hud-score'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
    G.gainAcc = 0; G.gainT = 0.14;
  }
  // fil des casses
  const feed = $('#hud-feed');
  for (const [cat, f] of G.feed) {
    f.t -= dt;
    if (!f.el) { f.el = document.createElement('div'); f.el.className = 'feed-item'; feed.prepend(f.el); }
    if (f.dirty) { f.el.innerHTML = `<span>${LABELS[cat] || cat}${f.n > 1 ? ' ×' + f.n : ''}</span><b>+${fmt(f.v)} €</b>`; f.dirty = false; }
    if (f.t <= 0) { const el = f.el; el.classList.add('out'); setTimeout(() => el.remove(), 400); G.feed.delete(cat); }
  }
  while (feed.children.length > 6) feed.lastChild.remove();
  // munitions
  const w = weapons.w;
  if (w.mag === Infinity) { setText('#w-ammo', '∞'); setText('#w-reserve', ''); }
  else { setText('#w-ammo', String(weapons.ammo[weapons.cur])); setText('#w-reserve', '/ ' + w.mag); }
  $('#w-ammo').classList.toggle('low', w.mag !== Infinity && weapons.ammo[weapons.cur] <= Math.ceil(w.mag * 0.2));
  const rl = $('#w-reload');
  if (w.kind === 'bomb' && weapons.bombCD > 0) {
    // attente de la prochaine bombinette : secondes restantes + jauge
    setText('#w-ammo', Math.ceil(weapons.bombCD) + ' s'); setText('#w-reserve', '');
    rl.classList.add('on'); setText('#w-reload span', 'Prochaine bombinette');
    rl.style.setProperty('--p', ((1 - weapons.bombCD / w.reload) * 100) + '%');
  } else {
    rl.classList.toggle('on', weapons.reloadT >= 0);
    setText('#w-reload span', 'Rechargement');
    if (weapons.reloadT >= 0) rl.style.setProperty('--p', (weapons.reloadT / w.reload * 100) + '%');
  }
  const gap = 6 + weapons.spreadK * 14 + weapons.recoil * 6;
  $('#crosshair').style.setProperty('--g', gap + 'px');
}

// ------------------------------------------------------------------ résultats
function showResults() {
  show('scr-results'); setHud(false);
  audio.intensity = 0;
  const rank = [...Q.ranks].reverse().find((r) => G.score >= r.min) || Q.ranks[0];
  $('#res-rank').textContent = rank.title;
  $('#res-quote').textContent = '« ' + rank.quote + ' »';
  const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0;
  const dur = G.elapsed, m = Math.floor(dur / 60), s = Math.floor(dur % 60);
  $('#res-stats').innerHTML = `<div><small>Démoli</small><b>${Math.floor(world.pct * 100)} %</b></div>
    <div><small>Objets</small><b>${fmt(G.pieces)}</b></div>
    <div><small>Meilleur combo</small><b>×${G.bestMult}</b></div>
    <div><small>Précision</small><b>${acc} %</b></div>`;
  const cats = Object.entries(G.cats).sort((a, b) => b[1].v - a[1].v);
  const now = new Date();
  const d = now.toLocaleDateString('fr-FR'), h = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const bonus = G.score - G.raw;
  const tva = G.score * 0.2;
  let delay = 0.3;
  const line = (a, b, cls = '') => { delay += 0.08; return `<div class="ln ${cls}" style="animation-delay:${delay.toFixed(2)}s"><span>${a}</span><span>${b}</span></div>`; };
  let html = `<h4>${G.E.sub.toUpperCase()}</h4>
    <div class="c">${G.E.name} — Ticket n° ${String(Math.floor(Math.random() * 90000) + 10000)}<br>${d} · ${h} · Durée ${m} min ${String(s).padStart(2, '0')} s<br>Caisse 01 · Opérateur : LE BOURRIN</div><hr>`;
  if (!cats.length) html += line('Rien. Absolument rien.', '0 €');
  for (const [cat, c] of cats) html += line(`${CATS[cat]?.label || cat} ×${c.n}`, fmt(c.v) + ' €');
  html += '<hr>' + line('Sous-total', fmt(G.raw) + ' €') + line(`Prime de style (combo ×${G.bestMult})`, fmt(bonus) + ' €');
  html += line('T.V.A. (Taxe sur la Violence Ajoutée) 20 %', fmt(tva) + ' €');
  html += line('TOTAL TTC', fmt(G.score + tva) + ' €', 'tot');
  html += `<hr><div class="c">Ni repris, ni échangé, ni réparé.<br>Merci de votre visite. Ne revenez pas.</div><div class="barcode"></div>
    <div class="stamp" style="--d:${(delay + 0.4).toFixed(2)}s">${rank.title}</div>`;
  $('#receipt').innerHTML = html;
  audio.play('cash');
  setTimeout(() => audio.play('stamp'), (delay + 0.4) * 1000);
}

// ------------------------------------------------------------------ boucle
let last = performance.now();
const clock = { t: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  clock.t += dt;

  if (G.state === 'playing') {
    if (G.stop > 0) { G.stop -= dt; dt *= 0.08; }
    if (G.slowT > 0) { G.slowT -= dt; G.timeScale += (0.35 - G.timeScale) * Math.min(1, dt * 12); if (G.slowT <= 0) $('#slowmo').classList.remove('on'); }
    else G.timeScale += (1 - G.timeScale) * Math.min(1, dt * 4);
    const sdt = dt * G.timeScale;
    G.elapsed += dt;
    if (G.time !== Infinity) { G.time -= dt; if (G.time <= 0) { G.time = 0; endGame('time'); } }
    G.comboT -= sdt; if (G.comboT <= 0) G.combo = 0;
    if (G.nukeT > 0) G.nukeT -= dt;
    G.quoteCD -= dt;
    G.idle += dt; if (G.idle > 14) { G.idle = 0; say(pick(Q.idle)); }
    player.update(dt, world, true);
    player.apply(camera, fx.shakeOffset(clock.t));
    weapons.update(sdt, player, look);
    world.update(sdt);
    fx.update(sdt);
    audio.listener(camera.position, player.yaw);
    updateHud(dt);
  } else if (G.state === 'paused' || G.state === 'results' || (G.state === 'settings' && settingsReturn === 'scr-pause')) {
    fx.update(dt * 0.3);
    if (G.state === 'results') { world.update(dt); menuCamera(dt, 0.4); }
  } else if (G.state !== 'loading') {
    menuCamera(dt, 1);
    world.update(dt);
    fx.update(dt);
    if (G.state === 'title' || G.state === 'menu') attract(dt);
  }
  look.x = 0; look.y = 0;
  if (waterMesh) { waterMesh.material.map.offset.set(clock.t * 0.02, clock.t * 0.013); waterMesh.position.y = UNDER.water + Math.sin(clock.t * 1.3) * 0.01; }
  $('#underwater').classList.toggle('on', G.state === 'playing' && camera.position.y < UNDER.water && world.baseY(camera.position.x, camera.position.z) < 0);

  if (S.quality !== 'haute') {
    renderer.autoClear = false; renderer.clear();
    renderer.render(scene, camera);
    if (G.state === 'playing' || G.state === 'paused') { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
    renderer.autoClear = true;
  } else {
    vmPass.enabled = G.state === 'playing' || G.state === 'paused';
    composer.render(dt);
  }
}

function menuCamera(dt, speed) {
  if (!G.info) return;
  G.menuT += dt * 0.05 * speed;
  const c = G.info.cam, E = G.E;
  const a = Math.sin(G.menuT) * 0.5;
  const cx = c.tx + (c.x - c.tx) * Math.cos(a) - (c.z - c.tz) * Math.sin(a);
  const cz = c.tz + (c.x - c.tx) * Math.sin(a) + (c.z - c.tz) * Math.cos(a);
  camera.position.set(
    Math.max(E ? -E.W / 2 + 0.6 : -99, Math.min(E ? E.W / 2 - 0.6 : 99, cx)),
    c.y + Math.sin(G.menuT * 1.7) * 0.15,
    Math.max(E ? -E.D / 2 + 0.6 : -99, Math.min(E ? E.D / 2 - 0.6 : 99, cz)),
  );
  camera.lookAt(c.tx, c.ty, c.tz);
  const sh = fx.shakeOffset(clock.t);
  camera.rotation.x += sh.x; camera.rotation.y += sh.y;
}

// démo en fond de menu : ça pète de temps en temps
function attract(dt) {
  G.attractT -= dt;
  if (G.attractT > 0) return;
  G.attractT = 4 + Math.random() * 3;
  if (world.pct > 0.3) { loadEnv(G.env); return; }
  const cands = world.statics.filter((p) => !p.structural && p.min.y > 0.3 && p.max.y < 2.2);
  if (!cands.length) return;
  const p = pick(cands);
  const pos = p.pos.clone();
  world.areaDamage(pos, 1.8, 250, 9, true);
  fx.explosion(pos, 1.6);
  audio.play('explosion', null, 0.18);
  fx.shake(0.25);
}

// ------------------------------------------------------------------ démarrage
async function boot() {
  try {
    setLoad(0.05, 'Chauffage des masses…');
    applyQuality();
    await wait(30);
    setLoad(0.15, 'Affûtage des arguments…');
    makeWeaponThumbs();
    let i = 0;
    for (const E of ENVS) {
      setLoad(0.25 + i * 0.1, ['Remplissage des rayons…', 'Mise en place des nappes…', 'Impression des rapports…', 'Encaustique du buffet…', 'Comptage des billets…', 'Réglage du projecteur…', 'Lustrage des lustres…'][i] || 'Presque…');
      await wait(20);
      loadEnv(E.id);
      renderer.compile(scene, camera);
      makeEnvThumb(E);
      i++;
    }
    setLoad(0.95, 'Presque prêt à tout casser…');
    loadEnv(ENVS[0].id);
    G.env = ENVS[0].id;
    await wait(80);
    setLoad(1, 'C\'est prêt.');
    await wait(250);
    goTitle();
    requestAnimationFrame(frame);
  } catch (e) {
    console.error(e);
    setLoad(1, 'Erreur au chargement : ' + e.message);
  }
}

window.__B = { POSE, G, S, world, player, weapons, fx, audio, camera, scene, renderer, composer, bloom, hemi, sun, loadEnv, startGame, endGame, goMenu, applyQuality };
boot();
