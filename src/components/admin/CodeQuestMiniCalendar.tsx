'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Problem } from '@/lib/types';

interface CodeQuestMiniCalendarProps {
  problems: Problem[];
  onSelect: (problem: Problem) => void;
  onCreate: (date: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Compact, always-on-screen scheduler. Days that already hold a POTD highlight
 * the scheduled problem and open it for editing, while empty future days create
 * a new one. Past days are locked, so a problem can never be scheduled in the
 * past or double-booked onto a taken date.
 */
export function CodeQuestMiniCalendar({
  problems,
  onSelect,
  onCreate,
  className = '',
}: CodeQuestMiniCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const byDate = useMemo(() => {
    const map = new Map<string, Problem>();
    for (const problem of problems) {
      if (!map.has(problem.scheduled_date)) map.set(problem.scheduled_date, problem);
    }
    return map;
  }, [problems]);

  const shift = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const firstWeekday = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className={`glass-panel flex flex-col rounded-xl border border-slate-200 p-4 dark:border-slate-800 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">POTD calendar</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shift(-1)}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[92px] text-center text-xs font-bold text-[#1A1A2E] dark:text-white">
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shift(1)}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-1 text-[10px] font-bold uppercase text-slate-400">
            {label}
          </span>
        ))}
        {cells.map((dayNum, index) => {
          if (dayNum === null) return <span key={`blank-${index}`} />;
          const iso = toIso(cursor.year, cursor.month, dayNum);
          const problem = byDate.get(iso);
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;
          const base = `relative flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold transition-all ${
            isToday ? 'ring-2 ring-[#FF7A00]' : ''
          }`;

          if (problem) {
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelect(problem)}
                title={problem.title}
                aria-label={`${iso}: ${problem.title}. Click to edit.`}
                className={`${base} bg-[#FF7A00] text-white hover:ring-2 hover:ring-[#FF7A00]/60`}
              >
                {dayNum}
              </button>
            );
          }

          if (isPast) {
            return (
              <span
                key={iso}
                aria-disabled
                aria-label={`${iso}: past dates cannot be scheduled`}
                className={`${base} cursor-not-allowed text-slate-300 dark:text-slate-600`}
              >
                {dayNum}
              </span>
            );
          }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onCreate(iso)}
              title={`Schedule a problem on ${iso}`}
              aria-label={`${iso}: schedule a problem`}
              className={`${base} cursor-pointer text-slate-600 hover:bg-orange-50 hover:text-[#FF7A00] dark:text-slate-300 dark:hover:bg-[#FF7A00]/10`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#FF7A00]" /> Scheduled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-[#FF7A00]" /> Today
        </span>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">
        Click an empty day to schedule · past days and taken dates are locked.
      </p>
    </div>
  );
}
