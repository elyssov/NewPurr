const GAME = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
  "KeyF",
  "KeyQ",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export class GameInput {
  keys = new Set<string>();
  private prev = new Set<string>();
  lookX = 0;
  lookY = 0;
  touchMoveX = 0;
  touchMoveY = 0;
  scratchHeld = false;
  pushHeld = false;
  locked = false;
  qaKeys: string[] | null = null;
  private el: HTMLElement | null = null;
  private pointers = new Map<number, { mode: "look" | "stick"; x: number; y: number; sx: number; sy: number }>();
  onUnlock: (() => void) | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    if (GAME.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
    this.scratchHeld = false;
    this.pushHeld = false;
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.lookX += e.movementX;
    this.lookY += e.movementY;
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.scratchHeld = true;
    if (e.button === 2) this.pushHeld = true;
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.scratchHeld = false;
    if (e.button === 2) this.pushHeld = false;
  };
  private onContext = (e: Event) => e.preventDefault();
  private onLockChange = () => {
    const next = document.pointerLockElement === this.el;
    const was = this.locked;
    this.locked = next;
    if (!next && was) this.onUnlock?.();
  };
  private onPointerDown = (e: PointerEvent) => {
    if (this.locked) return;
    const el = this.el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const mode: "look" | "stick" = x < r.width * 0.45 ? "stick" : "look";
    this.pointers.set(e.pointerId, { mode, x, y, sx: x, sy: y });
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };
  private onPointerMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const el = this.el!;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (p.mode === "look") {
      this.lookX += x - p.x;
      this.lookY += y - p.y;
    } else {
      const dx = x - p.sx;
      const dy = y - p.sy;
      const mag = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, mag / 56);
      this.touchMoveX = (dx / mag) * s;
      this.touchMoveY = (dy / mag) * s;
    }
    p.x = x;
    p.y = y;
  };
  private onPointerUp = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (p?.mode === "stick") {
      this.touchMoveX = 0;
      this.touchMoveY = 0;
    }
  };

  attach(el: HTMLElement): void {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
    document.addEventListener("pointerlockchange", this.onLockChange);
    el.addEventListener("mousemove", this.onMouseMove);
    el.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    el.addEventListener("contextmenu", this.onContext);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
  }

  detach(): void {
    const el = this.el;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    window.removeEventListener("mouseup", this.onMouseUp);
    if (el) {
      el.removeEventListener("mousemove", this.onMouseMove);
      el.removeEventListener("mousedown", this.onMouseDown);
      el.removeEventListener("contextmenu", this.onContext);
      el.removeEventListener("pointerdown", this.onPointerDown);
      el.removeEventListener("pointermove", this.onPointerMove);
      el.removeEventListener("pointerup", this.onPointerUp);
      el.removeEventListener("pointercancel", this.onPointerUp);
    }
    this.el = null;
  }

  async requestLock(): Promise<void> {
    const el = this.el;
    if (!el) return;
    try {
      const req = el.requestPointerLock as (o?: { unadjustedMovement?: boolean }) => Promise<void> | void;
      const res = req.call(el, { unadjustedMovement: true });
      if (res && typeof (res as Promise<void>).catch === "function") {
        await (res as Promise<void>).catch(() => el.requestPointerLock());
      }
    } catch {
      try {
        el.requestPointerLock();
      } catch {
        /* iframe / mobile */
      }
    }
  }

  beginFrame(): void {
    /* prev is last frame, snapshotted in endFrame */
  }
  endFrame(): void {
    this.prev = new Set(this.keys);
    this.lookX = 0;
    this.lookY = 0;
  }
  down(code: string): boolean {
    if (this.qaKeys) return this.qaKeys.includes(code);
    return this.keys.has(code);
  }
  just(code: string): boolean {
    return this.keys.has(code) && !this.prev.has(code);
  }

  /** x = strafe (−A … +D), z = forward (−S … +W), camera-relative */
  move(): { x: number; z: number; sprint: boolean } {
    let x = this.touchMoveX;
    let z = -this.touchMoveY;
    if (this.down("KeyD") || this.down("ArrowRight")) x += 1;
    if (this.down("KeyA") || this.down("ArrowLeft")) x -= 1;
    if (this.down("KeyW") || this.down("ArrowUp")) z += 1;
    if (this.down("KeyS") || this.down("ArrowDown")) z -= 1;
    const mag = Math.hypot(x, z);
    if (mag > 1) {
      x /= mag;
      z /= mag;
    }
    return { x, z, sprint: this.down("ShiftLeft") || this.down("ShiftRight") };
  }
}
