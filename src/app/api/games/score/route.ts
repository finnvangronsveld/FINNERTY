import { NextResponse } from 'next/server';
import { GAMES, GameId, plausible } from '@/lib/games';
import { award, isBanned } from '@/server/community';
import { db } from '@/server/db';
import { isoWeek, weekGame } from '@/lib/week';
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
  if (await isBanned(player.id)) return NextResponse.json({ error: 'Your scores can’t be saved.' }, { status: 403 });

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

  // Game of the week: keep a separate best for this week.
  let weekly = false;
  if (weekGame() === run.game) {
    weekly = true;
    const week = isoWeek().key;
    if (lower) {
      await sql`INSERT INTO finnos_weekly (week, game, twitch_id, score) VALUES (${week}, ${run.game}, ${player.id}, ${score})
        ON CONFLICT (week, twitch_id) DO UPDATE SET score = LEAST(finnos_weekly.score, EXCLUDED.score), achieved_at = CASE WHEN EXCLUDED.score < finnos_weekly.score THEN now() ELSE finnos_weekly.achieved_at END`;
    } else {
      await sql`INSERT INTO finnos_weekly (week, game, twitch_id, score) VALUES (${week}, ${run.game}, ${player.id}, ${score})
        ON CONFLICT (week, twitch_id) DO UPDATE SET score = GREATEST(finnos_weekly.score, EXCLUDED.score), achieved_at = CASE WHEN EXCLUDED.score > finnos_weekly.score THEN now() ELSE finnos_weekly.achieved_at END`;
    }
  }

  const codes = ['first-score'];
  if (rank <= 10) codes.push('top-10');
  if (rank === 1) codes.push('number-1');
  if (weekly) codes.push('weekly');
  if (run.game === 'snake' && score >= 25) codes.push('snake-25');
  if (run.game === '2048' && score >= 20_000) codes.push('2048-big');
  if (run.game === 'blocks' && score >= 10_000) codes.push('blocks-10k');
  if (run.game === 'bricks' && score >= 1000) codes.push('bricks-1k');
  if (run.game === 'minesweeper' && score <= 60) codes.push('mines-60');
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM finnos_scores WHERE twitch_id = ${player.id}`) as { n: number }[];
  if (n >= Object.keys(GAMES).length) codes.push('all-games');
  const achievements = await award(player.id, codes);

  return NextResponse.json({ best, newBest: better, rank, weekly, achievements }, { headers: { 'Cache-Control': 'private, no-store' } });
}
