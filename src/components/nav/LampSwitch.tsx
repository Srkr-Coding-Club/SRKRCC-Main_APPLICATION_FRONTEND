'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { isDarkTheme, isThemeChanging, setTheme } from '@/lib/theme';

/** How far (CSS px) the bead must be pulled for the lights to switch, and the most it will stretch. */
export const PULL_THRESHOLD = 16;
const PULL_MAX = 34;
/** A tap or key press tugs the cord this far, so it still feels like a pull. */
const TUG = 14;
/** Below this much movement a press is a tap, not a pull. */
const TAP_SLOP = 4;
const MAX_TILT = 5;
/** The one-time "how does this work" bubble: how long to wait before it shows, how long it stays, and its storage key. */
const HINT_DELAY = 2500;
const HINT_FOR = 7000;
export const HINT_KEY = 'lamp-hint-seen';

const SIZES = {
  bar: { width: 52, height: 76, viewBox: '0 0 68 100', cord: 76, bead: 5.5, scale: 52 / 68 },
  desk: { width: 68, height: 100, viewBox: '0 0 68 100', cord: 76, bead: 5.5, scale: 1 },
  drawer: { width: 92, height: 173, viewBox: '0 0 68 128', cord: 100, bead: 6.5, scale: 92 / 68 },
} as const;

interface LampSwitchProps {
  /** Show a small "Pull to switch the lights" bubble once, on a person's first visits (desktop bar only). */
  hint?: boolean;
  /** `desk` hangs from the desktop bar, `bar` is the smaller one in the phone bar, `drawer` the big one on a long cord in the phone menu. */
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * The theme switch as a pull-cord lamp: lit means light theme, dark and dim means dark. Pull the bead down and let go, or
 * tap it, or press Enter or Space (dragging is never the only way). The theme itself is the `dark` class on <html>, so the
 * lamp follows any other control that changes it.
 */
export function LampSwitch({ size = 'bar', hint = false, className = '' }: LampSwitchProps) {
  const spec = SIZES[size];
  const uid = useId().replace(/:/g, '');
  const [dark, setDark] = useState(true);
  const [pull, setPull] = useState(0);   // in drawing units
  const [tilt, setTilt] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const reduced = useRef(false);
  const frame = useRef(0);
  const drag = useRef<{ id: number; startY: number; px: number; moved: boolean } | null>(null);

  useEffect(() => {
    const read = () => setDark(isDarkTheme());
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    reduced.current = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return () => {
      watch.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const dismissHint = useCallback(() => {
    setHintOn(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* storage blocked: it may show again next visit */ }
  }, []);

  useEffect(() => {
    if (!hint) return undefined;
    try { if (localStorage.getItem(HINT_KEY)) return undefined; } catch { return undefined; }
    const showTimer = window.setTimeout(() => setHintOn(true), HINT_DELAY);
    const hideTimer = window.setTimeout(dismissHint, HINT_DELAY + HINT_FOR);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, [hint, dismissHint]);

  const show = useCallback((px: number) => {
    setPull(px / spec.scale);
    setTilt((px / PULL_MAX) * MAX_TILT);
  }, [spec.scale]);

  /** The cord springs back to rest: a damped spring, stepped once a frame. */
  const release = useCallback((fromPx: number) => {
    cancelAnimationFrame(frame.current);
    if (reduced.current || fromPx === 0) { show(0); return; }
    let position = fromPx;
    let velocity = 0;
    const step = () => {
      const dt = 1 / 60;
      velocity += (-240 * position - 13 * velocity) * dt;
      position += velocity * dt;
      if (Math.abs(position) < 0.08 && Math.abs(velocity) < 0.4) { show(0); return; }
      show(position);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [show]);

  const toggle = useCallback(() => {
    if (isThemeChanging()) return;   // one change at a time: a second pull waits until the circle has finished
    const rect = button.current?.getBoundingClientRect();
    const origin = rect ? { x: rect.left + 34 * spec.scale, y: rect.top + 46 * spec.scale } : undefined;   // the bulb
    const next = !isDarkTheme();
    setTheme(next, origin);
    setDark(next);
    dismissHint();
    if (!reduced.current) navigator.vibrate?.(10);
  }, [spec.scale, dismissHint]);

  const tug = useCallback(() => {
    toggle();
    if (!reduced.current) { show(TUG); release(TUG); }
  }, [toggle, show, release]);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    cancelAnimationFrame(frame.current);
    dismissHint();
    drag.current = { id: event.pointerId, startY: event.clientY, px: 0, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dy = event.clientY - current.startY;
    if (Math.abs(dy) > TAP_SLOP) current.moved = true;
    current.px = Math.min(Math.max(dy, 0), PULL_MAX);
    if (!reduced.current) show(current.px);
  };

  const finish = (event: React.PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (cancelled) { release(current.px); return; }
    if (current.px >= PULL_THRESHOLD) { toggle(); release(current.px); }
    else if (!current.moved) tug();
    else release(current.px);
  };

  // A click with no pointer behind it (detail 0) is the keyboard or assistive technology; pointer taps are handled above.
  const onClick = (event: React.MouseEvent) => { if (event.detail === 0) tug(); };

  const cordEnd = spec.cord + pull;
  const id = (name: string) => `${uid}-${name}`;
  const fade = { transition: 'opacity .3s ease' } as const;

  return (
    <>
    <button
      ref={button}
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
      onClick={onClick}
      aria-label="Toggle theme"
      aria-pressed={!dark}
      aria-describedby={id('hint')}
      title="Pull the cord to switch the lights"
      style={{ width: spec.width, height: spec.height, touchAction: 'none' }}
      className={`group relative block cursor-grab select-none overflow-visible rounded-xl bg-transparent p-0 outline-none transition-transform active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-journey-accent/80 ${className}`}
    >
      <span id={id('hint')} className="sr-only">Pull the cord down, or press Enter, to switch between light and dark.</span>
      <svg viewBox={spec.viewBox} width={spec.width} height={spec.height} aria-hidden="true" focusable="false" style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id={id('shadeD')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#363a50" /><stop offset="1" stopColor="#1b1e2b" /></linearGradient>
          <linearGradient id={id('shadeL')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFC857" /><stop offset="1" stopColor="#EE8A0A" /></linearGradient>
          <radialGradient id={id('bulbOff')} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#4a4f66" /><stop offset="1" stopColor="#2a2d3d" /></radialGradient>
          <radialGradient id={id('bulbOn')} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#FFFFF0" /><stop offset=".6" stopColor="#FFE27A" /><stop offset="1" stopColor="#FFC233" /></radialGradient>
          <radialGradient id={id('bead')} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#FFC48A" /><stop offset=".55" stopColor="#FF7A00" /><stop offset="1" stopColor="#B8420A" /></radialGradient>
          <radialGradient id={id('glow')} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFD35A" stopOpacity=".9" /><stop offset=".5" stopColor="#FFB02E" stopOpacity=".35" /><stop offset="1" stopColor="#FFB02E" stopOpacity="0" /></radialGradient>
          <linearGradient id={id('cone')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD35A" stopOpacity=".4" /><stop offset="1" stopColor="#FFD35A" stopOpacity="0" /></linearGradient>
        </defs>

        {/* light on: a soft cone down the page and a glow around the bulb */}
        <g style={{ ...fade, opacity: dark ? 0 : 1 }}>
          <polygon points="26,52 42,52 96,260 -28,260" fill={`url(#${id('cone')})`} />
          <circle cx="34" cy="46" r="32" fill={`url(#${id('glow')})`} />
        </g>

        <g transform={`rotate(${tilt} 34 0)`}>
          {/* dark: cool grey metal, a dead bulb */}
          <g style={{ ...fade, opacity: dark ? 1 : 0 }} transform="translate(4 0)">
            <rect x="25" y="0" width="10" height="5" rx="2" fill="#6b7285" />
            <path d="M30 5V16" stroke="#6b7285" strokeWidth="2" />
            <path d="M9 40Q9 16 30 14Q51 16 51 40Z" fill={`url(#${id('shadeD')})`} stroke="#7d849a" strokeWidth="1.2" />
            <path d="M15 31Q17 22 26 19" stroke="#fff" strokeOpacity=".28" strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="30" cy="40" rx="21" ry="3.2" fill="#14161f" stroke="#7d849a" strokeWidth=".9" />
            <ellipse cx="30" cy="45" rx="7" ry="6.5" fill={`url(#${id('bulbOff')})`} stroke="#8a91a8" strokeWidth=".8" />
            <circle cx="27.5" cy="43" r="1.6" fill="#fff" fillOpacity=".35" />
            <path d="M27 46q3-3.5 6 0" stroke="#5b6178" strokeWidth=".9" fill="none" />
          </g>
          {/* light: warm brass, a lit bulb */}
          <g style={{ ...fade, opacity: dark ? 0 : 1 }} transform="translate(4 0)">
            <rect x="25" y="0" width="10" height="5" rx="2" fill="#8a6a3a" />
            <path d="M30 5V16" stroke="#8a6a3a" strokeWidth="2" />
            <path d="M9 40Q9 16 30 14Q51 16 51 40Z" fill={`url(#${id('shadeL')})`} stroke="#B45309" strokeWidth="1.2" />
            <path d="M15 31Q17 22 26 19" stroke="#fff" strokeOpacity=".6" strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="30" cy="40" rx="21" ry="3.2" fill="#D9770A" stroke="#B45309" strokeWidth=".9" />
            <ellipse cx="30" cy="45" rx="7" ry="6.5" fill={`url(#${id('bulbOn')})`} stroke="#F5A623" strokeWidth=".8" />
            <circle cx="27.5" cy="43" r="1.6" fill="#fff" fillOpacity=".9" />
            <path d="M27 46q3-3.5 6 0" stroke="#E8860C" strokeWidth="1" fill="none" />
          </g>
          <path d={`M51 41V${cordEnd}`} stroke={dark ? '#8a91a8' : '#8a6a3a'} strokeWidth="1.7" strokeLinecap="round" fill="none" style={{ transition: 'stroke .3s ease' }} />
          <circle cx="51" cy={cordEnd + 6} r={spec.bead} fill={`url(#${id('bead')})`} />
        </g>
      </svg>
    </button>
    {hintOn && (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[32px] top-[62px] z-40 whitespace-nowrap rounded-[10px] bg-[#1A1A2E] px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_-10px_rgba(0,0,0,0.6)] dark:bg-white dark:text-[#12131B]"
      >
        Pull to switch the lights
        <span className="absolute -right-[5px] top-[11px] h-[10px] w-[10px] rotate-45 bg-[#1A1A2E] dark:bg-white" />
      </span>
    )}
    </>
  );
}
