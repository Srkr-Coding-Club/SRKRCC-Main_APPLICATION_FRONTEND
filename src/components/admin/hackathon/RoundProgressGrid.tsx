'use client';

import React from 'react';
import { CheckCircle2, Circle, MinusCircle } from 'lucide-react';
import type { RoundCellState, RoundProgress } from '@/lib/types';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';

const CELL: Record<RoundCellState, { label: string; icon: React.ReactNode }> = {
  scored: { label: 'Scored', icon: <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" aria-hidden="true" /> },
  pending: { label: 'Still to score', icon: <Circle className="mx-auto h-4 w-4 text-slate-400" aria-hidden="true" /> },
  recused: { label: 'Stepped aside', icon: <MinusCircle className="mx-auto h-4 w-4 text-amber-500" aria-hidden="true" /> },
};

/** Teams down the side, judges across the top: who has scored, who still has to, who stepped aside. */
export function RoundProgressGrid({ progress }: { progress: RoundProgress }) {
  const { judges, teams, totals } = progress;
  const percent = totals.assigned ? Math.round((totals.scored / totals.assigned) * 100) : 0;
  if (judges.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">No judges on this round yet.</p>;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{totals.scored} of {totals.assigned} scores in ({percent}%)</p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Scores in">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Judges">
        {judges.map((judge) => (
          <li key={judge.judge_id} className="rounded-lg border border-slate-200 p-2.5 text-xs dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{judge.name}</p>
            <p className="text-slate-500 dark:text-slate-400">
              {judge.scored} of {judge.assigned} scored{judge.recused ? ` · ${judge.recused} stepped aside` : ''}
            </p>
            <p className="text-slate-500 dark:text-slate-400">{judge.last_activity ? `Last score ${formatDateTime(judge.last_activity)}` : 'Has not scored yet'}</p>
          </li>
        ))}
      </ul>

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="sr-only">Who has scored which team</caption>
          <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th scope="col" className="py-2 pr-3">Team</th>
              {judges.map((judge) => <th key={judge.judge_id} scope="col" className="max-w-[7rem] truncate px-2 py-2 text-center" title={judge.name}>{judge.name.split(' ')[0]}</th>)}
              <th scope="col" className="py-2 pl-2 text-right">Reviews</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {teams.map((team) => (
              <tr key={team.entry_id}>
                <th scope="row" className="py-2 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{team.team_name}</th>
                {judges.map((judge) => {
                  const cell = team.cells.find((item) => item.judge_id === judge.judge_id);
                  return (
                    <td key={judge.judge_id} className="px-2 py-2 text-center">
                      {cell ? <span title={CELL[cell.state].label}>{CELL[cell.state].icon}<span className="sr-only">{CELL[cell.state].label}</span></span> : <span aria-label="Not assigned" className="text-slate-300 dark:text-slate-600">–</span>}
                    </td>
                  );
                })}
                <td className="py-2 pl-2 text-right text-xs">
                  <span className={team.needs ? 'font-bold text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}>
                    {team.review_count}{team.needs ? ` (needs ${team.needs} more)` : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
