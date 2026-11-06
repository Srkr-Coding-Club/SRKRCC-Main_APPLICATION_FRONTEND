'use client';

import React from 'react';
import type { RoundCriterion } from '@/lib/types';

const QUICK_PICK_LIMIT = 10;
const FIELD = 'h-11 w-20 rounded-lg border border-journey-text/20 bg-transparent px-2 text-center text-base font-semibold text-journey-text focus:border-journey-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/40 sm:text-sm';

interface ScoreInputProps {
  id: string;
  criterion: RoundCriterion;
  value: string;
  onChange: (value: string) => void;
}

/**
 * One criterion: its name, what to look for, a number box for an exact score, one-tap buttons for whole scores
 * (when the scale is short enough) and a bar that shows how much of the maximum the score is.
 */
export function ScoreInput({ id, criterion, value, onChange }: ScoreInputProps) {
  const max = criterion.max_score;
  const number = value === '' ? null : Number(value);
  const valid = number !== null && Number.isFinite(number) && number >= 0 && number <= max;
  const percent = valid ? Math.round(((number as number) / max) * 100) : 0;
  const quick = max <= QUICK_PICK_LIMIT ? Array.from({ length: max + 1 }, (_, index) => index) : [];

  return (
    <div className="space-y-3 rounded-xl border border-journey-text/10 bg-journey-text/[0.03] p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-tight text-journey-text">{criterion.name}</span>
          <span className="mt-0.5 inline-block rounded-full bg-journey-text/10 px-2 py-0.5 text-[11px] font-bold text-journey-muted">weight {criterion.weight}</span>
          {criterion.description && <span className="mt-1 block text-xs leading-snug text-journey-muted">{criterion.description}</span>}
        </label>
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            id={id} type="number" inputMode="decimal" required min={0} max={max} step="0.5" className={FIELD}
            value={value} onChange={(event) => onChange(event.target.value)}
          />
          <span className="text-xs text-journey-muted">/ {max}</span>
        </div>
      </div>

      {quick.length > 0 && (
        <div role="radiogroup" aria-label={`Quick pick for ${criterion.name}`} className="flex flex-wrap gap-1.5">
          {quick.map((score) => {
            const chosen = valid && number === score;
            return (
              <button
                key={score} type="button" role="radio" aria-checked={chosen} aria-label={`${score} out of ${max}`} onClick={() => onChange(String(score))}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition active:scale-95 sm:h-9 sm:w-9 ${
                  chosen ? 'border-journey-accent bg-journey-accent text-journey-on-accent' : 'border-journey-text/15 text-journey-text/80 hover:border-journey-accent/60 hover:bg-journey-accent/10'
                }`}
              >
                {score}
              </button>
            );
          })}
        </div>
      )}

      <div className="h-1.5 overflow-hidden rounded-full bg-journey-text/10" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-journey-accent/70 to-journey-accent transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
