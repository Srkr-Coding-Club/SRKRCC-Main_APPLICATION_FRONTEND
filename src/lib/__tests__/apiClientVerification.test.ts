import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redirectToLogin = vi.fn();
vi.mock('../auth', () => ({ redirectToLogin: () => redirectToLogin(), refreshAccessToken: vi.fn(async () => false) }));

import { fetchApi } from '../api-client';
import { VERIFICATION_REQUIRED_CODE, VERIFICATION_REQUIRED_EVENT } from '../emailVerification';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fetchMock = vi.fn();
const seen: any[] = [];
const listener = (e: Event) => seen.push((e as CustomEvent).detail);

beforeEach(() => {
  fetchMock.mockReset();
  seen.length = 0;
  redirectToLogin.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  window.addEventListener(VERIFICATION_REQUIRED_EVENT, listener);
});
afterEach(() => { window.removeEventListener(VERIFICATION_REQUIRED_EVENT, listener); vi.unstubAllGlobals(); });

describe('a feature refused because the email is not verified', () => {
  it('tells the page once, keeps the person signed in, and still throws for the caller', async () => {
    const body = { detail: 'Verify your email address to use this feature.', code: VERIFICATION_REQUIRED_CODE, reason: 'feature', blocked: false, days_left: 4 };
    fetchMock.mockResolvedValue(reply(403, body));
    await expect(fetchApi('/forms/submissions/', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 403, code: VERIFICATION_REQUIRED_CODE });
    expect(seen).toEqual([body]);
    expect(redirectToLogin).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does the same for a blocked account', async () => {
    fetchMock.mockResolvedValue(reply(403, { detail: 'x', code: VERIFICATION_REQUIRED_CODE, reason: 'deadline', blocked: true }));
    await expect(fetchApi('/forms/x/draft/')).rejects.toMatchObject({ code: VERIFICATION_REQUIRED_CODE });
    expect(seen[0].blocked).toBe(true);
  });

  it('is not triggered by other 403s or by other codes', async () => {
    fetchMock.mockResolvedValueOnce(reply(403, { detail: 'You do not have permission.' }));
    fetchMock.mockResolvedValueOnce(reply(403, { detail: 'x', code: 'SOMETHING_ELSE' }));
    fetchMock.mockResolvedValueOnce(reply(400, { detail: 'x', code: VERIFICATION_REQUIRED_CODE }));
    for (let i = 0; i < 3; i++) await expect(fetchApi('/forms/')).rejects.toBeDefined();
    expect(seen).toEqual([]);
  });

  it('does not break a 403 whose body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Forbidden', { status: 403 }));
    await expect(fetchApi('/forms/')).rejects.toMatchObject({ status: 403 });
    expect(seen).toEqual([]);
  });
});
