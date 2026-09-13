import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../db/types';
import {
  auditLogs,
  checkpoints,
  externalIdentities,
  ledger,
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
    else if (!checkpoint) {
      status = 'baseline';
      await tx
        .insert(checkpoints)
        .values({
          identityId: identity.id,
          baseline: observation.seconds!,
          highWater: observation.seconds!,
          remainder: 0n,
          epoch: observation.epoch,
          ruleVersion: rule.version,
          lastSuccessfulSyncAt: observation.observedAt,
        });
    } else {
      const uncreditedSeconds = observation.seconds! - checkpoint.highWater + checkpoint.remainder;
      credited = (uncreditedSeconds / rule.intervalSeconds) * rule.points;
      await tx
        .update(checkpoints)
        .set({
          highWater: observation.seconds!,
          remainder: uncreditedSeconds % rule.intervalSeconds,
          lastSuccessfulSyncAt: observation.observedAt,
        })
        .where(eq(checkpoints.identityId, identity.id));
      if (credited > 0n) {
        await tx
          .insert(ledger)
          .values({
            userId: identity.userId,
            type: 'watchtime',
            amount: credited,
            idempotencyKey: `watchtime:${observation.id}`,
            sourceRef: observation.id,
            ruleVersion: rule.version,
          });
        await tx
          .update(wallets)
          .set({ balance: wallet.balance + credited, totalEarned: wallet.totalEarned + credited })
          .where(eq(wallets.userId, identity.userId));
      }
    }
    await tx
      .insert(snapshots)
      .values({
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
    await tx
      .insert(auditLogs)
      .values({
        actorId: input.actorId,
        subjectId: input.userId,
        action: 'points_correction',
        reason: input.reason,
        reference: entry.id,
      });
  });
}
