import 'server-only';
import { db } from './db';
import type { Player } from './session';
import { broadcasterId, twitchConfigured } from './twitch';

/** Finnerty's own Twitch id, used when the Twitch API isn't reachable. */
const OWNER_FALLBACK = '442232328';

export async function isAdmin(player: Player | null) {
  if (!player) return false;
  if (player.id === OWNER_FALLBACK) return true;
  if (!twitchConfigured()) return false;
  try {
    return player.id === (await broadcasterId());
  } catch {
    return false;
  }
}

export async function isBanned(id: string) {
  const rows = (await db()`SELECT 1 FROM finnos_bans WHERE twitch_id = ${id}`) as unknown[];
  return rows.length > 0;
}

/** Grants achievements and returns the ones that are new. */
export async function award(id: string, codes: string[]) {
  if (!codes.length) return [];
  const rows = (await db()`
    INSERT INTO finnos_achievements (twitch_id, code)
    SELECT ${id}, unnest(${codes}::text[])
    ON CONFLICT DO NOTHING
    RETURNING code`) as { code: string }[];
  return rows.map((r) => r.code);
}

/** Strips control characters and squashes whitespace in user text. */
export function cleanText(s: unknown, max: number) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
