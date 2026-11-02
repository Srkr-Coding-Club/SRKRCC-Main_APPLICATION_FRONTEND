'use client';

import React from 'react';

export function LoadingSkeleton({
  rows = 4,
  className = '',
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`p-6 glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl skeleton" />
        <div className="space-y-2 flex-1">
          <div className="h-4 skeleton rounded w-1/3" />
          <div className="h-3 skeleton rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 skeleton rounded-xl w-full"
          />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-6 glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-4 skeleton rounded w-1/4" />
        <div className="h-3 skeleton rounded w-1/6" />
      </div>
      <div className="h-48 skeleton rounded-xl flex items-end justify-between p-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-orange-500/20 rounded-t w-full"
            style={{ height: `${20 + (i * 7) % 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}
