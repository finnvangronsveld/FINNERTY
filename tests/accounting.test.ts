import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq, sql } from 'drizzle-orm';
import {
  users,
  authAccounts,
  wallets,
  externalIdentities,
  checkpoints,
  pointRules,
  ledger,
  snapshots,
} from '../src/server/db/schema';
import { creditWatchtime, correctBalance, recordMonthMark } from '../src/server/points/service';
import { monthKey } from '../src/server/month';
import {
  collectWatchtime,
  parseStreamElementsWatchtimePage,
  normalizedWatchtimeSchema,
} from '../src/server/integrations/watchtime';
import type { Database } from '../src/server/db/types';

async function fixture() {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  const [user] = await db.insert(users).values({ displayName: 'Test crew' }).returning();
  await db
    .insert(authAccounts)
    .values({ userId: user.id, provider: 'twitch', providerUserId: '123', login: 'crew' });
  await db.insert(wallets).values({ userId: user.id });
  await db.insert(pointRules).values({ version: 1, intervalSeconds: 600n, points: 10n });
  const [identity] = await db
    .insert(externalIdentities)
    .values({
      userId: user.id,
      provider: 'fixture',
      channelId: 'fixture-channel',
      providerKey: 'fixture-id',
      verifiedTwitchId: '123',
      status: 'verified',
    })
    .returning();
  let sequence = 0;
  const observation = (seconds: bigint | null, id = `observation-${sequence++}`) => ({
    id,
    identityId: identity.id,
    seconds,
    epoch: 1,
    observedAt: new Date('2026-09-01T12:00:00Z'),
  });
  return { db, client, user, identity, observation };
}
async function balance(db: Database, userId: string) {
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
  return wallet;
}

test('historical time is a baseline; remainders accumulate with integer arithmetic', async () => {
  const f = await fixture();
  try {
    assert.equal((await creditWatchtime(f.db, f.observation(10_000n))).status, 'baseline');
    assert.equal((await balance(f.db, f.user.id)).balance, 0n);
    await creditWatchtime(f.db, f.observation(10_599n));
    assert.equal((await balance(f.db, f.user.id)).balance, 0n);
    await creditWatchtime(f.db, f.observation(10_601n));
    assert.equal((await balance(f.db, f.user.id)).balance, 10n);
    const [cp] = await f.db.select().from(checkpoints);
    assert.equal(cp.remainder, 1n);
  } finally {
    await f.client.close();
  }
});
test('retries and concurrent callers cannot credit an observation twice', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(0n));
    const update = f.observation(1200n);
    await Promise.all(Array.from({ length: 8 }, () => creditWatchtime(f.db, update)));
    assert.equal((await balance(f.db, f.user.id)).balance, 20n);
    assert.equal((await f.db.select().from(ledger)).length, 1);
    await assert.rejects(
      creditWatchtime(f.db, { ...update, seconds: 1800n }),
      /IDEMPOTENCY_CONFLICT/,
    );
  } finally {
    await f.client.close();
  }
});
test('decreases, null records and source epoch changes never reset the high water mark', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(6000n));
    await creditWatchtime(f.db, f.observation(7200n));
    assert.equal((await creditWatchtime(f.db, f.observation(0n))).status, 'counter_decreased');
    assert.equal((await creditWatchtime(f.db, f.observation(null))).status, 'missing');
    assert.equal(
      (await creditWatchtime(f.db, { ...f.observation(7800n), epoch: 2 })).status,
      'epoch_conflict',
    );
    await creditWatchtime(f.db, f.observation(7800n));
    assert.equal((await balance(f.db, f.user.id)).balance, 30n);
    assert.equal((await f.db.select().from(checkpoints))[0].highWater, 7800n);
  } finally {
    await f.client.close();
  }
});
test('unverified mappings and policy changes pause new awards', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(0n));
    await f.db.update(externalIdentities).set({ status: 'conflict' });
    assert.equal((await creditWatchtime(f.db, f.observation(600n))).status, 'mapping_conflict');
    await f.db.update(externalIdentities).set({ status: 'verified' });
    await f.db.insert(pointRules).values({ version: 2, intervalSeconds: 600n, points: 20n });
    assert.equal((await creditWatchtime(f.db, f.observation(600n))).status, 'policy_review');
    assert.equal((await balance(f.db, f.user.id)).balance, 0n);
  } finally {
    await f.client.close();
  }
});
test('missed cumulative updates award later, independent of current stream status', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(3000n));
    await creditWatchtime(f.db, f.observation(66_000n));
    assert.equal((await balance(f.db, f.user.id)).balance, 1050n);
  } finally {
    await f.client.close();
  }
});
test('concurrent corrections and credits reconcile; earned total is distinct from balance', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(0n));
    await creditWatchtime(f.db, f.observation(6000n));
    const correction = {
      userId: f.user.id,
      actorId: f.user.id,
      amount: -30n,
      reason: 'Herstel test',
      key: 'correction-1',
    };
    await Promise.all([
      creditWatchtime(f.db, f.observation(6600n)),
      correctBalance(f.db, correction),
      correctBalance(f.db, correction),
    ]);
    await creditWatchtime(f.db, f.observation(7200n));
    const wallet = await balance(f.db, f.user.id);
    assert.equal(wallet.balance, 90n);
    assert.equal(wallet.totalEarned, 120n);
    const sum = await f.db.execute<{ balance: string }>(
      sql`select coalesce(sum(amount),0)::text as balance from ledger_entries where user_id = ${f.user.id}`,
    );
    assert.equal(BigInt(sum.rows[0].balance), wallet.balance);
    await assert.rejects(
      correctBalance(f.db, { ...correction, amount: -40n }),
      /IDEMPOTENCY_CONFLICT/,
    );
    await assert.rejects(
      correctBalance(f.db, { ...correction, amount: -1000n, key: 'too-much' }),
      /NEGATIVE_BALANCE/,
    );
    assert.equal((await balance(f.db, f.user.id)).balance, 90n);
  } finally {
    await f.client.close();
  }
});
test('overflow rolls back snapshot, checkpoint, ledger and wallet atomically', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(0n));
    await f.db.update(pointRules).set({ points: 9223372036854775807n });
    await assert.rejects(creditWatchtime(f.db, f.observation(1200n, 'overflow')));
    assert.equal((await balance(f.db, f.user.id)).balance, 0n);
    assert.equal((await f.db.select().from(checkpoints))[0].highWater, 0n);
    assert.equal((await f.db.select().from(ledger)).length, 0);
    assert.equal((await f.db.select().from(snapshots)).length, 1);
  } finally {
    await f.client.close();
  }
});
test('Twitch identity is unique independent of display name; client decimals are rejected', async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      f.db
        .insert(authAccounts)
        .values({ userId: f.user.id, provider: 'twitch', providerUserId: '123', login: 'renamed' }),
    );
    await f.db.update(users).set({ displayName: 'Renamed crew' }).where(eq(users.id, f.user.id));
    assert.equal((await f.db.select().from(wallets)).length, 1);
    await assert.rejects(
      creditWatchtime(f.db, { ...f.observation(0n), seconds: 1.5 as unknown as bigint }),
    );
  } finally {
    await f.client.close();
  }
});
test('future and out-of-order observations cannot claim points', async () => {
  const f = await fixture();
  try {
    await creditWatchtime(f.db, f.observation(0n));
    assert.equal(
      (await creditWatchtime(f.db, { ...f.observation(600n), observedAt: new Date('2026-08-31') }))
        .status,
      'out_of_order',
    );
    assert.equal(
      (
        await creditWatchtime(f.db, {
          ...f.observation(600n),
          observedAt: new Date(Date.now() + 3600_000),
        })
      ).status,
      'invalid_time',
    );
    assert.equal((await balance(f.db, f.user.id)).balance, 0n);
  } finally {
    await f.client.close();
  }
});
test('complete pagination includes page two, validates records and fails closed on partial scans', async () => {
  const record = {
    providerAccountKey: 'one',
    twitchUserId: '1',
    providerUsername: 'demo',
    watchtimeSeconds: 600n,
    observedAt: new Date(),
  };
  const adapter = {
    readPage: async (cursor: string | null) => ({
      records: [{ ...record, providerAccountKey: cursor ?? 'one' }],
      nextCursor: cursor ? null : 'two',
    }),
  };
  assert.equal((await collectWatchtime(adapter)).length, 2);
  await assert.rejects(collectWatchtime(adapter, 1), /INCOMPLETE_PROVIDER_SCAN/);
  await assert.rejects(
    collectWatchtime({ readPage: async () => ({ records: [record], nextCursor: 'same' }) }),
    /DUPLICATE_PROVIDER_IDENTITY|PAGINATION_LOOP/,
  );
  assert.throws(() =>
    normalizedWatchtimeSchema.parse({ ...record, watchtimeSeconds: '10 minutes' }),
  );
  // The verified StreamElements shape: cumulative minutes per username; null past the end.
  const observedAt = new Date('2026-09-22T12:00:00Z');
  const page = parseStreamElementsWatchtimePage(
    {
      _total: 2,
      users: [
        { username: 'Crew_One', minutes: 90 },
        { username: 'two', minutes: 0 },
      ],
    },
    observedAt,
  );
  assert.equal(page.total, 2);
  assert.deepEqual(page.records[0], {
    providerAccountKey: 'crew_one',
    twitchUserId: null,
    providerUsername: 'Crew_One',
    watchtimeSeconds: 5400n,
    observedAt,
  });
  assert.deepEqual(
    parseStreamElementsWatchtimePage({ _total: 2, users: null }, observedAt).records,
    [],
  );
  // Seen live: a row with an empty username. It can never map to an account, so it is skipped
  // (but still counted for pagination) instead of failing the whole scan.
  const odd = parseStreamElementsWatchtimePage(
    {
      _total: 3,
      users: [
        { username: '', minutes: 5 },
        { username: 'ok_1', minutes: 1 },
      ],
    },
    observedAt,
  );
  assert.equal(odd.rows, 2);
  assert.deepEqual(
    odd.records.map((r) => r.providerAccountKey),
    ['ok_1'],
  );
  for (const unverified of [
    { watchtime: 10, points: 5000 },
    { _total: 1, users: [{ username: 'x', minutes: -1 }] },
    { _total: 1, users: [{ username: 'x', minutes: '10' }] },
    { _total: 1, users: [{ username: 'x', minutes: 1.5 }] },
  ])
    assert.throws(() => parseStreamElementsWatchtimePage(unverified, observedAt));
});

const mark = (seconds: bigint, observedAt: string) => ({
  provider: 'fixture',
  channelId: 'fixture-channel',
  providerKey: 'fixture-id',
  seconds,
  observedAt: new Date(observedAt),
});

test('a first login credits this month since the month-start mark, exactly once', async () => {
  const f = await fixture();
  try {
    // The sync saw this viewer before they had an account; the lowest value of the month wins.
    await recordMonthMark(f.db, mark(4200n, '2026-09-01T06:00:00Z'));
    await recordMonthMark(f.db, mark(4000n, '2026-09-01T00:10:00Z'));
    await recordMonthMark(f.db, mark(4100n, '2026-09-01T03:00:00Z'));
    const first = f.observation(7650n, 'first-login');
    assert.equal((await creditWatchtime(f.db, first)).status, 'month_catch_up');
    const wallet = await balance(f.db, f.user.id);
    assert.equal(wallet.balance, 60n, '3650 s this month = 6 × 600 s');
    assert.equal(wallet.totalEarned, 60n);
    const [entry] = await f.db.select().from(ledger);
    assert.equal(entry.reason, 'Kijktijd deze maand vóór je eerste login');
    assert.equal((await creditWatchtime(f.db, first)).status, 'duplicate');
    assert.equal((await balance(f.db, f.user.id)).balance, 60n);
    // The 50 s remainder carries over like any other credit.
    await creditWatchtime(f.db, f.observation(8200n));
    assert.equal((await balance(f.db, f.user.id)).balance, 70n);
    const [cp] = await f.db.select().from(checkpoints);
    assert.equal(cp.baseline, 4000n);
  } finally {
    await f.client.close();
  }
});

test('earlier months, a counter reset or the off policy only set a baseline', async () => {
  for (const setup of ['last_month', 'counter_reset', 'policy_off'] as const) {
    const f = await fixture();
    try {
      if (setup === 'last_month') await recordMonthMark(f.db, mark(1000n, '2026-08-31T20:00:00Z'));
      if (setup === 'counter_reset')
        await recordMonthMark(f.db, mark(90_000n, '2026-09-01T00:10:00Z'));
      if (setup === 'policy_off') {
        await recordMonthMark(f.db, mark(1000n, '2026-09-01T00:10:00Z'));
        await f.db.update(pointRules).set({ historicalImport: 'off' });
      }
      assert.equal((await creditWatchtime(f.db, f.observation(7200n))).status, 'baseline', setup);
      assert.equal((await balance(f.db, f.user.id)).balance, 0n, setup);
    } finally {
      await f.client.close();
    }
  }
});

test('watch-time months follow Belgian midnight', () => {
  assert.equal(monthKey(new Date('2026-08-31T21:59:59Z')), '2026-08');
  assert.equal(monthKey(new Date('2026-08-31T22:00:00Z')), '2026-09');
  assert.equal(monthKey(new Date('2026-10-31T23:30:00Z')), '2026-11');
});
