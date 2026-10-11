'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import type { Problem } from '@/lib/types';

interface CodeQuestCalendarProps {
  problems: Problem[];
  /** Server-computed "today" in the backend's timezone (Asia/Kolkata), YYYY-MM-DD. */
  today: string;
  solvedDates: ReadonlySet<string>;
  solvedLoading?: boolean;
  solvedError?: boolean;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DIFFICULTY_TOOLTIP_CLASS: Record<Problem['difficulty'], string> = {
  EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  HARD: 'bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
};

const MIN_VIEWABLE_YEAR = 2026;
const MIN_VIEWABLE_MONTH = 9;

const pad = (value: number) => String(value).padStart(2, '0');

function toDateId(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function CodeQuestCalendar({
  problems,
  today,
  solvedDates,
  solvedLoading = false,
  solvedError = false,
}: CodeQuestCalendarProps) {
  const seed = useMemo(() => new Date(`${today}T00:00:00`), [today]);
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const problemsByDate = useMemo(() => {
    const map = new Map<string, Problem>();
    for (const problem of problems) map.set(problem.scheduled_date, problem);
    return map;
  }, [problems]);

  const [currentYear, currentMonth] = today.split('-').map(Number);
  const atMaxMonth = viewYear === currentYear && viewMonth === currentMonth;
  const atMinMonth =
    viewYear === MIN_VIEWABLE_YEAR && viewMonth === MIN_VIEWABLE_MONTH;

  const shiftMonth = (delta: number) => {
    const months = viewYear * 12 + viewMonth + delta;
    const nextYear = Math.floor(months / 12);
    const nextMonth = ((months % 12) + 12) % 12;
    const belowMin =
      nextYear < MIN_VIEWABLE_YEAR ||
      (nextYear === MIN_VIEWABLE_YEAR && nextMonth < MIN_VIEWABLE_MONTH);
    const beyondMax =
      nextYear > currentYear || (nextYear === currentYear && nextMonth > currentMonth);
    if (belowMin || beyondMax) {
      return;
    }
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null as number | null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const navButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/60 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/60 disabled:hover:text-slate-600 dark:border-slate-700 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:disabled:hover:bg-white/5 dark:disabled:hover:text-slate-300';

  const solvedStatus = solvedLoading
    ? 'Loading your solved progress…'
    : solvedError
      ? "Couldn't load your solved progress. Solved ticks are hidden, but you can still browse the problems."
      : null;

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white sm:text-base">
          {new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            disabled={atMinMonth}
            className={navButtonClass}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            disabled={atMaxMonth}
            className={navButtonClass}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            {label}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                aria-hidden="true"
                className="min-h-8 rounded-xl sm:min-h-9"
              />
            );
          }

          const dateId = toDateId(viewYear, viewMonth, day);
          const isToday = dateId === today;
          const isFuture = dateId > today;
          const problem = problemsByDate.get(dateId);
          const isPotd = isToday && Boolean(problem);
          const isSolved = Boolean(problem) && solvedDates.has(dateId);
          const dateLabel = new Date(viewYear, viewMonth, day).toLocaleDateString(
            'en-US',
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
          );

          if (isFuture) {
            return (
              <time
                key={dateId}
                dateTime={dateId}
                aria-disabled="true"
                className="flex min-h-8 select-none items-center justify-center rounded-lg text-xs text-slate-300 line-through sm:min-h-9 sm:text-sm dark:text-slate-600"
              >
                {day}
              </time>
            );
          }

          const problemLabel = problem
            ? `${dateLabel}. ${problem.title}${isSolved ? ', solved.' : '.'}`
            : dateLabel;

          const cellClass = [
            'relative no-underline flex min-h-8 w-full flex-col items-center justify-center rounded-lg text-xs transition-colors sm:min-h-9 sm:text-sm',
            isPotd
              ? 'bg-[#FF7A00] font-bold text-white shadow-sm'
              : problem
                ? 'border border-orange-500/25 bg-orange-500/[0.08] text-[#1A1A2E] hover:bg-orange-500/20 dark:text-white dark:hover:bg-orange-400/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60',
            isToday ? 'ring-2 ring-[#FF7A00]/80' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const cellContent = (
            <>
              {isPotd && (
                <Star
                  aria-hidden="true"
                  className="absolute left-0.5 top-0.5 h-2.5 w-2.5 fill-white/80 text-white/80"
                />
              )}
              <span className="font-semibold">{day}</span>
              {problem && !isPotd && (
                <span aria-hidden="true" className="mt-0.5 h-1 w-1 rounded-full bg-[#FF7A00]" />
              )}
              {isSolved && (
                <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check aria-hidden="true" className="h-2.5 w-2.5 stroke-[3]" />
                  <span className="sr-only">Solved</span>
                </span>
              )}
            </>
          );

          const tooltip = problem ? (
            <div
              role="tooltip"
              className={[
                'pointer-events-none absolute left-1/2 z-50 w-max max-w-[72vw] -translate-x-1/2 whitespace-normal text-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-[#1A1A2E] shadow-lg transition-opacity duration-150 dark:border-slate-700 dark:bg-slate-900 dark:text-white',
                index < 7 ? 'top-full mt-2' : 'bottom-full mb-2',
                hoveredDate === dateId ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              <span className="block font-bold">{problem.title}</span>
              <span className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${DIFFICULTY_TOOLTIP_CLASS[problem.difficulty]}`}
                >
                  {problem.difficulty}
                </span>
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {dateLabel}
                </span>
              </span>
            </div>
          ) : null;

          if (problem?.external_url) {
            return (
              <a
                key={dateId}
                href={problem.external_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={problemLabel}
                className={cellClass}
                onMouseEnter={() => setHoveredDate(dateId)}
                onMouseLeave={() =>
                  setHoveredDate((current) => (current === dateId ? null : current))
                }
                onFocus={() => setHoveredDate(dateId)}
                onBlur={() =>
                  setHoveredDate((current) => (current === dateId ? null : current))
                }
              >
                {cellContent}
                {tooltip}
              </a>
            );
          }

          if (problem) {
            return (
              <button
                key={dateId}
                type="button"
                aria-label={problemLabel}
                className={cellClass}
                onClick={() => {
                  document
                    .getElementById('codequest-recent')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onMouseEnter={() => setHoveredDate(dateId)}
                onMouseLeave={() =>
                  setHoveredDate((current) => (current === dateId ? null : current))
                }
                onFocus={() => setHoveredDate(dateId)}
                onBlur={() =>
                  setHoveredDate((current) => (current === dateId ? null : current))
                }
              >
                {cellContent}
                {tooltip}
              </button>
            );
          }

          return (
            <time key={dateId} dateTime={dateId} className={cellClass} aria-label={dateLabel}>
              {cellContent}
            </time>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#FF7A00]" />
          Scheduled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full border-2 border-[#FF7A00]" />
          Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex h-2 w-2 items-center justify-center rounded-sm bg-[#FF7A00] text-white"
          >
            <Star className="h-1.5 w-1.5 fill-current" />
          </span>
          POTD
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Check
            aria-hidden="true"
            className="h-3 w-3 rounded-full bg-emerald-500 p-px text-white"
          />
          Solved
        </span>
      </div>

      {solvedStatus && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{solvedStatus}</p>
      )}
    </div>
  );
}