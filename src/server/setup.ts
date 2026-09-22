/**
 * Production readiness per feature, as issue codes only. Never includes configured values,
 * so it is safe to expose on the public health route while setup is incomplete.
 */
import { authKey } from './auth/crypto';

type Env = Record<string, string | undefined>;

export function appModeIsLive(env: Env = process.env) {
  return env.APP_MODE?.trim().toLowerCase() === 'live';
}

export function authSecretIssue(secret: string | undefined) {
  if (!secret?.trim()) return 'AUTH_SECRET_MISSING';
  return authKey(secret) ? null : 'AUTH_SECRET_NOT_32_BYTES';
}

export function setupReport(env: Env = process.env) {
  const missing = (...names: string[]) =>
    names.filter((name) => !env[name]?.trim()).map((name) => `${name}_MISSING`);
  const login = [
    ...(appModeIsLive(env)
      ? []
      : [env.APP_MODE?.trim() ? 'APP_MODE_NOT_LIVE' : 'APP_MODE_MISSING']),
    ...missing('APP_URL', 'DATABASE_URL', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'),
  ];
  const secret = authSecretIssue(env.AUTH_SECRET);
  if (secret) login.push(secret);
  if (env.APP_URL?.trim()) {
    try {
      if (new URL(env.APP_URL.trim()).protocol !== 'https:') login.push('APP_URL_NOT_HTTPS');
    } catch {
      login.push('APP_URL_INVALID');
    }
  }
  const stream = [...login];
  if (!/^\d+$/.test(env.TWITCH_BROADCASTER_ID?.trim() ?? ''))
    stream.push('TWITCH_BROADCASTER_ID_NOT_NUMERIC');
  if (!/^[a-z0-9_]+$/.test(env.TWITCH_CHANNEL_LOGIN?.trim() ?? ''))
    stream.push('TWITCH_CHANNEL_LOGIN_INVALID');
  const scheduler =
    (env.JOB_SECRET?.trim().length ?? 0) >= 32 || (env.CRON_SECRET?.trim().length ?? 0) >= 32
      ? []
      : ['JOB_SECRET_MISSING_OR_SHORTER_THAN_32'];
  const watchtime = [...stream];
  if (!env.STREAMELEMENTS_JWT?.trim()) watchtime.push('STREAMELEMENTS_JWT_MISSING');
  if (!/^[a-f0-9]{24}$/.test(env.STREAMELEMENTS_CHANNEL_ID?.trim() ?? ''))
    watchtime.push('STREAMELEMENTS_CHANNEL_ID_INVALID');
  const ready = (issues: string[]) => (issues.length ? issues : 'ready');
  return {
    login: ready(login),
    stream: ready(stream),
    watchtime: ready(watchtime),
    scheduler: ready(scheduler),
  };
}
