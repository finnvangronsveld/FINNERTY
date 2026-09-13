import { currentUserId } from '@/server/auth/session';
import { privateJson, sameOrigin } from '@/server/http';
import { getDb } from '@/server/db';
import { isDemo } from '@/server/config';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: 'Log eerst in.' }, 401);
  await (
    await getDb()
  )
    .update(users)
    .set({ deletionRequestedAt: new Date(), listed: false })
    .where(eq(users.id, userId));
  return privateJson({
    ok: true,
    message: isDemo()
      ? 'Je lokale demo-aanvraag is opgeslagen. Er wordt geen extern verzoek verstuurd.'
      : 'Je verwijderingsverzoek is geregistreerd voor de beheerder. Je account is nog niet verwijderd.',
  });
}
