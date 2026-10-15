import { NextResponse } from 'next/server';
import { db, hasDb } from '@/server/db';

/** Finn's current announcement and what he's playing. Every visitor polls this. */
export async function GET() {
  if (!hasDb()) return NextResponse.json({ announcement: null, nowPlaying: null });
  const sql = db();
  const [a] = (await sql`SELECT id, message, created_at FROM finnos_announcements WHERE active ORDER BY id DESC LIMIT 1`) as { id: number; message: string; created_at: string }[];
  const [np] = (await sql`SELECT value FROM finnos_status WHERE key = 'now-playing'`) as { value: string }[];
  return NextResponse.json(
    { announcement: a ?? null, nowPlaying: np?.value || null },
    { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } },
  );
}
