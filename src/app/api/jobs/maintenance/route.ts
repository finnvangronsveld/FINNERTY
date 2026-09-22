import { and, eq, lt, or, isNull } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { authAccounts, oauthFlows, requestLimits, sessions } from '@/server/db/schema';
import { privateJson } from '@/server/http';
import { authorizedJob, streamConfiguration, watchtimeConfiguration } from '@/server/jobs';
import { streamElementsReadOnly } from '@/server/integrations/streamelements';
import { syncWatchtime } from '@/server/watchtime/sync';
import { refreshStream } from '@/server/integrations/twitch-stream';
import { twitchOAuth } from '@/server/integrations/twitch-oauth';
import { authConfiguration } from '@/server/auth/config';
import { validateAuthorization } from '@/server/auth/identity';
export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
async function maintenance(request: Request) {
  if (!authorizedJob(request)) return privateJson({ error: 'Geen toegang.' }, 401);
  const config = streamConfiguration();
  if (!config) return privateJson({ error: 'Koppeling niet geconfigureerd.' }, 503);
  try {
    // Stop starting new work after 45 seconds; allow in-flight provider calls to finish.
    const startedAt = Date.now();
    const deadline = startedAt + 45_000;
    const db = await getDb();
    const stream = await refreshStream(db, config);
    const auth = authConfiguration();
    let validated = 0;
    if (auth) {
      const accounts = await db
        .select({ userId: authAccounts.userId })
        .from(authAccounts)
        .where(
          and(
            eq(authAccounts.provider, 'twitch'),
            eq(authAccounts.authorizationStatus, 'active'),
            or(
              isNull(authAccounts.validatedAt),
              lt(authAccounts.validatedAt, new Date(Date.now() - 55 * 60_000)),
            ),
          ),
        )
        .orderBy(authAccounts.validatedAt)
        .limit(25);
      for (const account of accounts) {
        if (Date.now() >= deadline) break;
        await validateAuthorization(
          db,
          account.userId,
          twitchOAuth(auth),
          auth.secret,
          new Date(0),
        );
        validated++;
      }
    }
    await db.delete(oauthFlows).where(lt(oauthFlows.expiresAt, new Date()));
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    await db.delete(requestLimits).where(lt(requestLimits.expiresAt, new Date()));
    // Watch time runs last and on its own schedule (every 10 minutes); a StreamElements outage
    // is reported but never fails the rest of maintenance.
    const watchtimeConfig = watchtimeConfiguration();
    const watchtime = watchtimeConfig
      ? await syncWatchtime(
          db,
          streamElementsReadOnly(watchtimeConfig.jwt),
          watchtimeConfig,
          new Date(),
          startedAt + 100_000,
        ).catch(() => ({ status: 'error' as const, code: 'WATCHTIME_SYNC_FAILED' }))
      : { status: 'not_configured' as const };
    return privateJson({ stream: stream.status, validated, watchtime });
  } catch {
    return privateJson({ error: 'Onderhoud tijdelijk niet beschikbaar.' }, 503);
  }
}
export { maintenance as GET, maintenance as POST };
