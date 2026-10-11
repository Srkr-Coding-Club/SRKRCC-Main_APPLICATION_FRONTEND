'use client';

import React from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Code2,
  Flame,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import type { CodeQuestDailyStats } from '@/lib/types';

interface DailyOverviewCardsProps {
  data: CodeQuestDailyStats;
  potdStreak?: number;
}

function BarItem({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'text-[#FF7A00]',
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[118px] flex-1 flex-col gap-0.5 px-4 py-3 ${
        highlight ? 'bg-[#FF7A00]/5 dark:bg-[#FF7A00]/10' : ''
      }`}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className={`h-3.5 w-3.5 ${accent}`} /> {label}
      </span>
      <span className="text-xl font-extrabold leading-tight text-[#1A1A2E] dark:text-white">{value}</span>
      {sub && <span className="text-[10px] font-medium text-slate-400">{sub}</span>}
    </div>
  );
}

export default function DailyOverviewCards({ data, potdStreak }: DailyOverviewCardsProps) {
  const { solved_by_difficulty: diff } = data;
  return (
    <div className="glass-panel overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap divide-x divide-slate-200 dark:divide-slate-800">
        <BarItem icon={Code2} label="Submissions" value={data.total_submissions} sub={`${data.unique_attempted} unique attempted`} />
        <BarItem icon={CheckCircle2} label="Accepted" value={data.accepted_submissions} sub={`${data.unique_solved} unique solved`} />
        <BarItem icon={XCircle} label="Rejected" value={data.rejected_submissions} accent="text-[#8B2E3B] dark:text-rose-400" />
        <BarItem icon={Zap} label="XP earned" value={data.xp_earned} sub="that day" accent="text-[#FFA500]" />
        <BarItem icon={BadgeCheck} label="Easy solved" value={diff.EASY} accent="text-emerald-500" />
        <BarItem icon={BadgeCheck} label="Medium solved" value={diff.MEDIUM} accent="text-[#FF7A00]" />
        <BarItem icon={BadgeCheck} label="Hard solved" value={diff.HARD} accent="text-rose-500" />
        <BarItem
          icon={Flame}
          label="Streak"
          value={data.streak_maintained ? 'Maintained' : 'Not maintained'}
          sub={`Current: ${data.coding_streak.current} days`}
          accent={data.streak_maintained ? 'text-[#FF7A00]' : 'text-slate-400'}
        />
        {potdStreak !== undefined && (
          <BarItem
            icon={Target}
            label="POTD streak"
            value={`${potdStreak}d`}
            sub="Consecutive POTDs solved"
            accent="text-[#FFA500]"
            highlight
          />
        )}
      </div>
    </div>
  );
}
