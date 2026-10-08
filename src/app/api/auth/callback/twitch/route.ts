import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/server/db';
import { authConfig, cookieOptions, Player, SESSION_COOKIE, sign, STATE_COOKIE, verify } from '@/server/session';

const DAY = 86_400;

export async function GET(request: Request) {
  const config = authConfig();
  if (!config) return NextResponse.json({ error: 'Twitch login is not configured.' }, { status: 503 });

  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/?login=${status}`, config.origin));
    res.cookies.delete(STATE_COOKIE);
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  };

  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const saved = verify<{ state: string }>(jar.get(STATE_COOKIE)?.value);
  const code = params.get('code');
  if (!saved || !code || params.get('state') !== saved.state) return back('failed');

  try {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.callback,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenRes.ok) return back('failed');
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return back('failed');

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: { Authorization: `Bearer ${access_token}`, 'Client-Id': config.clientId },
      signal: AbortSignal.timeout(8000),
    });
    const user = ((await userRes.json()) as { data?: { id: string; login: string; display_name: string; profile_image_url?: string }[] }).data?.[0];

    // The token was only needed to identify the user; revoke it right away.
    void fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, token: access_token }),
    }).catch(() => undefined);

    if (!user?.id) return back('failed');

    const player: Player = {
      id: user.id,
      login: user.login,
      name: user.display_name || user.login,
      avatar: user.profile_image_url ?? null,
    };
    await db()`
      INSERT INTO finnos_players (twitch_id, login, display_name, avatar)
      VALUES (${player.id}, ${player.login}, ${player.name}, ${player.avatar})
      ON CONFLICT (twitch_id) DO UPDATE
      SET login = EXCLUDED.login, display_name = EXCLUDED.display_name, avatar = EXCLUDED.avatar, updated_at = now()`;

    const res = back('ok');
    res.cookies.set(SESSION_COOKIE, sign(player, 30 * DAY), cookieOptions(30 * DAY));
    return res;
  } catch {
    return back('failed');
  }
}
