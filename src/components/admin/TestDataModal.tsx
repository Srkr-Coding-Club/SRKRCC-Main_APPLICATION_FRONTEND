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
      <div className="bg-white dark:bg-[#151722] rounded-xl max-w-lg w-full p-6 border border-purple-200 dark:border-purple-900 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-purple-600">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-base font-bold">Preview Test Submission Payload</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <pre className="p-4 rounded bg-[#0D0E15] text-amber-400 font-mono text-xs overflow-x-auto border border-slate-800">
          {JSON.stringify(submittedTestData, null, 2)}
        </pre>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-purple-600 text-white text-xs font-bold"
          >
            Close Payload Dialog
          </button>
        </div>
      </div>
    </div>
  );
}
