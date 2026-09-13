import { accountView, currentUserId } from '@/server/auth/session';
import { privateJson, readLimitedText, sameOrigin } from '@/server/http';
import { allowRequest } from '@/server/rate-limit';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
export async function GET() {
  const account = await accountView();
  return privateJson(account ? { account } : { error: 'Log eerst in.' }, account ? 200 : 401);
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: 'Log eerst in.' }, 401);
  try {
    if (!(await allowRequest(await getDb(), `profile:${userId}`, 30)))
      return privateJson({ error: 'Te veel aanvragen.' }, 429);
    const body = await readLimitedText(request);
    const settings = z.object({ listed: z.boolean() }).strict().parse(JSON.parse(body));
    await (await getDb()).update(users).set(settings).where(eq(users.id, userId));
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: 'Ongeldige instellingen.' }, 400);
  }
}
