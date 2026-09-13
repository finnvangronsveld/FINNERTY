import { eq, sql, count, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { currentAdminId } from '@/server/auth/admin';
import { getDb } from '@/server/db';
import { privateJson } from '@/server/http';
import { ledger, requestLimits, syncJobs, wallets } from '@/server/db/schema';
export async function GET() {
  if (!(await currentAdminId())) return privateJson({ error: 'Geen toegang.' }, 403);
  try {
    const db = await getDb();
    const writable = await db.transaction(async (tx) => {
      const key = `health:${randomUUID()}`;
      await tx.insert(requestLimits).values({ key, count: 1, expiresAt: new Date() });
      await tx.delete(requestLimits).where(eq(requestLimits.key, key));
      return true;
    });
    const discrepancies = await db
      .select({ userId: wallets.userId })
      .from(wallets)
      .leftJoin(ledger, eq(ledger.userId, wallets.userId))
      .groupBy(wallets.userId, wallets.balance, wallets.totalEarned)
      .having(
        sql`${wallets.balance} <> coalesce(sum(${ledger.amount}), 0) OR ${wallets.totalEarned} <> coalesce(sum(case when ${ledger.type} = 'watchtime' then ${ledger.amount} else 0 end), 0)`,
      );
    const [stalled] = await db
      .select({ count: count() })
      .from(syncJobs)
      .where(lt(syncJobs.lockedUntil, new Date()));
    return privateJson({
      databaseWritable: writable,
      ledgerDiscrepancies: discrepancies.length,
      expiredJobLeases: stalled.count,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return privateJson({ error: 'Databasecontrole mislukt.' }, 503);
  }
}
