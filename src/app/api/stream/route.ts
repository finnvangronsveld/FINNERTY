import { isDemo } from '@/server/config';
import { getDb } from '@/server/db';
import { streamStates } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
export async function GET() {
  if (!isDemo() && process.env.DATABASE_URL && process.env.TWITCH_BROADCASTER_ID) {
    try {
      const [state] = await (
        await getDb()
      )
        .select()
        .from(streamStates)
        .where(eq(streamStates.broadcasterId, process.env.TWITCH_BROADCASTER_ID));
      if (state)
        return Response.json(
          {
            status: state.status,
            title: state.title,
            category: state.category,
            checkedAt: state.checkedAt.toISOString(),
            source: 'twitch',
            stale: !!state.errorCode || Date.now() - state.checkedAt.getTime() > 120_000,
          },
          { headers: { 'Cache-Control': 'public, max-age=15' } },
        );
    } catch {
      /* The homepage remains available during a DB outage. */
    }
  }
  return Response.json(
    {
      status: isDemo() ? 'offline' : 'unknown',
      title: null,
      category: null,
      checkedAt: null,
      source: isDemo() ? 'demo' : 'unconfigured',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
