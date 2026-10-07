import React from 'react';
import { encounterAt, PLANETS } from './solarSystem';

/* ------------------------------------------------------------------ */
/* Mission control: the club's mark top-left, the journey readout     */
/* ("03 / 12", Technology -> Community) top-right, and an orbital     */
/* navigation down the right edge on large screens - every planet,    */
/* the current one lit, each one a jump target. HeroIntro marks the   */
/* active planet (`data-active`) and writes the counter each frame    */
/* the planet changes; it never re-renders React to do so.            */
/* ------------------------------------------------------------------ */
export default function IntroHud({ onNavigate }: { onNavigate: (progress: number) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[calc(var(--navbar-offset)*-1)] z-[26] motion-reduce:hidden group-data-[intro-done=true]/intro:invisible">
      <div data-intro="hud" className="absolute left-5 top-5 sm:left-10 sm:top-8">
        <p className="font-display text-[13px] font-semibold tracking-[-0.01em] text-[#F5F5F5]/85 [font-stretch:112%]">
          SRKR <span className="font-normal text-[#FFA500]">{'//'}</span> Coding Club
        </p>
        <p data-intro="hud-status" className="mt-1 h-4 max-w-[62vw] truncate font-mono text-[11px] text-[#94A3B8] sm:max-w-none">
          Initializing system
        </p>
      </div>

      <div data-intro="journey-hud" className="invisible opacity-0">
        <div className="absolute right-5 top-5 text-right font-mono text-[11px] text-[#94A3B8] sm:right-10 sm:top-8">
          <p className="text-[#F5F5F5]">
            <span data-intro="hud-count" className="text-[#FF7A00]">
              01
            </span>{' '}
            / {String(PLANETS.length).padStart(2, '0')}
          </p>
          <p data-intro="hud-chapter" data-chapter="technology" className="group/chapter mt-1 hidden items-center justify-end gap-2 sm:flex">
            <span className="group-data-[chapter=technology]/chapter:text-[#F5F5F5]">Technology</span>
            <span aria-hidden="true" className="h-px w-6 bg-white/25" />
            <span className="group-data-[chapter=club]/chapter:text-[#F5F5F5]">Community</span>
          </p>
        </div>

        <nav aria-label="Journey" className="pointer-events-auto absolute right-6 top-1/2 hidden -translate-y-1/2 xl:block">
          <ol className="flex flex-col gap-1.5">
            {PLANETS.map((planet, i) => (
              <li key={planet.id}>
                <button
                  type="button"
                  data-orbit-nav={i}
                  data-active="false"
                  onClick={() => onNavigate(encounterAt(i))}
                  className="group/nav flex min-h-[28px] w-full items-center justify-end gap-3 rounded font-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B] transition-colors hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA500] data-[active=true]:text-[#F5F5F5]"
                >
                  <span className="opacity-0 transition-opacity group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100">{planet.title}</span>
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full border border-current transition-all group-data-[active=true]/nav:h-2.5 group-data-[active=true]/nav:w-2.5 group-data-[active=true]/nav:border-[#FF7A00] group-data-[active=true]/nav:bg-[#FF7A00]/30" />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
