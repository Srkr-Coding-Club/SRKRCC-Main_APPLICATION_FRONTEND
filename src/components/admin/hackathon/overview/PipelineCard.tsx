'use client';

import React from 'react';
import { Workflow } from 'lucide-react';
import { pipeline, type FunnelStep } from '@/lib/hackathonOverview';
import type { HackathonFeatures } from '@/lib/types';
import { PANEL } from '../shared';

/** From registered teams to winners: how many are still in at each step, and where they dropped out. */
export function PipelineCard({ funnel, features, participants }: { funnel: FunnelStep[]; features: HackathonFeatures; participants: number }) {
  const steps = pipeline(funnel, features);
  // Nothing to follow until a team has registered.
  if (steps.length === 0 || steps[0].count === 0) return null;
  const worst = steps.reduce((pick, step) => (step.lost && step.lost.count > 0 && (!pick?.lost || step.lost.percent > pick.lost.percent) ? step : pick), null as (typeof steps)[number] | null);
  return (
    <section className={`${PANEL} space-y-3`} aria-label="Team pipeline">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><Workflow className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Where teams drop out</h3>
        <p className="text-xs text-journey-muted">{participants} people in {steps[0].count} registered teams</p>
      </div>
      <ol className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.key} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-journey-text">{step.label}</span>
              <span className="tabular-nums"><strong className="text-journey-text">{step.count}</strong> <span className="text-xs text-journey-muted">· {step.share}%</span></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-journey-text/10" role="img" aria-label={`${step.label}: ${step.count}, ${step.share}% of registered teams`}>
              <div className="h-full rounded-full bg-gradient-to-r from-journey-live to-journey-accent" style={{ width: `${step.share}%` }} />
            </div>
            {step.lost && step.lost.count > 0 && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">−{step.lost.count} ({step.lost.percent}%) since the step above</p>
            )}
          </li>
        ))}
      </ol>
      {worst?.lost && <p className="rounded-lg bg-journey-text/[0.04] px-3 py-2 text-xs text-journey-text">Biggest drop: <strong>{worst.label}</strong>, where {worst.lost.percent}% of the teams from the step above are missing.</p>}
    </section>
  );
}
