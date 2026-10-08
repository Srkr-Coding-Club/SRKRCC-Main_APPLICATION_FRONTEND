'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, Clock, ArrowRight } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { HackathonCTA } from './HackathonCTA';

export function HackathonStickyBar({ hackathon }: { hackathon: Hackathon }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past 450px
      if (window.scrollY > 450) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  const isClosed = !(hackathon.is_registration_open ?? hackathon.status !== 'CLOSED');

  return (
    <aside
      aria-label="Quick registration actions"
      className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-white/90 dark:bg-[#1A1A2E]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-[#8B2E3B] to-[#FF7A00] flex items-center justify-center text-white shadow-sm">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-[#1A1A2E] dark:text-white truncate">
              {hackathon.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-[#FF7A00]">{hackathon.prize_pool} Prize Pool</span>
              <span>•</span>
              <span>
                {hackathon.min_team_size === hackathon.max_team_size
                  ? `${hackathon.max_team_size} members`
                  : `${hackathon.min_team_size}–${hackathon.max_team_size} members`}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[240px]">
          <HackathonCTA hackathon={hackathon} />
        </div>
      </div>
    </aside>
  );
}
