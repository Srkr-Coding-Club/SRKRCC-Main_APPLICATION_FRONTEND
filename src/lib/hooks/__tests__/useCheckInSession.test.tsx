import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessions = vi.fn();
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { checkIn: { sessions: (...a: unknown[]) => sessions(...a) } },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));

import { pickSession, useCheckInSession } from '../useCheckInSession';

const row = (id: number, over: Record<string, unknown> = {}) => ({ id, name: `S${id}`, is_main: id === 1, is_active: true, outside_schedule: false, ...over }) as any;

beforeEach(() => { window.localStorage.clear(); sessions.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('pickSession', () => {
  const list = [row(1), row(2), row(3, { is_active: false }), row(4, { outside_schedule: true })];

  it('keeps the current choice while it still takes scans', () => {
    expect(pickSession(list, 2, 1)).toBe(2);
  });

  it('falls back to the remembered session, then the main one', () => {
    expect(pickSession(list, 3, 2)).toBe(2);
    expect(pickSession(list, 3, 4)).toBe(1);
    expect(pickSession(list, null, null)).toBe(1);
  });

  it('uses the first usable session when the main one is off or gone', () => {
    expect(pickSession([row(1, { is_active: false }), row(2, { is_main: false })], null, null)).toBe(2);
  });

  it('is null when nothing can take scans', () => {
    expect(pickSession([row(1, { is_active: false })], null, null)).toBeNull();
    expect(pickSession([], null, null)).toBeNull();
  });
});

describe('useCheckInSession', () => {
  it('selects the main session by default', async () => {
    sessions.mockResolvedValue([row(1), row(2)]);
    const { result } = renderHook(() => useCheckInSession('demo'));
    await waitFor(() => expect(result.current.session?.id).toBe(1));
    expect(result.current.sessions).toHaveLength(2);
  });

  it('restores the session this phone used last', async () => {
    window.localStorage.setItem('hackathon-check-in-session:demo', '2');
    sessions.mockResolvedValue([row(1), row(2)]);
    const { result } = renderHook(() => useCheckInSession('demo'));
    await waitFor(() => expect(result.current.session?.id).toBe(2));
  });

  it('remembers a choice and survives storage that throws', async () => {
    sessions.mockResolvedValue([row(1), row(2)]);
    const { result } = renderHook(() => useCheckInSession('demo'));
    await waitFor(() => expect(result.current.session?.id).toBe(1));
    act(() => result.current.select(2));
    expect(result.current.session?.id).toBe(2);
    expect(window.localStorage.getItem('hackathon-check-in-session:demo')).toBe('2');

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    act(() => result.current.select(1));
    expect(result.current.session?.id).toBe(1);
    setItem.mockRestore();
  });

  it('moves to another session when the chosen one is switched off on refresh', async () => {
    sessions.mockResolvedValueOnce([row(1), row(2)]);
    const { result } = renderHook(() => useCheckInSession('demo'));
    await waitFor(() => expect(result.current.session?.id).toBe(1));
    act(() => result.current.select(2));
    sessions.mockResolvedValueOnce([row(1), row(2, { is_active: false })]);
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.session?.id).toBe(1));
  });

  it('reports a load error and recovers on refresh', async () => {
    sessions.mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderHook(() => useCheckInSession('demo'));
    await waitFor(() => expect(result.current.error).toBe('Server error'));
    expect(result.current.session).toBeNull();
    sessions.mockResolvedValueOnce([row(1)]);
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.session?.id).toBe(1));
    expect(result.current.error).toBe('');
  });

  it('refreshes every minute while mounted', async () => {
    vi.useFakeTimers();
    sessions.mockResolvedValue([row(1)]);
    const { unmount } = renderHook(() => useCheckInSession('demo'));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const first = sessions.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(sessions.mock.calls.length).toBe(first + 1);
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(sessions.mock.calls.length).toBe(first + 1);
  });
});
