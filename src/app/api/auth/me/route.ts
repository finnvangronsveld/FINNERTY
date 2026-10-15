import { NextResponse } from 'next/server';
import { isAdmin } from '@/server/community';
import { authConfig, currentPlayer } from '@/server/session';

export async function GET() {
  const player = await currentPlayer();
  return NextResponse.json(
    { player, admin: await isAdmin(player), loginAvailable: !!authConfig() || process.env.NODE_ENV !== 'production' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
