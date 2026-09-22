import { z } from 'zod';
import { currentUserId } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { privateJson, readLimitedText, sameOrigin } from '@/server/http';
import { allowRequest } from '@/server/rate-limit';
import { GAME_IDS } from '@/lib/vault';
import { playRound, VaultError } from '@/server/vault/service';

const messages: Record<VaultError['code'], [string, number]> = {
  INVALID_BET: ['Ongeldige inzet. Controleer je bedrag en keuze.', 400],
  TOO_FAST: ['Rustig aan. De vorige ronde draait nog.', 429],
  INSUFFICIENT_BALANCE: ['Niet genoeg Vault Points voor deze inzet.', 409],
  MISSING_WALLET: ['Je account heeft nog geen saldo.', 409],
  IDEMPOTENCY_CONFLICT: ['Deze ronde is al gespeeld met een andere inzet.', 409],
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const userId = await currentUserId();
  if (!userId) return privateJson({ error: 'Log eerst in om te spelen.' }, 401);
  let input;
  try {
    input = z
      .object({ game: z.enum(GAME_IDS), bet: z.unknown(), key: z.uuid() })
      .strict()
      .parse(JSON.parse(await readLimitedText(request, 4096)));
  } catch {
    return privateJson({ error: messages.INVALID_BET[0] }, 400);
  }
  try {
    const db = await getDb();
    // Second line of defence next to the per-round pace check: at most 30 rounds a minute.
    if (!(await allowRequest(db, `vault:${userId}`, 30)))
      return privateJson({ error: 'Te veel rondes. Neem even pauze.', retryAfterMs: 10_000 }, 429);
    const round = await playRound(db, { userId, ...input });
    return privateJson({ round });
  } catch (error) {
    if (error instanceof VaultError) {
      const [message, status] = messages[error.code];
      return privateJson({ error: message, retryAfterMs: error.retryAfterMs || undefined }, status);
    }
    return privateJson({ error: 'De Vault is even niet bereikbaar. Probeer het opnieuw.' }, 503);
  }
}
