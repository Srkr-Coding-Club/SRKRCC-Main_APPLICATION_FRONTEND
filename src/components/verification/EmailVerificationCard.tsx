'use client';

import React from 'react';
import { BadgeCheck, MailWarning } from 'lucide-react';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { daysLeftText } from '@/lib/emailVerification';
import { VerifyPanel } from './VerifyPanel';

/** The profile page's view of the same thing: verified, or what to do about it. Nothing when verification is off. */
export function EmailVerificationCard() {
  const { state } = useEmailVerification();
  if (!state || state.mode === 'off') return null;

  if (state.verified) {
    return (
      <div className="glass-panel flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
        <span>Email verified</span>
      </div>
    );
  }
  return (
    <section aria-label="Email verification" className="glass-panel space-y-3 rounded-xl border border-amber-300 dark:border-amber-800/60 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
        <MailWarning className="h-5 w-5 text-amber-600" aria-hidden="true" />
        Email not verified {state.mode === 'block' && state.days_left !== null && <span className="font-semibold text-slate-600 dark:text-slate-300">({daysLeftText(state.days_left)})</span>}
      </h2>
      <VerifyPanel />
    </section>
  );
}
