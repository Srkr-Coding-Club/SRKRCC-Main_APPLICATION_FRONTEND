import React from 'react';
import { CLUB_LOGO_INK_PATH, CLUB_LOGO_RAYS_PATH, CLUB_LOGO_VIEWBOX } from './logoPaths';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

const sizePx: Record<NonNullable<LoadingSpinnerProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 68,
  xl: 100,
};

// The club mark, drawn: the bulb outline traces in and fills, then the rays trace
// out around it, holds complete, fades, and repeats. See the .animate-logo-* rules
// in globals.css - all three pieces share one cycle length so they stay in step.
export function LoadingSpinner({
  size = 'md',
  label,
  className = '',
}: LoadingSpinnerProps) {
  const px = sizePx[size];
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox={CLUB_LOGO_VIEWBOX}
        className="animate-logo-fade"
        role="img"
        aria-label="Loading"
      >
        {/* Light theme: dark ink on a light page. Dark theme: bright ink on a dark page. */}
        <path
          d={CLUB_LOGO_INK_PATH}
          strokeWidth={0.036}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          className="animate-logo-ink fill-[#6B1220] stroke-[#6B1220] dark:fill-[#FF8A4C] dark:stroke-[#FF8A4C]"
        />
        <path
          d={CLUB_LOGO_RAYS_PATH}
          strokeWidth={0.028}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          className="animate-logo-rays fill-[#B2460C] stroke-[#B2460C] dark:fill-[#FFD56B] dark:stroke-[#FFD56B]"
        />
      </svg>
      {label && (
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading SRKRCC Platform...' }: { label?: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <LoadingSpinner size="xl" label={label} />
    </div>
  );
}
