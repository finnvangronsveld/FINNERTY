import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { getDemoDb } from '../db';
import {
  authAccounts,
  externalIdentities,
  pointRules,
  sessions,
  users,
  wallets,
} from '../db/schema';
import { creditWatchtime } from '../points/service';
import { isDemo } from '../config';
export const SESSION_COOKIE = 'finnerty_demo_session';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function currentDemoUser() {
  if (!isDemo()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDemoDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())));
  return session?.userId ?? null;
}
export async function createDemoSession(previousUserId: string | null) {
  const db = await getDemoDb();
  // Each browser gets its own fictional identity. No shared demo account authorization.
  let userId = previousUserId;
  if (!userId) {
    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ displayName: 'Demo Crew Member' }).returning();
      await tx
        .insert(authAccounts)
        .values({ userId: user.id, provider: 'demo', providerUserId: user.id, login: 'demo_crew' });
      await tx.insert(wallets).values({ userId: user.id });
      await tx
        .insert(pointRules)
        .values({ version: 1, intervalSeconds: 600n, points: 10n })
        .onConflictDoNothing();
      await tx.insert(externalIdentities).values({
        userId: user.id,
        provider: 'demo',
        channelId: 'demo-channel',
        providerKey: user.id,
        providerUsername: 'demo_crew',
        status: 'verified',
      });
      return user.id;
    });
    const [identity] = await db
      .select()
      .from(externalIdentities)
      .where(eq(externalIdentities.userId, userId));
    for (let index = 0; index < 9; index++) {
      await creditWatchtime(db, {
        id: `demo:${userId}:${index}`,
        identityId: identity.id,
        seconds: 7200n + BigInt(index) * 600n,
        epoch: 1,
        observedAt: new Date(Date.now() - (9 - index) * 600_000),
      });
    }
  }
  const token = randomBytes(32).toString('hex');
  await db
    .insert(sessions)
    .values({ tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 86_400_000) });
  return { token, userId };
}
