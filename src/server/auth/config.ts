import 'server-only';
import { isDemo } from '../config';
import { appModeIsLive } from '../setup';
export function authConfiguration() {
  if (isDemo() || !appModeIsLive()) return null;
  const { APP_URL, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, AUTH_SECRET, DATABASE_URL } =
    process.env;
  if (!APP_URL || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !AUTH_SECRET || !DATABASE_URL)
    return null;
  const app = new URL(APP_URL);
  if (
    app.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(app.hostname))
  )
    return null;
  if (Buffer.from(AUTH_SECRET, 'base64').length !== 32) return null;
  return {
    clientId: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_CLIENT_SECRET,
    callback: new URL('/api/auth/callback/twitch', app.origin).href,
    origin: app.origin,
    secret: AUTH_SECRET,
  };
}
