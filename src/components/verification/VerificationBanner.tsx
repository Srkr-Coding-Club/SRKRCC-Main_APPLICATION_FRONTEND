'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { MailWarning } from 'lucide-react';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { daysLeftText, hidesBanner, needsVerification, urgency } from '@/lib/emailVerification';

/** "Verify your email" with the days left, for anyone signed in whose address is not verified yet. */
export function VerificationBanner() {
  const { state, openDialog, send, sending, sentTo, cooldown, error } = useEmailVerification();
  const pathname = usePathname() || '/';

  if (!needsVerification(state) || state.blocked || hidesBanner(pathname)) return null;

  const urgent = urgency(state) === 'urgent';
  const tone = urgent
    ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-900/60'
    : 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/50';
  const restricts = state.mode === 'features' || state.mode === 'block';

  return (
    <div role="region" aria-label="Email verification" className={`border-b px-4 py-2 text-sm ${tone}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 font-medium">
          <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Verify your email address.</strong>{' '}
            {restricts ? 'Forms, events, teams and other private features need it.' : 'It will soon be needed for private features.'}{' '}
            {state.mode === 'block' && state.days_left !== null && <strong>{daysLeftText(state.days_left)}.</strong>}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {error ? (
            <span role="alert" className="max-w-xs font-semibold">{error}</span>
          ) : sentTo ? (
            <span role="status" className="font-semibold">Link sent to {sentTo}</span>
          ) : null}
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || cooldown > 0}
            className="min-h-8 rounded-md bg-[#C25100] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#A84600] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending...' : cooldown > 0 ? `Send again in ${cooldown}s` : sentTo ? 'Send again' : 'Verify email'}
          </button>
          <button type="button" onClick={() => openDialog()} className="min-h-8 px-2 text-xs font-semibold underline">
            More
          </button>
        </div>
      </div>
    </div>
  );
}
