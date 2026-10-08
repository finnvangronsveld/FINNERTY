'use client';
import { getState, notify, Player, setState } from './store';
import type { AppId } from './apps';

const RESUME = 'finnos:resume';

export async function loadAccount() {
  try {
    const r = await fetch('/api/auth/me', { cache: 'no-store' });
    const d = (await r.json()) as { player: Player | null; loginAvailable: boolean };
    setState({ player: d.player, loginAvailable: d.loginAvailable });
    return d.player;
  } catch {
    return null;
  }
}

/** Leaves for Twitch; when we come back, FinnOS reopens `app`. */
export function logIn(app?: AppId) {
  try {
    sessionStorage.setItem(RESUME, app ?? 'gamecenter');
  } catch {
    /* ignore */
  }
  const dev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(location.hostname);
  location.href = dev ? '/api/auth/dev?name=DevPlayer' : '/api/auth/login';
}

export async function logOut() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  setState({ player: null });
  notify('Logged out', 'Your scores stay on the leaderboards.', 'gamecenter');
}

/** After the Twitch round trip: which app to reopen, and did it work? */
export function takeResume(): { app: AppId | null; status: string | null } {
  const params = new URLSearchParams(location.search);
  const status = params.get('login');
  let app: AppId | null = null;
  try {
    app = sessionStorage.getItem(RESUME) as AppId | null;
    sessionStorage.removeItem(RESUME);
  } catch {
    /* ignore */
  }
  if (status) history.replaceState(null, '', location.pathname);
  return { app: status ? app : null, status };
}

export const signedIn = () => !!getState().player;
