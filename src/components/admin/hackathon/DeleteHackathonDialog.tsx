'use client';

import React, { useEffect, useState } from 'react';
import { EyeOff, Trash2 } from 'lucide-react';
import type { Hackathon, HackathonDeleteImpact } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { Modal } from '@/components/ui/Modal';
import { BTN_DANGER, BTN_GHOST, INPUT, LABEL } from './shared';

interface DeleteHackathonDialogProps {
  hackathon: Hackathon;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Offered when the hackathon is still public: the reversible alternative to deleting. */
  onHideInstead?: () => void;
}

const IMPACT_LABELS: [keyof HackathonDeleteImpact, string][] = [
  ['teams', 'Teams'],
  ['members', 'Team memberships'],
  ['problem_statements', 'Problem statements'],
  ['rounds', 'Rounds'],
  ['round_entries', 'Shortlisting entries'],
  ['announcements', 'Announcements'],
  ['stages', 'Timeline stages'],
  ['submissions', 'Submissions'],
];

export function DeleteHackathonDialog({ hackathon, busy, onCancel, onConfirm, onHideInstead }: DeleteHackathonDialogProps) {
  const [impact, setImpact] = useState<HackathonDeleteImpact | null>(null);
  const [impactError, setImpactError] = useState('');
  const [typedSlug, setTypedSlug] = useState('');

  useEffect(() => {
    let cancelled = false;
    hackathonApi.admin
      .deleteImpact(hackathon.slug)
      .then((result) => !cancelled && setImpact(result))
      .catch((err) => !cancelled && setImpactError(apiErrorMessage(err, 'Could not load what will be deleted.')));
    return () => {
      cancelled = true;
    };
  }, [hackathon.slug]);

  const nonEmptyImpact = impact ? IMPACT_LABELS.filter(([key]) => impact[key] > 0) : [];
  const confirmed = typedSlug === hackathon.slug;

  return (
    <Modal isOpen onClose={onCancel} busy={busy} title="Delete hackathon permanently?" icon={Trash2} maxWidth="max-w-md">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <p>
          <strong className="text-[#1A1A2E] dark:text-white">{hackathon.title}</strong> and everything inside it will be removed. This cannot be undone.
          The linked registration form and its responses are kept.
        </p>

        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3" aria-live="polite">
          {impactError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{impactError}</p>
          ) : !impact ? (
            <p className="text-xs text-slate-500">Counting what will be deleted…</p>
          ) : nonEmptyImpact.length === 0 ? (
            <p className="text-xs text-slate-500">Nothing else is attached to this hackathon.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
              {nonEmptyImpact.map(([key, label]) => (
                <li key={key}>
                  {label}: <strong className="text-rose-600 dark:text-rose-400">{impact[key]}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        {onHideInstead && (
          <button type="button" onClick={onHideInstead} disabled={busy} className={`${BTN_GHOST} w-full justify-center`}>
            <EyeOff className="h-3.5 w-3.5" /> Hide from the public site instead (reversible)
          </button>
        )}

        <div>
          <label htmlFor="confirm-hackathon-slug" className={LABEL}>
            Type <span className="font-mono normal-case text-rose-600 dark:text-rose-400">{hackathon.slug}</span> to confirm
          </label>
          <input
            id="confirm-hackathon-slug"
            value={typedSlug}
            onChange={(event) => setTypedSlug(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={INPUT}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_GHOST}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !confirmed || (!impact && !impactError)}
            className={`${BTN_DANGER} border border-rose-500/40`}
          >
            <Trash2 className="h-3.5 w-3.5" /> {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
