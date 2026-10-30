'use client';

import React from 'react';
import { Check, Link2, Mail, Replace, Undo2, UserCheck } from 'lucide-react';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import type { Outcome, Person, ReconRow, RowAction } from '@/lib/reconciliation';

const TONE: Record<Outcome, PillTone> = {
  MATCH: 'green', NAME_DIFFERS: 'sky', ID_MISSING_IN_APP: 'amber', ID_MISMATCH: 'red', ID_HELD_BY_OTHER: 'red', EMAIL_MISMATCH: 'red', ID_RESERVED: 'red', ID_RETIRED: 'amber',
  NO_ACCOUNT: 'purple', NO_ACCOUNT_NO_ID: 'purple', NO_ID_IN_SHEET: 'slate', INVALID: 'slate', DUPLICATE: 'slate',
};
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95 disabled:opacity-40 sm:min-h-9';
const PRIMARY = `${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`;
const GHOST = `${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`;

function Account({ label, person }: { label: string; person: Person }) {
  return (
    <p className="text-xs text-journey-muted">
      <span className="font-bold uppercase tracking-wide">{label}</span> <span className="text-journey-text">{person.name}</span> · <span className="break-all">{person.email}</span> · <span className="font-mono">{person.club_id ?? 'no Club ID'}</span>
    </p>
  );
}

interface RowCardProps {
  row: ReconRow;
  canAct: boolean;
  busy: boolean;
  onAct: (row: ReconRow, action: RowAction) => void;
}

/** One sheet row: what the sheet says, what the app says, and the choices that apply. */
export function RowCard({ row, canAct, busy, onAct }: RowCardProps) {
  const has = (action: RowAction) => canAct && row.actions.includes(action);
  return (
    <li className="space-y-2.5 rounded-xl border border-journey-text/10 p-4" data-outcome={row.outcome}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-journey-text">{row.name || <span className="font-normal italic text-journey-muted">No name</span>}</p>
          <p className="text-xs text-journey-muted"><span className="break-all">{row.email || 'no email'}</span> · <span className="font-mono">{row.club_id || 'no Club ID'}</span> · row {row.row_number}</p>
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={TONE[row.outcome]}>{row.outcome_label}</StatusPill>
          {row.resolution !== 'PENDING' && <StatusPill tone="green" icon={Check}>{row.resolution_label}</StatusPill>}
        </span>
      </div>
      <p className="break-words text-sm text-journey-text/85">{row.detail}</p>
      {row.matched_user && <Account label="Account by email" person={row.matched_user} />}
      {row.other_user && row.other_user.id !== row.matched_user?.id && <Account label="Holder of the Club ID" person={row.other_user} />}
      {row.resolution !== 'PENDING' && (
        <p className="text-xs text-journey-muted">{row.resolution_label}{row.resolved_by ? ` by ${row.resolved_by}` : ''}{row.resolved_at ? ` on ${formatDateTime(row.resolved_at)}` : ''}{row.note ? ` · “${row.note}”` : ''}</p>
      )}
      {(has('link') || has('link_retired') || has('use_sheet') || has('keep_app') || has('invite') || has('follow_up') || has('dismiss')) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {has('link') && <button type="button" disabled={busy} onClick={() => onAct(row, 'link')} className={PRIMARY}><Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Link {row.club_id}</button>}
          {has('link_retired') && <button type="button" disabled={busy} onClick={() => onAct(row, 'link_retired')} className={GHOST}><Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Link the retired id anyway</button>}
          {has('use_sheet') && <button type="button" disabled={busy} onClick={() => onAct(row, 'use_sheet')} className={PRIMARY}><Replace className="h-3.5 w-3.5" aria-hidden="true" /> Use the sheet’s id</button>}
          {has('keep_app') && <button type="button" disabled={busy} onClick={() => onAct(row, 'keep_app')} className={GHOST}><UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Keep the app’s value</button>}
          {has('invite') && <button type="button" disabled={busy} onClick={() => onAct(row, 'invite')} className={PRIMARY}><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Invite and reserve {row.club_id}</button>}
          {has('follow_up') && <button type="button" disabled={busy} onClick={() => onAct(row, 'follow_up')} className={GHOST}>Follow up later</button>}
          {has('dismiss') && <button type="button" disabled={busy} onClick={() => onAct(row, 'dismiss')} className={`${BUTTON} text-journey-muted hover:bg-journey-text/10`}>Dismiss</button>}
        </div>
      )}
    </li>
  );
}
