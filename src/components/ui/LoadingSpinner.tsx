import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function LoadingSpinner({
  size = 'md',
  label,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Pulsing ambient glow behind spinner */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#8B2E3B] opacity-20 blur-md animate-pulse" />
        <Loader2 className={`${sizeClasses[size]} animate-spin text-[#FF7A00] relative z-10`} />
      </div>
      {label && (
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading SRKRCC Platform...' }: { label?: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="p-8 rounded-3xl bg-white/60 dark:bg-[#151722]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center gap-4 max-w-sm w-full text-center">
        <LoadingSpinner size="lg" />
        <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">
          {label}
        </p>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF7A00] to-[#8B2E3B] w-1/2 rounded-full animate-indeterminate" />
        </div>
      </div>
    </div>
  );
}
