'use client';

import React from 'react';
import { LucideIcon, RefreshCw } from 'lucide-react';

interface PanelStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: 'empty' | 'error';
  onRetry?: () => void;
}

/** Consistent empty/error treatment for every CodeQuest stats panel. */
export default function PanelState({ icon: Icon, title, description, tone = 'empty', onRetry }: PanelStateProps) {
  return (
    <div className="glass-panel rounded-xl border border-slate-200 p-8 text-center dark:border-slate-800">
      <Icon
        className={`mx-auto h-8 w-8 ${tone === 'error' ? 'text-[#8B2E3B] dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}
      />
      <h3 className="mt-3 font-bold text-[#1A1A2E] dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {tone === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#8B2E3B]/40 px-4 py-2 text-xs font-semibold text-[#1A1A2E] transition-colors hover:border-[#FF7A00] hover:text-[#FF7A00] dark:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
