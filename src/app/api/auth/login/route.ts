import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import * as oauth from 'oauth4webapi';
import { getDb } from '@/server/db';
import { oauthFlows } from '@/server/db/schema';
import { hash, encrypt, safeReturnPath } from '@/server/auth/crypto';
import { authConfiguration } from '@/server/auth/config';
import { privateJson, sameOrigin } from '@/server/http';
import { twitchAuthorizationServer } from '@/server/integrations/twitch-oauth';
import { allowRequest } from '@/server/rate-limit';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const config = authConfiguration();
  if (!config) return privateJson({ error: 'Twitch-login is nog niet geconfigureerd.' }, 503);
  const state = oauth.generateRandomState();
  const browser = randomBytes(24).toString('hex');
  const verifier = oauth.generateRandomCodeVerifier();
  const url = new URL(twitchAuthorizationServer.authorization_endpoint!);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callback,
    response_type: 'code',
    scope: '',
    state,
    code_challenge: await oauth.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
  }).toString();
  try {
    if (!(await allowRequest(await getDb(), 'oauth-start', 60)))
      return privateJson({ error: 'Te veel inlogaanvragen. Probeer zo opnieuw.' }, 429);
    await (
      await getDb()
    )
      .insert(oauthFlows)
      .values({
        stateHash: hash(state),
        browserHash: hash(browser),
        encryptedVerifier: encrypt(verifier, config.secret, `flow:${state}`),
        returnPath: safeReturnPath(new URL(request.url).searchParams.get('returnTo')),
        expiresAt: new Date(Date.now() + 600_000),
      });
    const response = NextResponse.json(
      { url: url.href },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
    response.cookies.set('finnerty_oauth', `${state}.${browser}`, {
      httpOnly: true,
      secure: config.origin.startsWith('https:'),
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch {
    return privateJson({ error: 'Inloggen is tijdelijk niet beschikbaar.' }, 503);
  }
}
