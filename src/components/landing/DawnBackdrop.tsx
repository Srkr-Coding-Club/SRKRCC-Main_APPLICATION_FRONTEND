'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* The HackOverflow band: a full-bleed night that warms toward dawn   */
/* as the chapter scrolls past, so the climax gains energy without    */
/* adding effects. Without motion it shows the dawn state.            */
/* ------------------------------------------------------------------ */
export default function DawnBackdrop() {
  const dawnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dawn = dawnRef.current;
    const section = dawn?.closest('section');
    if (!dawn || !section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.fromTo(
      dawn,
      { opacity: 0 },
      { opacity: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top 70%', end: 'bottom 30%', scrub: 0.6 } },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[-100vw] right-[-100vw] -z-0 overflow-hidden bg-journey-text/[0.035] dark:bg-black/40">
      <div className="absolute inset-x-0 top-0 h-px bg-journey-text/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-journey-text/10" />
      <div
        ref={dawnRef}
        className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_115%,rgb(var(--journey-accent)/0.22),transparent_62%)]"
      />
    </div>
  );
}
