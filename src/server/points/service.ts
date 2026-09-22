import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../db/types';
import { monthKey } from '../month';
import {
  auditLogs,
  checkpoints,
  externalIdentities,
  ledger,
  monthMarks,
  pointRules,
  snapshots,
  wallets,
} from '../db/schema';

export const observationSchema = z
  .object({
    id: z.string().min(1).max(180),
    identityId: z.uuid(),
    seconds: z.bigint().min(0n).max(9223372036854775807n).nullable(),
    observedAt: z.date(),
    epoch: z.number().int().positive(),
  })
  .strict();
export type Observation = z.infer<typeof observationSchema>;

export const monthMarkSchema = z
  .object({
    provider: z.string().min(1).max(40),
    channelId: z.string().min(1).max(120),
    providerKey: z.string().min(1).max(180),
    seconds: z.bigint().min(0n).max(9223372036854775807n),
    observedAt: z.date(),
  })
  .strict();

/**
 * Keeps the lowest cumulative watch time seen for each viewer in each Belgian month. The sync calls
 * this for every viewer on every page, including viewers without a site account yet.
 */
export async function recordMonthMarks(db: Database, input: z.infer<typeof monthMarkSchema>[]) {
  // One row per viewer and month (an upsert cannot touch the same row twice); lowest value wins.
  const lowest = new Map<string, z.infer<typeof monthMarkSchema> & { month: string }>();
  for (const mark of input) {
    const parsed = { ...monthMarkSchema.parse(mark), month: monthKey(mark.observedAt) };
    const key = [parsed.provider, parsed.channelId, parsed.providerKey, parsed.month].join('|');
    const current = lowest.get(key);
    if (!current || parsed.seconds < current.seconds) lowest.set(key, parsed);
  }
  const marks = [...lowest.values()];
  for (let index = 0; index < marks.length; index += 500)
    await db
      .insert(monthMarks)
      .values(marks.slice(index, index + 500))
      .onConflictDoUpdate({
        target: [
          monthMarks.provider,
          monthMarks.channelId,
          monthMarks.providerKey,
          monthMarks.month,
        ],
        set: {
          seconds: sql`LEAST(${monthMarks.seconds}, excluded.seconds)`,
          observedAt: sql`LEAST(${monthMarks.observedAt}, excluded.observed_at)`,
        },
      });
}
export const recordMonthMark = (db: Database, mark: z.infer<typeof monthMarkSchema>) =>
  recordMonthMarks(db, [mark]);

/** Only consumes verified, normalized observations. Never receives raw provider data. */
export async function creditWatchtime(db: Database, input: Observation) {
  const observation = observationSchema.parse(input);
  return db.transaction(async (tx) => {
    const [identity] = await tx
      .select()
      .from(externalIdentities)
      .where(eq(externalIdentities.id, observation.identityId));
    if (!identity) throw new Error('UNKNOWN_IDENTITY');
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, identity.userId))
      .for('update');
    if (!wallet) throw new Error('MISSING_WALLET');
    // All mapping changes and corrections must acquire this same wallet lock first.
    const [lockedIdentity] = await tx
      .select()
      .from(externalIdentities)
      .where(eq(externalIdentities.id, identity.id))
      .for('update');
    const [existing] = await tx
      .select()
      .from(snapshots)
      .where(eq(snapshots.observationId, observation.id));
    if (existing) {
      if (
        existing.identityId !== observation.identityId ||
        existing.seconds !== observation.seconds ||
        existing.observedAt.getTime() !== observation.observedAt.getTime()
      )
        throw new Error('IDEMPOTENCY_CONFLICT');
      return { status: 'duplicate', credited: 0n };
    }
    const [checkpoint] = await tx
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.identityId, identity.id));
    const [rule] = await tx
      .select()
      .from(pointRules)
      .orderBy(sql`${pointRules.version} DESC`)
      .limit(1);
    if (!rule) throw new Error('MISSING_POINT_RULE');
    let status = 'ok';
    let credited = 0n;
    if (lockedIdentity.status !== 'verified') status = 'mapping_conflict';
    else if (lockedIdentity.epoch !== observation.epoch) status = 'epoch_conflict';
    else if (observation.seconds === null) status = 'missing';
    else if (observation.observedAt.getTime() > Date.now() + 60_000) status = 'invalid_time';
    else if (
      checkpoint &&
      (checkpoint.ruleVersion !== rule.version || checkpoint.epoch !== observation.epoch)
    )
      status = 'policy_review';
    else if (checkpoint && observation.seconds < checkpoint.highWater) status = 'counter_decreased';
    else if (checkpoint && observation.observedAt < checkpoint.lastSuccessfulSyncAt)
      status = 'out_of_order';
    else {
      let from = checkpoint ? checkpoint.highWater - checkpoint.remainder : observation.seconds!;
      if (!checkpoint) {
        // First verified observation for this account. With the current_month policy, watch time
        // since the viewer's month-start mark is credited once; otherwise it only sets the baseline.
        status = 'baseline';
        if (rule.historicalImport === 'current_month') {
          const [mark] = await tx
            .select()
            .from(monthMarks)
            .where(
              and(
                eq(monthMarks.provider, identity.provider),
                eq(monthMarks.channelId, identity.channelId),
                eq(monthMarks.providerKey, identity.providerKey),
                eq(monthMarks.month, monthKey(observation.observedAt)),
              ),
            );
          if (
            mark &&
            mark.seconds < observation.seconds! &&
            mark.observedAt <= observation.observedAt
          ) {
            from = mark.seconds;
            status = 'month_catch_up';
          }
        }
      }
      const uncreditedSeconds = observation.seconds! - from;
      credited = (uncreditedSeconds / rule.intervalSeconds) * rule.points;
      const progress = {
        highWater: observation.seconds!,
        remainder: uncreditedSeconds % rule.intervalSeconds,
        lastSuccessfulSyncAt: observation.observedAt,
      };
      if (checkpoint)
        await tx.update(checkpoints).set(progress).where(eq(checkpoints.identityId, identity.id));
      else
        await tx.insert(checkpoints).values({
          identityId: identity.id,
          baseline: from,
          epoch: observation.epoch,
          ruleVersion: rule.version,
          ...progress,
        });
      if (credited > 0n) {
        await tx.insert(ledger).values({
          userId: identity.userId,
          type: 'watchtime',
          amount: credited,
          idempotencyKey: `watchtime:${observation.id}`,
          sourceRef: observation.id,
          ruleVersion: rule.version,
          reason: status === 'month_catch_up' ? 'Kijktijd deze maand vóór je eerste login' : null,
        });
        await tx
          .update(wallets)
          .set({ balance: wallet.balance + credited, totalEarned: wallet.totalEarned + credited })
          .where(eq(wallets.userId, identity.userId));
      }
    }
    await tx.insert(snapshots).values({
      observationId: observation.id,
      identityId: identity.id,
      seconds: observation.seconds,
      observedAt: observation.observedAt,
      status,
    });
    return { status, credited };
  });
}

/** Internal domain service. HTTP boundary MUST resolve and authorize actor from session. */
export async function correctBalance(
  db: Database,
  input: { userId: string; actorId: string; amount: bigint; reason: string; key: string },
) {
  if (
    !input.reason.trim() ||
    input.reason.length > 500 ||
    input.amount === 0n ||
    input.key.length > 150
  )
    throw new Error('INVALID_CORRECTION');
  return db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, input.userId))
      .for('update');
    if (!wallet) throw new Error('MISSING_WALLET');
    const [existing] = await tx
      .select()
      .from(ledger)
      .where(eq(ledger.idempotencyKey, `correction:${input.key}`));
    if (existing) {
      const [audit] = await tx
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.reference, existing.id), eq(auditLogs.actorId, input.actorId)));
      if (
        existing.userId !== input.userId ||
        existing.amount !== input.amount ||
        existing.reason !== input.reason ||
        !audit
      )
        throw new Error('IDEMPOTENCY_CONFLICT');
      return;
    }
    if (wallet.balance + input.amount < 0n) throw new Error('NEGATIVE_BALANCE');
    const [entry] = await tx
      .insert(ledger)
      .values({
        userId: input.userId,
        type: 'admin_correction',
        amount: input.amount,
        reason: input.reason,
        idempotencyKey: `correction:${input.key}`,
        sourceRef: input.key,
      })
      .returning();
    await tx
      .update(wallets)
      .set({ balance: wallet.balance + input.amount })
      .where(eq(wallets.userId, input.userId));
    await tx.insert(auditLogs).values({
      actorId: input.actorId,
      subjectId: input.userId,
      action: 'points_correction',
      reason: input.reason,
      reference: entry.id,
    });
  });
}
