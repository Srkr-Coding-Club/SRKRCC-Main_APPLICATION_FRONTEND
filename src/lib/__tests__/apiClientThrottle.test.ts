import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '../api-client';

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const settle = async (promise: Promise<unknown>, ms: number) => {
  const outcome = promise.then((v) => ({ ok: v }), (e) => ({ err: e }));
  await vi.advanceTimersByTimeAsync(ms);
  return outcome;
};

describe('a rate-limited (429) answer', () => {
  it('is retried once, quietly, for a read that only has to wait a moment', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(429, { detail: 'slow down', retry_after: 2 }, { 'retry-after': '2' }))
      .mockResolvedValueOnce(reply(200, { fine: true }));
    const result = await settle(fetchApi('/forms/'), 4000);
    expect(result).toEqual({ ok: { fine: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('is retried only once, then reported with how long to wait', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(reply(429, { detail: 'slow down', code: 'THROTTLED', retry_after: 3 }, { 'retry-after': '3' })));
    const result: any = await settle(fetchApi('/forms/'), 6000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.err.status).toBe(429);
    expect(result.err.retryAfter).toBe(3);
    expect(result.err.message).toBe('slow down');
  });

  it('is not retried when asked to wait a long time', async () => {
    fetchMock.mockResolvedValue(reply(429, { detail: 'slow down', retry_after: 40 }, { 'retry-after': '40' }));
    const result: any = await settle(fetchApi('/forms/'), 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.err.retryAfter).toBe(40);
  });

  it('is never retried for a write, so nothing is sent twice', async () => {
    fetchMock.mockResolvedValue(reply(429, { detail: 'slow down', retry_after: 1 }, { 'retry-after': '1' }));
    const result: any = await settle(fetchApi('/forms/submissions/', { method: 'POST', body: '{}' }), 3000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.err.status).toBe(429);
    expect(result.err.retryAfter).toBe(1);
  });

  it('copes with a 429 that has no wait information', async () => {
    fetchMock.mockResolvedValue(reply(429, { detail: 'slow down' }));
    const result: any = await settle(fetchApi('/forms/submissions/', { method: 'POST', body: '{}' }), 100);
    expect(result.err.status).toBe(429);
    expect(result.err.retryAfter).toBeUndefined();
  });
});
