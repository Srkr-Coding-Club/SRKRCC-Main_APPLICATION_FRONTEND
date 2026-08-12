'use client';

import React from 'react';
import { UserCheck, CalendarDays, Code2, Trophy } from 'lucide-react';

export default function StatsBar() {
  const stats = [
    {
      value: '500+',
      label: 'Active Members',
      icon: UserCheck,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
    },
    {
      value: '50+',
      label: 'Events Conducted',
      icon: CalendarDays,
      color: 'text-[#FF7A00]',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
    },
    {
      value: '100+',
      label: 'Projects Built',
      icon: Code2,
      color: 'text-[#8B2E3B] dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      value: '25+',
      label: 'Achievements',
      icon: Trophy,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <section className="py-8 bg-white dark:bg-[#0D0E15] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`flex flex-col items-center text-center ${
                  idx > 0 ? 'pt-6 md:pt-0' : ''
                }`}
              >
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} mb-3 shadow-sm`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#1A1A2E] dark:text-white tracking-tight">
                  {stat.value}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
