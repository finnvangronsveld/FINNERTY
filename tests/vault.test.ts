import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq, sql } from 'drizzle-orm';
import { authAccounts, gameRounds, ledger, users, wallets } from '../src/server/db/schema';
import { correctBalance } from '../src/server/points/service';
import { prepareRound, type Rng } from '../src/server/vault/games';
import { leaderboard, playRound, VaultError } from '../src/server/vault/service';
import { monthStart } from '../src/server/month';
import {
  DICE_CHANCE,
  ROULETTE_BET_TYPES,
  SLOT_WEIGHT_TOTAL,
  type GameId,
  type RouletteBetType,
} from '../src/lib/vault';
import type { Database } from '../src/server/db/types';

/** Exact return-to-player: settles every equally likely RNG sequence once. */
function exactRtp(game: GameId, bet: unknown, draws: number[]) {
  const round = prepareRound(game, bet);
  let payout = 0n;
  let outcomes = 0n;
  const walk = (prefix: number[]) => {
    if (prefix.length === draws.length) {
      let index = 0;
      const rng: Rng = () => prefix[index++];
      payout += round.settle(rng).payout;
      outcomes++;
      return;
    }
    for (let value = 0; value < draws[prefix.length]; value++) walk([...prefix, value]);
  };
  walk([]);
  return Number((payout * 1_000_000n) / (round.stake * outcomes)) / 1_000_000;
}

test('every game returns 95–97.5% over all outcomes; nothing pays above the stated odds', () => {
  const stake = '1000';
  assert.equal(exactRtp('coinflip', { stake, side: 'heads' }, [2]), 0.97);
  for (let chance = DICE_CHANCE.min; chance <= DICE_CHANCE.max; chance++)
    for (const direction of ['under', 'over'])
      assert.ok(
        Math.abs(exactRtp('dice', { stake, chance, direction }, [10_000]) - 0.97) < 0.001,
        `dice ${chance} ${direction}`,
      );
  const slots = exactRtp('slots', { stake }, [
    SLOT_WEIGHT_TOTAL,
    SLOT_WEIGHT_TOTAL,
    SLOT_WEIGHT_TOTAL,
  ]);
  assert.ok(slots > 0.965 && slots < 0.975, `slots ${slots}`);
  const values: Record<RouletteBetType, number | undefined> = {
    straight: 17,
    red: undefined,
    black: undefined,
    even: undefined,
    odd: undefined,
    low: undefined,
    high: undefined,
    dozen: 2,
    column: 3,
  };
  for (const type of ROULETTE_BET_TYPES) {
    const rtp = exactRtp(
      'roulette',
      { bets: [{ type, value: values[type], amount: '370' }] },
      [37],
    );
    assert.ok(Math.abs(rtp - 36 / 37) < 0.0001, `roulette ${type} ${rtp}`);
  }
});

test('invalid bets never reach the wallet', () => {
  const invalid: [GameId, unknown][] = [
    ['coinflip', { stake: '9', side: 'heads' }],
    ['coinflip', { stake: '5001', side: 'heads' }],
    ['coinflip', { stake: '-10', side: 'heads' }],
    ['coinflip', { stake: '10.5', side: 'heads' }],
    ['coinflip', { stake: '100', side: 'edge' }],
    ['dice', { stake: '100', chance: 1, direction: 'under' }],
    ['dice', { stake: '100', chance: 96, direction: 'under' }],
    ['dice', { stake: '100', chance: 50.5, direction: 'under' }],
    ['slots', { stake: '100', extra: true }],
    ['roulette', { bets: [] }],
    ['roulette', { bets: [{ type: 'straight', value: 37, amount: '10' }] }],
    ['roulette', { bets: [{ type: 'red', value: 1, amount: '10' }] }],
    ['roulette', { bets: Array.from({ length: 3 }, () => ({ type: 'red', amount: '2000' })) }],
  ];
  for (const [game, bet] of invalid)
    assert.throws(() => prepareRound(game, bet), Error, JSON.stringify(bet));
});

async function fixture(balance = 1000n) {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  const user = await createUser(db, 'Crew One', balance);
  return { db, client, user };
}
async function createUser(db: Database, name: string, balance: bigint, listed = true) {
  const [user] = await db.insert(users).values({ displayName: name, listed }).returning();
  await db
    .insert(authAccounts)
    .values({ userId: user.id, provider: 'twitch', providerUserId: randomUUID(), login: name });
  await db.insert(wallets).values({ userId: user.id });
  if (balance > 0n)
    await correctBalance(db, {
      userId: user.id,
      actorId: user.id,
      amount: balance,
      reason: 'test seed',
      key: randomUUID(),
    });
  return user;
}
const walletOf = async (db: Database, userId: string) =>
  (await db.select().from(wallets).where(eq(wallets.userId, userId)))[0];
/** Moves the player's rounds into the past so the pace check allows the next one. */
const letAnimationFinish = (db: Database) =>
  db.update(gameRounds).set({ createdAt: sql`${gameRounds.createdAt} - interval '1 minute'` });
const fixed =
  (...values: number[]): Rng =>
  () =>
    values.shift() ?? 0;

test('a round moves only the net through the ledger and keeps balance equal to the journal', async () => {
  const f = await fixture();
  try {
    const win = await playRound(
      f.db,
      {
        userId: f.user.id,
        game: 'coinflip',
        bet: { stake: '100', side: 'heads' },
        key: randomUUID(),
      },
      fixed(0),
    );
    assert.equal(win.payout, '194');
    assert.equal(win.balanceAfter, '1094');
    await letAnimationFinish(f.db);
    const loss = await playRound(
      f.db,
      {
        userId: f.user.id,
        game: 'dice',
        bet: { stake: '500', chance: 50, direction: 'under' },
        key: randomUUID(),
      },
      fixed(5000),
    );
    assert.equal(loss.net, '-500');
    const wallet = await walletOf(f.db, f.user.id);
    assert.equal(wallet.balance, 594n);
    assert.equal(wallet.totalEarned, 0n, 'game wins are not watch-time earnings');
    const [journal] = await f.db
      .select({ sum: sql<string>`sum(${ledger.amount})` })
      .from(ledger)
      .where(eq(ledger.userId, f.user.id));
    assert.equal(BigInt(journal.sum), wallet.balance);
    const games = await f.db.select().from(ledger).where(eq(ledger.type, 'game'));
    assert.deepEqual(games.map((entry) => entry.amount).sort(), [-500n, 94n].sort());
  } finally {
    await f.client.close();
  }
});

test('spamming the button cannot start a round before the previous animation has played', async () => {
  const f = await fixture();
  try {
    const bet = { stake: '10', side: 'heads' };
    await playRound(f.db, { userId: f.user.id, game: 'coinflip', bet, key: randomUUID() });
    for (let i = 0; i < 5; i++)
      await assert.rejects(
        playRound(f.db, {
          userId: f.user.id,
          game: 'slots',
          bet: { stake: '10' },
          key: randomUUID(),
        }),
        (error: unknown) =>
          error instanceof VaultError && error.code === 'TOO_FAST' && error.retryAfterMs > 0,
      );
    assert.equal((await f.db.select().from(gameRounds)).length, 1);
    await letAnimationFinish(f.db);
    await playRound(f.db, {
      userId: f.user.id,
      game: 'slots',
      bet: { stake: '10' },
      key: randomUUID(),
    });
    assert.equal((await f.db.select().from(gameRounds)).length, 2);
  } finally {
    await f.client.close();
  }
});

test('parallel requests settle at most one round and never overdraw', async () => {
  const f = await fixture(300n);
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        playRound(
          f.db,
          {
            userId: f.user.id,
            game: 'dice',
            bet: { stake: '300', chance: 95, direction: 'over' },
            key: randomUUID(),
          },
          fixed(0),
        ),
      ),
    );
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal((await walletOf(f.db, f.user.id)).balance, 0n);
    await letAnimationFinish(f.db);
    await assert.rejects(
      playRound(f.db, {
        userId: f.user.id,
        game: 'coinflip',
        bet: { stake: '10', side: 'tails' },
        key: randomUUID(),
      }),
      (error: unknown) => error instanceof VaultError && error.code === 'INSUFFICIENT_BALANCE',
    );
  } finally {
    await f.client.close();
  }
});

test('a retried request replays the same round; a changed bet under the same key is refused', async () => {
  const f = await fixture();
  try {
    const key = randomUUID();
    const bet = {
      bets: [
        { type: 'red', amount: '100' },
        { type: 'straight', value: 7, amount: '10' },
      ],
    };
    const first = await playRound(f.db, { userId: f.user.id, game: 'roulette', bet, key });
    const replay = await playRound(f.db, { userId: f.user.id, game: 'roulette', bet, key });
    assert.deepEqual(replay, first);
    assert.equal((await f.db.select().from(gameRounds)).length, 1);
    await assert.rejects(
      playRound(f.db, {
        userId: f.user.id,
        game: 'roulette',
        bet: { bets: [{ type: 'black', amount: '100' }] },
        key,
      }),
      (error: unknown) => error instanceof VaultError && error.code === 'IDEMPOTENCY_CONFLICT',
    );
  } finally {
    await f.client.close();
  }
});

test('leaderboards show opted-in accounts only; monthly counts net change since the 1st', async () => {
  const f = await fixture(1000n);
  try {
    const rich = await createUser(f.db, 'Rich Hidden', 9000n, false);
    const second = await createUser(f.db, 'Crew Two', 400n);
    const leaving = await createUser(f.db, 'Leaving', 5000n);
    await f.db
      .update(users)
      .set({ deletionRequestedAt: new Date() })
      .where(eq(users.id, leaving.id));
    // Crew One's seed happened last month; only this month's result counts monthly.
    await f.db
      .update(ledger)
      .set({ createdAt: new Date(monthStart().getTime() - 60_000) })
      .where(eq(ledger.userId, f.user.id));
    await playRound(
      f.db,
      {
        userId: f.user.id,
        game: 'coinflip',
        bet: { stake: '100', side: 'heads' },
        key: randomUUID(),
      },
      fixed(0),
    );

    const all = await leaderboard(f.db, 'all', second.id);
    assert.deepEqual(
      all.entries.map((entry) => [entry.rank, entry.name, entry.value, entry.you]),
      [
        [1, 'Crew One', '1094', false],
        [2, 'Crew Two', '400', true],
      ],
    );
    assert.deepEqual(all.viewer, { listed: true, rank: 2, value: '400' });

    const month = await leaderboard(f.db, 'month', rich.id);
    assert.deepEqual(
      month.entries.map((entry) => [entry.rank, entry.name, entry.value]),
      [
        [1, 'Crew Two', '400'],
        [2, 'Crew One', '94'],
      ],
    );
    assert.deepEqual(month.viewer, { listed: false, rank: null, value: '9000' });
    // A welcome bonus changes the balance but is not this month's activity.
    await f.db.insert(ledger).values({
      userId: second.id,
      type: 'welcome_bonus',
      amount: 5000n,
      idempotencyKey: `welcome:${second.id}`,
      sourceRef: 'test',
    });
    const afterWelcome = await leaderboard(f.db, 'month', second.id);
    assert.equal(afterWelcome.viewer?.value, '400');
    assert.equal(month.since, monthStart().toISOString());
  } finally {
    await f.client.close();
  }
});

test('the monthly window starts at midnight Belgian time, also across daylight saving', () => {
  assert.equal(
    monthStart(new Date('2026-09-22T10:00:00Z')).toISOString(),
    '2026-08-31T22:00:00.000Z',
  );
  assert.equal(
    monthStart(new Date('2026-01-15T10:00:00Z')).toISOString(),
    '2025-12-31T23:00:00.000Z',
  );
  assert.equal(
    monthStart(new Date('2026-10-31T23:30:00Z')).toISOString(),
    '2026-10-31T23:00:00.000Z',
  );
});
