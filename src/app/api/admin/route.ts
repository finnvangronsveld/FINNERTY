import { NextResponse } from 'next/server';
import { isGame } from '@/lib/games';
import { cleanText, isAdmin } from '@/server/community';
import { db } from '@/server/db';
import { currentPlayer } from '@/server/session';

const noStore = { 'Cache-Control': 'private, no-store' };

async function guard() {
  return isAdmin(await currentPlayer());
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  const sql = db();
  const [announcements, bans, players, status] = await Promise.all([
    sql`SELECT id, message, active, created_at FROM finnos_announcements ORDER BY id DESC LIMIT 10`,
    sql`SELECT twitch_id, login, created_at FROM finnos_bans ORDER BY created_at DESC`,
    sql`SELECT count(*)::int AS n FROM finnos_players`,
    sql`SELECT value FROM finnos_status WHERE key = 'now-playing'`,
  ]);
  return NextResponse.json(
    {
      announcements,
      bans,
      players: (players as { n: number }[])[0].n,
      nowPlaying: (status as { value: string }[])[0]?.value ?? '',
    },
    { headers: noStore },
  );
}

type Action =
  | { action: 'announce'; message: string }
  | { action: 'end-announcement' }
  | { action: 'now-playing'; value: string }
  | { action: 'ban' | 'unban'; login: string }
  | { action: 'delete-score'; game: string; login: string };

export async function POST(request: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Action;
  const sql = db();
  switch (body.action) {
    case 'announce': {
      const message = cleanText(body.message, 200);
      if (!message) return NextResponse.json({ error: 'Empty announcement.' }, { status: 400 });
      await sql`UPDATE finnos_announcements SET active = false WHERE active`;
      await sql`INSERT INTO finnos_announcements (message) VALUES (${message})`;
      break;
    }
    case 'end-announcement':
      await sql`UPDATE finnos_announcements SET active = false WHERE active`;
      break;
    case 'now-playing': {
      const value = cleanText(body.value, 80);
      await sql`INSERT INTO finnos_status (key, value) VALUES ('now-playing', ${value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
      break;
    }
    case 'ban': {
      const login = cleanText(body.login, 40).toLowerCase().replace(/^@/, '');
      const [p] = (await sql`SELECT twitch_id FROM finnos_players WHERE login = ${login}`) as { twitch_id: string }[];
      if (!p) return NextResponse.json({ error: `${login} hasn’t logged in here yet.` }, { status: 404 });
      await sql`INSERT INTO finnos_bans (twitch_id, login) VALUES (${p.twitch_id}, ${login}) ON CONFLICT DO NOTHING`;
      // A ban also clears their posts and scores.
      await sql`DELETE FROM finnos_chat WHERE twitch_id = ${p.twitch_id}`;
      await sql`DELETE FROM finnos_guestbook WHERE twitch_id = ${p.twitch_id}`;
      await sql`DELETE FROM finnos_scores WHERE twitch_id = ${p.twitch_id}`;
      await sql`DELETE FROM finnos_weekly WHERE twitch_id = ${p.twitch_id}`;
      break;
    }
    case 'unban':
      await sql`DELETE FROM finnos_bans WHERE login = ${cleanText(body.login, 40).toLowerCase()}`;
      break;
    case 'delete-score': {
      if (!isGame(body.game)) return NextResponse.json({ error: 'Unknown game.' }, { status: 400 });
      const login = cleanText(body.login, 40).toLowerCase().replace(/^@/, '');
      await sql`DELETE FROM finnos_scores WHERE game = ${body.game} AND twitch_id = (SELECT twitch_id FROM finnos_players WHERE login = ${login})`;
      await sql`DELETE FROM finnos_weekly WHERE game = ${body.game} AND twitch_id = (SELECT twitch_id FROM finnos_players WHERE login = ${login})`;
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
