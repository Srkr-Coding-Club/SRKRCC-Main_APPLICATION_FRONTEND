'use client';

import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { FeatureFlag } from '@/lib/types';

interface FlagsTabProps {
  flags: FeatureFlag[];
  onToggleFlag: (id: number) => void;
  isLoading?: boolean;
}

export function FlagsTab({ flags, onToggleFlag, isLoading = false }: FlagsTabProps) {
  return (
    <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Module Feature Flags & Visibility Windows</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-52" />
              </div>
              <div className="h-8 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          ))
        ) : flags.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-slate-400 text-sm">
            No feature flags configured.
          </div>
        ) : (
          flags.map((f) => (
            <div key={f.id} className="p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">{f.name}</p>
                <p className="text-xs text-slate-500">{f.description}</p>
              </div>
              <button onClick={() => onToggleFlag(f.id)}>
                {f.is_enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
