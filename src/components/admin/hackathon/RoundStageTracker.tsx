'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { RoundEvaluationStatus } from '@/lib/types';

const STEPS: { status: RoundEvaluationStatus; label: string; hint: string }[] = [
  { status: 'NOT_STARTED', label: 'Set up', hint: 'Teams, criteria and judges' },
  { status: 'IN_PROGRESS', label: 'Judges scoring', hint: 'Scores arrive' },
  { status: 'CLOSED', label: 'Closed', hint: 'Ranked, ready to shortlist' },
];

/** Where a judged round is in its life, so the organizer always knows what comes next. */
export function RoundStageTracker({ status }: { status: RoundEvaluationStatus }) {
  const current = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Stages of this round">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.status} aria-current={active ? 'step' : undefined} className="min-w-0">
            <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-journey-accent' : 'bg-slate-300/60 dark:bg-slate-700'}`} aria-hidden="true" />
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-journey-accent text-journey-on-accent' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {done ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
              </span>
              <span className={`truncate text-xs font-bold ${active ? 'text-[#1A1A2E] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{step.label}</span>
              <span className="sr-only">{done ? ', done' : active ? ', current stage' : ', still to come'}</span>
            </div>
            <p className="mt-0.5 hidden truncate pl-6 text-[11px] text-slate-500 dark:text-slate-400 sm:block">{step.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
