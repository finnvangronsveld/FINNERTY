import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { cookieOptions, Player, SESSION_COOKIE, sign } from '@/server/session';

/** Local development only: sign in as a fake player without Twitch. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const name = (new URL(request.url).searchParams.get('name') ?? 'DevPlayer').replace(/[^\w]/g, '').slice(0, 20) || 'DevPlayer';
  const player: Player = { id: `dev-${name.toLowerCase()}`, login: name.toLowerCase(), name, avatar: null };
  await db()`
    INSERT INTO finnos_players (twitch_id, login, display_name)
    VALUES (${player.id}, ${player.login}, ${player.name})
    ON CONFLICT (twitch_id) DO UPDATE SET display_name = EXCLUDED.display_name`;
  // Redirect to the host the browser used, so the cookie and the page share an origin.
  const host = request.headers.get('host') ?? '127.0.0.1:3000';
  const res = NextResponse.redirect(new URL('/?login=ok', `http://${host}`));
  res.cookies.set(SESSION_COOKIE, sign(player, 86_400), cookieOptions(86_400));
  return res;
}
