import { NextResponse } from 'next/server';
import { GAMES, GameId, plausible } from '@/lib/games';
import { db } from '@/server/db';
import { currentPlayer, verify } from '@/server/session';

const recent = new Map<string, number[]>();

/** Small per-player limit: at most 20 submissions a minute (per server instance). */
function limited(id: string) {
  const now = Date.now();
  const list = (recent.get(id) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(id, list);
  return list.length > 20;
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'Log in with Twitch to save scores.' }, { status: 401 });
  if (limited(player.id)) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { token?: string; score?: unknown };
  const run = verify<{ game: GameId; uid: string | null; t: number }>(body.token);
  if (!run || run.uid !== player.id || !(run.game in GAMES)) {
    return NextResponse.json({ error: 'This run can’t be saved.' }, { status: 400 });
  }
  const score = Number(body.score);
  const seconds = (Date.now() - run.t) / 1000;
  if (!plausible(run.game, score, seconds)) {
    return NextResponse.json({ error: 'That score doesn’t look right.' }, { status: 422 });
  }

  const lower = GAMES[run.game].lowerIsBetter;
  const sql = db();
  const [prev] = (await sql`SELECT score FROM finnos_scores WHERE game = ${run.game} AND twitch_id = ${player.id}`) as { score: number }[];
  const better = !prev || (lower ? score < prev.score : score > prev.score);

  if (!prev) {
    await sql`INSERT INTO finnos_scores (game, twitch_id, score) VALUES (${run.game}, ${player.id}, ${score})`;
  } else if (better) {
    await sql`UPDATE finnos_scores SET score = ${score}, plays = plays + 1, achieved_at = now() WHERE game = ${run.game} AND twitch_id = ${player.id}`;
  } else {
    await sql`UPDATE finnos_scores SET plays = plays + 1 WHERE game = ${run.game} AND twitch_id = ${player.id}`;
  }

  const best = better ? score : prev.score;
  const [{ rank }] = (lower
    ? await sql`SELECT count(*)::int + 1 AS rank FROM finnos_scores WHERE game = ${run.game} AND score < ${best}`
    : await sql`SELECT count(*)::int + 1 AS rank FROM finnos_scores WHERE game = ${run.game} AND score > ${best}`) as { rank: number }[];

  return NextResponse.json({ best, newBest: better, rank }, { headers: { 'Cache-Control': 'private, no-store' } });
}
