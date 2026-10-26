import React from 'react';
import { Power } from 'lucide-react';
import { BTN_PRIMARY, PANEL } from './shared';

interface FeatureOffNoticeProps {
  title: string;
  description: string;
  /** Jumps to the tab where the module is switched on. */
  onEnable: () => void;
}

/** Shown in place of a module's tab content while the organizer has that module switched off. */
export function FeatureOffNotice({ title, description, onEnable }: FeatureOffNoticeProps) {
  return (
    <div className={`${PANEL} flex flex-col items-center gap-3 py-10 text-center`}>
      <Power className="h-8 w-8 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">{title} is switched off</h3>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      <button type="button" onClick={onEnable} className={BTN_PRIMARY}>Switch it on in Registration controls</button>
    </div>
  );
}
