'use client';

import React, { useState } from 'react';
import { Check, Loader2, Mail } from 'lucide-react';
import { useEmailVerification } from '@/context/EmailVerificationContext';

const field =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D0E15] px-3 py-2 text-base sm:text-sm text-[#1A1A2E] dark:text-white focus:border-[#FF7A00] focus:outline-none';
export const primaryButton =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#C25100] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#A84600] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Send the link, say where it went, and (optionally) fix a wrong address. Shared by the banner, the dialog, the
 * blocked screen and the profile card, so the wording and the behaviour are the same everywhere.
 */
export function VerifyPanel({ allowChange = true }: { allowChange?: boolean }) {
  const { state, send, sending, sentTo, error, cooldown, changeEmail, changeMessage } = useEmailVerification();
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);

  if (!state) return null;

  const submitChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    const ok = await changeEmail(newEmail.trim(), password);
    setWorking(false);
    if (ok) { setChanging(false); setNewEmail(''); setPassword(''); }
  };

  const waiting = cooldown > 0;
  const label = sending ? 'Sending...' : waiting ? `Send again in ${cooldown}s` : sentTo ? 'Send the link again' : 'Verify email';

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        We will send a one-time link to <strong className="text-[#1A1A2E] dark:text-white">{state.email_masked}</strong>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void send()} disabled={sending || waiting} className={primaryButton}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          {label}
        </button>
        {allowChange && !changing && (
          <button type="button" onClick={() => setChanging(true)} className="min-h-9 px-2 text-sm font-semibold underline text-slate-700 dark:text-slate-200">
            Wrong address? Change it
          </button>
        )}
      </div>

      <div aria-live="polite" className="space-y-1">
        {sentTo && !error && (
          <p className="flex items-start gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>We sent a link to {sentTo}. Open it and press the button to finish. Check your spam folder if you cannot see it.</span>
          </p>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>}
        {changeMessage && !error && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{changeMessage}</p>}
        {state.pending_email_masked && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Waiting for you to confirm <strong>{state.pending_email_masked}</strong>. Your current address stays in use until you do.
          </p>
        )}
      </div>

      {allowChange && changing && (
        <form onSubmit={submitChange} className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div>
            <label htmlFor="verify-new-email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">New email address</label>
            <input id="verify-new-email" type="email" autoComplete="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={field} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="verify-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Your password</label>
            <input id="verify-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={working || waiting || !newEmail.trim() || !password} className={primaryButton}>
              {working ? 'Sending...' : 'Send a link to the new address'}
            </button>
            <button type="button" onClick={() => setChanging(false)} className="min-h-9 px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
