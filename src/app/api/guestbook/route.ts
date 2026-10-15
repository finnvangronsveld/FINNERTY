import { NextResponse } from 'next/server';
import { award, cleanText, isAdmin, isBanned } from '@/server/community';
import { db } from '@/server/db';
import { currentPlayer } from '@/server/session';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const rows = await db()`
    SELECT g.id::int AS id, g.message, g.created_at, p.display_name AS name, p.login, p.avatar
    FROM finnos_guestbook g JOIN finnos_players p USING (twitch_id)
    ORDER BY g.created_at DESC LIMIT 60`;
  return NextResponse.json({ entries: rows }, { headers: noStore });
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'Log in with Twitch to sign the guestbook.' }, { status: 401 });
  if (await isBanned(player.id)) return NextResponse.json({ error: 'You can’t post here.' }, { status: 403 });
  const message = cleanText(((await request.json().catch(() => ({}))) as { message?: unknown }).message, 280);
  if (!message) return NextResponse.json({ error: 'Write something first.' }, { status: 400 });
  const sql = db();
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM finnos_guestbook WHERE twitch_id = ${player.id} AND created_at > now() - interval '1 day'`) as { n: number }[];
  if (n >= 3) return NextResponse.json({ error: 'You can sign three times a day. Come back tomorrow!' }, { status: 429 });
  await sql`INSERT INTO finnos_guestbook (twitch_id, message) VALUES (${player.id}, ${message})`;
  const achievements = await award(player.id, ['guestbook']);
  return NextResponse.json({ ok: true, achievements }, { headers: noStore });
}

export async function DELETE(request: Request) {
  const player = await currentPlayer();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!player || !Number.isInteger(id)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  if (await isAdmin(player)) await db()`DELETE FROM finnos_guestbook WHERE id = ${id}`;
  else await db()`DELETE FROM finnos_guestbook WHERE id = ${id} AND twitch_id = ${player.id}`;
  return NextResponse.json({ ok: true }, { headers: noStore });
}
