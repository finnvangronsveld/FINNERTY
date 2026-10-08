import { NextResponse } from 'next/server';
import { GAMES, GameId, isGame } from '@/lib/games';
import { db, hasDb } from '@/server/db';
import { currentPlayer } from '@/server/session';

type Row = { name: string; login: string; avatar: string | null; score: number };

async function top(game: GameId, limit: number) {
  const sql = db();
  const rows = GAMES[game].lowerIsBetter
    ? await sql`SELECT p.display_name AS name, p.login, p.avatar, s.score FROM finnos_scores s JOIN finnos_players p USING (twitch_id) WHERE s.game = ${game} ORDER BY s.score ASC, s.achieved_at ASC LIMIT ${limit}`
    : await sql`SELECT p.display_name AS name, p.login, p.avatar, s.score FROM finnos_scores s JOIN finnos_players p USING (twitch_id) WHERE s.game = ${game} ORDER BY s.score DESC, s.achieved_at ASC LIMIT ${limit}`;
  return rows as Row[];
}

/** ?game=snake gives the top 10 for one game; no game gives the top 5 of every game. */
export async function GET(request: Request) {
  if (!hasDb()) return NextResponse.json({ boards: {}, mine: {} });
  const game = new URL(request.url).searchParams.get('game');
  const games: GameId[] = isGame(game) ? [game] : (Object.keys(GAMES) as GameId[]);
  const limit = isGame(game) ? 10 : 5;

  try {
    const boards = Object.fromEntries(await Promise.all(games.map(async (g) => [g, await top(g, limit)] as const)));
    const player = await currentPlayer();
    let mine: Record<string, number> = {};
    if (player) {
      const rows = (await db()`SELECT game, score FROM finnos_scores WHERE twitch_id = ${player.id}`) as { game: string; score: number }[];
      mine = Object.fromEntries(rows.map((r) => [r.game, r.score]));
    }
    return NextResponse.json({ boards, mine }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Leaderboards are unavailable right now.' }, { status: 503 });
  }
}
