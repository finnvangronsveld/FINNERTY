import 'server-only';
import { TWITCH_LOGIN } from '@/lib/links';

/**
 * Twitch Helix with an app access token (client credentials). Read-only, public data only:
 * clips, past broadcasts, channel emotes. Token and broadcaster id are cached per instance.
 */

let token: { value: string; exp: number } | null = null;
let broadcaster: string | null = null;

export const twitchConfigured = () => !!process.env.TWITCH_CLIENT_ID && !!process.env.TWITCH_CLIENT_SECRET;

async function appToken() {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const d = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return token.value;
}

export async function helix<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { Authorization: `Bearer ${await appToken()}`, 'Client-Id': process.env.TWITCH_CLIENT_ID! },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 401) token = null;
  if (!res.ok) throw new Error(`helix ${path.split('?')[0]} ${res.status}`);
  return res.json() as Promise<T>;
}

export async function broadcasterId() {
  if (broadcaster) return broadcaster;
  const d = await helix<{ data: { id: string }[] }>(`users?login=${TWITCH_LOGIN}`);
  broadcaster = d.data[0]?.id ?? null;
  if (!broadcaster) throw new Error('channel not found');
  return broadcaster;
}
