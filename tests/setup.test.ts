import test from 'node:test';
import assert from 'node:assert/strict';
import { appModeIsLive, setupReport } from '../src/server/setup';
import { authKey, decrypt, encrypt } from '../src/server/auth/crypto';

const complete = {
  APP_MODE: 'live',
  APP_URL: 'https://finnerty.vercel.app',
  DATABASE_URL: 'postgresql://example',
  TWITCH_CLIENT_ID: 'client',
  TWITCH_CLIENT_SECRET: 'secret',
  AUTH_SECRET: Buffer.alloc(32, 7).toString('base64'),
  TWITCH_BROADCASTER_ID: '442232328',
  TWITCH_CHANNEL_LOGIN: 'finnerty_',
  JOB_SECRET: 'x'.repeat(44),
  STREAMELEMENTS_JWT: 'jwt',
  STREAMELEMENTS_CHANNEL_ID: '5ee67bb6e5d09373a3cc3e5f',
};

test('a complete production setup reports every feature ready', () => {
  assert.deepEqual(setupReport(complete), {
    login: 'ready',
    stream: 'ready',
    watchtime: 'ready',
    scheduler: 'ready',
  });
  assert.deepEqual(setupReport({ ...complete, STREAMELEMENTS_CHANNEL_ID: 'finnerty_' }).watchtime, [
    'STREAMELEMENTS_CHANNEL_ID_INVALID',
  ]);
});

test('setup issues name the failing requirement without echoing any value', () => {
  const report = setupReport({
    ...complete,
    APP_MODE: 'production',
    AUTH_SECRET: 'too-short',
    TWITCH_CLIENT_SECRET: '  ',
    TWITCH_BROADCASTER_ID: 'finnerty_',
    JOB_SECRET: 'short',
  });
  assert.deepEqual(report.login, [
    'APP_MODE_NOT_LIVE',
    'TWITCH_CLIENT_SECRET_MISSING',
    'AUTH_SECRET_NOT_32_BYTES',
  ]);
  assert.ok((report.stream as string[]).includes('TWITCH_BROADCASTER_ID_NOT_NUMERIC'));
  assert.deepEqual(report.scheduler, ['JOB_SECRET_MISSING_OR_SHORTER_THAN_32']);
  const text = JSON.stringify(report);
  for (const value of ['production', 'finnerty_', 'short', 'too-short'])
    assert.ok(!text.includes(value), `report leaks ${value}`);
});

test('AUTH_SECRET works as 32 bytes in base64 or hex, and encrypts with either', () => {
  const bytes = Buffer.alloc(32, 9);
  for (const secret of [
    bytes.toString('base64'),
    bytes.toString('hex'),
    ` ${bytes.toString('hex')}\n`,
  ]) {
    assert.deepEqual(authKey(secret), bytes);
    assert.equal(setupReport({ ...complete, AUTH_SECRET: secret }).login, 'ready');
    assert.equal(decrypt(encrypt('pkce', secret, 'flow:x'), secret, 'flow:x'), 'pkce');
  }
  assert.equal(authKey('ab'.repeat(16)), null);
  assert.equal(authKey(Buffer.alloc(16).toString('base64')), null);
});

test('APP_MODE tolerates pasted whitespace and capitals, nothing else', () => {
  assert.equal(appModeIsLive({ APP_MODE: ' Live\n' }), true);
  assert.equal(appModeIsLive({ APP_MODE: 'demo' }), false);
  assert.equal(appModeIsLive({}), false);
});
