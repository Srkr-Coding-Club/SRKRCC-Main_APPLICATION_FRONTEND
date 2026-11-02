import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionButton } from '../ActionButton';
import { SlowNotice } from '../SlowNotice';
import { CardGridSkeleton, TableRowsSkeleton } from '../Skeleton';

afterEach(cleanup);
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

describe('SlowNotice', () => {
  beforeEach(() => { vi.useFakeTimers(); refresh.mockClear(); });
  afterEach(() => vi.useRealTimers());

  it('says nothing for the first seconds, then explains, then offers Retry', () => {
    render(<SlowNotice />);
    expect(screen.queryByText(/Still loading/)).toBeNull();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Still loading…')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText(/server is waking up/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    act(() => { vi.advanceTimersByTime(40000); });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('calls a custom retry instead of refreshing the route', () => {
    const retry = vi.fn();
    render(<SlowNotice onRetry={retry} />);
    act(() => { vi.advanceTimersByTime(46000); });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('ActionButton', () => {
  it('is disabled and busy while pending, and keeps its label', () => {
    render(<ActionButton pending>Save changes</ActionButton>);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Save changes')).toBeTruthy();
  });

  it('shows the success label and then tells its owner to clear it', () => {
    vi.useFakeTimers();
    const shown = vi.fn();
    render(<ActionButton success successLabel="Saved" onSuccessShown={shown}>Save changes</ActionButton>);
    expect(screen.getByText('Saved')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1200); });
    expect(shown).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('skeletons', () => {
  it('render the asked-for number of placeholders and are hidden from assistive technology', () => {
    const { container } = render(<><CardGridSkeleton count={2} /><TableRowsSkeleton rows={3} columns={2} /></>);
    expect(container.querySelectorAll('[aria-hidden="true"].skeleton').length).toBeGreaterThan(8);
    expect(container.querySelectorAll('.divide-y > div').length).toBe(3);
  });
});

describe('route progress helpers', () => {
  it('start the line before navigating, for push and replace', async () => {
    const { pushWithProgress, replaceWithProgress, ROUTE_PROGRESS_START } = await import('@/lib/routeProgress');
    const started = vi.fn();
    window.addEventListener(ROUTE_PROGRESS_START, started);
    const router = { push: vi.fn(), replace: vi.fn() } as never;
    pushWithProgress(router, '/events/x');
    replaceWithProgress(router, '/login', { scroll: false });
    window.removeEventListener(ROUTE_PROGRESS_START, started);
    expect(started).toHaveBeenCalledTimes(2);
    expect((router as { push: ReturnType<typeof vi.fn> }).push).toHaveBeenCalledWith('/events/x');
    expect((router as { replace: ReturnType<typeof vi.fn> }).replace).toHaveBeenCalledWith('/login', { scroll: false });
  });
});
