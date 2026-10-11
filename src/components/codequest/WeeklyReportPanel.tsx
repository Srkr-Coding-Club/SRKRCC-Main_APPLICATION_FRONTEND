'use client';

import React from 'react';
import { CalendarRange, CheckCircle2, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { CodeQuestWeeklyReport } from '@/lib/types';

interface WeeklyReportPanelProps {
  report: CodeQuestWeeklyReport;
}

function Delta({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-500">
        <TrendingUp className="h-3 w-3" /> +{value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-500">
        <TrendingDown className="h-3 w-3" /> {value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-400">
      <Minus className="h-3 w-3" /> 0
    </span>
  );
}

export default function WeeklyReportPanel({ report }: WeeklyReportPanelProps) {
  const metrics: { label: string; value: number; delta: number }[] = [
    { label: 'Submissions', value: report.current.submissions, delta: report.deltas.submissions },
    { label: 'Solved', value: report.current.solved, delta: report.deltas.solved },
    { label: 'Active days', value: report.current.active_days, delta: report.deltas.active_days },
    { label: 'XP earned', value: report.current.xp, delta: report.deltas.xp },
  ];
  const peak = Math.max(...report.days.map((day) => day.solved), 1);

  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-[#FF7A00]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">Weekly report</h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {report.week_start} → {report.week_end}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase text-slate-400">{metric.label}</p>
            <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{metric.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold">
              <Delta value={metric.delta} /> <span className="text-slate-400">vs last week</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Problems solved per day</p>
        <div className="flex items-end gap-1.5">
          {report.days.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end">
                <div
                  className={`w-full rounded-t ${
                    day.future ? 'bg-slate-100 dark:bg-slate-800/40' : 'bg-gradient-to-t from-[#8B2E3B] to-[#FF7A00]'
                  }`}
                  style={{ height: `${day.future ? 4 : Math.max((day.solved / peak) * 100, day.solved > 0 ? 12 : 3)}%` }}
                  title={`${day.date}: ${day.solved} solved`}
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{day.weekday.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Weekly missions</p>
        <ul className="space-y-2.5">
          {report.missions.map((mission) => {
            const percentage = mission.target ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 100;
            return (
              <li key={mission.code}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    {mission.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {mission.label}
                  </span>
                  <span className={mission.completed ? 'text-emerald-500' : 'text-slate-400'}>
                    {mission.progress}/{mission.target}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${mission.completed ? 'bg-emerald-500' : 'bg-[#FF7A00]'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
