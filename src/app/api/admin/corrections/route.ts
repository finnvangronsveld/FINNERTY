import { z } from 'zod';
import { currentAdminId } from '@/server/auth/admin';
import { privateJson, readLimitedText, sameOrigin } from '@/server/http';
import { getDb } from '@/server/db';
import { correctBalance } from '@/server/points/service';
import { allowRequest } from '@/server/rate-limit';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const adminId = await currentAdminId();
  if (!adminId) return privateJson({ error: 'Geen toegang.' }, 403);
  try {
    const db = await getDb();
    if (!(await allowRequest(db, `corrections:${adminId}`, 20)))
      return privateJson({ error: 'Te veel aanvragen. Probeer later opnieuw.' }, 429);
    const input = z
      .object({
        userId: z.uuid(),
        amount: z.string().regex(/^-?[1-9][0-9]{0,8}$/),
        reason: z.string().trim().min(5).max(500),
        key: z.uuid(),
      })
      .strict()
      .parse(JSON.parse(await readLimitedText(request, 2048)));
    await correctBalance(db, { ...input, amount: BigInt(input.amount), actorId: adminId });
    return privateJson({ ok: true });
  } catch {
    return privateJson(
      { error: 'Correctie niet verwerkt. Controleer bedrag, reden en saldo.' },
      400,
    );
  }
}
