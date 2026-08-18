import React from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { Problem } from '@/lib/types';
import Card from './Card';

interface ProblemCardProps {
  problem: Problem;
}

const DIFFICULTY_CLASSES: Record<Problem['difficulty'], string> = {
  EASY: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  MEDIUM: 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border-orange-200 dark:border-orange-800',
  HARD: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

export default function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <Card
      footer={
        <>
          <div className="flex flex-wrap gap-1.5">
            {problem.tags?.map((t) => (
              <span key={t} className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                #{t}
              </span>
            ))}
          </div>

          {problem.external_url ? (
            <a
              href={problem.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
            >
              <span>Solve on {problem.external_platform || 'External Judge'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              disabled
              title="No solving link set for this problem yet"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed"
            >
              <span>Solve Problem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 -mt-2">
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-extrabold px-3 py-1 rounded-md border ${DIFFICULTY_CLASSES[problem.difficulty]}`}>
            {problem.difficulty} ({problem.points || 100} XP)
          </span>

          <span className="text-xs text-slate-400 font-mono">Date: {problem.scheduled_date}</span>
        </div>

        <span className="text-xs font-mono font-bold text-slate-500">
          Solved by {problem.solved_count || 0} students
        </span>
      </div>

      <div>
        <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
          {problem.title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-2">{problem.statement}</p>
      </div>

      {problem.constraints && (
        <div className="p-3 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300">
          <strong className="text-[#FF7A00]">Constraints:</strong> {problem.constraints}
        </div>
      )}
    </Card>
  );
}
