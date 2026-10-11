'use client';

import React from 'react';
import { Award, CalendarCheck, Flame, Target, TrendingUp } from 'lucide-react';
import type { CodeQuestPotdSummary, CodeQuestStreakSummary } from '@/lib/types';

interface StreaksPanelProps {
  streak: CodeQuestStreakSummary;
  potd: CodeQuestPotdSummary;
}

export default function StreaksPanel({ streak, potd }: StreaksPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-[#FF7A00]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">Coding streak</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Any day with at least one submission counts as active.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/30">
            <p className="text-[11px] font-bold uppercase text-slate-400">Current</p>
            <p className="text-2xl font-extrabold text-[#FF7A00]">{streak.current_streak}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase text-slate-400">Longest</p>
            <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{streak.longest_streak}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase text-slate-400">Active days</p>
            <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{streak.total_active_days}</p>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Next milestone:{' '}
          {streak.next_milestone ? (
            <span className="text-[#FF7A00]">{streak.next_milestone} days</span>
          ) : (
            <span className="text-emerald-500">All milestones reached</span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {streak.milestones.map((milestone) => (
            <span
              key={milestone.target}
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                milestone.achieved
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              {milestone.target}d
            </span>
          ))}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Last 14 days</p>
          <div className="flex gap-1">
            {streak.recent_activity.map((day) => (
              <span
                key={day.date}
                title={day.date}
                className={`h-4 flex-1 rounded-sm ${day.active ? 'bg-[#FF7A00]' : 'bg-slate-200 dark:bg-slate-800'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#8B2E3B] dark:text-[#FFA500]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">POTD streak</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Counts a day only when you solve that day&apos;s scheduled challenge.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/30">
            <p className="text-[11px] font-bold uppercase text-slate-400">Current</p>
            <p className="text-2xl font-extrabold text-[#FF7A00]">{potd.current_streak}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase text-slate-400">Longest</p>
            <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{potd.longest_streak}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold uppercase text-slate-400">Completed</p>
            <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{potd.total_completed}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> {potd.total_completed} / {potd.total_eligible} eligible POTDs
            </span>
            <span className="text-[#FF7A00]">{potd.completion_percentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]"
              style={{ width: `${Math.min(100, potd.completion_percentage)}%` }}
            />
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Next milestone:{' '}
          {potd.next_milestone ? (
            <span className="text-[#FF7A00]">{potd.next_milestone} POTDs</span>
          ) : (
            <span className="text-emerald-500">All milestones reached</span>
          )}
        </p>

        <div className="mt-4">
          <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <CalendarCheck className="h-3 w-3" /> Last 14 days
          </p>
          <ul className="space-y-1">
            {potd.recent_history
              .filter((day) => day.scheduled)
              .slice(-5)
              .reverse()
              .map((day) => (
                <li key={day.date} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-600 dark:text-slate-300">{day.title ?? day.date}</span>
                  {day.completed ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                      <TrendingUp className="h-3 w-3" /> Completed
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-400">Missed</span>
                  )}
                </li>
              ))}
            {potd.recent_history.every((day) => !day.scheduled) && (
              <li className="text-xs text-slate-500 dark:text-slate-400">No recent scheduled challenges.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
