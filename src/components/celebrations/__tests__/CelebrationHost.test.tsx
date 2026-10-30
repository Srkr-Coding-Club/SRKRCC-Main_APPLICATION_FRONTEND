import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ pending: vi.fn(), seen: vi.fn(), setEnabled: vi.fn(), settings: vi.fn() }));
const burst = vi.hoisted(() => vi.fn(() => () => undefined));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const auth = vi.hoisted(() => ({ signedIn: true }));
const route = vi.hoisted(() => ({ path: '/' }));

vi.mock('@/lib/api/celebrations', () => ({ celebrationsApi: api }));
vi.mock('@/lib/celebrate', async (original) => ({ ...(await original<typeof import('@/lib/celebrate')>()), burst }));
vi.mock('@/lib/auth', () => ({ isAuthenticated: () => auth.signedIn }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('next/navigation', () => ({ usePathname: () => route.path }));
// Animation is not what these tests are about: a card appears and leaves at once, so nothing waits on a real animation frame.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
  motion: { div: ({ initial, animate, exit, transition, ...rest }: any) => <div {...rest} /> },
}));
vi.mock('next/link', () => ({ default: ({ href, children, onClick, ...rest }: any) => <a href={href} onClick={onClick} {...rest}>{children}</a> }));

import { CelebrationHost } from '../CelebrationHost';
import { requestCelebrationCheck } from '@/lib/hooks/useCelebrations';

const card = (over: Record<string, unknown> = {}) => ({
  id: 1, kind: 'hackathon.team_registered', size: 'BIG', title: "You're in!", message: 'Alpha is registered for HackOverflow.',
  link_url: '/hackathons/demo/dashboard', payload: {}, created_at: '2026-10-30T04:00:00Z', ...over,
});

const mount = async () => {
  render(<CelebrationHost />);
  await act(async () => { await vi.advanceTimersByTimeAsync(900); });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  Object.values(api).forEach((fn) => fn.mockReset());
  burst.mockClear().mockImplementation(() => () => undefined);
  toast.success.mockReset();
  toast.error.mockReset();
  auth.signedIn = true;
  route.path = '/';
  api.pending.mockResolvedValue({ enabled: true, results: [] });
  api.seen.mockResolvedValue({ marked: 1 });
  api.setEnabled.mockResolvedValue({ enabled: false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('CelebrationHost', () => {
  it('shows nothing and asks for nothing when nobody is signed in', async () => {
    auth.signedIn = false;
    await mount();
    expect(api.pending).not.toHaveBeenCalled();
    expect(screen.queryByText("You're in!")).toBeNull();
  });

  it('shows a waiting celebration with its words, a link and confetti of its size', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card()] });
    await mount();
    expect(screen.getByText("You're in!")).toBeTruthy();
    expect(screen.getByText('Alpha is registered for HackOverflow.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Take me there' }).getAttribute('href')).toBe('/hackathons/demo/dashboard');
    expect(burst).toHaveBeenCalledWith('BIG');
    expect(document.querySelector('[data-celebration="BIG"]')).toBeTruthy();
  });

  it('marks it seen the moment it is shown, once, and not again on later checks', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card()] });
    await mount();
    expect(api.seen).toHaveBeenCalledTimes(1);
    expect(api.seen).toHaveBeenCalledWith([1]);
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });     // it closed by itself, and the next poll still lists it (the mark may be slow)
    expect(api.pending.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(api.seen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("You're in!")).toBeNull();                      // not shown a second time
  });

  it('closes on the button, on Escape and by itself after a while', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card({ id: 1 }), card({ id: 2, title: 'Second', size: 'SMALL' }), card({ id: 3, title: 'Third', size: 'SMALL' })] });
    await mount();
    expect(screen.getByText("You're in!")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });       // the old card leaves before the next arrives
    expect(screen.getByText('Second')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByText('Third')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(7000); });       // small ones stay 5 seconds
    expect(screen.queryByText('Third')).toBeNull();
  });

  it('shows them one at a time, the order the server gave, and says how many are waiting', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card({ id: 1, title: 'First' }), card({ id: 2, title: 'Second', size: 'MEDIUM' })] });
    await mount();
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.queryByText('Second')).toBeNull();
    expect(screen.getByText('1 more waiting')).toBeTruthy();
  });

  it('lines up at most three and leaves the rest for a later check', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [1, 2, 3, 4, 5].map((id) => card({ id, title: `Card ${id}`, size: 'SMALL' })) });
    await mount();
    expect(screen.getByText('2 more waiting')).toBeTruthy();
  });

  it('shows nothing and clears the line when the person has turned celebrations off', async () => {
    api.pending.mockResolvedValue({ enabled: false, results: [card()] });
    await mount();
    expect(screen.queryByText("You're in!")).toBeNull();
    expect(burst).not.toHaveBeenCalled();
  });

  it('turns celebrations off from the card, saves it on the account and clears what is queued', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card({ id: 1 }), card({ id: 2, title: 'Second' })] });
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Turn off celebrations' })); await vi.advanceTimersByTimeAsync(1500); });
    expect(api.setEnabled).toHaveBeenCalledWith(false);
    expect(screen.queryByText("You're in!")).toBeNull();
    expect(screen.queryByText('Second')).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Celebrations are off', expect.stringContaining('profile'));
  });

  it('says so when turning them off fails and keeps the card', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card()] });
    api.setEnabled.mockRejectedValue(new Error('offline'));
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Turn off celebrations' })); await vi.advanceTimersByTimeAsync(50); });
    expect(toast.error).toHaveBeenCalled();
    expect(screen.getByText("You're in!")).toBeTruthy();
  });

  it('only follows links inside the site', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card({ link_url: 'https://evil.example/phish' })] });
    await mount();
    expect(screen.queryByRole('link', { name: 'Take me there' })).toBeNull();
    cleanup();
    api.pending.mockResolvedValue({ enabled: true, results: [card({ id: 9, link_url: '//evil.example' })] });
    await mount();
    expect(screen.queryByRole('link', { name: 'Take me there' })).toBeNull();
  });

  it('works with no link and no message', async () => {
    api.pending.mockResolvedValue({ enabled: true, results: [card({ link_url: '', message: '' })] });
    await mount();
    expect(screen.getByText("You're in!")).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Take me there' })).toBeNull();
  });

  it('is announced politely to screen readers and does not trap focus', async () => {
    await mount();
    const region = document.querySelector('[role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    api.pending.mockResolvedValue({ enabled: true, results: [card()] });
    await act(async () => { requestCelebrationCheck(); await vi.advanceTimersByTimeAsync(10); });
    expect(region?.textContent).toContain("You're in!");
    expect(region?.className).toContain('pointer-events-none');             // the page behind stays usable
  });

  it('looks again right away when asked, on a page change and when the tab comes back', async () => {
    await mount();
    const calls = () => api.pending.mock.calls.length;
    const before = calls();
    await act(async () => { requestCelebrationCheck(); await vi.advanceTimersByTimeAsync(10); });
    expect(calls()).toBe(before + 1);
    await act(async () => { window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(10); });
    expect(calls()).toBe(before + 1);                                       // too soon after the last look: skipped
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(10); });
    expect(calls()).toBe(before + 2);
  });

  it('does not look while the tab is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(api.pending).not.toHaveBeenCalled();
  });

  it('shrugs off a failed check and tries again later', async () => {
    api.pending.mockRejectedValueOnce(new Error('offline'));
    await mount();
    expect(screen.queryByText("You're in!")).toBeNull();
    api.pending.mockResolvedValue({ enabled: true, results: [card()] });
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(screen.getByText("You're in!")).toBeTruthy();
  });

  it('skips the motion for people who asked for less, but still shows the card', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })) as any;
    api.pending.mockResolvedValue({ enabled: true, results: [card()] });
    await mount();
    expect(screen.getByText("You're in!")).toBeTruthy();
  });

  describe('placement', () => {
    it('a big one takes the middle over a dimmed backdrop that closes it', async () => {
      api.pending.mockResolvedValue({ enabled: true, results: [card({ size: 'BIG' })] });
      await mount();
      const backdrop = document.querySelector('[data-celebration-backdrop]') as HTMLElement;
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      expect(screen.queryByText("You're in!")).toBeNull();
    });

    it('a small or medium one floats under the navigation with no backdrop', async () => {
      api.pending.mockResolvedValue({ enabled: true, results: [card({ size: 'SMALL' })] });
      await mount();
      expect(document.querySelector('[data-celebration-backdrop]')).toBeNull();
      const holder = document.querySelector('[data-celebration="SMALL"]')!.parentElement as HTMLElement;
      expect(holder.style.top).not.toBe('');
    });

    it.each(['/login', '/signup', '/attendance/scan', '/hackathons/demo/check-in', '/certificates/abc'])('waits on %s', async (path) => {
      route.path = path;
      api.pending.mockResolvedValue({ enabled: true, results: [card()] });
      await mount();
      expect(api.pending).not.toHaveBeenCalled();
      expect(screen.queryByText("You're in!")).toBeNull();
    });

    it('waits while the home opening film plays, then shows', async () => {
      document.documentElement.setAttribute('data-intro-cinema', '');
      api.pending.mockResolvedValue({ enabled: true, results: [card()] });
      await mount();
      expect(api.pending).not.toHaveBeenCalled();
      document.documentElement.removeAttribute('data-intro-cinema');
      await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
      expect(screen.getByText("You're in!")).toBeTruthy();
    });
  });
});
