import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { integrationCredentials, streamStates } from '../db/schema';
import type { Database } from '../db/types';
import { encrypt, decrypt } from '../auth/crypto';
export interface StreamCredentials {
  clientId: string;
  clientSecret: string;
  broadcasterId: string;
  channelLogin: string;
  secret: string;
}
const serverStartedAt = Date.now();
export const streamsSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        user_id: z.string(),
        user_login: z.string(),
        title: z.string(),
        game_name: z.string(),
        started_at: z.iso.datetime(),
        type: z.literal('live'),
      }),
    )
    .max(1),
});
export async function refreshStream(
  db: Database,
  config: StreamCredentials,
  request: typeof fetch = fetch,
) {
  return db.transaction(async (tx) => {
    const [lock] = await tx
      .select({
        acquired: sql<boolean>`pg_try_advisory_xact_lock(hashtext(${`stream:${config.broadcasterId}`}))`,
      })
      .from(sql`(select 1) as singleton`);
    if (!lock.acquired) return { status: 'busy' };
    const [previous] = await tx
      .select()
      .from(streamStates)
      .where(eq(streamStates.broadcasterId, config.broadcasterId));
    if (previous && previous.nextCheckAt > new Date()) return { status: 'cached' };
    try {
      const [saved] = await tx
        .select()
        .from(integrationCredentials)
        .where(eq(integrationCredentials.key, 'twitch-app'));
      const tokenSchema = z.object({
        accessToken: z.string(),
        expiresAt: z.number(),
        validatedAt: z.number(),
      });
      let token = saved
        ? tokenSchema.parse(JSON.parse(decrypt(saved.encryptedValue, config.secret, 'twitch-app')))
        : null;
      if (
        token &&
        (token.expiresAt < Date.now() + 60_000 ||
          token.validatedAt < serverStartedAt ||
          Date.now() - token.validatedAt > 55 * 60_000)
      ) {
        const validation = await request('https://id.twitch.tv/oauth2/validate', {
          headers: { Authorization: `OAuth ${token.accessToken}` },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (validation.status === 401) token = null;
        else {
          if (!validation.ok) throw new Error('TWITCH_UNAVAILABLE');
          const validated = z.object({ client_id: z.string() }).parse(await validation.json());
          if (validated.client_id !== config.clientId) token = null;
          else token.validatedAt = Date.now();
        }
      }
      if (!token) {
        const response = await request('https://id.twitch.tv/oauth2/token', {
          method: 'POST',
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'client_credentials',
          }),
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('TWITCH_UNAVAILABLE');
        const parsed = z
          .object({ access_token: z.string(), expires_in: z.number().positive() })
          .parse(await response.json());
        token = {
          accessToken: parsed.access_token,
          expiresAt: Date.now() + parsed.expires_in * 1000,
          validatedAt: Date.now(),
        };
      }
      await tx
        .insert(integrationCredentials)
        .values({
          key: 'twitch-app',
          encryptedValue: encrypt(JSON.stringify(token), config.secret, 'twitch-app'),
        })
        .onConflictDoUpdate({
          target: integrationCredentials.key,
          set: {
            encryptedValue: encrypt(JSON.stringify(token), config.secret, 'twitch-app'),
            updatedAt: new Date(),
          },
        });
      const response = await request(
        `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(config.broadcasterId)}`,
        {
          headers: { Authorization: `Bearer ${token.accessToken}`, 'Client-Id': config.clientId },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        },
      );
      if (response.status === 401)
        await tx.delete(integrationCredentials).where(eq(integrationCredentials.key, 'twitch-app'));
      if (!response.ok) throw new Error('TWITCH_UNAVAILABLE');
      const stream = streamsSchema.parse(await response.json()).data[0];
      if (
        stream &&
        (stream.user_id !== config.broadcasterId || stream.user_login !== config.channelLogin)
      )
        throw new Error('CHANNEL_MISMATCH');
      const state = {
        status: stream ? 'live' : 'offline',
        streamId: stream?.id ?? null,
        title: stream?.title ?? null,
        category: stream?.game_name ?? null,
        startedAt: stream ? new Date(stream.started_at) : null,
        checkedAt: new Date(),
        nextCheckAt: new Date(Date.now() + 60_000),
        failures: 0,
        errorCode: null,
      };
      await tx
        .insert(streamStates)
        .values({ broadcasterId: config.broadcasterId, ...state })
        .onConflictDoUpdate({ target: streamStates.broadcasterId, set: state });
      return { status: state.status };
    } catch {
      const failures = Math.min((previous?.failures ?? 0) + 1, 10);
      const failure = {
        failures,
        errorCode: 'TWITCH_REFRESH_FAILED',
        nextCheckAt: new Date(Date.now() + Math.min(60_000 * 2 ** (failures - 1), 900_000)),
      };
      // A failed refresh never overwrites the last confirmed live/offline state.
      await tx
        .insert(streamStates)
        .values({
          broadcasterId: config.broadcasterId,
          status: 'unknown',
          checkedAt: new Date(0),
          ...failure,
        })
        .onConflictDoUpdate({ target: streamStates.broadcasterId, set: failure });
      return { status: 'unavailable' };
    }
  });
}
