import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt, safeReturnPath } from '../src/server/auth/crypto';
import { saveTwitchIdentity, validateAuthorization } from '../src/server/auth/identity';
import {
  authAccounts,
  externalIdentities,
  sessions,
  streamStates,
  wallets,
} from '../src/server/db/schema';
import {
  RevokedAuthorization,
  twitchOAuth,
  type TwitchOAuthAdapter,
} from '../src/server/integrations/twitch-oauth';
import { validateEventSignature } from '../src/server/integrations/eventsub';
import { refreshStream } from '../src/server/integrations/twitch-stream';
const secret = randomBytes(32).toString('base64');
const tokens = {
  accessToken: 'test-access',
  refreshToken: 'test-refresh',
  expiresAt: Date.now() + 3600_000,
};
const profile = {
  id: '123',
  login: 'crew',
  display_name: 'The Crew',
  profile_image_url: 'https://static-cdn.jtvnw.net/example.png',
};
async function fixture() {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  return { client, db };
}

test('encrypted tokens reject tampering, incorrect key and cross-account reuse', () => {
  const sealed = encrypt('server-token', secret, 'account:1');
  assert.equal(decrypt(sealed, secret, 'account:1'), 'server-token');
  assert.ok(!sealed.includes('server-token'));
  assert.throws(() => decrypt(sealed, secret, 'account:2'));
  assert.throws(() => decrypt(sealed, randomBytes(32).toString('base64'), 'account:1'));
  assert.throws(() => decrypt(`x${sealed}`, secret, 'account:1'));
  for (const route of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/admin',
    '/account?next=//evil',
    '/%2f%2fevil',
  ])
    assert.equal(safeReturnPath(route), '/account');
  assert.equal(safeReturnPath('/vault'), '/vault');
});
test('OAuth rejects wrong/missing state and provider denial before exchanging a code', async () => {
  let requests = 0;
  const adapter = twitchOAuth(
    {
      clientId: 'client',
      clientSecret: 'secret',
      callback: 'https://example.com/api/auth/callback/twitch',
    },
    async () => {
      requests++;
      return Response.json({});
    },
  );
  await assert.rejects(
    adapter.exchange(new URLSearchParams({ code: 'code', state: 'wrong' }), 'expected', 'verifier'),
  );
  await assert.rejects(
    adapter.exchange(new URLSearchParams({ code: 'code' }), 'expected', 'verifier'),
  );
  await assert.rejects(
    adapter.exchange(
      new URLSearchParams({ error: 'access_denied', state: 'expected' }),
      'expected',
      'verifier',
    ),
  );
  assert.equal(requests, 0);
});
test('OAuth exchange validates token shape and stable user identity with mocked official responses', async () => {
  const requests: string[] = [];
  const adapter = twitchOAuth(
    {
      clientId: 'client',
      clientSecret: 'secret',
      callback: 'https://example.com/api/auth/callback/twitch',
    },
    async (url, init) => {
      requests.push(String(url));
      if (String(url).endsWith('/token')) {
        assert.equal(init?.method, 'POST');
        assert.ok(String(init?.body).includes('client_secret=secret'));
        return Response.json({
          access_token: 'access',
          refresh_token: 'refresh',
          token_type: 'bearer',
          expires_in: 3600,
        });
      }
      if (String(url).endsWith('/validate'))
        return Response.json({ client_id: 'client', user_id: '123', expires_in: 3600 });
      return Response.json({ data: [profile] });
    },
  );
  const result = await adapter.exchange(
    new URLSearchParams({ code: 'code', state: 'expected' }),
    'expected',
    'x'.repeat(43),
  );
  assert.equal(result.accessToken, 'access');
  assert.equal((await adapter.validate(result.accessToken)).userId, '123');
  assert.equal((await adapter.profile(result.accessToken)).login, 'crew');
  assert.equal(requests.length, 3);
});
test('concurrent first logins make one account; name changes preserve wallet and pause mapping', async () => {
  const f = await fixture();
  try {
    const ids = await Promise.all(
      Array.from({ length: 4 }, () => saveTwitchIdentity(f.db, profile, tokens, secret)),
    );
    assert.equal(new Set(ids).size, 1);
    const id = ids[0];
    await f.db
      .update(wallets)
      .set({ balance: 50n, totalEarned: 50n })
      .where(eq(wallets.userId, id));
    await f.db
      .insert(externalIdentities)
      .values({
        userId: id,
        provider: 'streamelements',
        channelId: 'channel',
        providerKey: 'verified-fixture',
        status: 'verified',
        verifiedTwitchId: '123',
      });
    assert.equal(
      await saveTwitchIdentity(
        f.db,
        { ...profile, login: 'renamed', display_name: 'Renamed' },
        tokens,
        secret,
      ),
      id,
    );
    assert.equal((await f.db.select().from(wallets))[0].balance, 50n);
    assert.equal((await f.db.select().from(externalIdentities))[0].status, 'name_changed');
    assert.ok(
      !(await f.db.select().from(authAccounts))[0].encryptedTokens!.includes('test-access'),
    );
  } finally {
    await f.client.close();
  }
});
test('refresh is serialized, validated hourly; revoked consent removes sessions', async () => {
  const f = await fixture();
  try {
    const id = await saveTwitchIdentity(f.db, profile, { ...tokens, expiresAt: 1 }, secret);
    await f.db.update(authAccounts).set({ validatedAt: new Date(0) });
    let refreshes = 0;
    const adapter: TwitchOAuthAdapter = {
      exchange: async () => tokens,
      profile: async () => profile,
      refresh: async () => {
        refreshes++;
        return tokens;
      },
      validate: async () => ({ userId: '123', expiresIn: 3600 }),
    };
    await Promise.all([
      validateAuthorization(f.db, id, adapter, secret, new Date(0)),
      validateAuthorization(f.db, id, adapter, secret, new Date(0)),
    ]);
    assert.equal(refreshes, 1);
    await f.db
      .insert(sessions)
      .values({ userId: id, tokenHash: 'test-session', expiresAt: new Date(Date.now() + 60000) });
    await f.db.update(authAccounts).set({ validatedAt: new Date(0) });
    const revoked = {
      ...adapter,
      validate: async () => {
        throw new RevokedAuthorization();
      },
      refresh: async () => {
        throw new RevokedAuthorization();
      },
    };
    assert.equal(await validateAuthorization(f.db, id, revoked, secret, new Date(0)), false);
    assert.equal((await f.db.select().from(sessions)).length, 0);
    assert.equal((await f.db.select().from(authAccounts))[0].authorizationStatus, 'revoked');
  } finally {
    await f.client.close();
  }
});
test('EventSub requires exact raw-body signature, fresh timestamps and valid secret', () => {
  const raw = '{"event":{"broadcaster_user_id":"123"}}';
  const id = 'event-id';
  const timestamp = new Date().toISOString();
  const key = 'a'.repeat(32);
  const signature =
    'sha256=' +
    createHmac('sha256', key)
      .update(id + timestamp + raw)
      .digest('hex');
  const headers = new Headers({
    'twitch-eventsub-message-id': id,
    'twitch-eventsub-message-timestamp': timestamp,
    'twitch-eventsub-message-signature': signature,
  });
  assert.equal(validateEventSignature(headers, raw, key), true);
  assert.equal(validateEventSignature(headers, `${raw} `, key), false);
  assert.equal(validateEventSignature(headers, raw, key, Date.now() + 660_000), false);
  assert.equal(validateEventSignature(headers, raw, 'wrong'), false);
});
test('shared stream cache avoids visitor polls and retains confirmed live state on failure', async () => {
  const f = await fixture();
  try {
    const config = {
      clientId: 'client',
      clientSecret: 'secret',
      broadcasterId: '123',
      channelLogin: 'crew',
      secret,
    };
    let calls = 0;
    const request: typeof fetch = async (url) => {
      calls++;
      return String(url).includes('/token')
        ? Response.json({ access_token: 'app-token', expires_in: 3600 })
        : Response.json({
            data: [
              {
                id: 'stream-1',
                user_id: '123',
                user_login: 'crew',
                title: 'Stream',
                game_name: 'Just Chatting',
                started_at: '2026-09-13T10:00:00Z',
                type: 'live',
              },
            ],
          });
    };
    assert.equal((await refreshStream(f.db, config, request)).status, 'live');
    assert.equal((await refreshStream(f.db, config, request)).status, 'cached');
    assert.equal(calls, 2);
    await f.db.update(streamStates).set({ nextCheckAt: new Date(0) });
    assert.equal(
      (await refreshStream(f.db, config, async () => new Response(null, { status: 503 }))).status,
      'unavailable',
    );
    const [state] = await f.db.select().from(streamStates);
    assert.equal(state.status, 'live');
    assert.equal(state.failures, 1);
    assert.equal(state.errorCode, 'TWITCH_REFRESH_FAILED');
  } finally {
    await f.client.close();
  }
});
