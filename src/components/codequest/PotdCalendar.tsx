'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type { CodeQuestHeatmap, Problem } from '@/lib/types';

interface PotdCalendarProps {
  problems: Problem[];
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

function MonthProgress({ solved, total }: { solved: number; total: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(1, solved / total) : 0;
  return (
    <div
      className="relative h-14 w-14 shrink-0"
      title={`${solved} of ${total} POTDs solved this month`}
      aria-label={`${solved} of ${total} POTDs solved this month`}
      role="img"
    >
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke="#FF7A00"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold leading-none text-[#1A1A2E] dark:text-white">{solved}</span>
        <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">solved</span>
      </div>
    </div>
  );
}

export default function PotdCalendar({ problems, className = '' }: PotdCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [solvedDates, setSolvedDates] = useState<Set<string>>(new Set());

  const byDate = useMemo(() => {
    const map = new Map<string, Problem>();
    for (const problem of problems) {
      if (!map.has(problem.scheduled_date)) map.set(problem.scheduled_date, problem);
    }
    return map;
  }, [problems]);

  const earliest = useMemo(() => {
    if (problems.length === 0) return { year: today.getFullYear(), month: today.getMonth() };
    const first = problems
      .map((problem) => problem.scheduled_date)
      .sort()[0];
    const [year, month] = first.split('-').map(Number);
    return { year, month: month - 1 };
  }, [problems, today]);

  // Solved days come from the server (per-user POTD completion for the viewed
  // year). Anonymous callers get a 401 and simply see no stars.
  useEffect(() => {
    let active = true;
    fetchApi<CodeQuestHeatmap>(`/codequest/stats/heatmap/?year=${cursor.year}`)
      .then((data) => {
        if (!active) return;
        setSolvedDates(new Set(data.days.filter((day) => day.potd_completed).map((day) => day.date)));
      })
      .catch(() => {
        if (active) setSolvedDates(new Set());
      });
    return () => {
      active = false;
    };
  }, [cursor.year]);

  const monthStart = new Date(cursor.year, cursor.month, 1);
  const canGoPrev = monthStart > new Date(earliest.year, earliest.month, 1);
  const canGoNext = monthStart < new Date(today.getFullYear(), today.getMonth(), 1);

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
  const monthDays = cells.filter((day): day is number => day !== null);
  const monthTotal = monthDays.filter((day) => byDate.has(toIso(cursor.year, cursor.month, day))).length;
  const monthSolved = monthDays.filter(
    (day) => byDate.has(toIso(cursor.year, cursor.month, day)) && solvedDates.has(toIso(cursor.year, cursor.month, day)),
  ).length;

  const goToProblem = (slug: string) => {
    const target = document.getElementById(`problem-${slug}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`glass-panel flex flex-col rounded-xl border border-slate-200 p-4 dark:border-slate-800 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canGoPrev}
            onClick={() => shift(-1)}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-center text-xs font-bold text-[#1A1A2E] dark:text-white">
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => shift(1)}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <MonthProgress solved={monthSolved} total={monthTotal} />
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
          const isFuture = iso > todayIso;
          const isAvailable = Boolean(problem) && !isFuture;
          const isSolved = solvedDates.has(iso);
          const tone = isFuture
            ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
            : isAvailable
              ? `cursor-pointer text-[#1A1A2E] hover:ring-2 hover:ring-[#FF7A00]/50 dark:text-white ${
                  isSolved ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-slate-100/70 dark:bg-slate-800/40'
                }`
              : 'cursor-default text-slate-400 dark:text-slate-500';
          const base = `relative flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold transition-all ${
            isToday ? 'ring-2 ring-[#FF7A00]' : ''
          } ${tone}`;

          if (!isAvailable || !problem) {
            return (
              <span
                key={iso}
                aria-disabled={isFuture || undefined}
                aria-label={`${iso}: ${isFuture ? 'locked, unlocks on its scheduled date' : 'no challenge'}`}
                className={base}
              >
                {dayNum}
              </span>
            );
          }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => goToProblem(problem.slug)}
              aria-label={`${iso}: ${problem.title} (${problem.difficulty}). Jump to challenge.`}
              title={problem.title}
              className={base}
            >
              {dayNum}
              {isSolved && (
                <Star className="absolute bottom-0.5 h-2.5 w-2.5 text-[#FFA500]" fill="currentColor" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-[#FF7A00]" /> Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3 w-3 text-[#FFA500]" fill="currentColor" /> Solved
        </span>
      </div>
    </div>
  );
}
