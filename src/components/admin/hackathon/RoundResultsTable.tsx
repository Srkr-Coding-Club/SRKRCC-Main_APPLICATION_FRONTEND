'use client';

import React from 'react';
import type { RoundPanelJudge, RoundResultRow } from '@/lib/types';

const number = (value: number | null) => (value === null ? '–' : value.toFixed(1));

/** The closed round: every team's rank and score, what each judge gave, and how far apart the judges were. */
export function RoundResultsTable({ rows, panel }: { rows: RoundResultRow[]; panel: RoundPanelJudge[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">No teams in this round.</p>;
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Round results</caption>
        <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            <th scope="col" className="py-2 pr-3">#</th>
            <th scope="col" className="py-2 pr-3">Team</th>
            <th scope="col" className="py-2 pr-3 text-right">Score</th>
            <th scope="col" className="py-2 pr-3 text-right">Reviews</th>
            {panel.map((judge) => <th key={judge.judge_id} scope="col" className="px-2 py-2 text-right" title={judge.name}>{judge.name.split(' ')[0]}</th>)}
            <th scope="col" className="py-2 pl-2 text-right" title="How far apart the judges were (standard deviation)">Spread</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.entry_id}>
              <td className="py-2 pr-3 font-bold text-journey-accent">{row.rank ?? '–'}</td>
              <th scope="row" className="py-2 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{row.team_name}</th>
              <td className="py-2 pr-3 text-right tabular-nums font-semibold">{number(row.score)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.review_count}</td>
              {panel.map((judge) => <td key={judge.judge_id} className="px-2 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{number(row.per_judge[String(judge.judge_id)] ?? null)}</td>)}
              <td className="py-2 pl-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{number(row.spread)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
