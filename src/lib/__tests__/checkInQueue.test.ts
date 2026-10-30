import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dequeueScan, enqueueScan, isNetworkFailure, loadQueue } from '../checkInQueue';

beforeEach(() => window.localStorage.clear());

describe('checkInQueue', () => {
  it('keeps scans per hackathon, oldest first, without duplicates', () => {
    enqueueScan('a', 'code-1', undefined, '2026-01-01T09:00:00Z');
    enqueueScan('a', 'code-2', undefined, '2026-01-01T09:01:00Z');
    enqueueScan('a', 'code-1', undefined, '2026-01-01T09:05:00Z');
    enqueueScan('b', 'code-9');
    expect(loadQueue('a').map((item) => item.code)).toEqual(['code-1', 'code-2']);
    expect(loadQueue('a')[0].scannedAt).toBe('2026-01-01T09:00:00Z');
    expect(loadQueue('b')).toHaveLength(1);
  });

  it('keeps the same code once per session, because a person checks in once to each', () => {
    enqueueScan('a', 'code-1', 5, '2026-01-01T09:00:00Z');
    enqueueScan('a', 'code-1', 6, '2026-01-01T09:01:00Z');
    enqueueScan('a', 'code-1', 5, '2026-01-01T09:02:00Z');
    expect(loadQueue('a').map((item) => item.session)).toEqual([5, 6]);
  });

  it('removes only the scan of the session that was sent', () => {
    enqueueScan('a', 'code-1', 5);
    enqueueScan('a', 'code-1', 6);
    expect(dequeueScan('a', 'code-1', 5).map((item) => item.session)).toEqual([6]);
  });

  it('treats a scan saved before sessions existed as the main session', () => {
    window.localStorage.setItem('hackathon-check-in-queue:a', JSON.stringify([{ code: 'old', scannedAt: 'x' }]));
    expect(enqueueScan('a', 'old')).toHaveLength(1);
    expect(dequeueScan('a', 'old')).toEqual([]);
  });

  it('removes a scan once it is sent and clears the key when empty', () => {
    enqueueScan('a', 'code-1');
    expect(dequeueScan('a', 'code-1')).toEqual([]);
    expect(window.localStorage.getItem('hackathon-check-in-queue:a')).toBeNull();
  });

  it('ignores corrupt storage', () => {
    window.localStorage.setItem('hackathon-check-in-queue:a', '{oops');
    expect(loadQueue('a')).toEqual([]);
    window.localStorage.setItem('hackathon-check-in-queue:a', JSON.stringify([{ code: 1 }, { code: 'ok', scannedAt: 'x' }]));
    expect(loadQueue('a')).toEqual([{ code: 'ok', scannedAt: 'x' }]);
  });

  it('treats an error with no HTTP status as a network failure', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFailure(Object.assign(new Error('bad'), { status: 400 }))).toBe(false);
    expect(isNetworkFailure(null)).toBe(true);
  });

  it('keeps a scan for retry on temporary server answers but not on real refusals', () => {
    for (const status of [429, 502, 503, 504]) expect(isNetworkFailure(Object.assign(new Error('x'), { status }))).toBe(true);
    for (const status of [400, 401, 403, 404, 409]) expect(isNetworkFailure(Object.assign(new Error('x'), { status }))).toBe(false);
  });

  it('survives storage that throws or is full', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => enqueueScan('a', 'code-1')).not.toThrow();
    setItem.mockRestore();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadQueue('a')).toEqual([]);
    getItem.mockRestore();
  });

  it('ignores a stored value that is not a list', () => {
    window.localStorage.setItem('hackathon-check-in-queue:a', JSON.stringify({ code: 'x' }));
    expect(loadQueue('a')).toEqual([]);
  });
});
