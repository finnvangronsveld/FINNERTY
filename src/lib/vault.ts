/**
 * Shared Vault game definitions. Client-safe: the UI shows exactly the odds the server applies.
 * Multipliers are basis points (10 000 = 1×) so all payouts stay integer VP.
 */
export const GAME_IDS = ['coinflip', 'dice', 'slots', 'roulette'] as const;
export type GameId = (typeof GAME_IDS)[number];

export const VAULT_LIMITS = { minStake: 10, maxStake: 5_000, rouletteMaxSpots: 40 } as const;

/**
 * Minimum time between two rounds of one player, enforced by the server under the wallet lock.
 * The UI animation runs exactly this long, so clicking faster never plays faster.
 */
export const GAME_DURATION_MS: Record<GameId, number> = {
  coinflip: 2600,
  dice: 2400,
  slots: 3400,
  roulette: 6200,
};

export const GAME_INFO: Record<GameId, { name: string; tagline: string; rtp: string }> = {
  coinflip: { name: 'Coinflip', tagline: 'Kop of munt. Eén worp.', rtp: '97,0%' },
  dice: { name: 'Dice', tagline: 'Kies je kans, kies je risico.', rtp: '97,0%' },
  slots: { name: 'Orbit Slots', tagline: 'Drie rollen. Eén F.', rtp: '97,1%' },
  roulette: { name: 'Roulette', tagline: 'Europees wiel, één nul.', rtp: '97,3%' },
};

export function payoutFor(stake: bigint, multiplierBp: number) {
  return (stake * BigInt(multiplierBp)) / 10_000n;
}

// Coinflip: 1.94× on a fair coin → 97% return.
export const COIN_SIDES = ['heads', 'tails'] as const;
export type CoinSide = (typeof COIN_SIDES)[number];
export const COIN_LABEL: Record<CoinSide, string> = { heads: 'Kop', tails: 'Munt' };
export const COINFLIP_MULTIPLIER_BP = 19_400;

// Dice: roll 0.00–99.99; the multiplier is 97 / win chance.
export const DICE_CHANCE = { min: 2, max: 95 } as const;
export type DiceDirection = 'under' | 'over';
export function diceMultiplierBp(chance: number) {
  return Math.floor(970_000 / chance);
}
/** Roll is an integer 0–9999 (shown as 0.00–99.99). */
export function diceWins(roll: number, chance: number, direction: DiceDirection) {
  return direction === 'under' ? roll < chance * 100 : roll >= 10_000 - chance * 100;
}

// Slots: three independent weighted reels, evaluated on the middle line.
export const SLOT_SYMBOLS = ['f', 'gem', 'rocket', 'moon', 'star', 'orbit'] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
  f: 1,
  gem: 2,
  rocket: 3,
  moon: 4,
  star: 5,
  orbit: 6,
};
export const SLOT_WEIGHT_TOTAL = 21;
export const SLOT_THREE_BP: Record<SlotSymbol, number> = {
  f: 2_500_000,
  gem: 550_000,
  rocket: 250_000,
  moon: 200_000,
  star: 100_000,
  orbit: 60_000,
};
/** First two reels match (third differs). */
export const SLOT_PAIR_BP: Record<SlotSymbol, number> = {
  f: 150_000,
  gem: 50_000,
  rocket: 30_000,
  moon: 20_000,
  star: 10_000,
  orbit: 10_000,
};
/** A single F anywhere returns the stake when nothing else pays. */
export const SLOT_SINGLE_F_BP = 10_000;
export type SlotLine = 'three' | 'pair' | 'single_f' | null;
export function slotResult(reels: readonly SlotSymbol[]): { bp: number; line: SlotLine } {
  const [a, b, c] = reels;
  if (a === b && b === c) return { bp: SLOT_THREE_BP[a], line: 'three' };
  if (a === b) return { bp: SLOT_PAIR_BP[a], line: 'pair' };
  if (reels.includes('f')) return { bp: SLOT_SINGLE_F_BP, line: 'single_f' };
  return { bp: 0, line: null };
}
export function slotSymbolAt(index: number): SlotSymbol {
  let cursor = index;
  for (const symbol of SLOT_SYMBOLS) {
    if (cursor < SLOT_WEIGHTS[symbol]) return symbol;
    cursor -= SLOT_WEIGHTS[symbol];
  }
  throw new Error('SLOT_INDEX_OUT_OF_RANGE');
}

// Roulette: European single-zero wheel. Every bet returns 36/37 = 97.3%.
export const ROULETTE_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type RouletteColor = 'red' | 'black' | 'zero';
export function rouletteColor(n: number): RouletteColor {
  return n === 0 ? 'zero' : RED.has(n) ? 'red' : 'black';
}
export const ROULETTE_BET_TYPES = [
  'straight',
  'red',
  'black',
  'even',
  'odd',
  'low',
  'high',
  'dozen',
  'column',
] as const;
export type RouletteBetType = (typeof ROULETTE_BET_TYPES)[number];
export interface RouletteBet {
  type: RouletteBetType;
  value?: number;
  amount: string;
}
export const ROULETTE_PAYOUT_BP: Record<RouletteBetType, number> = {
  straight: 360_000,
  red: 20_000,
  black: 20_000,
  even: 20_000,
  odd: 20_000,
  low: 20_000,
  high: 20_000,
  dozen: 30_000,
  column: 30_000,
};
export function rouletteBetWins(bet: Pick<RouletteBet, 'type' | 'value'>, n: number) {
  if (bet.type === 'straight') return bet.value === n;
  if (n === 0) return false;
  switch (bet.type) {
    case 'red':
      return RED.has(n);
    case 'black':
      return !RED.has(n);
    case 'even':
      return n % 2 === 0;
    case 'odd':
      return n % 2 === 1;
    case 'low':
      return n <= 18;
    case 'high':
      return n >= 19;
    case 'dozen':
      return Math.ceil(n / 12) === bet.value;
    case 'column':
      return ((n - 1) % 3) + 1 === bet.value;
  }
}

export function formatVp(value: string | bigint | number) {
  return BigInt(value).toLocaleString('nl-BE');
}
