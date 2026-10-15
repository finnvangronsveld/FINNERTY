import { NextResponse } from 'next/server';
import { broadcasterId, helix, twitchConfigured } from '@/server/twitch';

type Emote = { name: string; url: string; source: 'Twitch' | '7TV' | 'BTTV'; tier?: string; animated?: boolean };

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Channel emotes from Twitch, plus 7TV and BTTV if the channel uses them. */
export async function GET() {
  if (!twitchConfigured()) return NextResponse.json({ error: 'Twitch isn’t connected yet.' }, { status: 503 });
  try {
    const id = await broadcasterId();
    const emotes: Emote[] = [];

    const tw = await helix<{ data: { name: string; tier: string; emote_type: string; format: string[]; images: { url_4x: string } }[]; template: string }>(
      `chat/emotes?broadcaster_id=${id}`,
    ).catch(() => null);
    for (const e of tw?.data ?? []) {
      emotes.push({
        name: e.name,
        url: e.images.url_4x,
        source: 'Twitch',
        tier: e.emote_type === 'subscriptions' ? `Tier ${Number(e.tier) / 1000}` : e.emote_type === 'bitstier' ? 'Bits' : 'Follower',
        animated: e.format.includes('animated'),
      });
    }

    const seventv = await json<{ emote_set?: { emotes?: { name: string; data: { animated: boolean; host: { url: string } } }[] } }>(
      `https://7tv.io/v3/users/twitch/${id}`,
    );
    for (const e of seventv?.emote_set?.emotes ?? []) {
      emotes.push({ name: e.name, url: `https:${e.data.host.url}/2x.webp`, source: '7TV', animated: e.data.animated });
    }

    const bttv = await json<{ channelEmotes?: { id: string; code: string; animated?: boolean }[]; sharedEmotes?: { id: string; code: string; animated?: boolean }[] }>(
      `https://api.betterttv.net/3/cached/users/twitch/${id}`,
    );
    for (const e of [...(bttv?.channelEmotes ?? []), ...(bttv?.sharedEmotes ?? [])]) {
      emotes.push({ name: e.code, url: `https://cdn.betterttv.net/emote/${e.id}/2x`, source: 'BTTV', animated: e.animated });
    }

    return NextResponse.json({ emotes }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' } });
  } catch {
    return NextResponse.json({ error: 'Twitch didn’t answer. Try again in a minute.' }, { status: 502 });
  }
}
