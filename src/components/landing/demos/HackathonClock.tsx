'use client';

import React, { useRef } from 'react';
import { useScrollSteps } from '../useScrollSteps';

const HOURS = 24;
const STEPS_PER_HOUR = 4;
const STEPS = HOURS * STEPS_PER_HOUR;
const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 128;
const MILESTONES = [
  { hour: 0, label: 'Idea' },
  { hour: 6, label: 'Build' },
  { hour: 12, label: 'Prototype' },
  { hour: 18, label: 'Polish' },
  { hour: 24, label: 'Product' },
];

/* Rounded so server and browser trig agree to the digit (avoids hydration mismatches). */
const round = (value: number) => Math.round(value * 100) / 100;
const polar = (hour: number, radius: number) => {
  const angle = (hour / HOURS) * Math.PI * 2 - Math.PI / 2;
  return { x: round(CENTER + Math.cos(angle) * radius), y: round(CENTER + Math.sin(angle) * radius) };
};

function arcPath(hours: number) {
  if (hours <= 0) return '';
  if (hours >= HOURS) return `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER - 0.01} ${CENTER - RADIUS}`;
  const end = polar(hours, RADIUS);
  return `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 ${hours > HOURS / 2 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

/* ------------------------------------------------------------------ */
/* Chapter 06, the climax: 24 hours on one dial. The arc sweeps from  */
/* idea to product as you scroll, while the chapter's DawnBackdrop    */
/* warms from night toward morning.                                   */
/* ------------------------------------------------------------------ */
export default function HackathonClock() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScrollSteps(ref, STEPS, { start: 'top 70%', end: 'bottom 30%' });
  const hours = step / STEPS_PER_HOUR;
  const hand = polar(hours, RADIUS);
  const current = [...MILESTONES].reverse().find((milestone) => hours >= milestone.hour) ?? MILESTONES[0];

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label={`Hour ${Math.floor(hours)} of 24: ${current.label}`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-none stroke-journey-text/10" strokeWidth={1} />
        {Array.from({ length: HOURS }, (_, hour) => {
          const inner = polar(hour, RADIUS - (hour % 6 === 0 ? 14 : 7));
          const outer = polar(hour, RADIUS);
          return (
            <line
              key={hour}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              className={hour <= hours ? 'stroke-journey-accent/70' : 'stroke-journey-text/20'}
              strokeWidth={hour % 6 === 0 ? 1.5 : 1}
            />
          );
        })}
        <path d={arcPath(hours)} fill="none" className="stroke-journey-accent" strokeWidth={2.5} strokeLinecap="round" />
        {MILESTONES.slice(0, -1).map((milestone) => {
          const point = polar(milestone.hour, RADIUS + 24);
          return (
            <text
              key={milestone.label}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`font-mono text-[11px] transition-colors duration-300 ${hours >= milestone.hour ? 'fill-journey-text' : 'fill-journey-muted/60'}`}
            >
              {milestone.label}
            </text>
          );
        })}
        {hours > 0 && hours < HOURS && <circle cx={hand.x} cy={hand.y} r={5} className="fill-journey-accent" />}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[clamp(3.5rem,9vw,6rem)] font-semibold leading-none tracking-[-0.04em] text-journey-text tabular-nums [font-stretch:112%]">
          {String(Math.floor(hours)).padStart(2, '0')}
          <span className="text-journey-muted">h</span>
        </span>
        <span className="mt-3 font-mono text-sm text-journey-accent">{hours >= HOURS ? 'Pitch' : current.label}</span>
      </div>
    </div>
  );
}
