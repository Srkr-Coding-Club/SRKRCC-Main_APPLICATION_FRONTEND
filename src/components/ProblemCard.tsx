import React from 'react';
import { ExternalLink, ArrowRight, Clock, Flame } from 'lucide-react';
import type { Problem } from '@/lib/types';
import Card from './Card';
import MidnightCountdown from './MidnightCountdown';

interface ProblemCardProps {
  problem: Problem;
  highlight?: boolean;
  compact?: boolean;
}

const DIFFICULTY_CLASSES: Record<Problem['difficulty'], string> = {
  EASY: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  MEDIUM: 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border-orange-200 dark:border-orange-800',
  HARD: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

function SolveLink({ problem, compact = false }: { problem: Problem; compact?: boolean }) {
  if (problem.external_url) {
    return (
      <a
        href={problem.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className={
          compact
            ? 'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FF7A00] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#E06B00]'
            : 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#E06B00] sm:w-auto'
        }
      >
        <span>{compact ? problem.external_platform || 'Solve' : `Solve on ${problem.external_platform || 'External Judge'}`}</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <button
      disabled
      title="No solving link set for this problem yet"
      className={
        compact
          ? 'inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          : 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-200 px-5 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed sm:w-auto'
      }
    >
      <span>Solve Problem</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

export default function ProblemCard({ problem, highlight = false, compact = false }: ProblemCardProps) {
  if (compact) {
    return (
      <Card bodyClassName="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#1A1A2E] transition group-hover:text-[#FF7A00] dark:text-white">
              {problem.title}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Date: {problem.scheduled_date}</span>
          </div>
          <SolveLink problem={problem} compact />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={highlight ? 'border-[#FF7A00]/50 ring-2 ring-[#FF7A00]/40 shadow-md' : ''}
      bodyClassName="p-4 space-y-3"
      footerClassName="px-4 pb-4 pt-2"
      footer={
        <div
          className={`flex w-full flex-col gap-3 sm:flex-row sm:items-center ${
            highlight && problem.tags?.length ? 'sm:justify-between' : 'sm:justify-end'
          }`}
        >
          {highlight && problem.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}

          <SolveLink problem={problem} />
        </div>
      }
    >
      {highlight && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm">
            <Flame className="h-3.5 w-3.5" /> Today&apos;s POTD
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            <MidnightCountdown />
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-3 py-1 text-xs font-extrabold ${DIFFICULTY_CLASSES[problem.difficulty]}`}>
            {problem.difficulty} ({problem.points || 100} XP)
          </span>

          <span className="font-mono text-xs text-slate-400">Date: {problem.scheduled_date}</span>
        </div>

        {(problem.solved_count ?? 0) > 0 && (
          <span className="font-mono text-xs font-bold text-slate-500">Solved by {problem.solved_count} students</span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="break-words text-base font-bold text-[#1A1A2E] transition group-hover:text-[#FF7A00] dark:text-white sm:text-lg">
          {problem.title}
        </h3>
        <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
          {problem.statement}
        </p>
      </div>
    </Card>
  );
}
