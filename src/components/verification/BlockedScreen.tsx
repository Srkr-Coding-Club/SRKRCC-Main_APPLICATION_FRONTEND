'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { clearAuthSession } from '@/lib/auth';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { VerifyPanel } from './VerifyPanel';

/**
 * Shown instead of a private page once the verification period is over. Public pages are unaffected; verifying
 * (on this device or another) brings the page back without signing in again.
 */
export function BlockedScreen({ reason = 'deadline' }: { reason?: 'deadline' | 'staff' }) {
  const { refresh } = useEmailVerification();
  const staff = reason === 'staff';

  return (
    <section aria-labelledby="blocked-title" className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12">
      <div className="glass-panel w-full space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400"><ShieldAlert className="h-6 w-6" aria-hidden="true" /></span>
          <h1 id="blocked-title" className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{staff ? 'Verify your email to use the admin tools' : 'Verify your email to continue'}</h1>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {staff
            ? 'Admin tools need a verified email address, because they can change other people\'s data. Verify it once and they open straight away.'
            : 'Your account has been open for more than the verification period, so private pages are paused until your email address is verified. Nothing is lost. As soon as you verify, everything comes back.'}
        </p>
        <VerifyPanel />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-sm">
          <button type="button" onClick={() => void refresh({ force: true })} className="min-h-9 font-semibold underline text-slate-700 dark:text-slate-200">
            I have verified. Check again
          </button>
          <Link href="/" className="min-h-9 py-2 font-semibold underline text-slate-700 dark:text-slate-200">Browse public pages</Link>
          <button
            type="button"
            onClick={() => { clearAuthSession(); window.location.assign('/'); }}
            className="min-h-9 font-semibold underline text-slate-700 dark:text-slate-200"
          >
            Sign out
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Cannot receive the email? Ask a club admin to verify you.</p>
      </div>
    </section>
  );
}
