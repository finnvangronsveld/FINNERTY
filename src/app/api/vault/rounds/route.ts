import { currentUserId } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { privateJson } from '@/server/http';
import { recentRounds } from '@/server/vault/service';

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: 'Log eerst in.' }, 401);
  try {
    return privateJson({ rounds: await recentRounds(await getDb(), userId) });
  } catch {
    return privateJson({ error: 'Je rondes konden niet worden opgehaald.' }, 503);
  }
}
