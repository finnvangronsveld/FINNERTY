import type { Database } from './db/types';
import { requestLimits } from './db/schema';
import { sql } from 'drizzle-orm';
export async function allowRequest(db: Database, scope: string, limit: number, windowMs = 60_000) {
  const bucket = Math.floor(Date.now() / windowMs);
  const [row] = await db
    .insert(requestLimits)
    .values({ key: `${scope}:${bucket}`, count: 1, expiresAt: new Date((bucket + 1) * windowMs) })
    .onConflictDoUpdate({
      target: requestLimits.key,
      set: { count: sql`${requestLimits.count} + 1` },
    })
    .returning();
  return row.count <= limit;
}
