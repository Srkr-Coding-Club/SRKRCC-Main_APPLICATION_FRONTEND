import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from '@playwright/test';

/**
 * The live run: the real Django backend (its own throw-away database, mail written to files) and the real Next.js site,
 * talking to each other. Everything here is plumbing; the scenarios are in *.live.spec.ts.
 */
export const BACKEND_URL = 'http://127.0.0.1:8001';
export const SITE_URL = 'http://localhost:3200';

const root = resolve(__dirname, '..');
export const backendDir = process.env.LIVE_BACKEND_DIR || resolve(root, '..', 'SRKRCC-Main_APPLICATION_BACKEND');
export const python = process.env.LIVE_PYTHON || join(backendDir, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
export const stateDir = join(root, 'test-results', 'live');
export const mailDir = join(stateDir, 'mail');
const envFile = join(stateDir, 'database.json');

export function liveEnv(): NodeJS.ProcessEnv {
  const database = existsSync(envFile) ? JSON.parse(readFileSync(envFile, 'utf-8')) : {};
  return {
    ...process.env,
    ...database,
    DEBUG: 'True',
    DJANGO_SETTINGS_MODULE: 'live_e2e_settings',
    PYTHONPATH: [join(__dirname, 'django'), backendDir].join(process.platform === 'win32' ? ';' : ':'),
    LIVE_E2E_MAIL_DIR: mailDir,
    EMAIL_VERIFICATION_MODE: 'block',
    EMAIL_VERIFY_GRACE_DAYS: '7',
    FRONTEND_URL: SITE_URL,
    CLIENT_IP_SHARED_SECRET: 'live-e2e-shared-secret',
    SENTRY_DSN: '',
    PYTHONIOENCODING: 'utf-8',
  };
}

export const envFilePath = envFile;

/** Run one helper command against the live backend's database and return what it printed. */
export function helper<T = any>(...args: string[]): T {
  const output = execFileSync(python, [join(__dirname, 'django', 'helper.py'), ...args], { cwd: backendDir, env: liveEnv(), encoding: 'utf-8' });
  const last = output.trim().split('\n').filter(Boolean).pop() || 'null';
  return JSON.parse(last) as T;
}

export const PASSWORD = 'Live!Pass123';

export interface Mail { to: string[]; subject: string; verify: string | null; dispute: string | null; text: string }
export const mailbox = (): Mail[] => helper<Mail[]>('mailbox');
export const mailTo = (address: string): Mail[] => mailbox().filter((m) => m.to.some((t) => t.toLowerCase() === address.toLowerCase()));

/** A link from an email, opened on this site (the backend wrote its own FRONTEND_URL, which is this site). */
export const pathOf = (url: string): string => {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
};

export const uniqueEmail = (name: string) => `${name}.${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@example.org`;

/** Sign in through the real login page. */
export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByPlaceholder('you@srkr.ac.in').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}
