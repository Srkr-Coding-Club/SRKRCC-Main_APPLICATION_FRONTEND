'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface TestDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  submittedTestData: Record<string, any> | null;
}

export function TestDataModal({ isOpen, onClose, submittedTestData }: TestDataModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel rounded-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-[#FF7A00]">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Preview Test Submission Payload</h3>
          </div>
          <button onClick={onClose} className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white transition-transform duration-100 active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>

        <pre className="p-4 rounded bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white font-mono text-xs overflow-x-auto border border-slate-200 dark:border-slate-800">
          {JSON.stringify(submittedTestData, null, 2)}
        </pre>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#FF7A00] hover:bg-[#E06B00] text-white text-xs font-bold transition-colors active:scale-95"
          >
            Close Payload Dialog
          </button>
        </div>
      </div>
    </div>
  );
}
