import { TWITCH_LOGIN } from '@/lib/links';

/**
 * Live status via DecAPI (public Twitch helper, no credentials needed).
 * Cached at the CDN for a minute so Twitch never sees per-visitor traffic.
 */
export async function GET() {
  let body: { live: boolean | null; uptime: string | null } = { live: null, uptime: null };
  try {
    const res = await fetch(`https://decapi.me/twitch/uptime/${TWITCH_LOGIN}`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    const text = (await res.text()).trim();
    if (res.ok && text) {
      if (/offline/i.test(text)) body = { live: false, uptime: null };
      else if (/error|not found|invalid/i.test(text)) body = { live: null, uptime: null };
      else body = { live: true, uptime: compact(text) };
    }
  } catch {
    /* keep the unknown state */
  }
  return Response.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}

/** "2 hours, 5 minutes, 3 seconds" -> "2H 05M" */
function compact(text: string) {
  const h = /(\d+)\s*hour/.exec(text)?.[1];
  const m = /(\d+)\s*minute/.exec(text)?.[1] ?? '0';
  return h ? `${h}H ${m.padStart(2, '0')}M` : `${m}M`;
}
