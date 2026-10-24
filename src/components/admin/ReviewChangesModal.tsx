'use client';

import { useDialog } from '@/lib/hooks/useDialog';
import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import Portal from '@/components/ui/Portal';
import { FormChanges } from '@/components/admin/FormChanges';
import { ChangeReview } from '@/lib/formHistory';

/** Shown before a change to a LIVE form is saved: what will change and what it means for the responses already in. */
export function ReviewChangesModal({ review, onConfirm, onCancel }: {
  review: ChangeReview | null; onConfirm: () => void; onCancel: () => void;
}) {
  const dialogRef = useDialog(onCancel);
  if (!review) return null;
  return (
    <Portal>
      <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 outline-none" role="dialog" aria-modal="true" aria-label="Review changes">
        <div className="glass-panel rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-[#FF7A00]">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">This form is live. Review your changes</h3>
            </div>
            <button onClick={onCancel} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white active:scale-90">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto">
            <p className="text-xs text-slate-500 mb-3">
              Saving applies these changes to everyone straight away. You can go back later from History.
            </p>
            <FormChanges diff={review.diff} impact={review.impact} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 p-4">
            <button onClick={onCancel} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 active:scale-95">
              Keep editing
            </button>
            <button onClick={onConfirm} className="px-4 py-2 rounded bg-[#FF7A00] hover:bg-[#E06B00] text-white text-xs font-bold active:scale-95">
              Save and apply
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
