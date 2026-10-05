import React from 'react';
import { PHASES } from './timeline';

/* Literal class strings so Tailwind can see them; index matches PHASES. */
const SHOW_FOR_PHASE = [
  'group-data-[phase="0"]/hud:opacity-100',
  'group-data-[phase="1"]/hud:opacity-100',
  'group-data-[phase="2"]/hud:opacity-100',
  'group-data-[phase="3"]/hud:opacity-100',
];

/* ------------------------------------------------------------------ */
/* The only chrome during the intro: the club's name and one line of  */
/* system status that changes as the camera closes in. HeroIntro sets */
/* `data-phase` from the timeline.                                    */
/* ------------------------------------------------------------------ */
export default function IntroHud() {
  return (
    <div data-intro="hud" data-phase="0" className="group/hud pointer-events-none absolute inset-0">
      <div className="absolute left-5 top-5 sm:left-10 sm:top-8">
        <p className="font-display text-[13px] font-semibold tracking-[-0.01em] text-[#F5F5F5]/85 [font-stretch:112%]">
          SRKR <span className="font-normal text-[#FFA500]">{'//'}</span> Coding Club
        </p>
        <p className="relative mt-1 h-4 font-mono text-[11px] text-[#94A3B8]">
          {PHASES.map((phase, i) => (
            <span key={phase.label} className={`absolute left-0 top-0 whitespace-nowrap opacity-0 transition-opacity duration-700 ${SHOW_FOR_PHASE[i]}`}>
              {phase.status}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
