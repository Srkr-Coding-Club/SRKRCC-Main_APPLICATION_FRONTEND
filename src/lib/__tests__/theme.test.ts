import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isDarkTheme, isThemeChanging, setTheme } from '../theme';

type Transition = { ready: Promise<void>; finished: Promise<void> };

function withTransitions(options: { rejectReady?: boolean } = {}) {
  let finish: () => void = () => undefined;
  const calls: { updated: boolean }[] = [];
  (document as any).startViewTransition = vi.fn((update: () => void) => {
    const call = { updated: false };
    calls.push(call);
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    // Like a browser: the page is captured, then the update runs a moment later, asynchronously.
    const ready = Promise.resolve().then(() => { update(); call.updated = true; if (options.rejectReady) throw new Error('skipped'); });
    return { ready, finished } as Transition;
  });
  return { calls, finish: () => finish() };
}

const animate = vi.fn();
beforeEach(() => {
  document.documentElement.classList.add('dark');
  localStorage.clear();
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as any;
  (document.documentElement as any).animate = animate;
  animate.mockReset();
});
afterEach(() => {
  delete (document as any).startViewTransition;
  document.documentElement.classList.remove('dark');
});

describe('setTheme', () => {
  it('switches the class and remembers the choice at once when there is no origin', () => {
    setTheme(false);
    expect(isDarkTheme()).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    setTheme(true);
    expect(isDarkTheme()).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('switches at once in a browser without view transitions, even with an origin', () => {
    setTheme(false, { x: 10, y: 10 });
    expect(isDarkTheme()).toBe(false);
    expect(isThemeChanging()).toBe(false);
  });

  it('switches at once, with no animation, when the person asked for reduced motion', () => {
    const { calls } = withTransitions();
    window.matchMedia = ((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as any;
    setTheme(false, { x: 10, y: 10 });
    expect(isDarkTheme()).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('spreads the new theme out from the origin as a growing circle, then lets the next change through', async () => {
    const { calls, finish } = withTransitions();
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    setTheme(false, { x: 900, y: 40 });
    expect(isThemeChanging()).toBe(true);
    await vi.waitFor(() => expect(animate).toHaveBeenCalled());
    expect(calls[0].updated).toBe(true);
    expect(isDarkTheme()).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    const [frames, timing] = animate.mock.calls[0];
    expect(frames.clipPath[0]).toBe('circle(0px at 900px 40px)');
    expect(frames.clipPath[1]).toMatch(/^circle\(\d+(\.\d+)?px at 900px 40px\)$/);
    expect(parseFloat(frames.clipPath[1].slice(7))).toBeCloseTo(Math.hypot(900, 760), 0);   // far enough to cover the farthest corner
    expect(timing.pseudoElement).toBe('::view-transition-new(root)');
    finish();
    await vi.waitFor(() => expect(isThemeChanging()).toBe(false));
  });

  it('a second change while one is spreading applies at once instead of starting another', async () => {
    const { calls, finish } = withTransitions();
    setTheme(false, { x: 10, y: 10 });
    setTheme(true, { x: 10, y: 10 });
    expect(calls).toHaveLength(1);
    expect(isDarkTheme()).toBe(true);
    finish();
    await vi.waitFor(() => expect(isThemeChanging()).toBe(false));
  });

  it('still ends up in the right theme if the browser skips the transition', async () => {
    const { finish } = withTransitions({ rejectReady: true });
    setTheme(false, { x: 10, y: 10 });
    await vi.waitFor(() => expect(isDarkTheme()).toBe(false));
    finish();
    await vi.waitFor(() => expect(isThemeChanging()).toBe(false));
    expect(animate).not.toHaveBeenCalled();
  });
});
