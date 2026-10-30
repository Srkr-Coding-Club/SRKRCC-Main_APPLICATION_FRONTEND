import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confetti = vi.hoisted(() => vi.fn());
vi.mock('canvas-confetti', () => ({ default: confetti }));

import { burst, plan, prefersReducedMotion } from '../celebrate';

const setMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};
const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

beforeEach(() => {
  vi.useFakeTimers();
  confetti.mockReset();
  setMotion(false);
  setWidth(1280);
});
afterEach(() => vi.useRealTimers());

describe('plan', () => {
  const total = (size: 'SMALL' | 'MEDIUM' | 'BIG', scale = 1) => plan(size, scale).reduce((sum, shot) => sum + Number(shot.options.particleCount), 0);

  it('a bigger celebration throws more, over longer, in more places', () => {
    expect(plan('SMALL')).toHaveLength(1);
    expect(plan('SMALL').length).toBeLessThan(plan('MEDIUM').length);
    expect(plan('MEDIUM').length).toBeLessThan(plan('BIG').length);
    expect(total('SMALL')).toBeLessThan(total('MEDIUM'));
    expect(total('MEDIUM')).toBeLessThan(total('BIG'));
    const span = (size: 'SMALL' | 'MEDIUM' | 'BIG') => Math.max(...plan(size).map((shot) => shot.at));
    expect(span('SMALL')).toBeLessThan(span('MEDIUM'));
    expect(span('MEDIUM')).toBeLessThan(span('BIG'));
  });

  it('a big one is a finale: cannons from both bottom corners and fireworks spread across the screen', () => {
    const shots = plan('BIG');
    const cannons = shots.filter((shot) => (shot.options.origin as { y: number }).y > 0.9);
    expect(cannons.some((shot) => (shot.options.origin as { x: number }).x === 0)).toBe(true);
    expect(cannons.some((shot) => (shot.options.origin as { x: number }).x === 1)).toBe(true);
    const fireworks = shots.filter((shot) => shot.options.spread === 360);
    expect(fireworks.length).toBeGreaterThanOrEqual(6);
    const xs = fireworks.map((shot) => (shot.options.origin as { x: number }).x);
    expect(Math.min(...xs)).toBeLessThan(0.3);
    expect(Math.max(...xs)).toBeGreaterThan(0.7);
    expect(fireworks.every((shot) => (shot.options.origin as { y: number }).y < 0.5)).toBe(true);   // high up, not on the card
  });

  it('shrinks for a phone but never to nothing', () => {
    expect(total('BIG', 0.6)).toBeLessThan(total('BIG'));
    expect(plan('SMALL', 0.01)[0].options.particleCount).toBeGreaterThanOrEqual(8);
  });
});

describe('burst', () => {
  it('throws every shot of the plan, in the brand colours', async () => {
    for (const size of ['SMALL', 'MEDIUM', 'BIG'] as const) {
      confetti.mockClear();
      burst(size);
      await vi.advanceTimersByTimeAsync(4000);
      expect(confetti).toHaveBeenCalledTimes(plan(size).length);
    }
    expect(confetti.mock.calls[0][0].colors).toContain('#FF7A00');
    expect(confetti.mock.calls[0][0].disableForReducedMotion).toBe(true);
  });

  it('throws nothing for someone who asked for less motion', async () => {
    setMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    burst('BIG');
    await vi.advanceTimersByTimeAsync(4000);
    expect(confetti).not.toHaveBeenCalled();
  });

  it('uses fewer pieces on a phone', async () => {
    burst('BIG');
    await vi.advanceTimersByTimeAsync(4000);
    const desktop = confetti.mock.calls.reduce((sum, call) => sum + call[0].particleCount, 0);
    confetti.mockClear();
    setWidth(390);
    burst('BIG');
    await vi.advanceTimersByTimeAsync(4000);
    const phone = confetti.mock.calls.reduce((sum, call) => sum + call[0].particleCount, 0);
    expect(phone).toBeLessThan(desktop);
  });

  it('stops the shots still to come when it is cancelled', async () => {
    const stop = burst('BIG');
    await vi.advanceTimersByTimeAsync(500);
    const fired = confetti.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(4000);
    expect(confetti.mock.calls.length).toBe(fired);
    expect(fired).toBeLessThan(plan('BIG').length);
  });

  it('survives the library failing to load', async () => {
    vi.resetModules();
    vi.doMock('canvas-confetti', () => { throw new Error('offline'); });
    const { burst: fresh } = await import('../celebrate');
    expect(() => fresh('SMALL')).not.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    vi.doUnmock('canvas-confetti');
  });
});
