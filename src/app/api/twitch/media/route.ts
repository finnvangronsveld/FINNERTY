import { NextResponse } from 'next/server';
import { broadcasterId, helix, twitchConfigured } from '@/server/twitch';

type Clip = { id: string; title: string; thumbnail_url: string; view_count: number; created_at: string; duration: number; creator_name: string };
type Video = { id: string; title: string; thumbnail_url: string; view_count: number; created_at: string; duration: string };

const thumb = (url: string) => url.replace('%{width}', '480').replace('%{height}', '270');

/** Top clips and recent past broadcasts for the channel. */
export async function GET() {
  if (!twitchConfigured()) return NextResponse.json({ error: 'Twitch isn’t connected yet.' }, { status: 503 });
  try {
    const id = await broadcasterId();
    const [clips, videos] = await Promise.all([
      helix<{ data: Clip[] }>(`clips?broadcaster_id=${id}&first=30`),
      helix<{ data: Video[] }>(`videos?user_id=${id}&type=archive&first=20`),
    ]);
    return NextResponse.json(
      {
        clips: clips.data.map((c) => ({ id: c.id, title: c.title, thumb: c.thumbnail_url, views: c.view_count, date: c.created_at, duration: Math.round(c.duration), by: c.creator_name })),
        videos: videos.data.map((v) => ({ id: v.id, title: v.title, thumb: v.thumbnail_url ? thumb(v.thumbnail_url) : null, views: v.view_count, date: v.created_at, duration: v.duration })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
    );
  } catch {
    return NextResponse.json({ error: 'Twitch didn’t answer. Try again in a minute.' }, { status: 502 });
  }
}
