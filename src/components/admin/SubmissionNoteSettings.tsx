'use client';

import React from 'react';
import { FileCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface SubmissionNoteSettingsProps {
  enabled?: boolean;
  title?: string;
  content?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onChange: (patch: {
    submission_note_enabled?: boolean;
    submission_note_title?: string;
    submission_note_content?: string;
    submission_note_confirm_label?: string;
    submission_note_cancel_label?: string;
  }) => void;
}

export function SubmissionNoteSettings({
  enabled = false,
  title = '',
  content = '',
  confirmLabel = '',
  cancelLabel = '',
  onChange,
}: SubmissionNoteSettingsProps) {
  const defaultTitle = 'Review & Confirm Submission';
  const defaultConfirm = 'Yes, I Agree & Submit';
  const defaultCancel = 'No, Go Back';

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-journey-accent border border-orange-500/20">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A2E] dark:text-white">
              Pre-Submission Rule / Note Acceptance
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When clicked, display an acceptance modal with rules or guidelines before final submission.
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          aria-label="Enable submission note modal"
          checked={enabled}
          onChange={(e) => onChange({ submission_note_enabled: e.target.checked })}
          className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
        />
      </div>

      {enabled && (
        <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label htmlFor="sub-note-title" className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Confirmation Modal Title
            </label>
            <input
              id="sub-note-title"
              type="text"
              value={title}
              onChange={(e) => onChange({ submission_note_title: e.target.value })}
              placeholder={defaultTitle}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] outline-none"
            />
          </div>

          <div>
            <label htmlFor="sub-note-content" className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Admin Note / Rules / Declaration (Markdown supported) *
            </label>
            <textarea
              id="sub-note-content"
              rows={4}
              value={content}
              onChange={(e) => onChange({ submission_note_content: e.target.value })}
              placeholder="e.g. By submitting this form, I declare that all provided details are accurate and I agree to abide by the club code of conduct..."
              className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sub-note-confirm" className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Confirm Button Text
              </label>
              <input
                id="sub-note-confirm"
                type="text"
                value={confirmLabel}
                onChange={(e) => onChange({ submission_note_confirm_label: e.target.value })}
                placeholder={defaultConfirm}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] outline-none"
              />
            </div>
            <div>
              <label htmlFor="sub-note-cancel" className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Cancel Button Text
              </label>
              <input
                id="sub-note-cancel"
                type="text"
                value={cancelLabel}
                onChange={(e) => onChange({ submission_note_cancel_label: e.target.value })}
                placeholder={defaultCancel}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] outline-none"
              />
            </div>
          </div>

          {/* Modal Preview */}
          <div className="pt-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-journey-accent" />
              Live Respondent Modal Preview
            </span>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101117] shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-journey-accent shrink-0" />
                <h4 className="text-xs font-bold text-[#1A1A2E] dark:text-white truncate">
                  {title || defaultTitle}
                </h4>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 max-h-28 overflow-y-auto pr-1">
                {content ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <span className="text-slate-400 italic">Enter note or rules above to see preview here.</span>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-2">
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 opacity-80"
                >
                  {cancelLabel || defaultCancel}
                </button>
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 rounded-lg bg-journey-accent text-journey-on-accent text-[11px] font-bold opacity-90 shadow-sm"
                >
                  {confirmLabel || defaultConfirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

