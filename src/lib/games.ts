/** Arcade games with leaderboards. Shared by the client and the score API. */
export const GAMES = {
  snake: { name: 'Snake', unit: 'apples', lowerIsBetter: false },
  '2048': { name: '2048', unit: 'points', lowerIsBetter: false },
  bricks: { name: 'Bricks', unit: 'points', lowerIsBetter: false },
  blocks: { name: 'Blocks', unit: 'points', lowerIsBetter: false },
  minesweeper: { name: 'Minesweeper', unit: 'seconds', lowerIsBetter: true },
} as const;

export type GameId = keyof typeof GAMES;

export const isGame = (g: unknown): g is GameId => typeof g === 'string' && g in GAMES;

/**
 * Upper bound on a believable score for a run that lasted `seconds`.
 * Scores are sent by the browser, so this keeps obviously forged numbers off the board.
 * For Minesweeper (time), a run can't be shorter than the time it reports.
 */
export function plausible(game: GameId, score: number, seconds: number) {
  if (!Number.isInteger(score) || score < 0) return false;
  switch (game) {
    case 'snake':
      return score <= Math.min(400, seconds * 3 + 3);
    case '2048':
      return score <= Math.min(4_000_000, seconds * 450 + 200);
    case 'bricks':
      return score <= Math.min(100_000, seconds * 60 + 100);
    case 'blocks':
      return score <= Math.min(2_000_000, seconds * 600 + 500);
    case 'minesweeper':
      return score >= 2 && score <= 999 && seconds + 2 >= score;
  }
}
