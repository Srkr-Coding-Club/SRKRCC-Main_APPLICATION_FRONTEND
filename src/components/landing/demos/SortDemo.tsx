'use client';

import React, { useRef } from 'react';
import DemoFrame from './DemoFrame';
import { useScrollSteps } from '../useScrollSteps';

const VALUES = [5, 2, 8, 1, 7, 3, 6, 4];
const MAX_VALUE = Math.max(...VALUES);
const BAR_WIDTH_PCT = 10.5;
/* One slot is 1/8 of the track; translateX percentages are relative to the bar's own width. */
const SLOT_SHIFT_PCT = (100 / VALUES.length / BAR_WIDTH_PCT) * 100;

interface Frame {
  order: number[];
  compared: [number, number] | null;
  swapped: boolean;
  sortedFrom: number;
  comparisons: number;
  swaps: number;
}

/* Every comparison of a bubble sort, recorded so scroll can step through them one by one. */
function bubbleSortFrames(values: number[]): Frame[] {
  const order = [...values];
  const frames: Frame[] = [{ order: [...order], compared: null, swapped: false, sortedFrom: order.length, comparisons: 0, swaps: 0 }];
  let comparisons = 0;
  let swaps = 0;
  for (let pass = 0; pass < order.length - 1; pass++) {
    let swappedThisPass = false;
    for (let i = 0; i < order.length - 1 - pass; i++) {
      comparisons++;
      const swapped = order[i] > order[i + 1];
      if (swapped) {
        [order[i], order[i + 1]] = [order[i + 1], order[i]];
        swaps++;
        swappedThisPass = true;
      }
      frames.push({ order: [...order], compared: [i, i + 1], swapped, sortedFrom: order.length - pass, comparisons, swaps });
    }
    if (!swappedThisPass) break;
  }
  frames.push({ order: [...order], compared: null, swapped: false, sortedFrom: 0, comparisons, swaps });
  return frames;
}

const FRAMES = bubbleSortFrames(VALUES);
const LAST = FRAMES.length - 1;

function describe(frame: Frame) {
  if (frame === FRAMES[0]) return 'Eight numbers, in no particular order.';
  if (!frame.compared) return `Sorted: ${frame.comparisons} comparisons, ${frame.swaps} swaps.`;
  const [a, b] = frame.compared.map((i) => frame.order[i]);
  return frame.swapped ? `${b} is bigger than ${a}, so they swap.` : `${a} is smaller than ${b}, so they stay.`;
}

/* Chapter 03: bubble sort, one comparison per scroll step - the reasoning made visible. */
export default function SortDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScrollSteps(ref, LAST, { start: 'top 75%', end: 'bottom 25%' });
  const frame = FRAMES[step];
  const isDone = step === LAST;

  return (
    <div ref={ref} className="mx-auto max-w-lg lg:mx-0">
      <DemoFrame
        title="bubble_sort"
        aside={
          <span className="tabular-nums">
            {frame.comparisons} compared / {frame.swaps} swapped
          </span>
        }
        caption={<span aria-live="polite">{describe(frame)}</span>}
      >
        <div className="relative mx-5 mb-5 mt-8 h-48 sm:h-56">
          {VALUES.map((value) => {
            const position = frame.order.indexOf(value);
            const isCompared = frame.compared?.includes(position) ?? false;
            const isSorted = isDone || position >= frame.sortedFrom;
            return (
              <div
                key={value}
                className="absolute bottom-0 flex flex-col items-center gap-2 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
                style={{ left: 0, width: `${BAR_WIDTH_PCT}%`, transform: `translateX(${position * SLOT_SHIFT_PCT}%)` }}
              >
                <div
                  className={`w-full rounded-t-[3px] transition-colors duration-300 ${
                    isCompared ? 'bg-journey-accent' : isSorted ? 'bg-journey-text/70' : 'bg-journey-text/20'
                  }`}
                  style={{ height: `${(value / MAX_VALUE) * 9.5}rem` }}
                />
                <span className={`font-mono text-xs tabular-nums ${isCompared ? 'text-journey-accent' : 'text-journey-muted'}`}>{value}</span>
              </div>
            );
          })}
        </div>
      </DemoFrame>
    </div>
  );
}
