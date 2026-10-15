import { NextResponse } from 'next/server';
import { byCode } from '@/lib/achievements';
import { award } from '@/server/community';
import { db } from '@/server/db';
import { currentPlayer } from '@/server/session';

const noStore = { 'Cache-Control': 'private, no-store' };

/** Your achievements, plus how many players have each one. */
export async function GET() {
  const player = await currentPlayer();
  const counts = (await db()`SELECT code, count(*)::int AS n FROM finnos_achievements GROUP BY code`) as { code: string; n: number }[];
  const mine = player
    ? ((await db()`SELECT code, earned_at FROM finnos_achievements WHERE twitch_id = ${player.id}`) as { code: string; earned_at: string }[])
    : [];
  return NextResponse.json(
    { counts: Object.fromEntries(counts.map((c) => [c.code, c.n])), mine: Object.fromEntries(mine.map((m) => [m.code, m.earned_at])) },
    { headers: noStore },
  );
}

/** Easter-egg achievements the client reports. Only codes marked claimable are accepted. */
export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ achievements: [] }, { headers: noStore });
  const { code } = (await request.json().catch(() => ({}))) as { code?: string };
  if (!code || !byCode[code]?.claimable) return NextResponse.json({ error: 'Unknown achievement.' }, { status: 400 });
  const achievements = await award(player.id, [code]);
  return NextResponse.json({ achievements }, { headers: noStore });
}
