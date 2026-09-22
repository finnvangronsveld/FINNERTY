import { randomInt } from 'node:crypto';
import { z } from 'zod';
import {
  COIN_SIDES,
  COINFLIP_MULTIPLIER_BP,
  DICE_CHANCE,
  ROULETTE_BET_TYPES,
  ROULETTE_PAYOUT_BP,
  SLOT_WEIGHT_TOTAL,
  VAULT_LIMITS,
  diceMultiplierBp,
  diceWins,
  payoutFor,
  rouletteBetWins,
  rouletteColor,
  slotResult,
  slotSymbolAt,
  type GameId,
} from '@/lib/vault';

/** Uniform integer in [0, maxExclusive). Production uses the OS CSPRNG. */
export type Rng = (maxExclusive: number) => number;
export const secureRng: Rng = (maxExclusive) => randomInt(maxExclusive);

const amount = z
  .string()
  .regex(/^[1-9][0-9]{0,8}$/)
  .refine((value) => {
    const stake = BigInt(value);
    return stake >= BigInt(VAULT_LIMITS.minStake) && stake <= BigInt(VAULT_LIMITS.maxStake);
  });

const rouletteBet = z
  .object({
    type: z.enum(ROULETTE_BET_TYPES),
    value: z.number().int().optional(),
    amount,
  })
  .strict()
  .refine((bet) =>
    bet.type === 'straight'
      ? bet.value !== undefined && bet.value >= 0 && bet.value <= 36
      : bet.type === 'dozen' || bet.type === 'column'
        ? bet.value !== undefined && bet.value >= 1 && bet.value <= 3
        : bet.value === undefined,
  );

const schemas = {
  coinflip: z.object({ stake: amount, side: z.enum(COIN_SIDES) }).strict(),
  dice: z
    .object({
      stake: amount,
      chance: z.number().int().min(DICE_CHANCE.min).max(DICE_CHANCE.max),
      direction: z.enum(['under', 'over']),
    })
    .strict(),
  slots: z.object({ stake: amount }).strict(),
  roulette: z
    .object({ bets: z.array(rouletteBet).min(1).max(VAULT_LIMITS.rouletteMaxSpots) })
    .strict(),
};

export interface Settlement {
  stake: bigint;
  payout: bigint;
  outcome: Record<string, unknown>;
}
export interface PreparedRound {
  game: GameId;
  bet: Record<string, unknown>;
  stake: bigint;
  settle: (rng: Rng) => Settlement;
}

/** Validates a bet and returns its stake plus a settle function. Throws ZodError on invalid bets. */
export function prepareRound(game: GameId, input: unknown): PreparedRound {
  switch (game) {
    case 'coinflip': {
      const bet = schemas.coinflip.parse(input);
      const stake = BigInt(bet.stake);
      return {
        game,
        bet,
        stake,
        settle: (rng) => {
          const result = COIN_SIDES[rng(2)];
          const win = result === bet.side;
          return {
            stake,
            payout: win ? payoutFor(stake, COINFLIP_MULTIPLIER_BP) : 0n,
            outcome: { result, win },
          };
        },
      };
    }
    case 'dice': {
      const bet = schemas.dice.parse(input);
      const stake = BigInt(bet.stake);
      return {
        game,
        bet,
        stake,
        settle: (rng) => {
          const roll = rng(10_000);
          const win = diceWins(roll, bet.chance, bet.direction);
          return {
            stake,
            payout: win ? payoutFor(stake, diceMultiplierBp(bet.chance)) : 0n,
            outcome: { roll, win },
          };
        },
      };
    }
    case 'slots': {
      const bet = schemas.slots.parse(input);
      const stake = BigInt(bet.stake);
      return {
        game,
        bet,
        stake,
        settle: (rng) => {
          const reels = [0, 1, 2].map(() => slotSymbolAt(rng(SLOT_WEIGHT_TOTAL)));
          const { bp, line } = slotResult(reels);
          return {
            stake,
            payout: payoutFor(stake, bp),
            outcome: { reels, line, multiplierBp: bp },
          };
        },
      };
    }
    case 'roulette': {
      const bet = schemas.roulette.parse(input);
      const stake = bet.bets.reduce((sum, spot) => sum + BigInt(spot.amount), 0n);
      if (stake > BigInt(VAULT_LIMITS.maxStake)) throw new Error('STAKE_ABOVE_LIMIT');
      return {
        game,
        bet,
        stake,
        settle: (rng) => {
          const number = rng(37);
          const winners: number[] = [];
          let payout = 0n;
          bet.bets.forEach((spot, index) => {
            if (!rouletteBetWins(spot, number)) return;
            winners.push(index);
            payout += payoutFor(BigInt(spot.amount), ROULETTE_PAYOUT_BP[spot.type]);
          });
          return { stake, payout, outcome: { number, color: rouletteColor(number), winners } };
        },
      };
    }
  }
}
