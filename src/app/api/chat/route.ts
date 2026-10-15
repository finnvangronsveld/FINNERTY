import { NextResponse } from 'next/server';
import { award, cleanText, isAdmin, isBanned } from '@/server/community';
import { db } from '@/server/db';
import { currentPlayer } from '@/server/session';

const noStore = { 'Cache-Control': 'private, no-store' };

/** ?after=<id> returns only newer messages so the app can poll cheaply. ids lists what still exists. */
export async function GET(request: Request) {
  const after = Number(new URL(request.url).searchParams.get('after') ?? 0) || 0;
  const sql = db();
  const rows = after
    ? await sql`SELECT c.id::int AS id, c.message, c.created_at, c.twitch_id, p.display_name AS name, p.avatar FROM finnos_chat c JOIN finnos_players p USING (twitch_id) WHERE c.id > ${after} ORDER BY c.id ASC LIMIT 100`
    : await sql`SELECT * FROM (SELECT c.id::int AS id, c.message, c.created_at, c.twitch_id, p.display_name AS name, p.avatar FROM finnos_chat c JOIN finnos_players p USING (twitch_id) ORDER BY c.id DESC LIMIT 60) t ORDER BY id ASC`;
  // Recent ids, so messages a moderator removed disappear for everyone.
  const recent = (await sql`SELECT id::int AS id FROM finnos_chat ORDER BY id DESC LIMIT 80`) as { id: number }[];
  return NextResponse.json({ messages: rows, alive: recent.map((r) => r.id) }, { headers: noStore });
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'Log in with Twitch to chat.' }, { status: 401 });
  if (await isBanned(player.id)) return NextResponse.json({ error: 'You can’t chat here.' }, { status: 403 });
  const message = cleanText(((await request.json().catch(() => ({}))) as { message?: unknown }).message, 300);
  if (!message) return NextResponse.json({ error: 'Empty message.' }, { status: 400 });
  const sql = db();
  const recent = (await sql`SELECT message, created_at FROM finnos_chat WHERE twitch_id = ${player.id} ORDER BY id DESC LIMIT 1`) as { message: string; created_at: string }[];
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 2000) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  if (recent[0]?.message === message) return NextResponse.json({ error: 'You just said that.' }, { status: 429 });
  const [row] = (await sql`INSERT INTO finnos_chat (twitch_id, message) VALUES (${player.id}, ${message}) RETURNING id::int AS id`) as { id: number }[];
  // Keep only the latest 1000 messages.
  if (row.id % 50 === 0) await sql`DELETE FROM finnos_chat WHERE id < ${row.id - 1000}`;
  const achievements = await award(player.id, ['chatter']);
  return NextResponse.json({ ok: true, id: row.id, achievements }, { headers: noStore });
}

export async function DELETE(request: Request) {
  const player = await currentPlayer();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!player || !Number.isInteger(id)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  if (await isAdmin(player)) await db()`DELETE FROM finnos_chat WHERE id = ${id}`;
  else await db()`DELETE FROM finnos_chat WHERE id = ${id} AND twitch_id = ${player.id}`;
  return NextResponse.json({ ok: true }, { headers: noStore });
}
