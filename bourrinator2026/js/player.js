// Déplacement à la première personne : ZQSD / WASD (touches physiques), saut, sprint.
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class Player {
  constructor() {
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.onGround = true;
    this.keys = new Set();
    this.sens = 1; this.invertY = false;
    this.r = 0.32; this.h = 1.75; this.eyeH = 1.62;
    this.eyeY = 1.62; this.bobT = 0; this.bobAmt = 0; this.land = 0; this.speed = 0;
  }

  reset(sp) {
    this.pos.x = sp.x; this.pos.y = 0; this.pos.z = sp.z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = sp.yaw || 0; this.pitch = 0;
    this.eyeY = this.eyeH; this.keys.clear();
  }

  look(dx, dy) {
    const k = 0.0022 * this.sens;
    this.yaw -= dx * k;
    this.pitch -= dy * k * (this.invertY ? -1 : 1);
    this.pitch = clamp(this.pitch, -1.52, 1.52);
  }

  push(x, y, z) { this.vel.x += x; this.vel.y += y; this.vel.z += z; if (y > 0) this.onGround = false; }

  update(dt, world, active) {
    const k = this.keys;
    const k0 = (c) => k.has(c);
    let fx = 0, fz = 0;
    if (active) {
      if (k.has('KeyW') || k.has('ArrowUp')) fz -= 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fz += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    }
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    const maxS = sprint ? 7.2 : 4.4;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let wx = fx * cy + fz * sy, wz = -fx * sy + fz * cy;
    const len = Math.hypot(wx, wz);
    if (len > 0) { wx /= len; wz /= len; }
    const acc = (this.onGround ? 48 : 10) * dt;
    this.vel.x += clamp(wx * maxS - this.vel.x, -acc, acc);
    this.vel.z += clamp(wz * maxS - this.vel.z, -acc, acc);
    if (active && k.has('Space') && this.onGround) { this.vel.y = 5.6; this.onGround = false; }
    this.vel.y -= 17 * dt;

    // mouvement découpé en petits pas : quelle que soit la fluidité, on ne rentre jamais dans un mur
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.z), Math.abs(this.vel.y)) * dt / 0.05));
    const h = dt / n;
    let ground = 0;
    for (let s = 0; s < n; s++) {
      this.pos.x += this.vel.x * h;
      this.pos.z += this.vel.z * h;
      ground = world.collidePlayer(this.pos, this.r, this.h, 0.45);
      this.pos.y += this.vel.y * h;
      if (this.pos.y <= ground) {
        if (!this.onGround && this.vel.y < -4) this.land = Math.min(1, -this.vel.y / 12);
        this.pos.y = ground; this.vel.y = 0; this.onGround = true;
      } else if (this.pos.y > ground + 0.06) this.onGround = false;
      if (this.pos.y + this.h > world.headY) { this.pos.y = Math.max(ground, world.headY - this.h); if (this.vel.y > 0) this.vel.y = 0; }
    }

    // dans la nappe : on flotte, on nage (Espace pour remonter)
    this.inWater = world.waterY !== undefined && this.pos.y + 0.9 < world.waterY && world.baseY(this.pos.x, this.pos.z) < 0;
    if (this.inWater) {
      this.vel.y += 13 * dt;
      const k = Math.max(0, 1 - 3 * dt);
      this.vel.x *= k; this.vel.z *= k; this.vel.y *= k;
      if (active && k0('Space')) this.vel.y = Math.min(3, this.vel.y + 22 * dt);
    }
    // au fond d'un trou : Espace contre la paroi pour escalader
    if (active && k0('Space') && world.touchWall && this.pos.y < -0.05) this.vel.y = Math.max(this.vel.y, 3.2);

    if (this.pos.y + this.h > world.headY) {
      this.pos.y = Math.max(ground, world.headY - this.h); if (this.vel.y > 0) this.vel.y = 0;
    }
    // la clôture de la cour : on ne sort pas du terrain de jeu
    const P = world.plot, m = this.r + 0.15;
    if (P) { this.pos.x = clamp(this.pos.x, P.x0 + m, P.x1 - m); this.pos.z = clamp(this.pos.z, P.z0 + m, P.z1 - m); }
    else { this.pos.x = clamp(this.pos.x, -70, 70); this.pos.z = clamp(this.pos.z, -70, 70); }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround) this.bobT += dt * this.speed * 1.9;
    this.bobAmt += ((this.onGround ? Math.min(1, this.speed / 4.4) : 0) - this.bobAmt) * Math.min(1, dt * 10);
    this.land = Math.max(0, this.land - dt * 3);
    const te = this.pos.y + this.eyeH;
    this.eyeY += (te - this.eyeY) * Math.min(1, dt * 18);
    if (Math.abs(te - this.eyeY) > 0.6) this.eyeY = te;
  }

  apply(cam, sh) {
    const b = this.bobAmt;
    const side = Math.sin(this.bobT) * 0.025 * b;
    cam.position.set(
      this.pos.x + Math.cos(this.yaw) * side,
      this.eyeY + Math.abs(Math.cos(this.bobT)) * 0.045 * b - this.land * 0.12,
      this.pos.z - Math.sin(this.yaw) * side,
    );
    cam.rotation.set(this.pitch + sh.x, this.yaw + sh.y, sh.z, 'YXZ');
  }
}
