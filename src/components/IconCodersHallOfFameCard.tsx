import React from 'react';
import { Trophy } from 'lucide-react';
import { IconCodersHallOfFameEntry } from '@/lib/types';
import Card from './Card';

interface IconCodersHallOfFameCardProps {
  entry: IconCodersHallOfFameEntry;
}

export default function IconCodersHallOfFameCard({ entry }: IconCodersHallOfFameCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#FF7A00] border border-orange-200 dark:border-orange-900/40">
          Edition {entry.year}
        </span>
        <Trophy className="w-5 h-5 text-amber-400" />
      </div>

      <h3 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
        {entry.participantName}
      </h3>
      <p className="text-[#8B2E3B] dark:text-rose-400 text-sm font-semibold">{entry.project}</p>
    </Card>
  );
}
