import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROME_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
      : {},
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
