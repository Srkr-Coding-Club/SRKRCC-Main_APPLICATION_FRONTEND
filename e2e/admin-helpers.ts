import type { BrowserContext, Page, Route } from '@playwright/test';
import { adminUser } from './helpers';

export interface AdminCall { method: string; path: string; body: any }
export type Handler = (call: AdminCall, route: Route) => unknown | Promise<unknown>;

export interface AdminBackend {
  calls: AdminCall[];
  /** Calls with this method whose path matches. */
  find: (method: string, path: RegExp | string) => AdminCall[];
}

/**
 * Signs in an administrator and answers the admin pages' API calls. `handlers` are tried in order for each call: return
 * `undefined` to pass, a value to answer 200 with it, or `{ __status, ...body }` for another status. Anything nobody
 * answers gets an empty list, which is what most admin screens expect for "nothing here yet".
 */
export async function openAdmin(page: Page, context: BrowserContext, path: string, handlers: Record<string, Handler> | Handler[] = []): Promise<AdminBackend> {
  const calls: AdminCall[] = [];
  await context.addCookies([
    { name: 'srkrcc_access_token', value: 'test', url: 'http://localhost:3100' },
    { name: 'srkrcc_user_role', value: 'ADMIN', url: 'http://localhost:3100' },
  ]);
  await page.addInitScript((u) => localStorage.setItem('srkrcc_user', JSON.stringify(u)), adminUser);

  const list = Array.isArray(handlers) ? handlers : Object.entries(handlers).map(([key, fn]): Handler => {
    const [method, ...rest] = key.split(' ');
    const pattern = new RegExp(rest.join(' '));
    return (call, route) => (call.method === method && pattern.test(call.path) ? fn(call, route) : undefined);
  });

  await page.route('**/api/proxy/**', async (route) => {
    const request = route.request();
    const call: AdminCall = {
      method: request.method(),
      path: new URL(request.url()).pathname.replace('/api/proxy', '') + new URL(request.url()).search,
      body: request.postData() ? safeJson(request.postData()!) : null,
    };
    calls.push(call);
    for (const handler of list) {
      const result = await handler(call, route);
      if (result === undefined) continue;
      const { __status, ...rest } = (result ?? {}) as { __status?: number };
      const body = __status !== undefined ? rest : result;
      return route.fulfill({ status: __status ?? 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    if (call.path.startsWith('/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(call.method === 'GET' ? [] : {}) });
  });

  await page.goto(path);
  return {
    calls,
    find: (method, matcher) => calls.filter((c) => c.method === method && (typeof matcher === 'string' ? c.path.includes(matcher) : matcher.test(c.path))),
  };
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}

export const savedForm = (over: Record<string, unknown> = {}) => ({
  id: 55, title: 'Hack Night', slug: 'demo', description: '', status: 'DRAFT', version: 3, category: 'General',
  allow_multiple_responses: false, allow_response_editing: true, enable_prefill: false, response_count: 0,
  language: 'en', confirmation_message: '', redirect_url: '', redirect_delay_seconds: 5, captcha_enabled: false,
  fields: [
    { id: 11, label: 'Full name', type: 'TEXT', is_required: true, order: 1, options: [], validation_rules: {}, conditional_logic: {} },
    { id: 12, label: 'Track', type: 'RADIO', is_required: false, order: 2, options: ['AI', 'Web'], validation_rules: {}, conditional_logic: {} },
  ],
  ...over,
});
