'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useToast, ToastItem } from '@/context/ToastContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  // Remaining time (ms) as of the last time the timer was (re)started — used
  // so hover/focus can pause the countdown and resume from where it left off.
  const remainingRef = useRef(duration);
  const runStartRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  const startTimers = () => {
    runStartRef.current = Date.now();
    const remainingAtStart = remainingRef.current;
    timeoutRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingAtStart);
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - runStartRef.current;
      const remaining = Math.max(0, remainingAtStart - elapsed);
      setProgress((remaining / duration) * 100);
    }, 50);
  };

  const pauseTimers = () => {
    const elapsed = Date.now() - runStartRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimers();
  };

  useEffect(() => {
    startTimers();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, duration]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Only resume once focus has actually left the toast (not just moved
    // between two focusable elements inside it).
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      startTimers();
    }
  };

  const config = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/30',
      progressColor: 'bg-emerald-500',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-rose-400',
      bgGlow: 'from-rose-500/10 to-transparent',
      borderColor: 'border-rose-500/30',
      progressColor: 'bg-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      bgGlow: 'from-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/30',
      progressColor: 'bg-amber-500',
    },
    info: {
      icon: Info,
      iconColor: 'text-[#FF7A00]',
      bgGlow: 'from-orange-500/10 to-transparent',
      borderColor: 'border-orange-500/30',
      progressColor: 'bg-[#FF7A00]',
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
      onMouseEnter={pauseTimers}
      onMouseLeave={startTimers}
      onFocus={pauseTimers}
      onBlur={handleBlur}
      className={`relative overflow-hidden w-full max-w-sm rounded-xl bg-[#151722]/95 backdrop-blur-xl border ${config.borderColor} shadow-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 flex items-start gap-3`}
    >
      <div className={`p-2 rounded-lg bg-white/5 ${config.iconColor} flex-shrink-0 mt-0.5`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-sm font-bold text-white leading-tight break-words">{toast.title}</h4>
        {toast.description && (
          <p className="mt-1 text-xs text-slate-300/85 leading-relaxed break-words">
            {toast.description}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          className={`h-full ${config.progressColor} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-auto max-w-sm w-full"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
