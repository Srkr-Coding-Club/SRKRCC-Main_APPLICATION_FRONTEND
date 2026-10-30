import type { CelebrationSize } from '@/lib/types';

/** The brand palette: orange, gold, burgundy and a white for contrast on both themes. */
const COLORS = ['#FF7A00', '#FFA500', '#FFD27A', '#8B2E3B', '#F5F5F5'];

/** How long a card of each size stays before it closes by itself. */
export const CELEBRATION_SIZES: Record<CelebrationSize, { stayMs: number }> = {
  SMALL: { stayMs: 6000 },
  MEDIUM: { stayMs: 8000 },
  BIG: { stayMs: 11000 },
};

export interface Shot {
  /** Milliseconds after the card appears. */
  at: number;
  /** What `canvas-confetti` is asked for. */
  options: Record<string, unknown>;
}

const SHAPES = ['star', 'circle', 'square'];

const cannon = (at: number, side: 'left' | 'right', count: number, velocity: number): Shot => ({
  at,
  options: {
    particleCount: count, angle: side === 'left' ? 60 : 120, spread: 65, startVelocity: velocity, gravity: 0.9, ticks: 260,
    origin: { x: side === 'left' ? 0 : 1, y: 0.95 }, shapes: SHAPES,
  },
});

/** A firework: a quick round burst high on the screen that hangs and drifts. */
const firework = (at: number, x: number, y: number, count: number): Shot => ({
  at,
  options: {
    particleCount: count, spread: 360, startVelocity: 34, gravity: 0.55, decay: 0.92, ticks: 90, scalar: 1.15,
    origin: { x, y }, shapes: ['star', 'circle'],
  },
});

/**
 * What to throw for a celebration, in order. A small one is a single pop; a medium one is two cannons from the bottom
 * corners and a burst; a big one is a finale: cannons, a run of fireworks over the whole screen, then cannons again.
 * `scale` shrinks it for a phone.
 */
export function plan(size: CelebrationSize, scale = 1): Shot[] {
  const n = (count: number) => Math.max(8, Math.round(count * scale));
  if (size === 'SMALL') {
    return [{ at: 0, options: { particleCount: n(60), spread: 70, startVelocity: 32, origin: { x: 0.5, y: 0.2 }, shapes: SHAPES, ticks: 160 } }];
  }
  if (size === 'MEDIUM') {
    return [
      cannon(0, 'left', n(60), 55), cannon(0, 'right', n(60), 55),
      firework(450, 0.5, 0.3, n(80)),
      cannon(900, 'left', n(40), 50), cannon(900, 'right', n(40), 50),
    ];
  }
  return [
    cannon(0, 'left', n(110), 65), cannon(0, 'right', n(110), 65),
    firework(350, 0.25, 0.3, n(90)), firework(700, 0.75, 0.25, n(90)), firework(1050, 0.5, 0.2, n(110)),
    firework(1400, 0.15, 0.4, n(80)), firework(1700, 0.85, 0.4, n(80)),
    cannon(2000, 'left', n(80), 60), cannon(2000, 'right', n(80), 60),
    firework(2400, 0.5, 0.3, n(130)), firework(2700, 0.3, 0.2, n(90)), firework(2900, 0.7, 0.2, n(90)),
  ];
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Confetti and fireworks for a celebration. Nothing moves for someone who asked for less motion; phones get fewer pieces so
 * they stay smooth. The library is loaded only now, so pages without a celebration never download it. Returns a function
 * that stops anything still to come.
 */
export function burst(size: CelebrationSize): () => void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => undefined;
  const scale = window.innerWidth < 640 ? 0.6 : 1;
  const timers: number[] = [];
  let stopped = false;

  void import('canvas-confetti').then(({ default: confetti }) => {
    if (stopped) return;
    for (const shot of plan(size, scale)) {
      timers.push(window.setTimeout(() => {
        if (stopped) return;
        void confetti({ colors: COLORS, disableForReducedMotion: true, zIndex: 200, ...shot.options });
      }, shot.at));
    }
  }).catch(() => undefined);

  return () => {
    stopped = true;
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}
