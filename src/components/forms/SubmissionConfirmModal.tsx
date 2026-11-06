'use client';

import React from 'react';
import { ShieldAlert, X, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useDialog } from '@/lib/hooks/useDialog';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface SubmissionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  content: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
}

export function SubmissionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Review & Confirm Submission',
  content,
  confirmLabel = 'Yes, I Agree & Submit',
  cancelLabel = 'No, Go Back',
  isSubmitting = false,
}: SubmissionConfirmModalProps) {
  const dialogRef = useDialog(onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
      aria-labelledby="submission-confirm-title"
      tabIndex={-1}
      ref={dialogRef as any}
    >
      <div
        className="relative w-full max-w-lg glass-panel bg-white/95 dark:bg-[#101117]/95 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-journey-accent border border-orange-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="submission-confirm-title" className="text-base sm:text-lg font-extrabold text-[#1A1A2E] dark:text-white leading-tight">
                {title || 'Review & Confirm Submission'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Please review these instructions before submitting your response.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 pr-1 py-1 flex-1 min-h-[80px]">
          <div className="rounded-xl p-4 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 prose dark:prose-invert prose-xs max-w-none">
            <MarkdownRenderer content={content} />
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{cancelLabel || 'No, Go Back'}</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-journey-accent text-journey-on-accent text-xs sm:text-sm font-extrabold shadow-md hover:brightness-105 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{confirmLabel || 'Yes, I Agree & Submit'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

