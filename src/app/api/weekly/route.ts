import { NextResponse } from 'next/server';
import { GAMES } from '@/lib/games';
import { isoWeek, previousWeek, weekEnds, weekGame } from '@/lib/week';
import { db, hasDb } from '@/server/db';

type Row = { name: string; login: string; avatar: string | null; score: number };

async function standings(week: string, lower: boolean, limit: number) {
  const sql = db();
  return (lower
    ? await sql`SELECT p.display_name AS name, p.login, p.avatar, w.score FROM finnos_weekly w JOIN finnos_players p USING (twitch_id) WHERE w.week = ${week} ORDER BY w.score ASC, w.achieved_at ASC LIMIT ${limit}`
    : await sql`SELECT p.display_name AS name, p.login, p.avatar, w.score FROM finnos_weekly w JOIN finnos_players p USING (twitch_id) WHERE w.week = ${week} ORDER BY w.score DESC, w.achieved_at ASC LIMIT ${limit}`) as Row[];
}

/** This week's game, its standings, and last week's winner. */
export async function GET() {
  const game = weekGame();
  const lastGame = weekGame(previousWeek());
  const week = isoWeek().key;
  let top: Row[] = [];
  let last: (Row & { game: string }) | null = null;
  if (hasDb()) {
    top = await standings(week, GAMES[game].lowerIsBetter, 10);
    const [winner] = await standings(isoWeek(previousWeek()).key, GAMES[lastGame].lowerIsBetter, 1);
    if (winner) last = { ...winner, game: GAMES[lastGame].name };
  }
  return NextResponse.json(
    { week, game, name: GAMES[game].name, unit: GAMES[game].unit, endsAt: weekEnds().toISOString(), top, last },
    { headers: { 'Cache-Control': 'public, s-maxage=20' } },
  );
}
