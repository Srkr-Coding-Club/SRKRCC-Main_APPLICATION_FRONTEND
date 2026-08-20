import React from 'react';
import Link from 'next/link';
import { Home, Compass, Calendar, Trophy, Code2, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full p-8 sm:p-10 rounded-3xl bg-white/60 dark:bg-[#151722]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-8 text-center">
        {/* 404 Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 font-mono text-xs uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5" />
          HTTP 404 Error
        </div>

        <div className="space-y-3">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            The page or module you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-left">
          <Link
            href="/events"
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-orange-500/10 border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/30 transition group"
          >
            <Calendar className="w-4 h-4 text-orange-500 mb-1" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-500">
              Events
            </p>
            <p className="text-[10px] text-slate-400">Workshops & talks</p>
          </Link>

          <Link
            href="/hackathons"
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-orange-500/10 border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/30 transition group"
          >
            <Trophy className="w-4 h-4 text-amber-500 mb-1" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-500">
              Hackathons
            </p>
            <p className="text-[10px] text-slate-400">IconCoders & more</p>
          </Link>

          <Link
            href="/codequest"
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-orange-500/10 border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/30 transition group col-span-2 sm:col-span-1"
          >
            <Code2 className="w-4 h-4 text-emerald-500 mb-1" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-500">
              CodeQuest
            </p>
            <p className="text-[10px] text-slate-400">Daily CP streaks</p>
          </Link>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm shadow-lg shadow-orange-500/25 transition"
          >
            <Home className="w-4 h-4" />
            Back to Home Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
