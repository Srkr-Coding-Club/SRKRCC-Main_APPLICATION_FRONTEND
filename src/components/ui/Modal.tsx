'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  /** Blocks Escape / backdrop / X while a request is in flight. */
  busy?: boolean;
  maxWidth?: string;
}

/** Shared dialog shell: focus trap, Escape to close, body scroll lock (same behaviour as CreateUserModal). */
export function Modal({ isOpen, onClose, title, icon: Icon, children, busy = false, maxWidth = 'max-w-lg' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, busy]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`glass-panel-solid rounded-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-5 h-5 shrink-0 text-[#FF7A00]" />}
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex items-center justify-center min-h-9 min-w-9 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
