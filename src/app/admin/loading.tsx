import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="p-8 rounded-3xl bg-white/60 dark:bg-[#151722]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center gap-4 max-w-sm w-full text-center">
        <LoadingSpinner size="lg" />
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            Loading Admin Control Room...
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Synchronizing live schemas, users, and audit records
          </p>
        </div>
      </div>
    </div>
  );
}
