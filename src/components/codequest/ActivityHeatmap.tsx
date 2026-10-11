'use client';

import React, { useMemo, useState } from 'react';
import { Activity, CalendarRange } from 'lucide-react';
import type { CodeQuestHeatmap, CodeQuestHeatmapDay } from '@/lib/types';
import { intensityClass } from './heatmapColors';

interface ActivityHeatmapProps {
  data: CodeQuestHeatmap;
  year: number;
  onYearChange?: (year: number) => void;
  selectedDate?: string;
  onSelectDate?: (iso: string) => void;
  title?: string;
}

interface TooltipState {
  day: CodeQuestHeatmapDay;
  x: number;
  y: number;
}

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityHeatmap({
  data,
  year,
  onYearChange,
  selectedDate,
  onSelectDate,
  title = 'Coding activity heatmap',
}: ActivityHeatmapProps) {
  const interactive = Boolean(onSelectDate);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const weeks = useMemo(() => {
    const padded: (CodeQuestHeatmapDay | null)[] = [];
    if (data.days.length > 0) {
      const firstDate = new Date(`${data.days[0].date}T00:00:00`);
      const offset = (firstDate.getDay() + 6) % 7; // Monday-first
      for (let i = 0; i < offset; i += 1) padded.push(null);
    }
    padded.push(...data.days);
    const result: (CodeQuestHeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) result.push(padded.slice(i, i + 7));
    return result;
  }, [data.days]);

  // Month separator labels aligned to the week columns (GitHub-style), so each
  // month is visually distinguishable within the year grid.
  const monthLabels = useMemo(() => {
    let lastMonth = -1;
    return weeks.map((week) => {
      const firstDay = week.find((day): day is CodeQuestHeatmapDay => day !== null);
      if (!firstDay) return '';
      const month = Number(firstDay.date.slice(5, 7)) - 1;
      if (month === lastMonth) return '';
      lastMonth = month;
      return MONTH_SHORT[month] ?? '';
    });
  }, [weeks]);

  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#FF7A00]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {data.totals.active_days} active days
            {data.most_active_day && ` · best ${data.most_active_day.date} (${data.most_active_day.accepted})`}
          </span>
          {onYearChange && (
            <select
              aria-label="Select heatmap year"
              value={year}
              onChange={(event) => onYearChange(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1A1A2E] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {data.available_years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="heatmap-scroll overflow-x-auto pb-3">
        <div className="flex w-full min-w-max justify-between gap-1">
          <div className="flex shrink-0 flex-col gap-1 pr-1">
            <span className="h-4" />
            {WEEKDAYS.map((label, index) => (
              <span key={index} className="h-4 text-[9px] leading-4 text-slate-400">
                {label}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              <span className="h-4 whitespace-nowrap text-[9px] leading-4 text-slate-400">
                {monthLabels[weekIndex]}
              </span>
              {week.map((day, dayIndex) => {
                if (!day) return <span key={dayIndex} className="h-4 w-4" />;
                const isSelected = day.date === selectedDate;
                const cellClass = `h-4 w-4 rounded-sm transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF7A00] ${
                  interactive ? 'cursor-pointer' : 'cursor-default'
                } ${intensityClass(day.intensity)} ${
                  isSelected ? 'outline outline-2 outline-[#8B2E3B] dark:outline-white' : ''
                }`;
                const ariaLabel = `${day.date}: ${day.submissions} submissions, ${day.accepted} accepted, ${day.solved} solved, ${day.xp} XP`;
                const showTooltip = (event: React.MouseEvent<HTMLElement>) =>
                  setTooltip({ day, x: event.clientX, y: event.clientY });

                if (!interactive) {
                  return (
                    <span
                      key={day.date}
                      aria-label={ariaLabel}
                      title={ariaLabel}
                      onMouseEnter={showTooltip}
                      onMouseMove={showTooltip}
                      onMouseLeave={() => setTooltip(null)}
                      className={cellClass}
                    />
                  );
                }
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-label={ariaLabel}
                    title={ariaLabel}
                    onClick={() => onSelectDate?.(day.date)}
                    onMouseEnter={showTooltip}
                    onMouseMove={showTooltip}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setTooltip({ day, x: rect.left, y: rect.top });
                    }}
                    onBlur={() => setTooltip(null)}
                    className={cellClass}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <span>Less</span>
          {data.intensity_rules.map((rule) => (
            <span key={rule.level} className={`h-3 w-3 rounded-sm ${intensityClass(rule.level)}`} title={rule.label} />
          ))}
          <span>More</span>
          <span className="ml-2 inline-flex items-center gap-1">
            <CalendarRange className="h-3 w-3" /> Intensity = accepted problems per day
          </span>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-[#1A1A2E]"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="font-bold text-[#1A1A2E] dark:text-white">{tooltip.day.date}</p>
          <p className="text-slate-500 dark:text-slate-400">
            {tooltip.day.submissions} submissions · {tooltip.day.accepted} accepted
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {tooltip.day.solved} solved · {tooltip.day.xp} XP
          </p>
          {tooltip.day.potd_completed && <p className="text-emerald-500">POTD completed</p>}
        </div>
      )}
    </div>
  );
}
