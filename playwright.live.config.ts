import { defineConfig, devices } from '@playwright/test';

/**
 * LIVE end-to-end run: the real Django backend (own throw-away database, mail written to files) and the real Next.js
 * site on port 3200, nothing mocked. Needs PostgreSQL and the backend's Python environment (see e2e-live/live.ts for
 * the paths and the LIVE_* overrides).
 *   pnpm test:e2e:live
 */
const SITE_PORT = 3200;

export default defineConfig({
  testDir: './e2e-live',
  testMatch: /.*\.live\.spec\.ts/,
  globalSetup: './e2e-live/global-setup.ts',
  globalTeardown: './e2e-live/global-teardown.ts',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  // LIVE_SLOWMO=600 pnpm test:e2e:live --headed  slows every step so a person can follow along; LIVE_VIDEO=1 also records each test.
  use: {
    baseURL: `http://localhost:${SITE_PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure',
    video: process.env.LIVE_VIDEO ? 'on' : 'off',
    launchOptions: { slowMo: Number(process.env.LIVE_SLOWMO) || 0 },
  },
  projects: [{ name: 'live-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next dev -p ${SITE_PORT}`,
    url: `http://localhost:${SITE_PORT}/forms`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      INTERNAL_API_BASE_URL: 'http://127.0.0.1:8001/api',
      NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:8001/api',
      CLIENT_IP_SHARED_SECRET: 'live-e2e-shared-secret',
      NEXT_DIST_DIR: '',
      UPLOAD_CONNECT_SRC: process.env.LIVE_STORAGE_URL || 'http://localhost:4566',
    },
  },
});
