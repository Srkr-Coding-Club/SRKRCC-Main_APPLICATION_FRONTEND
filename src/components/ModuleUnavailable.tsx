import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowLeft } from 'lucide-react';

interface ModuleUnavailableProps {
  moduleName: string;
  icon: LucideIcon;
  description?: string;
}

export default function ModuleUnavailable({ moduleName, icon: Icon, description }: ModuleUnavailableProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 sm:p-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] flex items-center justify-center mx-auto">
            <Icon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
              {moduleName} is temporarily unavailable
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {description || 'This module has been paused by the admin team and will return once the current season/window opens.'}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
