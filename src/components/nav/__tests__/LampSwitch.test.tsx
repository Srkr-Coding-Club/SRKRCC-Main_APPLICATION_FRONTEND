import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HINT_KEY, LampSwitch, PULL_THRESHOLD } from '../LampSwitch';

// jsdom has no PointerEvent: give it one that carries the position and the pointer, like a browser's.
if (!('PointerEvent' in window)) {
  class PolyfilledPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: any = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  (window as any).PointerEvent = PolyfilledPointerEvent;
}

const noMotion = (reduce: boolean) => { window.matchMedia = ((query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as any; };
const lamp = () => screen.getByRole('button', { name: 'Toggle theme' });
const cord = () => lamp().querySelector('svg path[stroke-linecap="round"][d^="M51 41V"]')!.getAttribute('d')!;
const pointer = (type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel', y: number) =>
  fireEvent[type](lamp(), { pointerId: 1, button: 0, clientY: y, clientX: 10 });

beforeEach(() => {
  document.documentElement.classList.add('dark');
  localStorage.clear();
  noMotion(false);
});
afterEach(() => { cleanup(); vi.useRealTimers(); document.documentElement.classList.remove('dark'); });

describe('LampSwitch', () => {
  it('is one button named Toggle theme, lit (pressed) only in the light theme', () => {
    render(<LampSwitch />);
    expect(lamp().getAttribute('aria-pressed')).toBe('false');
    expect(lamp().getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(lamp().getAttribute('aria-describedby')!)?.textContent).toMatch(/Enter/);
    cleanup();
    document.documentElement.classList.remove('dark');
    render(<LampSwitch />);
    expect(lamp().getAttribute('aria-pressed')).toBe('true');
  });

  it('switches with the keyboard or assistive technology (a click with no pointer), and remembers the choice', () => {
    render(<LampSwitch />);
    fireEvent.click(lamp());   // detail 0, as Enter or Space send
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(lamp().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(lamp());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('switches when the bead is pulled past the threshold and let go', () => {
    render(<LampSwitch />);
    pointer('pointerDown', 100);
    pointer('pointerMove', 100 + PULL_THRESHOLD + 6);
    expect(cord()).not.toBe('M51 41V76');   // the cord is stretched while pulled
    expect(document.documentElement.classList.contains('dark')).toBe(true);   // nothing changes until it is let go
    pointer('pointerUp', 100 + PULL_THRESHOLD + 6);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('springs back without switching when pulled less than the threshold', () => {
    render(<LampSwitch />);
    pointer('pointerDown', 100);
    pointer('pointerMove', 100 + PULL_THRESHOLD - 6);
    pointer('pointerUp', 100 + PULL_THRESHOLD - 6);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('treats a press with no movement as a tap and switches', () => {
    render(<LampSwitch />);
    pointer('pointerDown', 100);
    pointer('pointerUp', 100);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('does not switch when the pull is cancelled, when it goes upward, or for a right-click', () => {
    render(<LampSwitch />);
    pointer('pointerDown', 100);
    pointer('pointerMove', 130);
    pointer('pointerCancel', 130);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    pointer('pointerDown', 100);
    pointer('pointerMove', 60);   // up: nothing to pull
    pointer('pointerUp', 60);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.pointerDown(lamp(), { pointerId: 2, button: 2, clientY: 100 });
    fireEvent.pointerUp(lamp(), { pointerId: 2, button: 2, clientY: 100 });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('never stretches past its limit', () => {
    render(<LampSwitch />);
    pointer('pointerDown', 0);
    pointer('pointerMove', 5000);
    const end = Number(cord().replace('M51 41V', ''));
    expect(end).toBeLessThanOrEqual(76 + 34 / (52 / 68) + 0.01);
  });

  it('follows the theme when something else changes it, such as the Light/Dark buttons or another tab', async () => {
    render(<LampSwitch />);
    act(() => { document.documentElement.classList.remove('dark'); });
    await waitFor(() => expect(lamp().getAttribute('aria-pressed')).toBe('true'));
    act(() => { document.documentElement.classList.add('dark'); });
    await waitFor(() => expect(lamp().getAttribute('aria-pressed')).toBe('false'));
  });

  it('with reduced motion it switches at once and the cord does not move', () => {
    noMotion(true);
    render(<LampSwitch />);
    pointer('pointerDown', 100);
    pointer('pointerMove', 130);
    expect(cord()).toBe('M51 41V76');
    pointer('pointerUp', 130);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(lamp());
    expect(cord()).toBe('M51 41V76');
  });

  it('settles back to rest after a pull', () => {
    vi.useFakeTimers();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    render(<LampSwitch />);
    pointer('pointerDown', 100);
    pointer('pointerMove', 130);
    pointer('pointerUp', 130);
    for (let i = 0; i < 400 && frames.length; i += 1) act(() => { frames.shift()!(performance.now()); });
    expect(cord()).toBe('M51 41V76');
    vi.unstubAllGlobals();
  });

  it('is big enough to press on a phone', () => {
    render(<LampSwitch size="bar" />);
    expect(Number(lamp().style.width.replace('px', ''))).toBeGreaterThanOrEqual(44);
    expect(Number(lamp().style.height.replace('px', ''))).toBeGreaterThanOrEqual(44);
    expect(lamp().style.touchAction).toBe('none');
  });
});

describe('LampSwitch: haptics and the first-visit hint', () => {
  it('buzzes briefly on a phone when it switches, and not with reduced motion', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<LampSwitch />);
    fireEvent.click(lamp());
    expect(vibrate).toHaveBeenCalledWith(10);
    cleanup();
    vibrate.mockClear();
    noMotion(true);
    render(<LampSwitch />);
    fireEvent.click(lamp());
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('shows the hint after a short wait, then hides it for good after a while', () => {
    vi.useFakeTimers();
    render(<LampSwitch size="desk" hint />);
    expect(screen.queryByText('Pull to switch the lights')).toBeNull();
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.getByText('Pull to switch the lights')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(7100); });
    expect(screen.queryByText('Pull to switch the lights')).toBeNull();
    expect(localStorage.getItem(HINT_KEY)).toBe('1');
    cleanup();
    render(<LampSwitch size="desk" hint />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText('Pull to switch the lights')).toBeNull();   // seen: never again
  });

  it('hides the hint the moment the lamp is used', () => {
    vi.useFakeTimers();
    render(<LampSwitch size="desk" hint />);
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.getByText('Pull to switch the lights')).toBeTruthy();
    fireEvent.click(lamp());
    expect(screen.queryByText('Pull to switch the lights')).toBeNull();
    expect(localStorage.getItem(HINT_KEY)).toBe('1');
  });

  it('shows no hint unless asked, and it never blocks the lamp or reads out twice for a screen reader', () => {
    vi.useFakeTimers();
    render(<LampSwitch size="desk" />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Pull to switch the lights')).toBeNull();
    cleanup();
    render(<LampSwitch size="desk" hint />);
    act(() => { vi.advanceTimersByTime(2600); });
    const bubble = screen.getByText('Pull to switch the lights');
    expect(bubble.getAttribute('aria-hidden')).toBe('true');
    expect(bubble.className).toMatch(/pointer-events-none/);
  });
});
