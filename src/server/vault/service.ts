import { and, desc, eq, gt, gte, isNull, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { Database } from '../db/types';
import { gameRounds, ledger, users, wallets } from '../db/schema';
import { GAME_DURATION_MS, GAME_IDS, type GameId } from '@/lib/vault';
import type { LeaderboardPeriod, LeaderboardView, VaultRoundView } from '@/lib/contracts';
import { prepareRound, secureRng, type Rng } from './games';
import { monthStart } from '../month';

export type VaultErrorCode =
  'INVALID_BET' | 'TOO_FAST' | 'INSUFFICIENT_BALANCE' | 'MISSING_WALLET' | 'IDEMPOTENCY_CONFLICT';
export class VaultError extends Error {
  constructor(
    readonly code: VaultErrorCode,
    readonly retryAfterMs = 0,
  ) {
    super(code);
  }
}

/** Stable JSON for comparing a replayed bet with the stored one (jsonb reorders keys). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function roundView(round: typeof gameRounds.$inferSelect): VaultRoundView {
  return {
    id: round.id,
    game: round.game,
    stake: round.stake.toString(),
    payout: round.payout.toString(),
    net: (round.payout - round.stake).toString(),
    balanceAfter: round.balanceAfter.toString(),
    bet: round.bet as Record<string, unknown>,
    outcome: round.outcome as Record<string, unknown>,
    createdAt: round.createdAt.toISOString(),
  };
}

/**
 * Plays one round of free Vault Points. Everything happens under the player's wallet row lock:
 * the pace check, balance check, random outcome, round record, ledger net and wallet update.
 */
export async function playRound(
  db: Database,
  input: { userId: string; game: GameId; bet: unknown; key: string },
  rng: Rng = secureRng,
): Promise<VaultRoundView> {
  let prepared;
  try {
    prepared = prepareRound(input.game, input.bet);
  } catch (error) {
    if (
      error instanceof ZodError ||
      (error instanceof Error && error.message === 'STAKE_ABOVE_LIMIT')
    )
      throw new VaultError('INVALID_BET');
    throw error;
  }
  const idempotencyKey = `vault:${input.userId}:${input.key}`;
  return db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, input.userId))
      .for('update');
    if (!wallet) throw new VaultError('MISSING_WALLET');
    const [existing] = await tx
      .select()
      .from(gameRounds)
      .where(eq(gameRounds.idempotencyKey, idempotencyKey));
    if (existing) {
      if (
        existing.userId !== input.userId ||
        existing.game !== prepared.game ||
        canonical(existing.bet) !== canonical(prepared.bet)
      )
        throw new VaultError('IDEMPOTENCY_CONFLICT');
      return roundView(existing);
    }
    // Pace: a new round may only start once the previous round's animation has fully played.
    // Both timestamps come from the database clock, and the wallet lock serializes this check.
    const [last] = await tx
      .select({
        game: gameRounds.game,
        elapsedMs:
          sql<number>`(extract(epoch from (now() - ${gameRounds.createdAt})) * 1000)::float8`.mapWith(
            Number,
          ),
      })
      .from(gameRounds)
      .where(eq(gameRounds.userId, input.userId))
      .orderBy(desc(gameRounds.createdAt))
      .limit(1);
    if (last) {
      const required =
        GAME_DURATION_MS[last.game as GameId] ?? Math.max(...Object.values(GAME_DURATION_MS));
      if (last.elapsedMs < required)
        throw new VaultError('TOO_FAST', Math.ceil(required - Math.max(0, last.elapsedMs)));
    }
    if (wallet.balance < prepared.stake) throw new VaultError('INSUFFICIENT_BALANCE');
    const settlement = prepared.settle(rng);
    const net = settlement.payout - settlement.stake;
    const balanceAfter = wallet.balance + net;
    const [round] = await tx
      .insert(gameRounds)
      .values({
        userId: input.userId,
        game: prepared.game,
        stake: settlement.stake,
        payout: settlement.payout,
        balanceAfter,
        bet: prepared.bet,
        outcome: settlement.outcome,
        idempotencyKey,
      })
      .returning();
    if (net !== 0n) {
      await tx.insert(ledger).values({
        userId: input.userId,
        type: 'game',
        amount: net,
        idempotencyKey: `game:${round.id}`,
        sourceRef: round.id,
        reason: prepared.game,
      });
      await tx
        .update(wallets)
        .set({ balance: balanceAfter })
        .where(eq(wallets.userId, input.userId));
    }
    return roundView(round);
  });
}

export async function recentRounds(db: Database, userId: string, limit = 8) {
  const rows = await db
    .select()
    .from(gameRounds)
    .where(eq(gameRounds.userId, userId))
    .orderBy(desc(gameRounds.createdAt), desc(gameRounds.id))
    .limit(limit);
  return rows.map(roundView);
}

const LEADERBOARD_SIZE = 25;
/**
 * Accounts appear while `listed` is on (the default; members can turn it off) and no deletion was requested.
 * All-time ranks the current balance; monthly ranks the net VP change since the first of the month.
 */
export async function leaderboard(
  db: Database,
  period: LeaderboardPeriod,
  viewerId: string | null,
  now = new Date(),
): Promise<LeaderboardView> {
  const since = period === 'month' ? monthStart(now) : null;
  const eligible = and(eq(users.listed, true), isNull(users.deletionRequestedAt));
  const monthly = db
    .select({
      userId: ledger.userId,
      value: sql<bigint>`sum(${ledger.amount})`.mapWith(BigInt).as('value'),
    })
    .from(ledger)
    .where(gte(ledger.createdAt, since ?? new Date(0)))
    .groupBy(ledger.userId)
    .as('monthly');
  const rows =
    period === 'all'
      ? await db
          .select({
            id: users.id,
            name: users.displayName,
            avatarUrl: users.avatarUrl,
            value: wallets.balance,
          })
          .from(wallets)
          .innerJoin(users, eq(users.id, wallets.userId))
          .where(and(eligible, gt(wallets.balance, 0n)))
          .orderBy(desc(wallets.balance), users.displayName, users.id)
          .limit(LEADERBOARD_SIZE)
      : await db
          .select({
            id: users.id,
            name: users.displayName,
            avatarUrl: users.avatarUrl,
            value: monthly.value,
          })
          .from(monthly)
          .innerJoin(users, eq(users.id, monthly.userId))
          .where(and(eligible, sql`${monthly.value} > 0`))
          .orderBy(desc(monthly.value), users.displayName, users.id)
          .limit(LEADERBOARD_SIZE);

  let viewer: LeaderboardView['viewer'] = null;
  if (viewerId) {
    const [me] = await db
      .select({ listed: users.listed, balance: wallets.balance })
      .from(users)
      .innerJoin(wallets, eq(wallets.userId, users.id))
      .where(eq(users.id, viewerId));
    if (me) {
      let value = me.balance;
      if (period === 'month') {
        const [row] = await db
          .select({ value: monthly.value })
          .from(monthly)
          .where(eq(monthly.userId, viewerId));
        value = row ? BigInt(row.value) : 0n;
      }
      let rank: number | null = null;
      if (me.listed && value > 0n) {
        const [ahead] =
          period === 'all'
            ? await db
                .select({ count: sql<number>`count(*)`.mapWith(Number) })
                .from(wallets)
                .innerJoin(users, eq(users.id, wallets.userId))
                .where(and(eligible, gt(wallets.balance, value)))
            : await db
                .select({ count: sql<number>`count(*)`.mapWith(Number) })
                .from(monthly)
                .innerJoin(users, eq(users.id, monthly.userId))
                .where(and(eligible, sql`${monthly.value} > ${value.toString()}::numeric`));
        rank = ahead.count + 1;
      }
      viewer = { listed: me.listed, rank, value: value.toString() };
    }
  }
  let previous: bigint | null = null;
  let rank = 0;
  return {
    period,
    since: since?.toISOString() ?? null,
    entries: rows.map((row, index) => {
      const value = BigInt(row.value);
      // Equal values share a rank (1, 2, 2, 4).
      if (value !== previous) rank = index + 1;
      previous = value;
      return {
        rank,
        name: row.name,
        avatarUrl: row.avatarUrl,
        value: value.toString(),
        you: row.id === viewerId,
      };
    }),
    viewer,
  };
}

export function isGameId(value: unknown): value is GameId {
  return (GAME_IDS as readonly unknown[]).includes(value);
}
