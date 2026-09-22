import { and, eq, isNull, lte, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../db/types';
import { authAccounts, externalIdentities, pointRules, syncJobs } from '../db/schema';
import {
  parseStreamElementsWatchtimePage,
  type NormalizedWatchtime,
} from '../integrations/watchtime';
import { creditWatchtime, recordMonthMarks } from '../points/service';

export const WATCHTIME_JOB = 'streamelements_watchtime';
export const SYNC_INTERVAL_MS = 10 * 60_000;
const LEASE_MS = 3 * 60_000;
const PAGE_SIZE = 100;
const PROVIDER = 'streamelements';

/** The read-only transport the sync needs (see integrations/streamelements.ts). */
export interface StreamElementsClient {
  channel(): Promise<unknown>;
  watchtimePage(channelId: string, offset: number, limit: number): Promise<unknown>;
}
export interface WatchtimeSyncConfig {
  channelId: string;
  broadcasterId: string;
  pointsPerInterval: bigint;
  intervalSeconds: bigint;
}

const channelSchema = z.object({
  _id: z.string(),
  provider: z.string(),
  providerId: z.string(),
});

/**
 * Reads every viewer's cumulative watch time. The list is sorted by minutes and shifts while a
 * stream is live, so a viewer can appear on two pages: keep the higher (later) value. A viewer
 * missed in one scan is simply observed on the next; a missing record never means zero.
 */
export async function scanWatchtime(
  client: StreamElementsClient,
  channelId: string,
  observedAt: Date,
  deadline = Number.POSITIVE_INFINITY,
) {
  const viewers = new Map<string, NormalizedWatchtime>();
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let pages = 0;
  while (offset < total) {
    if (Date.now() > deadline) throw new Error('WATCHTIME_SCAN_DEADLINE');
    const page = parseStreamElementsWatchtimePage(
      await client.watchtimePage(channelId, offset, PAGE_SIZE),
      observedAt,
    );
    total = page.total;
    if (++pages > Math.ceil(total / PAGE_SIZE) + 5) throw new Error('INCOMPLETE_PROVIDER_SCAN');
    if (!page.rows) break;
    for (const record of page.records) {
      const seen = viewers.get(record.providerAccountKey);
      if (!seen || record.watchtimeSeconds > seen.watchtimeSeconds)
        viewers.set(record.providerAccountKey, record);
    }
    offset += page.rows;
  }
  return [...viewers.values()];
}

/** Takes the job lease when the sync is due. Returns false when not due or another run holds it. */
async function acquire(db: Database, now: Date) {
  await db
    .insert(syncJobs)
    .values({ kind: WATCHTIME_JOB, status: 'idle', nextRunAt: now })
    .onConflictDoNothing({ target: syncJobs.kind });
  const taken = await db
    .update(syncJobs)
    .set({
      status: 'running',
      lockedUntil: new Date(now.getTime() + LEASE_MS),
      attempts: sql`${syncJobs.attempts} + 1`,
    })
    .where(
      and(
        eq(syncJobs.kind, WATCHTIME_JOB),
        lte(syncJobs.nextRunAt, now),
        or(isNull(syncJobs.lockedUntil), lt(syncJobs.lockedUntil, now)),
      ),
    )
    .returning();
  return taken[0] ?? null;
}

/** First install: the owner's default rate (10 VP per 10 minutes) with this-month catch-up. */
async function ensurePointRule(db: Database, config: WatchtimeSyncConfig) {
  await db
    .insert(pointRules)
    .values({
      version: 1,
      points: config.pointsPerInterval,
      intervalSeconds: config.intervalSeconds,
      historicalImport: 'current_month',
    })
    .onConflictDoNothing();
}

/** Links each Twitch account to the StreamElements viewer with the same (current) login. */
async function ensureMappings(db: Database, channelId: string) {
  const accounts = await db
    .select({
      userId: authAccounts.userId,
      login: authAccounts.login,
      twitchId: authAccounts.providerUserId,
      mapped: externalIdentities.id,
    })
    .from(authAccounts)
    .leftJoin(
      externalIdentities,
      and(
        eq(externalIdentities.userId, authAccounts.userId),
        eq(externalIdentities.provider, PROVIDER),
        eq(externalIdentities.channelId, channelId),
      ),
    )
    .where(eq(authAccounts.provider, 'twitch'));
  for (const account of accounts) {
    if (account.mapped) continue;
    // A username can only belong to one account; a recycled name stays unmapped for review.
    await db
      .insert(externalIdentities)
      .values({
        userId: account.userId,
        provider: PROVIDER,
        channelId,
        providerKey: account.login.toLowerCase(),
        providerUsername: account.login,
        verifiedTwitchId: account.twitchId,
        status: 'verified',
      })
      .onConflictDoNothing();
  }
}

export type SyncResult =
  | { status: 'not_due' }
  | { status: 'ok'; viewers: number; accounts: number; credited: number; failed: number }
  | { status: 'error'; code: string };

/**
 * One watch-time pass: verify the channel, record every viewer's month mark, credit linked
 * accounts. Runs at most every 10 minutes under a database lease; failures back off.
 */
export async function syncWatchtime(
  db: Database,
  client: StreamElementsClient,
  config: WatchtimeSyncConfig,
  now = new Date(),
  deadline = Number.POSITIVE_INFINITY,
): Promise<SyncResult> {
  const job = await acquire(db, now);
  if (!job) return { status: 'not_due' };
  try {
    const channel = channelSchema.parse(await client.channel());
    if (
      channel._id !== config.channelId ||
      channel.provider !== 'twitch' ||
      channel.providerId !== config.broadcasterId
    )
      throw new Error('STREAMELEMENTS_CHANNEL_MISMATCH');
    await ensurePointRule(db, config);
    await ensureMappings(db, config.channelId);
    const viewers = await scanWatchtime(client, config.channelId, now, deadline);
    await recordMonthMarks(
      db,
      viewers.map((viewer) => ({
        provider: PROVIDER,
        channelId: config.channelId,
        providerKey: viewer.providerAccountKey,
        seconds: viewer.watchtimeSeconds,
        observedAt: viewer.observedAt,
      })),
    );
    const byKey = new Map(viewers.map((viewer) => [viewer.providerAccountKey, viewer]));
    const identities = await db
      .select()
      .from(externalIdentities)
      .where(
        and(
          eq(externalIdentities.provider, PROVIDER),
          eq(externalIdentities.channelId, config.channelId),
          eq(externalIdentities.status, 'verified'),
        ),
      );
    let credited = 0;
    let failed = 0;
    for (const identity of identities) {
      const viewer = byKey.get(identity.providerKey);
      if (!viewer) continue;
      // Each credit is its own idempotent transaction; one bad account must not block the rest.
      try {
        const result = await creditWatchtime(db, {
          id: `se:${now.toISOString()}:${identity.id}`,
          identityId: identity.id,
          seconds: viewer.watchtimeSeconds,
          observedAt: now,
          epoch: identity.epoch,
        });
        if (result.credited > 0n) credited++;
      } catch {
        failed++;
      }
    }
    await db
      .update(syncJobs)
      .set({
        status: 'ok',
        attempts: 0,
        errorCode: failed ? 'SOME_ACCOUNTS_NOT_CREDITED' : null,
        lockedUntil: null,
        nextRunAt: new Date(now.getTime() + SYNC_INTERVAL_MS),
      })
      .where(eq(syncJobs.kind, WATCHTIME_JOB));
    return { status: 'ok', viewers: viewers.length, accounts: identities.length, credited, failed };
  } catch (error) {
    const code =
      error instanceof z.ZodError
        ? 'STREAMELEMENTS_RESPONSE_CHANGED'
        : error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : 'WATCHTIME_SYNC_FAILED';
    // Exponential backoff: 2, 4, 8 … up to 60 minutes. Nothing partial is credited on a failed scan.
    const backoff = Math.min(60, 2 ** Math.min(job.attempts, 6)) * 60_000;
    await db
      .update(syncJobs)
      .set({
        status: 'error',
        errorCode: code,
        lockedUntil: null,
        nextRunAt: new Date(now.getTime() + backoff),
      })
      .where(eq(syncJobs.kind, WATCHTIME_JOB));
    return { status: 'error', code };
  }
}
