import React from 'react';
import { Trophy } from 'lucide-react';
import { IconCodersHallOfFameEntry } from '@/lib/types';
import SpotlightCard from '@/components/ui/SpotlightCard';

interface IconCodersHallOfFameCardProps {
  entry: IconCodersHallOfFameEntry;
}

export default function IconCodersHallOfFameCard({ entry }: IconCodersHallOfFameCardProps) {
  return (
    <div className="h-full py-6 transition-transform duration-300 hover:-translate-y-1">
      <SpotlightCard
        spotlightColor="#FF7A00"
        className="glass-panel h-full w-full border border-slate-200/70 shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-white/10"
      >
        <div className="flex h-full flex-col overflow-hidden p-6">
          <div className="flex min-h-7 items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-[#FF7A00] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Edition {entry.year}
            </span>
            <Trophy className="h-5 w-5 shrink-0 text-amber-400" />
          </div>

          <div className="mt-4 overflow-hidden">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-white">
              {entry.participantName}
            </h3>
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              {entry.project}
            </p>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
