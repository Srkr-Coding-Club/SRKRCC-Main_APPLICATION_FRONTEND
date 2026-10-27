'use client';

import React from 'react';
import { Hourglass, ShieldCheck } from 'lucide-react';
import type { MyWithdrawalRequest } from '@/lib/types';
import { formatDateTime } from './HackathonAnnouncementsFeed';

interface WithdrawalNoticeProps {
  request: MyWithdrawalRequest;
  /** Only the leader can take a waiting request back. */
  canCancel: boolean;
  busy: boolean;
  onCancel: () => void;
}

/** Where a withdrawal request stands: waiting for the organizers, or denied (with their note). */
export function WithdrawalNotice({ request, canCancel, busy, onCancel }: WithdrawalNoticeProps) {
  if (request.status === 'PENDING') {
    return (
      <div role="status" className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        <Hourglass className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-bold">Withdrawal requested, waiting for the organizers</p>
          <p className="break-words text-xs opacity-90">You asked on {formatDateTime(request.created_at)}: &ldquo;{request.reason}&rdquo;. Your team stays as it is until they decide.</p>
        </div>
        {canCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 shrink-0 rounded-lg border border-amber-600/40 px-3 py-2 text-xs font-bold hover:bg-amber-500/15 disabled:opacity-60 sm:min-h-0">
            {busy ? 'Cancelling…' : 'Cancel request'}
          </button>
        )}
      </div>
    );
  }
  if (request.status === 'DENIED') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-journey-text/15 bg-journey-text/[0.04] px-4 py-3 text-sm text-journey-text">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-journey-accent" aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className="font-bold">The organizers kept your team</p>
          <p className="break-words text-xs text-journey-muted">{request.decision_note || 'Your withdrawal request was denied.'}</p>
        </div>
      </div>
    );
  }
  return null;
}
