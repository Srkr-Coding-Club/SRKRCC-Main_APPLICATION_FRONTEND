'use client';

import React from 'react';
import { CalendarClock, Trophy } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import type { DateRow } from '@/lib/hackathonPage';

/** Chronological list of every date and deadline, with what is done, next and still to come. */
export function DatesList({ rows }: { rows: DateRow[] }) {
  const now = Date.now();
  const nextKey = rows.find((row) => new Date(row.at).getTime() > now)?.key;
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
      {rows.map((row) => {
        const past = new Date(row.at).getTime() <= now;
        const isNext = row.key === nextKey;
        return (
          <li key={row.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5">
            <CalendarClock className={`h-4 w-4 shrink-0 ${past ? 'text-slate-400' : 'text-[#FF7A00]'}`} aria-hidden="true" />
            <span className="w-[calc(100%-2rem)] text-sm font-semibold text-[#1A1A2E] dark:text-white sm:w-auto sm:min-w-0 sm:flex-1">{row.label}</span>
            <span className="pl-7 text-sm text-slate-600 dark:text-slate-300 sm:pl-0">{formatDateTime(row.at)}</span>
            <span
              className={`w-20 rounded-full px-2.5 py-0.5 text-center text-[11px] font-bold ${
                past
                  ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                  : isNext
                    ? 'bg-[#FF7A00]/15 text-[#C25A00] dark:text-[#FFB066]'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
              }`}
            >
              {past ? 'Done' : isNext ? 'Next' : 'Upcoming'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Prize cards from the admin's prize list, or a single card for the plain prize pool. */
export function PrizeCards({ hackathon }: { hackathon: Hackathon }) {
  const prizes = hackathon.prizes ?? [];
  if (prizes.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-[#FF7A00]/30 bg-gradient-to-br from-[#FF7A00]/10 to-transparent p-6">
        <Trophy className="h-10 w-10 shrink-0 text-[#FF7A00]" aria-hidden="true" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total prize pool</p>
          <p className="text-3xl font-extrabold text-[#1A1A2E] dark:text-white">{hackathon.prize_pool}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {hackathon.prize_pool && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Total prize pool: <strong className="text-[#1A1A2E] dark:text-white">{hackathon.prize_pool}</strong>
        </p>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prizes.map((prize, index) => (
          <li
            key={`${prize.title}-${index}`}
            className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex items-center gap-2">
              <Trophy className={`h-5 w-5 ${index === 0 ? 'text-amber-500' : 'text-[#FF7A00]'}`} aria-hidden="true" />
              <h3 className="font-bold text-[#1A1A2E] dark:text-white">{prize.title}</h3>
            </div>
            {prize.amount && <p className="text-2xl font-extrabold text-[#FF7A00]">{prize.amount}</p>}
            {prize.description && <p className="text-sm text-slate-600 dark:text-slate-300">{prize.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
