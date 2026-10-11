'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CodeQuestHeatmapDay } from '@/lib/types';
import { intensityClass } from './heatmapColors';

interface ActivityCalendarProps {
  year: number;
  days: CodeQuestHeatmapDay[];
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function ActivityCalendar({ year, days, selectedDate, onSelectDate }: ActivityCalendarProps) {
  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const initialMonth = useMemo(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year) return parsed.getMonth();
    const today = new Date();
    return today.getFullYear() === year ? today.getMonth() : 11;
  }, [selectedDate, year]);

  const [month, setMonth] = useState(initialMonth);
  useEffect(() => setMonth(initialMonth), [initialMonth]);

  const dayByDate = useMemo(() => {
    const map = new Map<string, CodeQuestHeatmapDay>();
    for (const day of days) map.set(day.date, day);
    return map;
  }, [days]);

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="glass-panel mx-auto w-full max-w-sm rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#FF7A00]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">Activity calendar</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={month === 0}
            onClick={() => setMonth((m) => Math.max(0, m - 1))}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-center text-xs font-bold text-[#1A1A2E] dark:text-white">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            disabled={month === 11}
            onClick={() => setMonth((m) => Math.min(11, m + 1))}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
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
          const iso = toIso(year, month, dayNum);
          const info = dayByDate.get(iso);
          const isFuture = iso > todayIso;
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;
          const intensity = info?.intensity ?? 0;
          return (
            <button
              key={iso}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(iso)}
              aria-label={`${iso}${info?.potd_completed ? ', POTD completed' : ''}${info?.active ? ', active coding day' : ''}`}
              aria-pressed={isSelected}
              className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold transition-all ${intensityClass(intensity)} ${
                isFuture
                  ? 'cursor-not-allowed opacity-30'
                  : 'hover:ring-2 hover:ring-[#FF7A00]/50'
              } ${
                isToday ? 'ring-2 ring-[#FF7A00]' : ''
              } ${isSelected ? 'outline outline-2 outline-[#8B2E3B] dark:outline-white' : ''} ${
                intensity >= 3 ? 'text-white' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {dayNum}
              {info?.potd_scheduled && !info?.potd_completed && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#FFA500]" />
              )}
              {info?.potd_completed && (
                <Check className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-500 p-[1px] text-white" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-[#FF7A00] bg-transparent" /> Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFA500]" /> POTD scheduled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3 rounded-full bg-emerald-500 p-[1px] text-white" /> POTD completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" /> Inactive
        </span>
      </div>
    </div>
  );
}
