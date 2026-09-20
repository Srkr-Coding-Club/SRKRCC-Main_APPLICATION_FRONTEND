'use client';

import React, { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchApi } from '@/lib/api-client';
import { AttendanceBadge } from '@/lib/types';

interface AttendanceBadgeCardProps {
  formId: number | string;
  registrantName?: string;
}

/**
 * "Your Attendance Pass" card — fetched from GET /api/forms/<id>/attendance/my-badge/
 * once the registrant has a completed response on an attendance_enabled form. The
 * `token` is rendered as a QR code volunteers scan at check-in (see
 * AttendanceScannerTab / POST /api/attendance/scan/ on the admin side).
 *
 * Viewed from Profile → Registered Events → select event, so the container
 * (AttendanceBadgeModal) is responsible for gating when this mounts.
 */
export function AttendanceBadgeCard({ formId, registrantName }: AttendanceBadgeCardProps) {
  const [badge, setBadge] = useState<AttendanceBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchApi<AttendanceBadge>(`/forms/${formId}/attendance/my-badge/`);
        if (!cancelled) setBadge(res);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load your attendance pass.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (formId) loadBadge();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] p-6 text-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading your attendance pass…</p>
      </div>
    );
  }

  // Opened deliberately (the person clicked "View QR Badge"), so a failure
  // has to say something instead of rendering nothing — silently showing an
  // empty modal would look broken rather than "no badge available."
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-center">
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p>
      </div>
    );
  }

  if (!badge) return null;

  return (
    <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-b from-orange-50/60 to-white dark:from-orange-950/20 dark:to-[#151722] p-6 sm:p-8 text-center space-y-4">
      <div className="flex items-center justify-center gap-2 text-[#FF7A00]">
        <QrCode className="w-5 h-5" />
        <h3 className="text-sm font-black uppercase tracking-widest">Your Attendance Pass</h3>
      </div>
      <div className="inline-block p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <QRCodeSVG value={badge.token} size={192} level="M" includeMargin={false} />
      </div>
      {registrantName && (
        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{registrantName}</p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Show this QR code at check-in for each session. It stays the same for every day — no need to reload or
        re-download it.
      </p>
    </div>
  );
}
