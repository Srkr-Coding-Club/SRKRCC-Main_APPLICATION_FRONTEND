import type gsap from 'gsap';

/** The card entrance vocabulary first used by FormCard: each helper adds one step to a timeline. */

type Tl = gsap.core.Timeline;
type Target = gsap.TweenTarget;

/** Cards beyond this index share the last stagger slot, so a long list never makes the user wait. */
export const ENTRANCE_STAGGER_LIMIT = 5;
export const ENTRANCE_STAGGER_SECONDS = 0.09;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shellFade(tl: Tl, shell: Target) {
  tl.fromTo(shell, { opacity: 0 }, { opacity: 1, duration: 0.45, clearProps: 'opacity' });
}

/** Unveils a rounded cover top to bottom while the picture inside settles from a slight zoom. */
export function coverWipe(tl: Tl, media: Target, image: Target, radius = 18) {
  tl.fromTo(
    media,
    { clipPath: `inset(0% 0% 100% 0% round ${radius}px)` },
    { clipPath: `inset(0% 0% 0% 0% round ${radius}px)`, duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' },
    '-=0.25',
  );
  tl.fromTo(image, { scale: 1.18 }, { scale: 1, duration: 1.2, clearProps: 'transform' }, '<');
}

export function popIn(tl: Tl, targets: Target, position = '-=0.5') {
  tl.fromTo(
    targets,
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(1.6)', clearProps: 'transform,opacity' },
    position,
  );
}

/** The target's parent must clip (`overflow-hidden`) for the text to appear to rise out of a mask. */
export function riseFromMask(tl: Tl, target: Target, position = '-=0.25') {
  tl.fromTo(target, { yPercent: 110 }, { yPercent: 0, duration: 0.6, clearProps: 'transform' }, position);
}

export function fadeIn(tl: Tl, target: Target, position = '-=0.35') {
  tl.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.5, clearProps: 'opacity' }, position);
}

/** The line grows down, the dots pop along it and each step's text slides in. */
export function drawTimeline(tl: Tl, parts: { line: Target; dots: Target; steps: Target }) {
  tl.fromTo(
    parts.line,
    { scaleY: 0 },
    { scaleY: 1, duration: 0.6, ease: 'power2.inOut', clearProps: 'transform' },
    '-=0.3',
  );
  tl.fromTo(
    parts.dots,
    { scale: 0 },
    { scale: 1, duration: 0.4, stagger: 0.25, ease: 'back.out(2)', clearProps: 'transform' },
    '<',
  );
  tl.fromTo(
    parts.steps,
    { x: -10, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.45, stagger: 0.2, clearProps: 'transform,opacity' },
    '<0.05',
  );
}

export function footerRise(tl: Tl, target: Target) {
  tl.fromTo(target, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, clearProps: 'transform,opacity' }, '-=0.3');
}

/** A block (a page section, a card) drifts up into place while fading in. */
export function riseIn(tl: Tl, target: Target, { y = 24, duration = 0.65, position }: { y?: number; duration?: number; position?: string | number } = {}) {
  tl.fromTo(target, { y, opacity: 0 }, { y: 0, opacity: 1, duration, clearProps: 'transform,opacity' }, position);
}

/** The items of a list arrive one after another. */
export function staggerIn(
  tl: Tl,
  targets: Target,
  { x = 0, y = 16, scale = 1, stagger = 0.08, duration = 0.5, position }: { x?: number; y?: number; scale?: number; stagger?: number; duration?: number; position?: string | number } = {},
) {
  tl.fromTo(
    targets,
    { x, y, scale, opacity: 0 },
    { x: 0, y: 0, scale: 1, opacity: 1, duration, stagger, clearProps: 'transform,opacity' },
    position,
  );
}
