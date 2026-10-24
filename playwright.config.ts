import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests. The backend is not needed: each test answers the site's own `/api/proxy/*` calls itself
 * (see e2e/helpers.ts), so these run against `next dev` alone.
 *   pnpm test:e2e                         everything (desktop Chromium, an iPhone in WebKit, an Android phone, Firefox)
 *   pnpm test:e2e --project=iphone        one device
 *   PW_SLOWMO=600 pnpm test:e2e --headed --workers=1   watch it work
 * First run: `pnpm exec playwright install chromium webkit firefox`.
 */
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 25_000 },
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', launchOptions: { slowMo: Number(process.env.PW_SLOWMO || 0) } },
  projects: [
    // Desktop Chromium runs the whole suite except the device-specific files.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /devices\.spec\.ts/ },
    // Real touch and phone-sized screens: an iPhone in Safari's engine (WebKit) and an Android phone in Chromium.
    { name: 'iphone', use: { ...devices['iPhone 13'] }, testMatch: /devices\.spec\.ts/ },
    { name: 'android', use: { ...devices['Pixel 7'] }, testMatch: /devices\.spec\.ts/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /devices\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/forms`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
