'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  /** Pinned under the scrolling body, so a long form keeps its Save / Cancel in view. */
  footer?: React.ReactNode;
  /** Blocks Escape / backdrop / X while a request is in flight. */
  busy?: boolean;
  maxWidth?: string;
}

/* Several dialogs can stack (a confirm over a form): the page stays locked until the last one closes. */
let scrollLockCount = 0;

function lockPageScroll() {
  if (scrollLockCount++ === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';
  }
  return () => {
    if (--scrollLockCount === 0) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  };
}

/**
 * Shared dialog shell: focus trap, Escape to close, page scroll lock (no layout jump), portalled to <body>.
 * The header stays pinned while the body scrolls; on phones it opens as a bottom sheet.
 */
export function Modal({ isOpen, onClose, title, icon: Icon, children, footer, busy = false, maxWidth = 'max-w-lg' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useFocusTrap(ref, isOpen);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, busy]);

  useEffect(() => (isOpen ? lockPageScroll() : undefined), [isOpen]);

  if (!isOpen || !mounted) return null;

  // Portalled to <body>: an ancestor with backdrop-filter (glass-panel) would otherwise become the containing block of this fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
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
        className={`glass-panel-solid flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-xl border border-slate-200 shadow-2xl dark:border-slate-800 sm:max-h-[90dvh] sm:rounded-xl`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800 sm:px-7">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-journey-accent" />}
            <h3 className="truncate text-lg font-bold text-[#1A1A2E] dark:text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition hover:text-slate-900 active:scale-90 disabled:opacity-40 dark:hover:text-white sm:min-h-9 sm:min-w-9"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-200/70 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-slate-800 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
