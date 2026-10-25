'use client';

import React, { useEffect, useState } from 'react';
import { QrCode, CheckCircle2, Circle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchApi } from '@/lib/api-client';
import { AttendanceBadge, MyAttendanceRecord } from '@/lib/types';

interface AttendanceBadgeCardProps {
  formId: number | string;
  registrantName?: string;
}

/**
 * "Your Attendance Pass" card - fetched from GET /api/forms/<id>/attendance/my-badge/
 * once the registrant has a completed response on an attendance_enabled form. The
 * `token` is rendered as a QR code volunteers scan at check-in (see
 * AttendanceScannerTab / POST /api/attendance/scan/ on the admin side).
 *
 * Also fetches GET /api/forms/<id>/attendance/my-record/ and renders a
 * session-by-session attended/not-attended list beneath the QR code - the
 * registrant's own performance for this event, not just their check-in pass.
 *
 * Viewed from Profile → Registered Events → select event, so the container
 * (AttendanceBadgeModal) is responsible for gating when this mounts.
 */
export function AttendanceBadgeCard({ formId, registrantName }: AttendanceBadgeCardProps) {
  const [badge, setBadge] = useState<AttendanceBadge | null>(null);
  const [record, setRecord] = useState<MyAttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      setLoading(true);
      setError(null);
      try {
        const [badgeRes, recordRes] = await Promise.all([
          fetchApi<AttendanceBadge>(`/forms/${formId}/attendance/my-badge/`),
          // Sessions may not exist yet (e.g. the form was just switched on) -
          // that's not fatal to showing the QR pass itself, so it fails quietly.
          fetchApi<MyAttendanceRecord>(`/forms/${formId}/attendance/my-record/`).catch(() => null),
        ]);
        if (!cancelled) {
          setBadge(badgeRes);
          setRecord(recordRes);
        }
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
      <div className="rounded-[24px] border border-journey-text/10 bg-journey-surface/70 p-6 text-center">
        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-journey-accent border-t-transparent" />
        <p className="text-sm text-journey-muted">Loading your attendance pass…</p>
      </div>
    );
  }

  // Opened deliberately (the person clicked "View QR Badge"), so a failure
  // has to say something instead of rendering nothing - silently showing an
  // empty modal would look broken rather than "no badge available."
  if (error) {
    return (
      <div className="rounded-[24px] border border-journey-live/20 bg-journey-live/5 p-5 text-center sm:p-6">
        <p className="text-sm font-medium text-journey-live">{error}</p>
      </div>
    );
  }

  if (!badge) return null;

  return (
    <div className="space-y-4">
      <div className="relative isolate space-y-4 overflow-hidden rounded-[24px] border border-journey-text/10 bg-journey-surface px-4 py-6 text-center shadow-[0_20px_45px_-30px_rgba(30,41,59,0.35)] sm:p-8 dark:shadow-[0_20px_45px_-30px_rgba(0,0,0,0.8)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.16),transparent)]" />
        <div className="flex flex-wrap items-center justify-center gap-2 text-journey-accent">
          <QrCode className="h-5 w-5 shrink-0" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] sm:text-base">Your Attendance Pass</h3>
        </div>
        <div className="inline-block max-w-full rounded-2xl border border-journey-text/10 bg-white p-3 shadow-sm sm:p-4">
          <QRCodeSVG value={badge.token} size={192} level="M" includeMargin={false} className="h-auto max-w-full" />
        </div>
        {registrantName && (
          <p className="break-words font-display text-base font-semibold text-journey-text sm:text-lg">{registrantName}</p>
        )}
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-journey-muted">
          Show this QR code at check-in for each session. It stays the same for every day, so there is no need to reload or
          re-download it.
        </p>
      </div>

      {record && record.total_sessions > 0 && (
        <div className="space-y-3 rounded-[24px] border border-journey-text/10 bg-journey-surface/70 p-4 text-left sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-journey-muted">
              Your Attendance
            </h4>
            <span className="text-sm font-semibold text-journey-text">
              {record.attended_count}/{record.total_sessions} sessions · {record.percentage}%
            </span>
          </div>
          <div className="space-y-1.5">
            {record.sessions.map((s) => (
              <div
                key={s.id}
                className={`flex flex-col gap-2 rounded-xl border border-journey-text/5 px-3 py-3 text-xs font-medium sm:flex-row sm:items-center sm:justify-between ${
                  s.attended
                    ? 'bg-journey-live/5 text-journey-live'
                    : 'bg-journey-bg/70 text-journey-muted'
                }`}
              >
                <span className="flex min-w-0 items-start gap-2">
                  {s.attended ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 flex-shrink-0 opacity-50" />
                  )}
                  <span className="min-w-0 break-words">Day {s.day_index + 1} · {s.session_label_display}</span>
                </span>
                <span className="pl-6 text-[11px] opacity-80 sm:pl-0 sm:text-right">
                  {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
