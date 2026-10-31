'use client';

import React from 'react';
import { Clock, IndianRupee } from 'lucide-react';
import { rupees, type MoneySummary } from '@/lib/hackathonOverview';
import { BTN_GHOST, PANEL } from '../shared';

interface MoneyCardProps {
  summary: MoneySummary;
  feeAmount: number;
  onOpen: () => void;
}

/** What has been paid, what is waiting for a check, what was rejected, and what still has to go back to people. */
export function MoneyCard({ summary, feeAmount, onOpen }: MoneyCardProps) {
  const parts = [
    { key: 'verified', label: 'Verified', line: summary.verified, bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'waiting', label: 'Waiting for a check', line: summary.waiting, bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { key: 'rejected', label: 'Rejected', line: summary.rejected, bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  ] as const;
  const total = parts.reduce((sum, part) => sum + part.line.amount, 0);
  const count = parts.reduce((sum, part) => sum + part.line.count, 0);

  return (
    <section className={`${PANEL} flex flex-col gap-3`} aria-label="Fees">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><IndianRupee className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Fees <span className="font-normal text-journey-muted">· {rupees(feeAmount)} per team</span></h3>
        <button type="button" onClick={onOpen} className={BTN_GHOST}>Open payments</button>
      </div>
      {count === 0 ? (
        <p className="text-sm text-journey-muted">No payment has been submitted yet.</p>
      ) : (
        <>
          <p className="text-3xl font-extrabold tabular-nums text-journey-text">{rupees(summary.verified.amount)} <span className="text-sm font-semibold text-journey-muted">verified</span></p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-journey-text/10" role="img" aria-label={parts.map((part) => `${part.label}: ${rupees(part.line.amount)}`).join(', ')}>
            {total > 0 && parts.map((part) => <div key={part.key} className={part.bar} style={{ width: `${(part.line.amount / total) * 100}%` }} />)}
          </div>
          <dl className="grid grid-cols-3 gap-2 text-xs">
            {parts.map((part) => (
              <div key={part.key}><dt className="font-bold uppercase leading-tight text-journey-muted">{part.label}</dt><dd className={`text-base font-extrabold tabular-nums ${part.text}`}>{rupees(part.line.amount)}</dd><dd className="text-journey-muted">{part.line.count} {part.line.count === 1 ? 'team' : 'teams'}</dd></div>
            ))}
          </dl>
          {summary.toSettle.count > 0 && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-journey-text">
              <strong className="tabular-nums">{rupees(summary.toSettle.amount)}</strong> still to settle with {summary.toSettle.count} {summary.toSettle.count === 1 ? 'team' : 'teams'} (rejected payments, and payments of teams that dropped out). The payments export lists them.
            </p>
          )}
          {summary.longWaiting > 0 && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-journey-text"><Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" /> {summary.longWaiting} {summary.longWaiting === 1 ? 'payment has' : 'payments have'} waited over 24 hours for a check.</p>
          )}
        </>
      )}
    </section>
  );
}
