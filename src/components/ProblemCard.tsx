import { ArrowRight, Calendar, ExternalLink, Laptop, Users } from 'lucide-react';
import { Problem } from '@/lib/types';
import PublicListingCard from '@/components/PublicListingCard';

interface ProblemCardProps {
  problem: Problem;
  index?: number;
}

const DIFFICULTY_CLASS: Record<Problem['difficulty'], string> = {
  EASY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  HARD: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
};

const DIFFICULTY_DOT_CLASS: Record<Problem['difficulty'], string> = {
  EASY: 'bg-emerald-500 dark:bg-emerald-400',
  MEDIUM: 'bg-amber-500 dark:bg-amber-400',
  HARD: 'bg-rose-500 dark:bg-rose-400',
};

export default function ProblemCard({ problem, index = 0 }: ProblemCardProps) {
  return (
    <PublicListingCard
      accent="#FF7A00"
      index={index}
      category={
        <>
          <Laptop className="h-3 w-3" />
          CodeQuest
        </>
      }
      status={
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${DIFFICULTY_CLASS[problem.difficulty]}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_DOT_CLASS[problem.difficulty]}`} />
          {problem.difficulty} · {problem.points || 100} XP
        </span>
      }
      schedule={
        <>
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#FF7A00]" />
          {problem.scheduled_date}
        </>
      }
      title={problem.title}
      description={problem.statement}
      descriptionClassName="mb-3"
      details={
        <div className="grid gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-[#FF7A00]" />
            <span className="font-medium">Solved by {problem.solved_count || 0} students</span>
          </div>
          {problem.constraints && (
            <p className="line-clamp-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-600 dark:border-slate-800 dark:bg-[#0D0E15] dark:text-slate-300">
              <strong className="text-[#FF7A00]">Constraints:</strong> {problem.constraints}
            </p>
          )}
        </div>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-5">
          <div className="flex flex-wrap gap-1.5">
            {problem.tags?.map((tag) => (
              <span key={tag} className="rounded-md border border-orange-500/15 bg-orange-500/[0.06] px-2.5 py-0.5 text-[11px] font-mono text-orange-800 dark:border-orange-400/15 dark:bg-orange-400/[0.08] dark:text-orange-200">
                #{tag}
              </span>
            ))}
          </div>
          {problem.external_url ? (
            <a
              href={problem.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#E06B00]"
            >
              <span>Solve on {problem.external_platform || 'External Judge'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              disabled
              title="No solving link set for this problem yet"
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            >
              <span>Solve Problem</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      }
    />
  );
}
