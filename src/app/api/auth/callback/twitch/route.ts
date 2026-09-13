import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { authConfiguration } from '@/server/auth/config';
import { sessionCookieName } from '@/server/auth/session';
import { hash, decrypt, safeReturnPath } from '@/server/auth/crypto';
import { saveTwitchIdentity } from '@/server/auth/identity';
import { getDb } from '@/server/db';
import { oauthFlows, sessions } from '@/server/db/schema';
import { twitchOAuth } from '@/server/integrations/twitch-oauth';
import { privateJson } from '@/server/http';
export async function GET(request: Request) {
  const config = authConfiguration();
  if (!config) return privateJson({ error: 'Twitch-login is nog niet beschikbaar.' }, 503);
  const cookieStore = await cookies();
  const [expectedState, browser] = (cookieStore.get('finnerty_oauth')?.value ?? '').split('.');
  const failed = () => {
    const response = NextResponse.redirect(new URL('/account?auth=failed', config.origin));
    response.cookies.delete('finnerty_oauth');
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  if (!expectedState || !browser || expectedState.length > 200 || browser.length > 100)
    return failed();
  const parameters = new URL(request.url).searchParams;
  if (parameters.get('state') !== expectedState) return failed();
  try {
    const db = await getDb();
    const [flow] = await db
      .delete(oauthFlows)
      .where(
        and(
          eq(oauthFlows.stateHash, hash(expectedState)),
          eq(oauthFlows.browserHash, hash(browser)),
          gt(oauthFlows.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!flow || parameters.has('error')) return failed();
    const adapter = twitchOAuth(config);
    const tokens = await adapter.exchange(
      parameters,
      expectedState,
      decrypt(flow.encryptedVerifier, config.secret, `flow:${expectedState}`),
    );
    const validation = await adapter.validate(tokens.accessToken);
    const profile = await adapter.profile(tokens.accessToken);
    if (validation.userId !== profile.id) return failed();
    const userId = await saveTwitchIdentity(db, profile, tokens, config.secret);
    const session = randomBytes(32).toString('hex');
    await db.transaction(async (tx) => {
      const previous = cookieStore.get(sessionCookieName())?.value;
      if (previous) await tx.delete(sessions).where(eq(sessions.tokenHash, hash(previous)));
      await tx
        .insert(sessions)
        .values({
          userId,
          tokenHash: hash(session),
          expiresAt: new Date(Date.now() + 7 * 86400_000),
        });
    });
    const response = NextResponse.redirect(new URL(safeReturnPath(flow.returnPath), config.origin));
    response.headers.set('Cache-Control', 'private, no-store');
    response.cookies.delete('finnerty_oauth');
    response.cookies.set(sessionCookieName(), session, {
      httpOnly: true,
      secure: config.origin.startsWith('https:'),
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 86400,
    });
    return response;
  } catch {
    return failed();
  }
}
