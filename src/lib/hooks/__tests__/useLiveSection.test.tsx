import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isForbidden, useLiveSection } from '../useLiveSection';

afterEach(() => { vi.useRealTimers(); });

describe('useLiveSection', () => {
  it('loads, then reloads on demand', async () => {
    const load = vi.fn().mockResolvedValueOnce('one').mockResolvedValueOnce('two');
    const { result } = renderHook(() => useLiveSection(load));
    await waitFor(() => expect(result.current.data).toBe('one'));
    expect(result.current.updatedAt).not.toBeNull();
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('two'));
  });

  it('keeps the old data when a refresh fails, and reports the failure', async () => {
    const load = vi.fn().mockResolvedValueOnce('one').mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useLiveSection(load));
    await waitFor(() => expect(result.current.data).toBe('one'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error?.message).toBe('down'));
    expect(result.current.data).toBe('one');
  });

  it('makes no request while disabled', () => {
    const load = vi.fn();
    const { result } = renderHook(() => useLiveSection(load, { enabled: false }));
    expect(load).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('uses only the newest answer when a slow one arrives late', async () => {
    let resolveFirst: (value: string) => void = () => {};
    const load = vi.fn().mockImplementationOnce(() => new Promise<string>((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce('new');
    const { result } = renderHook(() => useLiveSection(load));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('new'));
    await act(async () => { resolveFirst('stale'); });
    expect(result.current.data).toBe('new');
  });

  it('polls only while the page is visible', async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockResolvedValue('x');
    renderHook(() => useLiveSection(load, { interval: 1000 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    const visibleCalls = load.mock.calls.length;
    expect(visibleCalls).toBeGreaterThanOrEqual(3);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(load.mock.calls.length).toBe(visibleCalls);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
});

describe('isForbidden', () => {
  it('recognises a 403 only', () => {
    expect(isForbidden(Object.assign(new Error('no'), { status: 403 }))).toBe(true);
    expect(isForbidden(Object.assign(new Error('no'), { status: 500 }))).toBe(false);
    expect(isForbidden(null)).toBe(false);
  });
});
