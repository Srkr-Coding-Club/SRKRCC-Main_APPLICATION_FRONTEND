'use client';

import React, { useEffect, useRef } from 'react';
import { X, QrCode } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { AttendanceBadgeCard } from '@/components/AttendanceBadgeCard';

interface AttendanceBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: number | null;
  eventTitle?: string;
  registrantName?: string;
}

/**
 * Modal shell around AttendanceBadgeCard — opened from the profile page's
 * "View QR Badge" action on a registered event that has attendance enabled.
 */
export function AttendanceBadgeModal({ isOpen, onClose, formId, eventTitle, registrantName }: AttendanceBadgeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
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

  if (!isOpen || !formId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Attendance QR badge"
        tabIndex={-1}
        className="glass-panel rounded-xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <QrCode className="w-5 h-5 text-[#FF7A00] flex-shrink-0" />
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
    </div>
  );
}
