'use client';

import React, { useRef } from 'react';
import DemoFrame from './DemoFrame';
import { useScrollSteps } from '../useScrollSteps';

const ROUND_MINUTES = 90;
const PLAYERS = ['You', 'Player A', 'Player B', 'Player C', 'Player D'];

/* Illustrative scores at each checkpoint of a round: "You" starts last and climbs to second. */
const CHECKPOINTS: number[][] = [
  [0, 0, 0, 0, 0],
  [100, 200, 100, 100, 200],
  [300, 300, 200, 300, 400],
  [500, 400, 300, 400, 500],
  [700, 500, 500, 400, 700],
  [800, 600, 600, 500, 900],
];
const STEPS = CHECKPOINTS.length - 1;
const ROW_HEIGHT_REM = 3;

function standings(scores: number[]) {
  return PLAYERS.map((name, i) => ({ name, score: scores[i], index: i })).sort((a, b) => b.score - a.score || (a.index === 0 ? 1 : b.index === 0 ? -1 : a.index - b.index));
}

function clock(minutesLeft: number) {
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

/* Chapter 05: a round under the clock - scores land, ranks reshuffle, you climb. */
export default function ContestDemo({ cadence }: { cadence: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScrollSteps(ref, STEPS);
  const ranked = standings(CHECKPOINTS[step]);
  const minutesLeft = Math.round(ROUND_MINUTES * (1 - step / STEPS));

  return (
    <div ref={ref} className="mx-auto max-w-lg lg:mx-0">
      <DemoFrame
        title="edgecase / round"
        aside={<span className={`tabular-nums ${minutesLeft === 0 ? 'text-journey-accent' : 'text-journey-text'}`}>{minutesLeft === 0 ? 'final standings' : clock(minutesLeft)}</span>}
        caption={cadence}
      >
        <ol className="relative px-2 py-3" style={{ height: `${PLAYERS.length * ROW_HEIGHT_REM + 1.5}rem` }} aria-label="Illustrative leaderboard">
          {PLAYERS.map((name, i) => {
            const rank = ranked.findIndex((row) => row.name === name);
            const isYou = i === 0;
            return (
              <li
                key={name}
                className={`absolute inset-x-2 flex items-center gap-4 rounded-lg px-3 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none ${
                  isYou ? 'bg-journey-accent/10 text-journey-text' : 'text-journey-muted'
                }`}
                style={{ height: `${ROW_HEIGHT_REM - 0.25}rem`, transform: `translateY(${rank * ROW_HEIGHT_REM}rem)` }}
              >
                <span className={`w-6 font-mono text-sm tabular-nums ${isYou ? 'text-journey-accent' : ''}`}>{rank + 1}</span>
                <span className={`flex-1 text-[15px] ${isYou ? 'font-semibold' : ''}`}>{name}</span>
                <span className="font-mono text-sm tabular-nums">{CHECKPOINTS[step][i]}</span>
              </li>
            );
          })}
        </ol>
      </DemoFrame>
    </div>
  );
}
