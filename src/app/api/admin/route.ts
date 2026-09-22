import { privateJson } from '@/server/http';
import { currentAdminId } from '@/server/auth/admin';
import { getDb } from '@/server/db';
import {
  users,
  wallets,
  authAccounts,
  externalIdentities,
  streamStates,
  syncJobs,
} from '@/server/db/schema';
import { WATCHTIME_JOB } from '@/server/watchtime/sync';
import { eq, ilike, count, ne } from 'drizzle-orm';
export async function GET(request: Request) {
  if (!(await currentAdminId()))
    return privateJson(
      { error: 'Geen toegang. Beheer vereist een geverifieerde Twitch-identiteit.' },
      403,
    );
  const query = (new URL(request.url).searchParams.get('q') ?? '')
    .trim()
    .slice(0, 60)
    .replace(/[%_\\]/g, '');
  const db = await getDb();
  const accounts = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      login: authAccounts.login,
      balance: wallets.balance,
      totalEarned: wallets.totalEarned,
      deletionRequestedAt: users.deletionRequestedAt,
    })
    .from(users)
    .innerJoin(authAccounts, eq(authAccounts.userId, users.id))
    .innerJoin(wallets, eq(wallets.userId, users.id))
    .where(ilike(users.displayName, `%${query}%`))
    .orderBy(users.displayName)
    .limit(30);
  const [conflicts] = await db
    .select({ count: count() })
    .from(externalIdentities)
    .where(ne(externalIdentities.status, 'verified'));
  const states = await db
    .select({
      status: streamStates.status,
      checkedAt: streamStates.checkedAt,
      errorCode: streamStates.errorCode,
    })
    .from(streamStates);
  const [job] = await db.select().from(syncJobs).where(eq(syncJobs.kind, WATCHTIME_JOB));
  const watchtime = job
    ? `${job.status}${job.errorCode ? ` (${job.errorCode})` : ''} · volgende ${job.nextRunAt.toISOString()}`
    : 'nog niet gestart';
  return privateJson({
    accounts: accounts.map((a) => ({
      ...a,
      balance: a.balance.toString(),
      totalEarned: a.totalEarned.toString(),
    })),
    health: { stream: states, mappingIssues: conflicts.count, watchtime },
  });
}
