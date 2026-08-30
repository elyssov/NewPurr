import { create } from "zustand";

export type Phase = "menu" | "playing" | "paused" | "ended";
export type Outcome = "door" | "window" | "boredom" | "weak" | "dead" | null;

export type BillRow = {
  name: string;
  material: string;
  value: number;
};

type Hud = {
  phase: Phase;
  boredom: number;
  attention: number;
  mischief: number;
  damage: number;
  lives: number;
  clock: string;
  hint: string;
  dog: string;
  target: string | null;
  outcome: Outcome;
  rating: string;
  bill: BillRow[];
  help: boolean;
};

type Actions = {
  patch: (p: Partial<Hud>) => void;
  setPhase: (phase: Phase) => void;
  setHelp: (help: boolean) => void;
  resetHud: () => void;
};

const initial: Hud = {
  phase: "menu",
  boredom: 100,
  attention: 0,
  mischief: 0,
  damage: 0,
  lives: 9,
  clock: "09:00",
  hint: "Царапай. Толкай. Не переборщи.",
  dog: "нет пса",
  target: null,
  outcome: null,
  rating: "",
  bill: [],
  help: false,
};

export const useGameStore = create<Hud & Actions>((set) => ({
  ...initial,
  patch: (p) => set(p),
  setPhase: (phase) => set({ phase }),
  setHelp: (help) => set({ help }),
  resetHud: () => set({ ...initial, phase: "playing" }),
}));
