'use client';

import { useEffect, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* Maps a demonstration's scroll position to a step, 0..steps.        */
/*                                                                    */
/* It starts at `steps` - the finished state - so the server render,  */
/* no-JS visitors and reduced-motion visitors all see the complete,   */
/* readable demonstration. Only when motion is allowed does it rewind */
/* and play with scroll. React re-renders only when the step changes. */
/* ------------------------------------------------------------------ */
export function useScrollSteps(ref: RefObject<HTMLElement | null>, steps: number, range = { start: 'top 78%', end: 'bottom 45%' }) {
  const [step, setStep] = useState(steps);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const toStep = (progress: number) => setStep(Math.round(progress * steps));
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: range.start,
      end: range.end,
      onUpdate: (self) => toStep(self.progress),
    });
    toStep(trigger.progress);
    return () => trigger.kill();
  }, [ref, steps, range.start, range.end]);

  return step;
}
