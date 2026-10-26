'use client';

import React from 'react';
import { MailCheck, X } from 'lucide-react';
import Portal from '@/components/ui/Portal';
import { useDialog } from '@/lib/hooks/useDialog';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { VerifyPanel } from './VerifyPanel';

const REASONS: Record<string, string> = {
  feature: 'This feature needs a verified email address.',
  staff: 'Admin tools need a verified email address.',
  deadline: 'Your verification period has ended, so private features are paused.',
};

/** Opened wherever the server refused something because the address is not verified; also from the banner's "More". */
export function VerifyDialog() {
  const { dialogOpen, dialogReason, closeDialog, state } = useEmailVerification();
  const dialogRef = useDialog(closeDialog);

  if (!dialogOpen || !state || state.verified) return null;
  const reason = (dialogReason?.reason && REASONS[dialogReason.reason]) || dialogReason?.detail || 'Verifying your email keeps accounts safe and unlocks forms, events and teams.';

  return (
    <Portal>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Verify your email"
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm outline-none"
      >
        <div className="glass-panel w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-journey-accent">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-bold text-[#1A1A2E] dark:text-white">Verify your email</h2>
            </div>
            <button type="button" onClick={closeDialog} aria-label="Close" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{reason}</p>
            <VerifyPanel />
          </div>
        </div>
      </div>
    </Portal>
  );
}
