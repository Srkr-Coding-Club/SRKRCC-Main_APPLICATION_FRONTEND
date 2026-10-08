'use client';

import React, { useRef } from 'react';
import DemoFrame from './DemoFrame';
import { useScrollSteps } from '../useScrollSteps';

const DAYS = 21;
const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 200;
const MARGIN = 20;

/* Each solved day is a node on a rising route - the streak literally climbs. */
const NODES = Array.from({ length: DAYS }, (_, i) => {
  const t = i / (DAYS - 1);
  return {
    x: Math.round(MARGIN + t * (VIEW_WIDTH - MARGIN * 2)),
    y: Math.round(VIEW_HEIGHT - MARGIN - t * (VIEW_HEIGHT - MARGIN * 3.2) - (i % 2 === 1 ? 14 : 0)),
  };
});
const ROUTE = NODES.map((node, i) => `${i === 0 ? 'M' : 'L'}${node.x} ${node.y}`).join(' ');
const ROUTE_LENGTH = NODES.reduce((sum, node, i) => (i === 0 ? 0 : sum + Math.hypot(node.x - NODES[i - 1].x, node.y - NODES[i - 1].y)), 0);
const segmentLengthTo = (index: number) =>
  NODES.slice(1, index + 1).reduce((sum, node, i) => sum + Math.hypot(node.x - NODES[i].x, node.y - NODES[i].y), 0);

/* Chapter 04: a problem a day, solved and connected - consistency you can see. */
export default function StreakDemo({ latest }: { latest?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const solved = useScrollSteps(ref, DAYS);
  const drawn = solved > 1 ? segmentLengthTo(solved - 1) : 0;

  return (
    <div ref={ref} className="mx-auto max-w-lg lg:mx-0">
      <DemoFrame
        title="codequest"
        aside={
          <span className="tabular-nums">
            {solved === 0 ? 'day 1' : `${solved}-day streak`}
          </span>
        }
        caption={latest}
      >
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="block w-full px-2 py-4" role="img" aria-label={`${solved} of ${DAYS} daily problems solved in a row`}>
          <path d={ROUTE} fill="none" className="stroke-journey-text/10" strokeWidth={1} />
          <path
            d={ROUTE}
            fill="none"
            className="stroke-journey-accent transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
            strokeWidth={1.5}
            strokeDasharray={ROUTE_LENGTH}
            strokeDashoffset={ROUTE_LENGTH - drawn}
          />
          {NODES.map((node, i) => {
            const isSolved = i < solved;
            const isToday = i === solved - 1 && solved < DAYS;
            return (
              <g key={i}>
                {isToday && <circle cx={node.x} cy={node.y} r={9} className="fill-none stroke-journey-accent/40" strokeWidth={1} />}
                <rect
                  x={node.x - 4}
                  y={node.y - 4}
                  width={8}
                  height={8}
                  transform={`rotate(45 ${node.x} ${node.y})`}
                  className={`transition-colors duration-300 ${isSolved ? 'fill-journey-accent' : 'fill-journey-bg stroke-journey-text/25'}`}
                  strokeWidth={1}
                />
              </g>
            );
          })}
          <text x={MARGIN} y={VIEW_HEIGHT - 2} className="fill-journey-muted font-mono text-[10px]">
            day 1
          </text>
          <text x={NODES[DAYS - 1].x} y={NODES[DAYS - 1].y + 22} textAnchor="end" className="fill-journey-muted font-mono text-[10px]">
            day {DAYS}
          </text>
        </svg>
      </DemoFrame>
    </div>
  );
}
