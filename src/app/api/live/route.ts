import { TWITCH_LOGIN } from '@/lib/links';

/**
 * Live status and avatar via DecAPI (public Twitch helper, no credentials needed).
 * Cached at the CDN for a minute so Twitch never sees per-visitor traffic.
 */
async function decapi(path: string) {
  try {
    const res = await fetch(`https://decapi.me/twitch/${path}/${TWITCH_LOGIN}`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    const text = (await res.text()).trim();
    return res.ok ? text : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [uptime, avatar] = await Promise.all([decapi('uptime'), decapi('avatar')]);

  let live: boolean | null = null;
  let up: string | null = null;
  if (uptime) {
    if (/offline/i.test(uptime)) live = false;
    else if (!/error|not found|invalid/i.test(uptime)) {
      live = true;
      up = compact(uptime);
    }
  }

  // Only accept Twitch's own image CDN.
  const safeAvatar =
    avatar && /^https:\/\/static-cdn\.jtvnw\.net\/[\w\-./]+\.(png|jpe?g|webp)$/i.test(avatar)
      ? avatar
      : null;

  return Response.json(
    { live, uptime: up, avatar: safeAvatar },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}

/** "2 hours, 5 minutes, 3 seconds" -> "2h 05m" */
function compact(text: string) {
  const h = /(\d+)\s*hour/.exec(text)?.[1];
  const m = /(\d+)\s*minute/.exec(text)?.[1] ?? '0';
  return h ? `${h}h ${m.padStart(2, '0')}m` : `${m}m`;
}
