'use client';

import React, { useMemo, useState } from 'react';
import { Clock, ExternalLink, Inbox } from 'lucide-react';
import type { CodeQuestDailySubmission } from '@/lib/types';

interface DailySubmissionsTableProps {
  submissions: CodeQuestDailySubmission[];
}

const DIFFICULTY_CLASSES: Record<string, string> = {
  EASY: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
  MEDIUM: 'text-[#FF7A00] bg-orange-50 dark:bg-orange-950/40',
  HARD: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function DailySubmissionsTable({ submissions }: DailySubmissionsTableProps) {
  const [verdict, setVerdict] = useState<'ALL' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [difficulty, setDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');

  const filtered = useMemo(
    () =>
      submissions.filter(
        (item) =>
          (verdict === 'ALL' || item.verdict === verdict) &&
          (difficulty === 'ALL' || item.difficulty === difficulty),
      ),
    [submissions, verdict, difficulty],
  );

  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-[#1A1A2E] dark:text-white">Submission history</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by verdict"
            value={verdict}
            onChange={(event) => setVerdict(event.target.value as typeof verdict)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1A1A2E] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">All verdicts</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            aria-label="Filter by difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1A1A2E] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-[#1A1A2E] dark:text-white">No submissions to show</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {submissions.length === 0
              ? 'You did not submit any solutions on this date.'
              : 'No submissions match the selected filters.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-[#1A1A2E] dark:text-white">{item.problem_title}</span>
                  {item.external_url && (
                    <a
                      href={item.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.problem_title}`}
                      className="text-slate-400 transition-colors hover:text-[#FF7A00]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(item.created_at)}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase dark:bg-slate-800">
                    {item.language}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFFICULTY_CLASSES[item.difficulty] ?? ''}`}>
                    {item.difficulty}
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.is_correct
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                }`}
              >
                {item.verdict}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
