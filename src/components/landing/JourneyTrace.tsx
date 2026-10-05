'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NODE_ACTIVATION = 'top 62%';

/* ------------------------------------------------------------------ */
/* The trace: one continuous line - an execution path - that runs     */
/* down the whole journey, from the first chapter to the final call   */
/* to action. It draws itself with scroll, and each <PathNode> along  */
/* it lights up as its section arrives.                               */
/*                                                                    */
/* Layout contract: children sit in a column padded by --trace-pad;   */
/* the line sits at --trace-x. PathNode uses both to land on the line.*/
/* Without JS or with reduced motion the line is fully drawn and      */
/* every node is lit.                                                 */
/* ------------------------------------------------------------------ */
export default function JourneyTrace({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: root, start: 'top 62%', end: 'bottom 62%', scrub: 0.6 } },
      );
      gsap.utils.toArray<HTMLElement>('[data-path-node]').forEach((node) => {
        node.dataset.active = 'false';
        ScrollTrigger.create({
          trigger: node,
          start: NODE_ACTIVATION,
          end: 'max',
          onToggle: (self) => {
            node.dataset.active = String(self.isActive);
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative pl-[var(--trace-pad)] [--trace-pad:2.5rem] [--trace-x:0.75rem] sm:[--trace-pad:4.5rem] sm:[--trace-x:1.5rem] lg:[--trace-pad:7rem] lg:[--trace-x:2.5rem]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[var(--trace-x)] top-0 w-px bg-journey-text/10">
        <div ref={fillRef} className="h-full w-full origin-top bg-journey-accent" />
      </div>
      {children}
    </div>
  );
}
