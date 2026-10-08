import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'finnos_session';
export const STATE_COOKIE = 'finnos_oauth';

export type Player = { id: string; login: string; name: string; avatar: string | null };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET is missing or too short');
  return s;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');

/** HMAC-signed, expiring token: payload.signature */
export function sign(payload: object, ttlSeconds: number) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verify<T>(token: string | undefined): (T & { exp: number }) | null {
  if (!token || token.length > 4000) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = createHmac('sha256', secret()).update(body).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof data.exp !== 'number' || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export const randomState = () => randomBytes(24).toString('base64url');

export async function currentPlayer(): Promise<Player | null> {
  const jar = await cookies();
  try {
    return verify<Player>(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export function authConfig() {
  const { APP_URL, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, AUTH_SECRET, DATABASE_URL } = process.env;
  if (!APP_URL || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !AUTH_SECRET || !DATABASE_URL) return null;
  const origin = new URL(APP_URL).origin;
  return {
    clientId: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_CLIENT_SECRET,
    origin,
    callback: `${origin}/api/auth/callback/twitch`,
  };
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});
