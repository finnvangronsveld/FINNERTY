import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import {
  authAccounts,
  externalIdentities,
  ledger,
  monthMarks,
  pointRules,
  syncJobs,
  users,
  wallets,
} from '../src/server/db/schema';
import {
  scanWatchtime,
  syncWatchtime,
  WATCHTIME_JOB,
  type StreamElementsClient,
} from '../src/server/watchtime/sync';
import type { Database } from '../src/server/db/types';

const CHANNEL = '5ee67bb6e5d09373a3cc3e5f';
const config = {
  channelId: CHANNEL,
  broadcasterId: '442232328',
  pointsPerInterval: 10n,
  intervalSeconds: 600n,
  welcomeCap: 1000n,
};
const at = (minutes: number) => new Date(Date.UTC(2026, 8, 10, 12, minutes));

/** Fake StreamElements: cumulative minutes per username, served like the verified API. */
function fakeStreamElements(
  minutes: Record<string, number>,
  overrides: Partial<StreamElementsClient> = {},
) {
  return {
    minutes,
    client: {
      channel: async () => ({ _id: CHANNEL, provider: 'twitch', providerId: '442232328' }),
      watchtimePage: async (_channel: string, offset: number, limit: number) => {
        const all = Object.entries(minutes)
          .map(([username, value]) => ({ username, minutes: value }))
          .sort((a, b) => b.minutes - a.minutes);
        const users = all.slice(offset, offset + limit);
        return { _total: all.length, users: users.length ? users : null };
      },
      ...overrides,
    } satisfies StreamElementsClient,
  };
}

async function fixture() {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  return { db, client };
}
async function member(db: Database, login: string) {
  const [user] = await db.insert(users).values({ displayName: login }).returning();
  await db
    .insert(authAccounts)
    .values({ userId: user.id, provider: 'twitch', providerUserId: randomUUID(), login });
  await db.insert(wallets).values({ userId: user.id });
  return user;
}
const balanceOf = async (db: Database, userId: string) =>
  (await db.select().from(wallets).where(eq(wallets.userId, userId)))[0].balance;

test('the sync links members, marks every viewer and credits watch time every 10 minutes', async () => {
  const f = await fixture();
  try {
    const crew = await member(f.db, 'Crew_One');
    const se = fakeStreamElements({ crew_one: 100, stranger: 500, some_bot: 9000 });
    const first = await syncWatchtime(f.db, se.client, config, at(0));
    assert.deepEqual(first, { status: 'ok', viewers: 3, accounts: 1, credited: 1, failed: 0 });
    const [rule] = await f.db.select().from(pointRules);
    assert.equal(rule.historicalImport, 'current_month');
    assert.equal(rule.welcomeCap, 1000n);
    assert.equal(
      (await f.db.select().from(monthMarks)).length,
      3,
      'viewers without an account too',
    );
    const [identity] = await f.db.select().from(externalIdentities);
    assert.equal(identity.providerKey, 'crew_one');
    assert.equal(identity.status, 'verified');
    assert.equal(await balanceOf(f.db, crew.id), 100n, 'welcome bonus for 100 earlier minutes');

    se.minutes.crew_one = 120;
    assert.deepEqual(await syncWatchtime(f.db, se.client, config, at(5)), { status: 'not_due' });
    assert.equal((await syncWatchtime(f.db, se.client, config, at(10))).status, 'ok');
    assert.equal(await balanceOf(f.db, crew.id), 120n, 'then 20 minutes = 2 × 10 VP');
  } finally {
    await f.client.close();
  }
});

test('a viewer who logs in later this month receives their watch time since the month mark', async () => {
  const f = await fixture();
  try {
    const se = fakeStreamElements({ late_viewer: 100, other: 40 });
    await syncWatchtime(f.db, se.client, config, at(0));
    const late = await member(f.db, 'late_viewer');
    se.minutes.late_viewer = 160;
    const result = await syncWatchtime(f.db, se.client, config, at(10));
    assert.equal(result.status === 'ok' && result.credited, 1);
    // 60 minutes this month in full, plus the 100 minutes before the month mark as welcome.
    assert.equal(await balanceOf(f.db, late.id), 160n);
    const entries = await f.db.select().from(ledger).where(eq(ledger.userId, late.id));
    assert.deepEqual(entries.map((e) => [e.type, e.amount]).sort(), [
      ['watchtime', 60n],
      ['welcome_bonus', 100n],
    ]);
  } finally {
    await f.client.close();
  }
});

test('a different channel or a changed response credits nothing and backs off', async () => {
  const f = await fixture();
  try {
    const crew = await member(f.db, 'crew');
    const wrong = fakeStreamElements(
      { crew: 50 },
      { channel: async () => ({ _id: CHANNEL, provider: 'twitch', providerId: '1' }) },
    );
    assert.deepEqual(await syncWatchtime(f.db, wrong.client, config, at(0)), {
      status: 'error',
      code: 'STREAMELEMENTS_CHANNEL_MISMATCH',
    });
    let [job] = await f.db.select().from(syncJobs).where(eq(syncJobs.kind, WATCHTIME_JOB));
    assert.equal(job.nextRunAt.getTime(), at(2).getTime());
    assert.equal(job.lockedUntil, null);
    const changed = fakeStreamElements(
      {},
      { watchtimePage: async () => ({ watchtime: [{ user: 'crew', seconds: 3000 }] }) },
    );
    assert.deepEqual(await syncWatchtime(f.db, changed.client, config, at(2)), {
      status: 'error',
      code: 'STREAMELEMENTS_RESPONSE_CHANGED',
    });
    [job] = await f.db.select().from(syncJobs).where(eq(syncJobs.kind, WATCHTIME_JOB));
    assert.equal(job.nextRunAt.getTime(), at(6).getTime(), 'second failure waits 4 minutes');
    assert.equal((await f.db.select().from(ledger)).length, 0);
    assert.equal(await balanceOf(f.db, crew.id), 0n);
  } finally {
    await f.client.close();
  }
});

test('the scan keeps the higher value when a viewer moves between pages', async () => {
  const pages: Record<number, unknown> = {
    0: {
      _total: 3,
      users: [
        { username: 'a', minutes: 50 },
        { username: 'b', minutes: 40 },
      ],
    },
    2: {
      _total: 3,
      users: [
        { username: 'b', minutes: 45 },
        { username: 'c', minutes: 10 },
      ],
    },
  };
  const client = {
    channel: async () => ({}),
    watchtimePage: async (_: string, offset: number) => pages[offset] ?? { _total: 3, users: null },
  };
  const viewers = await scanWatchtime(client, CHANNEL, at(0));
  assert.deepEqual(
    viewers.map((v) => [v.providerAccountKey, v.watchtimeSeconds]),
    [
      ['a', 3000n],
      ['b', 2700n],
      ['c', 600n],
    ],
  );
  const endless = {
    channel: async () => ({}),
    watchtimePage: async () => ({ _total: 1000, users: [{ username: 'a', minutes: 1 }] }),
  };
  await assert.rejects(scanWatchtime(endless, CHANNEL, at(0)), /INCOMPLETE_PROVIDER_SCAN/);
});
