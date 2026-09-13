import 'server-only';
import { isDemo } from './config';
import { safeEqual } from './auth/crypto';
import type { StreamCredentials } from './integrations/twitch-stream';
export function authorizedJob(request: Request) {
  const secret = request.method === 'GET' ? process.env.CRON_SECRET : process.env.JOB_SECRET;
  return (
    !!secret &&
    secret.length >= 32 &&
    safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)
  );
}
export function streamConfiguration(): StreamCredentials | null {
  if (isDemo() || process.env.APP_MODE !== 'live') return null;
  const {
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    TWITCH_CHANNEL_LOGIN,
    TWITCH_BROADCASTER_ID,
    AUTH_SECRET,
    DATABASE_URL,
  } = process.env;
  if (
    !TWITCH_CLIENT_ID ||
    !TWITCH_CLIENT_SECRET ||
    !TWITCH_CHANNEL_LOGIN ||
    !TWITCH_BROADCASTER_ID ||
    !AUTH_SECRET ||
    !DATABASE_URL
  )
    return null;
  if (
    !/^\d+$/.test(TWITCH_BROADCASTER_ID) ||
    !/^[a-z0-9_]+$/.test(TWITCH_CHANNEL_LOGIN) ||
    Buffer.from(AUTH_SECRET, 'base64').length !== 32
  )
    return null;
  return {
    clientId: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_CLIENT_SECRET,
    broadcasterId: TWITCH_BROADCASTER_ID,
    channelLogin: TWITCH_CHANNEL_LOGIN,
    secret: AUTH_SECRET,
  };
}
