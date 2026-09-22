import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('responsive Frost Orbit routes without horizontal overflow', async ({ page }) => {
  await mkdir('docs/screenshots', { recursive: true });
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/', '/vault', '/account', '/stream', '/community']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}px`,
      ).toBe(true);
      if ((route === '/' || route === '/vault') && (width === 390 || width === 1440))
        await page.screenshot({
          path: `docs/screenshots/${route === '/' ? 'home' : 'vault'}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/vault');
  for (const game of ['Coinflip', 'Dice', 'Orbit Slots', 'Roulette']) {
    await page.getByRole('tab', { name: new RegExp(game) }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${game} at 390px`,
    ).toBe(true);
  }
});
test('the Vault plays one paced round at a time and ranks opted-in players', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Expected 401/429 responses are logged by the browser; anything else (e.g. React key warnings) fails.
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource'))
      errors.push(message.text());
  });
  const plays: number[] = [];
  page.on('response', (response) => {
    if (response.url().endsWith('/api/vault/play')) plays.push(response.status());
  });
  await page.goto('/vault');
  await expect(page.getByRole('button', { name: 'Gooi de munt' })).toBeDisabled();
  await page.locator('header').getByRole('button', { name: 'Demo-account' }).click();
  await expect(page.locator('.vault-wallet')).toContainText('80');

  // Hammering the button only ever sends one round; the button stays busy for the whole animation.
  const flip = page.locator('.play-button');
  await flip.click();
  await expect(flip).toBeDisabled();
  for (let i = 0; i < 8; i++) await flip.click({ force: true, timeout: 200 }).catch(() => {});
  await expect(page.locator('.game-result')).toContainText(/Gewonnen|Helaas/, { timeout: 5000 });
  await expect(flip).toBeEnabled();
  expect(plays).toEqual([200]);
  const [round] = (await (await page.request.get('/api/vault/rounds')).json()).rounds;
  await expect(page.locator('.vault-wallet strong')).toContainText(round.balanceAfter);

  // Scripts that bypass the UI are paced by the server as well.
  const burst = await page.evaluate(() =>
    Promise.all(
      Array.from({ length: 5 }, () =>
        fetch('/api/vault/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game: 'coinflip',
            bet: { stake: '10', side: 'tails' },
            key: crypto.randomUUID(),
          }),
        }).then((response) => response.status),
      ),
    ),
  );
  expect(burst.filter((status) => status === 200).length).toBeLessThanOrEqual(1);
  expect(burst.filter((status) => status === 429).length).toBeGreaterThanOrEqual(4);
  const forged = await page.request.post('/api/vault/play', {
    headers: { origin: 'https://evil.example' },
    data: { game: 'coinflip', bet: { stake: '10', side: 'heads' }, key: crypto.randomUUID() },
  });
  expect(forged.status()).toBe(403);

  await page.getByRole('button', { name: 'Toon mij in het leaderboard' }).click();
  await expect(page.locator('.leaderboard-list li.you')).toContainText('Demo Crew Member');
  await page.getByRole('tab', { name: 'Deze maand' }).click();
  await expect(page.locator('.leaderboard-viewer')).toContainText(/#\d+|Nog geen stijging/);

  await page.getByRole('tab', { name: /Roulette/ }).click();
  await page.locator('.board-spot', { hasText: 'Zwart' }).click();
  await expect(page.locator('.roulette')).toContainText('Totale inzet 10 VP');
  await page.goto('/account');
  await expect(page.locator('.ledger-row').first()).toContainText('The Vault · Coinflip');
  expect(errors).toEqual([]);
});
test('demo account persists, uses paginated ledger, protects writes and revokes logout', async ({
  page,
}) => {
  await page.goto('/account');
  await page.locator('header').getByRole('button', { name: 'Demo-account' }).click();
  await expect(page.getByRole('heading', { name: 'Demo Crew Member' })).toBeVisible();
  await expect(page.locator('.account-stats')).toContainText('80');
  const firstPage = await (await page.request.get('/api/account/ledger?page=1')).json();
  await page.getByRole('button', { name: 'Volgende transacties' }).click();
  await expect(page.locator('.pagination')).toContainText('Pagina 2');
  await expect(page.locator('.ledger-row')).toHaveCount(3);
  const secondPage = await (await page.request.get('/api/account/ledger?page=2')).json();
  expect(
    secondPage.entries.every(
      (entry: { id: string }) =>
        !firstPage.entries.some((first: { id: string }) => first.id === entry.id),
    ),
  ).toBe(true);
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Demo Crew Member' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.screenshot({ path: 'docs/screenshots/account-1440.png', fullPage: true });
  const forbidden = await page.request.post('/api/auth/demo', {
    headers: { origin: 'https://evil.example' },
  });
  expect(forbidden.status()).toBe(403);
  expect((await page.request.get('/api/admin')).status()).toBe(403);
  const accountResponse = await page.request.get('/api/account');
  expect(accountResponse.headers()['cache-control']).toContain('no-store');
  const sessionCookie = (await page.context().cookies()).find(
    (c) => c.name === 'finnerty_demo_session',
  )!;
  expect(sessionCookie.httpOnly).toBe(true);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Uitloggen' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'One crew. Your identity.' })).toBeVisible();
  expect((await page.request.get('/api/account')).status()).toBe(401);
  expect(
    (
      await page.request.get('/api/account', {
        headers: { cookie: `${sessionCookie.name}=${sessionCookie.value}` },
      })
    ).status(),
  ).toBe(401);
});
test('one iframe survives navigation, scroll, back, resize, dismissal and recovery', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.demo-tools summary').click();
  await page.getByLabel('Demo streamstatus').selectOption('live');
  const frame = page.frameLocator('[data-testid="demo-player-frame"]');
  await expect(frame.locator('body')).toHaveAttribute('data-instance', /.+/);
  const instance = await frame.locator('body').getAttribute('data-instance');
  await page.locator('.demo-tools summary').click();
  for (const route of ['/vault', '/account', '/stream']) {
    const selector =
      route === '/account' ? '.footer-links a[href="/account"]' : `header nav a[href="${route}"]`;
    await page.locator(selector).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByTestId('demo-player-frame')).toHaveCount(1);
    expect(await frame.locator('body').getAttribute('data-instance')).toBe(instance);
  }
  await page.goBack();
  expect(await frame.locator('body').getAttribute('data-instance')).toBe(instance);
  await page.evaluate(() => window.scrollTo(0, 300));
  expect(await frame.locator('body').getAttribute('data-instance')).toBe(instance);
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(page.locator('.live-bar')).toBeVisible();
  await expect(page.getByTestId('persistent-player')).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByTestId('persistent-player')).toBeVisible();
  expect(await frame.locator('body').getAttribute('data-instance')).toBe(instance);
  const bounds = await page.locator('.player-video').boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(400);
  expect(bounds!.height).toBeGreaterThanOrEqual(300);
  await page.getByRole('button', { name: 'Stream sluiten' }).click();
  await expect(page.getByTestId('persistent-player')).toBeHidden();
  await page.getByRole('button', { name: /Stream heropenen/ }).click();
  expect(await frame.locator('body').getAttribute('data-instance')).toBe(instance);
  await page.locator('.demo-tools summary').click();
  await page.getByLabel('Demo playerstatus').selectOption('blocked');
  await page.getByRole('button', { name: 'Start stream' }).click();
  await expect(page.getByRole('button', { name: 'Start stream' })).toHaveCount(0);
  await page.getByLabel('Demo playerstatus').selectOption('unavailable');
  await expect(page.locator('.player-recovery')).toBeVisible();
});
test('keyboard focus and reduced motion preference remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Naar de inhoud' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(
    await page.locator('.hero .orbit-art').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.getByRole('button', { name: 'Effecten beperken' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Effecten beperkt', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
