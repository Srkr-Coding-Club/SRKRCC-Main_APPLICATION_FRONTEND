'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Target, X } from 'lucide-react';
import type { CodeQuestGoalProgress, CodeQuestGoals } from '@/lib/types';

interface GoalsPanelProps {
  goals: CodeQuestGoals;
  onSave: (daily: number, weekly: number) => Promise<void>;
}

function GoalBar({ label, caption, progress }: { label: string; caption: string; progress: CodeQuestGoalProgress }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className={progress.completed ? 'text-emerald-500' : 'text-[#FF7A00]'}>
          {progress.progress} / {progress.target}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${
            progress.completed
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        {progress.completed && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
        {caption}
      </p>
    </div>
  );
}

export default function GoalsPanel({ goals, onSave }: GoalsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [daily, setDaily] = useState(String(goals.daily.target));
  const [weekly, setWeekly] = useState(String(goals.weekly.target));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDaily(String(goals.daily.target));
      setWeekly(String(goals.weekly.target));
    }
  }, [goals, editing]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const dailyValue = Number(daily);
    const weeklyValue = Number(weekly);
    if (!Number.isFinite(dailyValue) || !Number.isFinite(weeklyValue)) return;
    setSaving(true);
    try {
      await onSave(dailyValue, weeklyValue);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#FF7A00]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">Coding goals</h3>
        </div>
        <button
          type="button"
          onClick={() => setEditing((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-[#FF7A00] hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-400"
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? 'Cancel' : 'Edit targets'}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Targets count distinct problems solved; they never affect XP or badges.
      </p>

      {editing && (
        <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Daily target
            <input
              type="number"
              min={1}
              max={100}
              value={daily}
              onChange={(event) => setDaily(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1A1A2E] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Weekly target
            <input
              type="number"
              min={1}
              max={100}
              value={weekly}
              onChange={(event) => setWeekly(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1A1A2E] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="col-span-2 rounded-lg bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] px-4 py-2 text-xs font-bold text-white transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save goals'}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <GoalBar label="Today" caption={goals.daily.completed ? 'Daily goal complete' : 'Keep going to hit today’s goal'} progress={goals.daily} />
        <GoalBar label="This week" caption={goals.weekly.completed ? 'Weekly goal complete' : 'Solve more to reach this week’s goal'} progress={goals.weekly} />
      </div>
    </div>
  );
}
