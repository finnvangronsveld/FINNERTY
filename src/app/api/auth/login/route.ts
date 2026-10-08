import { NextResponse } from 'next/server';
import { authConfig, cookieOptions, randomState, sign, STATE_COOKIE } from '@/server/session';

/** Starts "Log in with Twitch". No scopes: we only read the public profile. */
export async function GET() {
  const config = authConfig();
  if (!config) return NextResponse.json({ error: 'Twitch login is not configured.' }, { status: 503 });
  const state = randomState();
  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.callback);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', '');
  url.searchParams.set('state', state);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, sign({ state }, 600), cookieOptions(600));
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
