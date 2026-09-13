import assert from 'node:assert/strict';
const base = process.env.SMOKE_URL || 'http://127.0.0.1:3001';
const target = new URL(base);
if (!['127.0.0.1', 'localhost'].includes(target.hostname))
  throw new Error('Use a local production preview.');
const checks = [
  ['/', 'GET', 200],
  ['/api/account', 'GET', 401],
  ['/api/admin', 'GET', 403],
  ['/api/admin/health', 'GET', 403],
  ['/api/auth/demo', 'POST', 404],
  ['/demo/player', 'GET', 404],
  ['/api/jobs/maintenance', 'POST', 401],
  ['/api/jobs/maintenance', 'GET', 401],
  ['/api/twitch/webhook', 'POST', 503],
];
for (const [route, method, expected] of checks) {
  const response = await fetch(new URL(route, base), { method, headers: { Origin: base } });
  assert.equal(response.status, expected, `${method} ${route}`);
  const body = await response.text();
  assert.ok(!body.includes('FINNERTY_TEST_CANARY_'), `Test secret exposed by ${route}`);
  if (route === '/')
    assert.ok(!body.includes('Lokale preview'), 'Production must not render demo controls.');
}
const stream = await (await fetch(new URL('/api/stream', base))).json();
assert.equal(stream.status, 'unknown');
assert.equal(stream.source, 'unconfigured');
console.log(
  '10 production smoke checks passed: no demo fallback, unauthorized actions denied, no canary in responses.',
);
