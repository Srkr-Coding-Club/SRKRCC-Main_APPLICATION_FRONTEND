'use client';

import React from 'react';
import { Flame, Medal, Trophy, Zap } from 'lucide-react';
import type { CodeQuestLeaderboard } from '@/lib/types';

interface LeaderboardPanelProps {
  data: CodeQuestLeaderboard;
}

function rankClass(rank: number): string {
  if (rank === 1) return 'bg-amber-400 text-white';
  if (rank === 2) return 'bg-slate-300 text-slate-800';
  if (rank === 3) return 'bg-orange-400 text-white';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

export default function LeaderboardPanel({ data }: LeaderboardPanelProps) {
  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#FF7A00]" />
        <h3 className="font-bold text-[#1A1A2E] dark:text-white">Club leaderboard</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Top members by lifetime XP. Only public club data is shown.
      </p>

      {data.entries.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {data.entries.map((entry) => (
            <li
              key={entry.rank}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                entry.is_me
                  ? 'border-[#FF7A00]/50 bg-orange-50 dark:bg-orange-950/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${rankClass(entry.rank)}`}>
                {entry.rank <= 3 ? <Medal className="h-3.5 w-3.5" /> : entry.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                  {entry.name}
                  {entry.is_me && <span className="ml-1.5 text-[10px] font-black uppercase text-[#FF7A00]">You</span>}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Level {entry.level} · {entry.solved} solved
                  {entry.club_id && ` · ${entry.club_id}`}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3 text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA500]">
                  <Zap className="h-3.5 w-3.5" /> {entry.lifetime_xp}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF7A00]">
                  <Flame className="h-3.5 w-3.5" /> {entry.current_streak}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          No XP earned on the board yet — be the first to climb it.
        </p>
      )}

      {!data.me.in_top && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
          <span className="text-xs font-bold text-[#1A1A2E] dark:text-white">Your rank</span>
          <span className="text-sm font-extrabold text-[#FF7A00]">
            #{data.me.rank} · {data.me.lifetime_xp} XP
          </span>
        </div>
      )}
    </div>
  );
}
