import { useEffect, useRef, useState } from "react";
import { useGameStore, type Outcome } from "@/game/store";
import { PurrgeGame } from "@/game/engine";

export default function App() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PurrgeGame | null>(null);
  const phase = useGameStore((s) => s.phase);
  const boredom = useGameStore((s) => s.boredom);
  const attention = useGameStore((s) => s.attention);
  const mischief = useGameStore((s) => s.mischief);
  const damage = useGameStore((s) => s.damage);
  const lives = useGameStore((s) => s.lives);
  const clock = useGameStore((s) => s.clock);
  const hint = useGameStore((s) => s.hint);
  const target = useGameStore((s) => s.target);
  const help = useGameStore((s) => s.help);
  const outcome = useGameStore((s) => s.outcome);
  const rating = useGameStore((s) => s.rating);
  const bill = useGameStore((s) => s.bill);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720);
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const game = new PurrgeGame(el, canvas);
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const g = () => gameRef.current;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div ref={wrapRef} className="absolute inset-0 z-0 touch-none">
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      </div>

      {phase === "playing" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          {attention >= 90 && <div className="absolute inset-0 bg-attention/15" />}
          <div
            className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          >
            <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-fg/80" />
            <span className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-fg/80" />
            <span className="absolute top-1/2 left-0 h-px w-1.5 -translate-y-1/2 bg-fg/80" />
            <span className="absolute top-1/2 right-0 h-px w-1.5 -translate-y-1/2 bg-fg/80" />
          </div>
          <div className="relative flex items-start justify-between gap-4">
            <div className="w-[min(16rem,46vw)] space-y-2 rounded-lg border border-border bg-bg-elevated/88 p-3">
              <Bar label="Скука" value={boredom} tone="bg-boredom" />
              <Bar label="Внимание" value={attention} tone="bg-attention" warn={attention >= 80} />
              <Bar label="Озорство" value={mischief} tone="bg-mischief" />
            </div>
            <div className="rounded-lg border border-border bg-bg-elevated/88 px-3 py-2 text-right">
              <p className="font-display text-lg tabular-nums leading-tight">{clock}</p>
              <p className="text-xs text-muted">жизни {lives} · ${Math.round(damage)}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            {target && <p className="rounded-sm bg-bg-elevated/80 px-2 py-1 text-xs text-fg">{target}</p>}
            <p className="max-w-sm text-center text-xs text-muted">{hint}</p>
          </div>
        </div>
      )}

      {touch && phase === "playing" && (
        <div className="absolute inset-0 z-20">
          <div className="pointer-events-none absolute bottom-24 left-5 h-28 w-28 rounded-full border border-border-strong/50 bg-surface/25" />
          <div className="absolute right-3 bottom-24 flex flex-col gap-2">
            <TouchBtn label="Царапка" onDown={() => g()?.setScratch(true)} onUp={() => g()?.setScratch(false)} />
            <TouchBtn label="Толкнуть" onDown={() => g()?.setPush(true)} onUp={() => g()?.setPush(false)} />
            <TouchBtn label="Прыжок" onDown={() => g()?.setJump(true)} onUp={() => g()?.setJump(false)} />
          </div>
        </div>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/20 sm:items-center">
          <div className="mb-8 w-[min(28rem,calc(100%-2rem))] rounded-xl border border-border bg-bg-elevated/94 p-6 sm:mb-0 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">The Misfits Software</p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-fg">PURRGE</h1>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">
              Хозяйка ушла. Скука убивает. Разрушь квартиру достаточно, чтобы тебя выставили за дверь — и не настолько, чтобы вышвырнули в окно.
            </p>
            <div className="mt-7 flex flex-col gap-2">
              <button
                type="button"
                className="h-11 rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition-transform duration-150 hover:brightness-110 active:scale-[0.98]"
                onClick={() => g()?.start()}
              >
                Играть
              </button>
              <button
                type="button"
                className="h-11 text-sm text-muted hover:text-fg"
                onClick={() => useGameStore.getState().setHelp(!help)}
              >
                Управление
              </button>
            </div>
            {help && <Help />}
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/50">
          <div className="w-[min(22rem,calc(100%-2rem))] rounded-xl border border-border bg-bg-elevated p-6">
            <h2 className="font-display text-2xl">Пауза</h2>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="h-11 rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg active:scale-[0.98]"
                onClick={() => g()?.resume()}
              >
                Продолжить
              </button>
              <button
                type="button"
                className="h-11 text-sm text-muted hover:text-fg"
                onClick={() => g()?.start()}
              >
                Заново
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "ended" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/55 p-4">
          <div className="max-h-[90dvh] w-[min(26rem,100%)] overflow-auto rounded-xl border border-border bg-bg-elevated p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{rating}</p>
            <h2 className="mt-2 font-display text-3xl">{outcomeTitle(outcome)}</h2>
            <p className="mt-2 text-sm text-muted">{outcomeCopy(outcome)}</p>
            <p className="mt-4 text-sm tabular-nums text-fg">ущерб ${Math.round(damage)}</p>
            {bill.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                {bill.map((row, i) => (
                  <li key={`${row.name}-${i}`} className="flex justify-between gap-3 text-muted">
                    <span>{row.name}</span>
                    <span className="tabular-nums text-fg">${row.value}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-6 h-11 w-full rounded-md bg-accent text-sm font-semibold text-accent-fg active:scale-[0.98]"
              onClick={() => g()?.start()}
            >
              Ещё квартира
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Bar({
  label,
  value,
  tone,
  warn,
}: {
  label: string;
  value: number;
  tone: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-subtle">
        <span>{label}</span>
        <span className={`tabular-nums ${warn ? "text-attention" : ""}`}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Help() {
  return (
    <ul className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm leading-relaxed text-muted">
      <li>WASD — ходить, мышь — камера</li>
      <li>ЛКМ / E — царапать, ПКМ / F — толкать</li>
      <li>Пробел — прыжок, Q — мяу, ESC — пауза</li>
      <li>Цель: озорство и внимание в дверной зоне, не в окно</li>
    </ul>
  );
}

function TouchBtn({
  label,
  onDown,
  onUp,
}: {
  label: string;
  onDown: () => void;
  onUp?: () => void;
}) {
  return (
    <button
      type="button"
      className="h-11 min-w-[5.5rem] rounded-md border border-border bg-bg-elevated/90 px-3 text-xs font-medium text-fg"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDown();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onUp?.();
      }}
      onPointerCancel={() => onUp?.()}
    >
      {label}
    </button>
  );
}

function outcomeTitle(o: Outcome): string {
  switch (o) {
    case "door":
      return "За дверь";
    case "window":
      return "В окно";
    case "boredom":
      return "Смерть от скуки";
    case "dead":
      return "Девять жизней";
    default:
      return "Слабый забег";
  }
}

function outcomeCopy(o: Outcome): string {
  switch (o) {
    case "door":
      return "Хозяйка выставила кота. Улица ждёт — в этой версии пока только чек.";
    case "window":
      return "Слишком громко. Кот летит в окно. Жадность наказана.";
    case "boredom":
      return "Квартира осталась цела. Кот — нет.";
    case "dead":
      return "Физика победила. Обломки не шутят.";
    default:
      return "Хозяйка вернулась. Бардака мало, скандала тоже.";
  }
}
