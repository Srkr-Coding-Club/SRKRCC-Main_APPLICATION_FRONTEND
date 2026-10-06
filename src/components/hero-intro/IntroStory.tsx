import React from 'react';
import Link from 'next/link';
import type { gsap } from 'gsap';
import { encounterAt, JOURNEY, PLANETS } from './solarSystem';

/* ------------------------------------------------------------------ */
/* The words of the journey, in the DOM (readable, selectable,         */
/* accessible) over the WebGL system: the opening lines in the void,  */
/* the Sun's name, one mission-control panel per planet, and the      */
/* final invitation. `choreographStory` times them on the intro's     */
/* timeline; each panel lives inside its planet's encounter window.   */
/* ------------------------------------------------------------------ */

const FINAL_LINES = ['Where curiosity becomes code.', 'Where code becomes capability.', 'Where builders find their orbit.'];

export function choreographStory(timeline: gsap.core.Timeline) {
  JOURNEY.openingLines.forEach((line, i) => {
    timeline
      .fromTo(`[data-opening="${i}"]`, { autoAlpha: 0, y: 14, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.012 }, line.start)
      .to(`[data-opening="${i}"]`, { autoAlpha: 0, y: -10, filter: 'blur(6px)', duration: 0.01 }, line.end - 0.01);
  });

  timeline
    .fromTo('[data-intro="sun-title"]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.015 }, JOURNEY.sunReveal.start)
    .to('[data-intro="sun-title"]', { autoAlpha: 0, y: -12, duration: 0.012 }, JOURNEY.sunReveal.end - 0.012)
    .fromTo('[data-intro="journey-hud"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.015 }, encounterAt(0) - JOURNEY.encounterStep * 0.6)
    .to('[data-intro="journey-hud"]', { autoAlpha: 0, duration: 0.015 }, JOURNEY.outerSpace - 0.01);

  PLANETS.forEach((_, i) => {
    const at = encounterAt(i);
    const reach = JOURNEY.encounterReach;
    timeline
      .fromTo(
        `[data-planet-panel="${i}"]`,
        { autoAlpha: 0, x: 24, filter: 'blur(10px)' },
        { autoAlpha: 1, x: 0, filter: 'blur(0px)', duration: reach * 0.5, ease: 'power2.out' },
        at - reach,
      )
      .to(`[data-planet-panel="${i}"]`, { autoAlpha: 0, x: -16, filter: 'blur(8px)', duration: reach * 0.4, ease: 'power2.in' }, at + reach * 0.6);
  });

  timeline
    .fromTo('[data-intro="final"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.008 }, JOURNEY.finalReveal.start)
    .fromTo('[data-intro="final-title"]', { y: 24, filter: 'blur(12px)' }, { y: 0, filter: 'blur(0px)', duration: 0.014, ease: 'power3.out' }, JOURNEY.finalReveal.start)
    .fromTo('[data-final-line]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.006, stagger: 0.003 }, JOURNEY.finalReveal.start + 0.004)
    // Everything is in place by about a third of the way in, so the invitation holds for most of the scene.
    .fromTo('[data-intro="final-actions"]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.006 }, JOURNEY.finalReveal.start + 0.012)
    .to('[data-intro="final"]', { autoAlpha: 0, duration: 0.008 }, JOURNEY.finalReveal.end);
}

/* A small orbit glyph: the planet's ring with its position marked. */
function OrbitMark({ index }: { index: number }) {
  const angle = (index / PLANETS.length) * Math.PI * 2 - Math.PI / 2;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <circle cx="12" cy="12" r="2" fill="#FF7A00" />
      {/* Rounded so server and browser trig agree (avoids hydration mismatches). */}
      <circle cx={Math.round((12 + Math.cos(angle) * 9) * 100) / 100} cy={Math.round((12 + Math.sin(angle) * 9) * 100) / 100} r="1.8" fill="#F5F5F5" />
    </svg>
  );
}

export default function IntroStory() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[calc(var(--navbar-offset)*-1)] z-[25] motion-reduce:hidden group-data-[intro-done=true]/intro:invisible">
      {/* The void: two lines, then the Sun. */}
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        {JOURNEY.openingLines.map((line, i) => (
          <p
            key={line.text}
            data-opening={i}
            className="invisible absolute font-display text-[clamp(1.4rem,3.2vw,2.4rem)] font-medium tracking-[-0.02em] text-[#E6EAF2] opacity-0 [font-stretch:108%]"
          >
            {line.text}
          </p>
        ))}
      </div>

      <div data-intro="sun-title" className="invisible absolute inset-x-0 bottom-[12%] px-6 text-center opacity-0">
        <p className="ember-text font-poppins text-[clamp(2.2rem,6vw,4.5rem)] font-extrabold leading-none tracking-tight">SRKR CODING CLUB</p>
        <p className="mt-4 font-mono text-xs tracking-[0.3em] text-[#A6B0C3] sm:text-sm">CODING · CREATIVITY · COMMUNITY</p>
      </div>

      {/* One mission-control panel per planet, on the side of the frame the planet leaves free. */}
      {PLANETS.map((planet, i) => (
        <div
          key={planet.id}
          className={`absolute bottom-[9%] left-5 right-5 lg:bottom-auto lg:top-1/2 lg:w-[25rem] lg:-translate-y-1/2 ${
            planet.side === 'left' ? 'lg:left-auto lg:right-[8%]' : 'lg:left-[8%] lg:right-auto'
          }`}
        >
          <article
            data-planet-panel={i}
            aria-label={`${planet.eyebrow}: ${planet.title}`}
            className="pointer-events-auto invisible rounded-xl border border-white/10 bg-[#05060A]/55 p-5 opacity-0 backdrop-blur-md sm:p-6"
          >
            <div className="flex items-center justify-between font-mono text-[11px] text-[#94A3B8]">
              <span className="flex items-center gap-3">
                <span className="text-[#FF7A00]">{String(i + 1).padStart(2, '0')}</span>
                <span className="h-px w-8 bg-white/20" />
                <span>{planet.chapter === 'technology' ? 'Technology' : 'Community'}</span>
              </span>
              <OrbitMark index={i} />
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[#A6B0C3]">{planet.eyebrow}</p>
            <h2 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-[#F5F5F5] [font-stretch:112%]">
              {planet.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#C3CAD6]">{planet.statement}</p>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <Link
                href={planet.href}
                className="group/cta inline-flex min-h-[40px] items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#F5F5F5] transition-colors hover:text-[#FFA500] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA500]"
              >
                <span className="text-[#FF7A00] transition-transform group-hover/cta:-translate-x-0.5">[</span>
                {planet.cta}
                <span className="text-[#FF7A00] transition-transform group-hover/cta:translate-x-0.5">]</span>
              </Link>
              <span className="hidden shrink-0 whitespace-nowrap font-mono text-[10px] text-[#64748B] sm:inline">
                Orbit {String(i + 1).padStart(2, '0')} / {PLANETS.length}
              </span>
            </div>
          </article>
        </div>
      ))}

      {/* Back at the Sun: who we are, and the invitation. */}
      <div data-intro="final" className="invisible absolute inset-0 flex flex-col items-center justify-end bg-[linear-gradient(to_top,rgba(5,6,10,0.85),rgba(5,6,10,0.45)_45%,transparent_70%)] px-6 pb-28 text-center sm:pb-[9%] opacity-0">
        <h2 data-intro="final-title" className="ember-text font-poppins text-[clamp(2.6rem,8vw,6.5rem)] font-extrabold leading-[0.92] tracking-tight">
          SRKR CODING CLUB
        </h2>
        <div className="mt-6 space-y-1 font-display text-[clamp(1.05rem,2vw,1.4rem)] font-medium tracking-[-0.01em] text-[#E6EAF2] [font-stretch:108%]">
          {FINAL_LINES.map((line) => (
            <p key={line} data-final-line className="invisible opacity-0">
              {line}
            </p>
          ))}
        </div>
        <div data-intro="final-actions" className="pointer-events-auto invisible mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-0">
          <Link
            href="/signup"
            className="inline-flex min-h-[52px] items-center rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] px-8 text-base font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,122,0,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060A]"
          >
            Join the journey
          </Link>
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center text-base font-semibold text-[#F5F5F5] underline decoration-[#FF7A00] decoration-2 underline-offset-[6px] transition-colors hover:text-[#FFA500] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA500]"
          >
            Explore events
          </Link>
        </div>
      </div>
    </div>
  );
}
