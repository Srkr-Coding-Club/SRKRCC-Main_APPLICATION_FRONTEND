'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AdminHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-[#FFE5CC] dark:bg-[#8B2E3B]/30 text-journey-accent flex-shrink-0">
          <img src="/logonobg.webp" alt="SRKRCC Logo" className="w-10 h-10 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
              Admin Control Room
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#8B2E3B] text-white">
              SYSTEM HIGH PRIVILEGE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Complete Dashboard Analytics • User Management & Password Creation • Forms Builder & Audit Logs
          </p>
        </div>
      </div>

      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-journey-accent px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Main Site</span>
        </Link>
      </div>
    </div>
  );
}
