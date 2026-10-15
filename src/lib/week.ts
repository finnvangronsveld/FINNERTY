import type { GameId } from './games';

/** Games take turns as the game of the week, Monday to Sunday (UTC). */
// Ordered so that week 42 of 2026 (when this list grew) stays on Snake.
export const ROTATION: GameId[] = ['2048', 'bricks', 'minesweeper', 'flappy', 'snake', 'blocks', 'pong', 'solitaire'];

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return { key: `${year}-W${String(week).padStart(2, '0')}`, year, week };
}

export function weekGame(d = new Date()): GameId {
  const { year, week } = isoWeek(d);
  return ROTATION[(year * 53 + week) % ROTATION.length];
}

/** Next Monday 00:00 UTC. */
export function weekEnds(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + (8 - day));
  return t;
}

export function previousWeek(d = new Date()) {
  return new Date(d.getTime() - 7 * 86_400_000);
}
