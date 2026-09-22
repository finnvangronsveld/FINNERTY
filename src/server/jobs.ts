import 'server-only';
import { isDemo } from './config';
import { appModeIsLive } from './setup';
import { authKey, safeEqual } from './auth/crypto';
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
  if (isDemo() || !appModeIsLive()) return null;
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
    !authKey(AUTH_SECRET)
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
function positiveInteger(value: string | undefined, fallback: bigint) {
  return value && /^[1-9][0-9]{0,8}$/.test(value.trim()) ? BigInt(value.trim()) : fallback;
}
/** StreamElements watch-time sync: needs the stream setup plus a JWT and the 24-hex channel id. */
export function watchtimeConfiguration() {
  const stream = streamConfiguration();
  const jwt = process.env.STREAMELEMENTS_JWT?.trim();
  const channelId = process.env.STREAMELEMENTS_CHANNEL_ID?.trim();
  if (!stream || !jwt || !channelId || !/^[a-f0-9]{24}$/.test(channelId)) return null;
  return {
    jwt,
    channelId,
    broadcasterId: stream.broadcasterId,
    // First-install rate only; the versioned point rule in the database stays authoritative.
    pointsPerInterval: positiveInteger(process.env.POINTS_PER_INTERVAL, 10n),
    intervalSeconds: positiveInteger(process.env.POINTS_INTERVAL_SECONDS, 600n),
  };
}
