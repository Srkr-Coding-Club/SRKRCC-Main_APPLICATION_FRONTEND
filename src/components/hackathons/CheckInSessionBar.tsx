'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import type { CheckInScanMode, CheckInSessionInfo } from '@/lib/types';
import { FormSelect } from '@/components/ui/FormSelect';

const SCAN_MODE_NOTE: Record<CheckInScanMode, string> = {
  MEMBERS: 'Each person shows their own code',
  TEAMS: 'Scan the team code, then pick who is present',
  BOTH: 'Person or team codes',
};

const WINDOW_LABEL = { NOT_OPEN: 'Not open yet', OPEN: 'Open now', CLOSED: 'Closed' } as const;
const WINDOW_TONE = {
  NOT_OPEN: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  OPEN: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  CLOSED: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
} as const;

interface CheckInSessionBarProps {
  sessions: CheckInSessionInfo[];
  session: CheckInSessionInfo | null;
  onSelect: (id: number) => void;
}

/** Which session people are being scanned into, in large type so a volunteer never scans lunch into arrival by mistake. */
export function CheckInSessionBar({ sessions, session, onSelect }: CheckInSessionBarProps) {
  if (!session || sessions.length < 2) return null;
  const options = sessions.map((item) => ({
    value: String(item.id),
    label: item.name,
    hint: item.outside_schedule ? 'Retired' : !item.is_active ? 'Off' : WINDOW_LABEL[item.window],
    disabled: item.outside_schedule || !item.is_active,
  }));
  return (
    <div className="space-y-2 rounded-xl border border-journey-accent/40 bg-journey-accent/10 p-3" role="group" aria-label="Session being scanned">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-xl font-extrabold leading-tight text-journey-text sm:text-2xl">
          <CalendarClock className="h-5 w-5 shrink-0 text-journey-accent" aria-hidden="true" />
          <span className="min-w-0 break-words">{session.name}</span>
        </p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${WINDOW_TONE[session.window]}`}>{WINDOW_LABEL[session.window]}</span>
      </div>
      <p className="text-xs text-journey-muted">
        {SCAN_MODE_NOTE[session.scan_mode]}
        {!session.is_main && session.needs_arrival ? ' · only people who have arrived' : ''}
      </p>
      <FormSelect
        value={String(session.id)}
        options={options}
        placeholder="Choose a session"
        allowClear={false}
        onChange={(value) => value && onSelect(Number(value))}
        aria-label="Session"
      />
    </div>
  );
}
