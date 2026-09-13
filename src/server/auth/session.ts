import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import {
  authAccounts,
  checkpoints,
  externalIdentities,
  sessions,
  users,
  wallets,
} from '../db/schema';
import { getDb } from '../db';
import { isDemo } from '../config';
import { currentDemoUser } from './demo';
import { hash } from './crypto';
import { authConfiguration } from './config';
import { twitchOAuth } from '../integrations/twitch-oauth';
import { validateAuthorization } from './identity';
import type { AccountView } from '@/lib/contracts';
const startedAt = new Date();
export function sessionCookieName() {
  return isDemo()
    ? 'finnerty_demo_session'
    : process.env.NODE_ENV === 'production'
      ? '__Host-finnerty_session'
      : 'finnerty_session';
}
export async function currentUserId() {
  if (isDemo()) return currentDemoUser();
  const config = authConfiguration();
  if (!config) return null;
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date())));
  if (!session) return null;
  return (await validateAuthorization(
    db,
    session.userId,
    twitchOAuth(config),
    config.secret,
    startedAt,
  ))
    ? session.userId
    : null;
}
export async function accountView(): Promise<AccountView | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: users, auth: authAccounts, wallet: wallets })
    .from(users)
    .innerJoin(authAccounts, eq(authAccounts.userId, users.id))
    .innerJoin(wallets, eq(wallets.userId, users.id))
    .where(eq(users.id, userId));
  if (!row) return null;
  const [mapping] = await db
    .select({ identity: externalIdentities, checkpoint: checkpoints })
    .from(externalIdentities)
    .leftJoin(checkpoints, eq(checkpoints.identityId, externalIdentities.id))
    .where(eq(externalIdentities.userId, userId));
  return {
    displayName: row.user.displayName,
    login: row.auth.login,
    provider: row.auth.provider,
    avatarUrl: row.user.avatarUrl,
    balance: row.wallet.balance.toString(),
    totalEarned: row.wallet.totalEarned.toString(),
    watchtimeSeconds: mapping?.checkpoint?.highWater.toString() ?? null,
    lastSuccessfulSyncAt: mapping?.checkpoint?.lastSuccessfulSyncAt.toISOString() ?? null,
    syncStatus: isDemo() ? 'demo' : (mapping?.identity.status ?? 'not_connected'),
    listed: row.user.listed,
    deletionRequested: !!row.user.deletionRequestedAt,
  };
}
