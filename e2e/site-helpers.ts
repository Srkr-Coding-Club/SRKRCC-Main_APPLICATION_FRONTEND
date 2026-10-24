import type { Page, Route } from '@playwright/test';
import { user } from './helpers';

export interface Verification {
  mode: 'off' | 'banner' | 'features' | 'block';
  verified: boolean;
  verified_at: string | null;
  days_left: number | null;
  deadline: string | null;
  blocked: boolean;
  email_masked: string;
  pending_email_masked: string | null;
}

export const unverified = (over: Partial<Verification> = {}): Verification => ({
  mode: 'block', verified: false, verified_at: null, days_left: 5, deadline: '2026-11-01T00:00:00Z', blocked: false,
  email_masked: 'd**@example.org', pending_email_masked: null, ...over,
});
export const verifiedState = (over: Partial<Verification> = {}): Verification => ({
  mode: 'block', verified: true, verified_at: '2026-10-20T10:00:00Z', days_left: null, deadline: null, blocked: false,
  email_masked: 'd**@example.org', pending_email_masked: null, ...over,
});

export interface SiteCall { method: string; path: string; body: any }
export interface SiteOptions {
  /** What /auth/me/ says about verification. A function lets a test change its mind mid-way. */
  verification: Verification | (() => Verification);
  /** null = signed out */
  asUser?: object | null;
  /** Extra answers: return undefined to pass. */
  handlers?: Array<(call: SiteCall) => { status?: number; body: unknown } | undefined>;
}

export interface Site { calls: SiteCall[]; find: (method: string, path: string) => SiteCall[] }

/** A signed-in (or signed-out) visitor on the real pages, with the API answered by the test. */
export async function openSite(page: Page, path: string, options: SiteOptions): Promise<Site> {
  const calls: SiteCall[] = [];
  const who = options.asUser === undefined ? user : options.asUser;
  await page.addInitScript((u) => { if (u) localStorage.setItem('srkrcc_user', JSON.stringify(u)); }, who);
  if (who) {
    // /profile and /admin are guarded by the site's middleware, which wants the session cookies a real sign-in sets.
    await page.context().addCookies([
      { name: 'srkrcc_access_token', value: 'test', url: 'http://localhost:3100' },
      { name: 'srkrcc_user_role', value: 'NON_AFFILIATE', url: 'http://localhost:3100' },
    ]);
  }

  const reply = (route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers });

  await page.route('**/api/proxy/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const call: SiteCall = { method: request.method(), path: url.pathname.replace('/api/proxy', '') + url.search, body: request.postData() ? safe(request.postData()!) : null };
    calls.push(call);
    for (const handler of options.handlers ?? []) {
      const result = handler(call);
      if (result) return reply(route, result.body, result.status ?? 200);
    }
    if (call.path.startsWith('/auth/me')) {
      const verification = typeof options.verification === 'function' ? options.verification() : options.verification;
      return reply(route, { ...(who as object), email_verification: verification });
    }
    if (call.path.startsWith('/forms/demo/my-response')) return reply(route, { has_submitted: false, can_edit: true, response: null });
    if (call.path === '/forms/demo/availability/') return reply(route, {});
    if (call.path === '/forms/demo/draft/') return reply(route, call.method === 'PUT' ? { saved_at: 'now', dropped: [] } : { draft: null });
    return reply(route, call.method === 'GET' ? [] : {});
  });

  await page.goto(path);
  return { calls, find: (method, p) => calls.filter((c) => c.method === method && c.path.includes(p)) };
}

function safe(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}
