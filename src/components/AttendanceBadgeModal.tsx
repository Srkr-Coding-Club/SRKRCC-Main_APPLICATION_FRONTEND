'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useSiteNavbarOffset } from '@/lib/hooks/useSiteNavbarOffset';
import { AttendanceBadgeCard } from '@/components/AttendanceBadgeCard';

interface AttendanceBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: number | null;
  eventTitle?: string;
  registrantName?: string;
}

/**
 * Modal shell around AttendanceBadgeCard - opened from the profile page's
 * "View QR Badge" action on a registered event that has attendance enabled.
 */
export function AttendanceBadgeModal({ isOpen, onClose, formId, eventTitle, registrantName }: AttendanceBadgeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const navbarOffset = useSiteNavbarOffset(isOpen);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !formId || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      style={{ top: navbarOffset }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Attendance QR badge"
        tabIndex={-1}
        className="glass-panel w-full max-w-sm space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-6 shadow-xl dark:border-slate-800"
        style={{ maxHeight: `calc(100dvh - ${navbarOffset}px - 3rem)` }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <QrCode className="w-5 h-5 text-journey-accent flex-shrink-0" />
            <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white truncate">{eventTitle || 'Attendance QR Badge'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white flex-shrink-0 transition-transform duration-100 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AttendanceBadgeCard formId={formId} registrantName={registrantName} />
      </div>
    </div>,
    document.body,
  );
}
