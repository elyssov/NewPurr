import * as THREE from "three";
import { buildApartment, inDoor, wallBlock } from "./apartment";
import { buildCat, poseCat, CAT_SCALE } from "./cat";
import { aabbHit, type Item } from "./furniture";
import { GameAudio } from "./audio";
import { GameInput } from "./input";
import {
  applyEvent,
  clockLabel,
  createSim,
  dayOver,
  decide,
  HINTS,
  hitCat,
  rating,
  tickMeters,
  type Sim,
} from "./meters";
import { C } from "./palette";
import { mat } from "./vox";
import { useGameStore } from "./store";

const FIXED = 1 / 60;
const HW = 0.16 * CAT_SCALE;
const CAT_H = 0.48 * CAT_SCALE;

type Debris = { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number };

export class PurrgeGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.08, 60);
  private input = new GameInput();
  private audio = new GameAudio();
  private cat = buildCat();
  private items: Item[] = [];
  private sim: Sim = createSim();
  private camYaw = 0.15;
  private camPitch = -0.12;
  private catYaw = Math.PI;
  private px = 4.5;
  private py = 0;
  private pz = 3.3;
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private grounded = true;
  private container: HTMLElement;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private t = 0;
  private trauma = 0;
  private cool = 0;
  private disposed = false;
  private hudAcc = 0;
  private orbit = 0;
  private debris: Debris[] = [];
  private debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  private resizeObs: ResizeObserver;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2(0, 0);
  private target: Item | null = null;
  private scratchAnim = 0;
  private lookAt = new THREE.Vector3();

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(C.sky, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";

    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.sky, 10, 22);

    this.scene.add(new THREE.AmbientLight(0xfff1e0, 0.55));
    const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8a7a68, 1.05);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe6c4, 1.35);
    sun.position.set(4, 10, -6);
    this.scene.add(sun);

    this.items = buildApartment(this.scene);
    this.cat.position.set(this.px, this.py, this.pz);
    this.cat.rotation.y = this.catYaw;
    this.scene.add(this.cat);

    this.input.attach(canvas);
    this.input.onUnlock = () => {
      if (useGameStore.getState().phase === "playing") useGameStore.getState().setPhase("paused");
    };

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();

    this.wireQa();
    this.raf = requestAnimationFrame((n) => this.loop(n));
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start(): void {
    this.audio.unlock();
    const shell = this.scene.getObjectByName("shell");
    if (shell) this.scene.remove(shell);
    for (const it of this.items) this.scene.remove(it.group);
    this.items = buildApartment(this.scene);
    this.sim = createSim();
    this.px = 4.5;
    this.py = 0;
    this.pz = 3.3;
    this.vx = this.vy = this.vz = 0;
    this.catYaw = Math.PI;
    this.camYaw = 0.15;
    this.camPitch = -0.12;
    this.grounded = true;
    this.cool = 0;
    this.trauma = 0;
    this.acc = 0;
    this.scratchAnim = 0;
    this.target = null;
    for (const d of this.debris) this.scene.remove(d.mesh);
    this.debris = [];
    this.cat.position.set(this.px, this.py, this.pz);
    this.cat.rotation.y = this.catYaw;
    useGameStore.getState().resetHud();
    useGameStore.getState().setPhase("playing");
    void this.input.requestLock();
  }

  resume(): void {
    this.audio.unlock();
    useGameStore.getState().setPhase("playing");
    void this.input.requestLock();
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const sec = now / 1000;
    let dt = this.last ? sec - this.last : 0.016;
    this.last = sec;
    dt = Math.min(dt, 0.08);
    this.t += dt;
    this.input.beginFrame();

    const phase = useGameStore.getState().phase;
    if (phase === "menu") {
      this.orbit += dt * 0.12;
      const a = this.orbit + 0.85;
      this.camera.position.set(6.6 + Math.cos(a) * 4.6, 3.3, 2.4 + Math.sin(a) * 4.6);
      this.camera.lookAt(6.5, 0.55, 2.2);
    } else if (phase === "playing") {
      this.simulate(dt);
    } else {
      this.cameraFollow(0);
    }

    this.updateDebris(dt);
    this.trauma = Math.max(0, this.trauma - dt * 2);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  };

  private simulate(dt: number): void {
    if (this.input.just("Escape")) {
      useGameStore.getState().setPhase("paused");
      return;
    }
    if (this.input.just("KeyQ")) this.audio.meow();

    this.camYaw -= this.input.lookX * 0.0024;
    this.camPitch -= this.input.lookY * 0.002;
    this.camPitch = Math.max(-0.7, Math.min(0.35, this.camPitch));

    const mv = this.input.move();
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);
    const rx = Math.cos(this.camYaw);
    const rz = -Math.sin(this.camYaw);
    const speed = mv.sprint ? 3.6 : 2.4;
    const wishX = fx * mv.z + rx * mv.x;
    const wishZ = fz * mv.z + rz * mv.x;
    const wantJump = this.input.down("Space");

    this.acc += dt;
    while (this.acc >= FIXED) {
      this.stepPhysics(FIXED, wishX, wishZ, speed, wantJump);
      this.acc -= FIXED;
    }

    const moving = Math.hypot(this.vx, this.vz);
    if (this.grounded && moving > 0.4) this.audio.step(this.t);
    poseCat(this.cat, this.t, moving, this.grounded, this.scratchAnim > 0);
    this.cat.position.set(this.px, this.py, this.pz);
    if (moving > 0.15) {
      const face = Math.atan2(wishX, wishZ);
      this.catYaw = lerpAng(this.catYaw, face, 1 - Math.exp(-10 * dt));
    }
    this.cat.rotation.y = this.catYaw;

    this.cool = Math.max(0, this.cool - dt);
    this.scratchAnim = Math.max(0, this.scratchAnim - dt);
    this.pickTarget();
    if (this.cool === 0 && (this.input.scratchHeld || this.input.down("KeyE"))) {
      this.scratch();
      this.cool = 0.22;
    }
    if (this.cool === 0 && (this.input.pushHeld || this.input.down("KeyF"))) {
      this.push();
      this.cool = 0.28;
    }

    const cozy = this.inBox();
    tickMeters(this.sim, dt, !this.input.scratchHeld && moving < 0.2, cozy);
    this.stepFurniture(dt);

    if (this.sim.boredom <= 0 || this.sim.lives <= 0 || this.sim.attention >= 100 || dayOver(this.sim)) {
      this.endRun();
      return;
    }
    if (inDoor(this.px, this.pz) && this.sim.mischief >= 40 && this.sim.attention >= 70) {
      this.endRun("door");
      return;
    }

    this.cameraFollow(dt);
    this.hudAcc += dt;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      this.flushHud();
    }
  }

  private stepPhysics(dt: number, wishX: number, wishZ: number, speed: number, wantJump: boolean): void {
    this.vx += (wishX * speed - this.vx) * Math.min(1, 12 * dt);
    this.vz += (wishZ * speed - this.vz) * Math.min(1, 12 * dt);
    if (wantJump && this.grounded) {
      this.vy = 5.2;
      this.grounded = false;
      this.audio.jump();
    }
    this.vy -= 18 * dt;
    this.py += this.vy * dt;
    if (this.py <= 0) {
      this.py = 0;
      this.vy = 0;
      this.grounded = true;
    } else this.grounded = false;

    const nx = this.px + this.vx * dt;
    const nz = this.pz + this.vz * dt;
    if (!this.blocked(nx, this.pz)) this.px = nx;
    else this.vx = 0;
    if (!this.blocked(this.px, nz)) this.pz = nz;
    else this.vz = 0;
  }

  private blocked(x: number, z: number): boolean {
    if (wallBlock(x, z, HW)) return true;
    for (const it of this.items) {
      if (it.shattered || it.falling) continue;
      if (it.mass < 8) continue;
      if (aabbHit(x, z, HW * 2, HW * 2, it.group.position.x, it.group.position.z, it.w, it.d)) return true;
    }
    return false;
  }

  private pickTarget(): void {
    this.ray.setFromCamera(this.ndc, this.camera);
    const meshes: THREE.Object3D[] = [];
    for (const it of this.items) {
      if (it.shattered) continue;
      it.group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o);
      });
    }
    const hits = this.ray.intersectObjects(meshes, false);
    this.target = null;
    if (hits[0]) {
      let o: THREE.Object3D | null = hits[0].object;
      while (o) {
        const found = this.items.find((it) => it.group === o);
        if (found) {
          this.target = found;
          break;
        }
        o = o.parent;
      }
    }
    if (this.target) return;
    const fx = Math.sin(this.catYaw);
    const fz = Math.cos(this.catYaw);
    let best = 2.1;
    for (const it of this.items) {
      if (it.shattered) continue;
      const dx = it.group.position.x - this.px;
      const dz = it.group.position.z - this.pz;
      const along = dx * fx + dz * fz;
      if (along < 0.12) continue;
      const dist = Math.hypot(dx, dz);
      if (dist < best) {
        best = dist;
        this.target = it;
      }
    }
  }

  private scratch(): void {
    const it = this.target;
    if (!it || it.shattered) return;
    const dmg = it.mass < 5 ? 0.55 : 0.22;
    it.hp -= dmg;
    this.audio.scratch(it.hp <= 0);
    this.trauma = Math.min(1, this.trauma + 0.2);
    this.scratchAnim = 0.2;
    it.group.scale.setScalar(0.92 + Math.random() * 0.04);
    if (it.hp <= 0) this.breakItem(it);
    else {
      it.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material instanceof THREE.MeshLambertMaterial) {
          const cloned = m.material.clone();
          cloned.color.offsetHSL(0, 0, -0.08);
          m.material = cloned;
        }
      });
      applyEvent(this.sim, it.fun * 0.25, it.att * 0.2, Math.round(it.value * 0.08), `${it.name} (царапка)`, it.material);
    }
  }

  private push(): void {
    const it = this.target;
    if (!it || it.shattered) return;
    const fx = Math.sin(this.catYaw);
    const fz = Math.cos(this.catYaw);
    if (it.mass > 40) {
      this.audio.thud();
      return;
    }
    it.vx += fx * (18 / Math.max(2, it.mass));
    it.vz += fz * (18 / Math.max(2, it.mass));
    it.falling = true;
    it.vy = 1.2;
    this.audio.thud();
    this.trauma = Math.min(1, this.trauma + 0.15);
    applyEvent(this.sim, it.fun * 0.35, it.att * 0.35, Math.round(it.value * 0.05), `${it.name} (толчок)`, it.material);
  }

  private breakItem(it: Item): void {
    if (it.shattered) return;
    it.shattered = true;
    it.falling = false;
    this.audio.shatter(it.material);
    this.spawnDebris(it);
    it.group.visible = false;
    applyEvent(this.sim, it.fun, it.att, it.value, it.name, it.material);
    this.trauma = Math.min(1, this.trauma + 0.45);
    for (const child of this.items) {
      if (child.parentId === it.id && !child.shattered) {
        child.falling = true;
        child.vy = 0.4;
      }
    }
  }

  private spawnDebris(it: Item): void {
    const col =
      it.material === "стекло" || it.material === "керамика"
        ? 0xe8d8c8
        : it.material === "ткань"
          ? 0x6b7d8a
          : it.material === "металл"
            ? 0x8a9098
            : 0x8a6240;
    const n = it.mass > 20 ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.debrisGeo, mat(col));
      const s = 0.06 + Math.random() * 0.1;
      mesh.scale.setScalar(s);
      mesh.position.copy(it.group.position);
      mesh.position.y += Math.random() * it.h;
      this.scene.add(mesh);
      this.debris.push({
        mesh,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 1,
        vz: (Math.random() - 0.5) * 4,
        life: 1.2 + Math.random() * 0.6,
      });
    }
  }

  private stepFurniture(dt: number): void {
    const byId = new Map(this.items.map((it) => [it.id, it]));
    for (const it of this.items) {
      if (it.shattered) continue;
      if (it.parentId) {
        const parent = byId.get(it.parentId);
        if (!parent || parent.shattered || parent.falling) {
          if (!it.falling) {
            it.falling = true;
            it.vy = 0.25;
            if (parent && !parent.shattered) {
              it.vx += parent.vx * 0.85;
              it.vz += parent.vz * 0.85;
            }
          }
        } else {
          it.group.position.x = parent.group.position.x + it.offX;
          it.group.position.z = parent.group.position.z + it.offZ;
          it.group.position.y = parent.group.position.y + parent.h / 2 + it.h / 2 + 0.02;
          continue;
        }
      }
      if (!it.falling && Math.hypot(it.vx, it.vz) < 0.05) continue;
      it.vy -= 16 * dt;
      it.group.position.x += it.vx * dt;
      it.group.position.y += it.vy * dt;
      it.group.position.z += it.vz * dt;
      it.vx *= 0.92;
      it.vz *= 0.92;
      if (it.group.position.y <= it.h / 2) {
        if (it.falling && it.vy < -2) {
          this.audio.thud();
          applyEvent(this.sim, it.fun * 0.4, it.att * 0.5, Math.round(it.value * 0.15), `${it.name} (падение)`, it.material);
          if (it.hp < 0.5 || it.mass < 6) this.breakItem(it);
        }
        it.group.position.y = it.h / 2;
        it.vy = 0;
        it.falling = false;
        it.vx *= 0.4;
        it.vz *= 0.4;
      }
      if (
        !it.shattered &&
        this.sim.iFrames <= 0 &&
        aabbHit(this.px, this.pz, HW * 2, HW * 2, it.group.position.x, it.group.position.z, it.w, it.d) &&
        it.group.position.y < CAT_H &&
        it.vy < -1.5 &&
        it.mass > 8
      ) {
        if (hitCat(this.sim)) this.trauma = 1;
      }
    }
  }

  private updateDebris(dt: number): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const p = this.debris[i]!;
      p.life -= dt;
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 6;
      if (p.mesh.position.y < 0.04) {
        p.mesh.position.y = 0.04;
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.debris.splice(i, 1);
      }
    }
  }

  private cameraFollow(dt: number): void {
    let dist = 2.7;
    const h = 1.15;
    let tx = this.px + Math.sin(this.camYaw) * dist;
    let tz = this.pz + Math.cos(this.camYaw) * dist;
    const ty = this.py + h + this.camPitch * -1.2;
    for (let i = 0; i < 8 && wallBlock(tx, tz, 0.25); i++) {
      dist *= 0.78;
      tx = this.px + Math.sin(this.camYaw) * dist;
      tz = this.pz + Math.cos(this.camYaw) * dist;
    }
    const k = dt > 0 ? 1 - Math.exp(-8 * dt) : 1;
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (ty - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;
    this.lookAt.set(
      this.px - Math.sin(this.camYaw) * 0.4,
      this.py + 0.36 * CAT_SCALE,
      this.pz - Math.cos(this.camYaw) * 0.4,
    );
    this.camera.lookAt(this.lookAt);
    if (this.trauma > 0.01) {
      const s = this.trauma * this.trauma;
      this.camera.position.x += (Math.random() - 0.5) * s * 0.08;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.06;
    }
  }

  private flushHud(): void {
    const s = this.sim;
    let hint = HINTS.idle;
    if (s.boredom < 25) hint = HINTS.low;
    else if (s.attention > 85) hint = HINTS.window;
    else if (inDoor(this.px, this.pz)) hint = HINTS.door;
    else if (this.inBox()) hint = HINTS.box;
    else if (this.target) hint = `${this.target.name} — ${HINTS.target}`;
    useGameStore.getState().patch({
      boredom: s.boredom,
      attention: s.attention,
      mischief: s.mischief,
      damage: s.damage,
      lives: s.lives,
      clock: clockLabel(s),
      hint,
      target: this.target?.name ?? null,
    });
  }

  private endRun(force?: "door"): void {
    const outcome = force ?? decide(this.sim);
    useGameStore.getState().patch({
      phase: "ended",
      outcome,
      rating: rating(this.sim.damage),
      bill: this.sim.bill.slice(-12),
      damage: this.sim.damage,
      boredom: this.sim.boredom,
      attention: this.sim.attention,
      mischief: this.sim.mischief,
    });
  }

  setScratch(v: boolean): void {
    this.input.scratchHeld = v;
  }
  setPush(v: boolean): void {
    this.input.pushHeld = v;
  }
  setJump(v: boolean): void {
    if (v) this.input.keys.add("Space");
    else this.input.keys.delete("Space");
  }

  private inBox(): boolean {
    for (const it of this.items) {
      if (it.id !== "box" || it.shattered) continue;
      if (aabbHit(this.px, this.pz, HW * 2, HW * 2, it.group.position.x, it.group.position.z, it.w, it.d)) {
        return true;
      }
    }
    return false;
  }

  private wireQa(): void {
    window.__controlsTest = {
      getYaw: () => this.camYaw,
      getSpeed: () => Math.hypot(this.vx, this.vz),
      getPosition: () => ({ x: this.px, y: this.py, z: this.pz }),
      setKeys: (codes: string[]) => {
        this.input.qaKeys = codes;
        this.input.keys = new Set(codes);
      },
    };
    window.__purrge = this;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.input.detach();
    this.debrisGeo.dispose();
    this.renderer.dispose();
    delete window.__controlsTest;
  }
}

function lerpAng(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPosition: () => { x: number; y: number; z: number };
      setKeys?: (codes: string[]) => void;
    };
    __purrge?: PurrgeGame;
  }
}
