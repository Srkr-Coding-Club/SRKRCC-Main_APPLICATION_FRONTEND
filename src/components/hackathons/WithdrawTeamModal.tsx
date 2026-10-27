'use client';

import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FieldError, FieldLabel, SpotlightTextarea, fieldErrorId } from '@/components/ui/InputField';

const REASON_LIMIT = 300;

interface WithdrawTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sends the reason. A rejection keeps the dialog open and shows its message. */
  onSubmit: (reason: string) => Promise<void>;
  /** Whether the organizers have to approve this (the team is registered or already in a round). */
  needsApproval: boolean;
  /** How many teams one person may create, so people know what withdrawing costs. */
  maxTeams?: number;
}

/** The sole leader gives up the team: say why, and know what happens next. */
export function WithdrawTeamModal({ isOpen, onClose, onSubmit, needsApproval, maxTeams }: WithdrawTeamModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) { setReason(''); setError(''); }
  }, [isOpen]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Tell the organizers why you are withdrawing.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not withdraw the team.');
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-lg px-4 py-2 text-sm font-bold text-journey-muted hover:text-journey-text sm:min-h-0">Keep my team</button>
      <button type="submit" form="withdraw-team-form" disabled={busy} className="min-h-11 rounded-lg bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-60 sm:min-h-0">
        {busy ? 'Sending…' : needsApproval ? 'Ask to withdraw' : 'Withdraw team'}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={busy} title="Withdraw this team?" icon={LogOut} maxWidth="max-w-lg" footer={footer}>
      <form id="withdraw-team-form" onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-journey-text/80">
          {needsApproval
            ? 'Your team already holds a place, so the organizers have to approve this. Your team stays as it is until they decide, and you can take the request back.'
            : 'You are the only member, so leaving withdraws the team and cancels its pending invites.'}
        </p>
        {maxTeams ? (
          <p className="rounded-lg border border-journey-text/10 bg-journey-text/[0.03] px-3 py-2 text-xs text-journey-muted">
            Each person can create {maxTeams} teams for a hackathon, and you will need to wait a few minutes before creating a new one.
          </p>
        ) : null}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="withdraw-reason" required>Why are you withdrawing?</FieldLabel>
          <SpotlightTextarea
            id="withdraw-reason"
            rows={4}
            maxLength={REASON_LIMIT}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. We could not find teammates, or we chose another problem"
            hasError={!!error}
            aria-describedby={error ? fieldErrorId('withdraw-reason') : undefined}
            autoFocus
          />
          <div className="flex justify-between gap-3 text-xs">
            <FieldError id={fieldErrorId('withdraw-reason')}>{error}</FieldError>
            <span className="ml-auto text-journey-muted">{reason.length}/{REASON_LIMIT}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
