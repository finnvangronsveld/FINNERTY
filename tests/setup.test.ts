import test from 'node:test';
import assert from 'node:assert/strict';
import { appModeIsLive, setupReport } from '../src/server/setup';

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
};

test('a complete production setup reports every feature ready', () => {
  assert.deepEqual(setupReport(complete), { login: 'ready', stream: 'ready', scheduler: 'ready' });
});

test('setup issues name the failing requirement without echoing any value', () => {
  const report = setupReport({
    ...complete,
    APP_MODE: 'production',
    AUTH_SECRET: 'a'.repeat(64),
    TWITCH_CLIENT_SECRET: '  ',
    TWITCH_BROADCASTER_ID: 'finnerty_',
    JOB_SECRET: 'short',
  });
  assert.deepEqual(report.login, [
    'APP_MODE_NOT_LIVE',
    'TWITCH_CLIENT_SECRET_MISSING',
    'AUTH_SECRET_IS_HEX_EXPECTED_BASE64',
  ]);
  assert.ok((report.stream as string[]).includes('TWITCH_BROADCASTER_ID_NOT_NUMERIC'));
  assert.deepEqual(report.scheduler, ['JOB_SECRET_MISSING_OR_SHORTER_THAN_32']);
  const text = JSON.stringify(report);
  for (const value of ['production', 'finnerty_', 'short', 'a'.repeat(64)])
    assert.ok(!text.includes(value), `report leaks ${value}`);
  assert.deepEqual(setupReport({ ...complete, AUTH_SECRET: 'too-short' }).login, [
    'AUTH_SECRET_NOT_32_BYTES_BASE64',
  ]);
});

test('APP_MODE tolerates pasted whitespace and capitals, nothing else', () => {
  assert.equal(appModeIsLive({ APP_MODE: ' Live\n' }), true);
  assert.equal(appModeIsLive({ APP_MODE: 'demo' }), false);
  assert.equal(appModeIsLive({}), false);
});
