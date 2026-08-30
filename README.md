# PURRGE — web prototype

Веб-прототип PURRGE (The Misfits Software). Короткий забег: кот в квартире, скука vs внимание хозяйки, царапки и толчки, чек за ущерб.

Это не Prometheus Engine (Rust + wgpu). Автономный браузерный прототип на Three.js.

## Запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build`.

## Управление

- WASD — ходьба
- мышь — камера
- ЛКМ / E — царапать
- ПКМ / F — толкать
- Space — прыжок
- Q — мяу
- Esc — пауза

Цель: набрать озорство и внимание в дверной зоне, не улетая в окно и не умерев от скуки.

## Карта исходников

- `src/game/cat.ts` — воксельный кот (`CAT_SCALE = 0.52` ≈ мейн-кун)
- `src/game/apartment.ts` — квартира, стены, свет
- `src/game/furniture.ts` — диван, ваза, ТВ, коробка
- `src/game/engine.ts` — цикл, физика AABB, камера, разрушение
- `src/game/meters.ts` — скука / внимание / озорство / исходы
- `src/game/input.ts` — клава, мышь, геймпад, тач
- `src/game/vox.ts` — shared box mesh + lambert palette
- `src/game/audio.ts` — Web Audio
- `src/App.tsx` — HUD и меню

Прототип для The Misfits Software. Тестовое задание, Grok Build, август 2026.
