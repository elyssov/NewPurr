import type { BillRow, Outcome } from "./store";

export type Sim = {
  boredom: number;
  attention: number;
  mischief: number;
  damage: number;
  lives: number;
  t: number;
  iFrames: number;
  bill: BillRow[];
};

export function createSim(): Sim {
  return {
    boredom: 100,
    attention: 0,
    mischief: 0,
    damage: 0,
    lives: 9,
    t: 0,
    iFrames: 0,
    bill: [],
  };
}

const DAY = 180;

export function tickMeters(s: Sim, dt: number, quiet: boolean, cozy = false): void {
  s.t += dt;
  s.iFrames = Math.max(0, s.iFrames - dt);
  s.boredom = Math.max(0, s.boredom - (cozy ? 0.08 : 0.28) * dt);
  if (quiet) s.attention = Math.max(0, s.attention - 0.18 * dt);
}

export function clockLabel(s: Sim): string {
  const u = Math.min(1, s.t / DAY);
  const minutes = 9 * 60 + u * 9 * 60;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function dayOver(s: Sim): boolean {
  return s.t >= DAY;
}

export function applyEvent(s: Sim, fun: number, att: number, value: number, name: string, material: string): void {
  s.boredom = Math.min(100, s.boredom + fun);
  s.attention = Math.min(100, s.attention + att);
  s.mischief = Math.min(100, s.mischief + fun * 0.85);
  s.damage += value;
  s.bill.push({ name, material, value });
}

export function hitCat(s: Sim): boolean {
  if (s.iFrames > 0) return false;
  s.lives -= 1;
  s.iFrames = 1.4;
  return true;
}

export function rating(sum: number): string {
  if (sum < 50) return "Буддийский кот";
  if (sum < 500) return "Любопытный котёнок";
  if (sum < 2000) return "Домашний террорист";
  if (sum < 5000) return "Кошачий шар разрушения";
  if (sum < 10000) return "Катастрофа 5 категории";
  return "Легендарный уничтожитель";
}

export function decide(s: Sim): Outcome {
  if (s.lives <= 0) return "dead";
  if (s.boredom <= 0) return "boredom";
  if (s.attention >= 100) return "window";
  if (s.mischief >= 40 && s.attention >= 70) return "door";
  return "weak";
}

export const HINTS = {
  idle: "Скука падает. Найди что тронуть.",
  target: "ЛКМ — царапка · F — толкнуть",
  door: "Дверная зона. Можно закончить цикл.",
  box: "Коробка. Скука почти не растёт.",
  window: "Слишком громко. Окно близко.",
  low: "Скука критическая.",
};
