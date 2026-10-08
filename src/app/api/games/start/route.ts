import { NextResponse } from 'next/server';
import { isGame } from '@/lib/games';
import { currentPlayer, sign } from '@/server/session';

/** Issues a signed "run started" token. The score endpoint uses it to check how long the run took. */
export async function POST(request: Request) {
  const { game } = (await request.json().catch(() => ({}))) as { game?: unknown };
  if (!isGame(game)) return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
  const player = await currentPlayer();
  const token = sign({ game, uid: player?.id ?? null, t: Date.now() }, 6 * 3600);
  return NextResponse.json({ token }, { headers: { 'Cache-Control': 'private, no-store' } });
}
