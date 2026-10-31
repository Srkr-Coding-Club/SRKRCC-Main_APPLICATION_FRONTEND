'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { visibleStages, type StageKey } from '@/lib/hackathonOverview';
import type { HackathonFeatures } from '@/lib/types';

/** Where the hackathon is: finished stages ticked, the current one highlighted. */
export function StageStrip({ current, features }: { current: StageKey; features: HackathonFeatures | undefined }) {
  const stages = visibleStages(features);
  const at = Math.max(stages.findIndex((stage) => stage.key === current), 0);
  return (
    <nav aria-label="Stage of the hackathon" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5 text-xs">
        {stages.map((stage, index) => {
          const state = index < at ? 'done' : index === at ? 'now' : 'next';
          return (
            <li key={stage.key} aria-current={state === 'now' ? 'step' : undefined} className="flex items-center gap-1.5">
              {index > 0 && <span className={`h-px w-4 sm:w-8 ${index <= at ? 'bg-journey-accent' : 'bg-journey-text/15'}`} aria-hidden="true" />}
              <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 font-bold ${state === 'now' ? 'border-journey-accent bg-journey-accent text-journey-on-accent' : state === 'done' ? 'border-journey-accent/40 text-journey-text' : 'border-journey-text/10 text-journey-muted'}`}>
                {state === 'done' && <Check className="h-3 w-3 text-journey-accent" aria-hidden="true" />}
                {stage.label}
                {state === 'now' && <span className="sr-only"> (now)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
