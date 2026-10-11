'use client';

import React from 'react';
import { Coins, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import type { CodeQuestXpSummary } from '@/lib/types';

interface XpPanelProps {
  xp: CodeQuestXpSummary;
}

const REWARD_LABELS: Record<string, string> = {
  SOLVE: 'Problem solve',
  POTD_BONUS: 'POTD bonus',
};

export default function XpPanel({ xp }: XpPanelProps) {
  const { level } = xp;
  const progressPercent = level.next_level_xp > 0
    ? Math.min(100, Math.round((level.current_level_xp / level.next_level_xp) * 100))
    : 100;

  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#FFA500]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">XP &amp; level</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] px-3 py-1 text-xs font-bold text-white">
          <Sparkles className="h-3.5 w-3.5" /> Level {level.level}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Lifetime', value: xp.lifetime_xp, icon: Trophy },
          { label: 'Today', value: xp.xp_today, icon: Coins },
          { label: 'This week', value: xp.xp_this_week, icon: Coins },
          { label: 'This month', value: xp.xp_this_month, icon: Coins },
        ].map((tile) => (
          <div key={tile.label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase text-slate-400">{tile.label}</p>
              <tile.icon className="h-3.5 w-3.5 text-[#FFA500]" />
            </div>
            <p className="mt-1 text-xl font-extrabold text-[#1A1A2E] dark:text-white">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Level {level.level} progress</span>
          <span className="text-[#FF7A00]">
            {level.current_level_xp} / {level.next_level_xp} XP · {level.xp_to_next_level} to next
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">XP breakdown</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">Problem solves</span>
              <span className="font-bold text-[#1A1A2E] dark:text-white">{xp.breakdown.solve} XP</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">POTD bonuses</span>
              <span className="font-bold text-[#1A1A2E] dark:text-white">{xp.breakdown.potd_bonus} XP</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Recent XP</p>
          {xp.history.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No XP earned yet. Solve a challenge to get started.</p>
          ) : (
            <ul className="space-y-1.5">
              {xp.history.slice(0, 6).map((reward) => (
                <li key={reward.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                    <Star className="h-3 w-3 flex-shrink-0 text-[#FFA500]" />
                    {REWARD_LABELS[reward.reward_type] ?? reward.reward_type}
                    {reward.problem_title ? ` · ${reward.problem_title}` : ''}
                  </span>
                  <span className="font-bold text-[#FF7A00]">+{reward.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
