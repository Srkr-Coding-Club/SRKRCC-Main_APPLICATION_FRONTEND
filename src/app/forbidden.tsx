import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home, LogIn, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full p-8 sm:p-10 rounded-3xl bg-white/60 dark:bg-[#151722]/80 backdrop-blur-xl border border-rose-500/20 dark:border-rose-500/20 shadow-2xl space-y-8 text-center">
        {/* 403 Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono text-xs uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          HTTP 403 Forbidden
        </div>

        <div className="space-y-3">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
            403
          </h1>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You do not have the required administrative clearance (<strong>ADMIN</strong> or <strong>CLUB_LEAD</strong>) to view or manage this resource.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login?next=/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Admin Credentials
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
