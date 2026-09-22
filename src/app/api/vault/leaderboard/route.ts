import { currentUserId } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { privateJson } from '@/server/http';
import { leaderboard } from '@/server/vault/service';

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get('period') ?? 'all';
  if (period !== 'all' && period !== 'month')
    return privateJson({ error: 'Ongeldige periode.' }, 400);
  try {
    const viewerId = await currentUserId();
    return privateJson({ leaderboard: await leaderboard(await getDb(), period, viewerId) });
  } catch {
    return privateJson({ error: 'Het leaderboard is even niet beschikbaar.' }, 503);
  }
}
