'use client';

import React from 'react';
import { Award, Calendar, Flame, Star, Sun, Trophy, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CodeQuestBadge, CodeQuestBadgesSummary } from '@/lib/types';

interface BadgesGridProps {
  data: CodeQuestBadgesSummary;
}

const ICON_MAP: Record<string, LucideIcon> = {
  trophy: Trophy,
  calendar: Calendar,
  flame: Flame,
  sun: Sun,
  zap: Zap,
  star: Star,
};

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function BadgeCard({ badge }: { badge: CodeQuestBadge }) {
  const Icon = ICON_MAP[badge.icon] ?? Award;
  const locked = !badge.earned;
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        locked
          ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-[#FF7A00]/40 bg-orange-50/60 dark:border-[#FF7A00]/40 dark:bg-orange-950/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
            locked ? 'bg-slate-200 text-slate-400 dark:bg-slate-800' : 'bg-gradient-to-br from-[#FF7A00] to-[#FFA500] text-white'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`truncate font-bold ${locked ? 'text-slate-500 dark:text-slate-400' : 'text-[#1A1A2E] dark:text-white'}`}>
              {badge.name}
            </p>
            <span className={`flex-shrink-0 text-[10px] font-bold uppercase ${locked ? 'text-slate-400' : 'text-emerald-500'}`}>
              {locked ? 'Locked' : 'Earned'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>

          {locked ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span>
                  {badge.progress} / {badge.threshold}
                </span>
                <span>{badge.percentage}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-[#FF7A00]" style={{ width: `${badge.percentage}%` }} />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[10px] font-semibold text-emerald-500">Earned {formatDate(badge.earned_at)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BadgesGrid({ data }: BadgesGridProps) {
  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[#FF7A00]" />
          <h3 className="font-bold text-[#1A1A2E] dark:text-white">Badges &amp; achievements</h3>
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {data.earned_count} / {data.total_count} earned
        </span>
      </div>

      <div className="space-y-5">
        {data.categories.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.label}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.badges.map((badge) => (
                <BadgeCard key={badge.code} badge={badge} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
