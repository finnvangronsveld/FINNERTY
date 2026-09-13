import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { authAccounts } from '../db/schema';
import { isDemo } from '../config';
import { currentUserId } from './session';
export async function currentAdminId() {
  if (isDemo()) return null;
  const id = await currentUserId();
  if (!id) return null;
  const [account] = await (
    await getDb()
  )
    .select()
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, id), eq(authAccounts.provider, 'twitch')));
  const allowed = (process.env.ADMIN_TWITCH_USER_IDS ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return account && allowed.includes(account.providerUserId) ? id : null;
}
