import React from 'react';

export type PillTone = 'green' | 'amber' | 'red' | 'slate' | 'orange' | 'purple' | 'sky';

const TONES: Record<PillTone, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  red: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300',
  slate: 'bg-slate-500/10 text-slate-600 border-slate-400/30 dark:text-slate-300',
  orange: 'bg-[#FF7A00]/10 text-[#C25A00] border-[#FF7A00]/30 dark:text-[#FF9A4A]',
  purple: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300',
  sky: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300',
};

export function StatusPill({ tone, children, icon: Icon }: { tone: PillTone; children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap ${TONES[tone]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

export const TEAM_STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  FORMING: { tone: 'amber', label: 'Forming' },
  REGISTERED: { tone: 'green', label: 'Registered' },
  DISQUALIFIED: { tone: 'red', label: 'Disqualified' },
  WITHDRAWN: { tone: 'slate', label: 'Withdrawn' },
};

export const ENTRY_STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  PENDING: { tone: 'amber', label: 'Under review' },
  SHORTLISTED: { tone: 'green', label: 'Shortlisted' },
  REJECTED: { tone: 'red', label: 'Not shortlisted' },
};

export const ROUND_STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  UPCOMING: { tone: 'sky', label: 'Upcoming' },
  ACTIVE: { tone: 'orange', label: 'Active' },
  COMPLETED: { tone: 'slate', label: 'Completed' },
};
