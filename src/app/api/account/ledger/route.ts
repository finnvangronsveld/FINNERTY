import { currentUserId } from '@/server/auth/session';
import { privateJson } from '@/server/http';
import { getDb } from '@/server/db';
import { ledger } from '@/server/db/schema';
import { desc, eq } from 'drizzle-orm';
export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: 'Log eerst in.' }, 401);
  const page = Number(new URL(request.url).searchParams.get('page') || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    return privateJson({ error: 'Ongeldige pagina.' }, 400);
  const entries = await (
    await getDb()
  )
    .select()
    .from(ledger)
    .where(eq(ledger.userId, userId))
    .orderBy(desc(ledger.createdAt), desc(ledger.id))
    .limit(6)
    .offset((page - 1) * 5);
  return privateJson({
    hasMore: entries.length > 5,
    entries: entries
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount.toString(),
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      })),
  });
}
