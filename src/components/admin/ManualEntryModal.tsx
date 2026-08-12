'use client';

import React from 'react';
import { Lock, X } from 'lucide-react';
import { Form } from '@/lib/types';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClosedForm: Form | null;
  onSubmit: (e: React.FormEvent) => void;
  manualEntryAnswers: Record<string, any>;
  setManualEntryAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export function ManualEntryModal({
  isOpen,
  onClose,
  selectedClosedForm,
  onSubmit,
  manualEntryAnswers,
  setManualEntryAnswers,
}: ManualEntryModalProps) {
  if (!isOpen || !selectedClosedForm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151722] rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-rose-600">
            <Lock className="w-5 h-5" />
            <h3 className="text-base font-bold">Admin Manual Entry Override</h3>
          </div>
          <button onClick={onClose} className="text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Form <strong className="text-slate-800 dark:text-white">{selectedClosedForm.title}</strong> is CLOSED to public students. As an Admin, you can manually enter an offline candidate response:
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Candidate Full Name *</label>
            <input
              type="text"
              required
              onChange={(e) => setManualEntryAnswers({ ...manualEntryAnswers, Name: e.target.value })}
              className="w-full px-3 py-2 rounded text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">College Email *</label>
            <input
              type="email"
              required
              onChange={(e) => setManualEntryAnswers({ ...manualEntryAnswers, Email: e.target.value })}
              className="w-full px-3 py-2 rounded text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-rose-600 text-white text-xs font-bold"
            >
              Record Admin Special Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
