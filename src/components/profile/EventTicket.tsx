'use client';

import React from 'react';
import Link from 'next/link';
import { Award, Calendar, CheckCircle2, FileText, Loader2, QrCode, Star, XCircle } from 'lucide-react';
import type { RegisteredEventItem } from '@/lib/myEvents';
import { focusRing } from './styles';

const EVENT_TIME_ZONE = 'Asia/Kolkata';

// "23rd Sep 2026 · 5:30 PM" (time is skipped when the source has no time part)
const formatEventDate = (raw: string): string => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = Number(d.toLocaleDateString('en-US', { day: 'numeric', timeZone: EVENT_TIME_ZONE }));
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: EVENT_TIME_ZONE });
  const base = `${day}${suffix} ${month} ${d.toLocaleDateString('en-US', { year: 'numeric', timeZone: EVENT_TIME_ZONE })}`;
  const hasTime = /\d{1,2}:\d{2}/.test(raw);
  if (!hasTime) return base;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: EVENT_TIME_ZONE });
  return `${base} · ${time}`;
};


/** One event registration as a ticket: its status, what can be done next (rate, certificate, cancel) and the QR badge. */
export function EventTicket({ evt, onShowQr, onRate, onCancel, cancelling }: { evt: RegisteredEventItem; onShowQr: () => void; onRate: () => void; onCancel: () => void; cancelling: boolean }) {
  const accent = '#FF7A00';
  const canShowQr = evt.attendance_enabled && evt.form_id;
  const canRate = Boolean(evt.event_slug && evt.event_ended && evt.attendance_enabled);
  // The server decides; older payloads without the rules fall back to "not started yet".
  const cancellation = evt.cancellation ?? (evt.event_slug ? { allowed: !evt.event_started, reason: null, closes_at: null } : null);
  const canCancel = Boolean(evt.event_slug && cancellation?.allowed);
  const cancelClosed = Boolean(evt.event_slug && cancellation && !cancellation.allowed && !evt.event_started && !evt.event_ended);
  const hasCertificate = Boolean(evt.event_slug && evt.certificates_released && evt.attendance_enabled);
  // Keep the status colours coming from the API, but drop any border classes so it reads as a plain tag.
  const statusClasses = (evt.badgeBg || '')
    .split(/\s+/)
    .filter((c) => c && !/(^|:)border/.test(c))
    .join(' ');

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-journey-text/10 bg-white/65 shadow-[0_20px_50px_-36px_rgba(26,26,46,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-journey-accent/30 dark:bg-white/[0.04] sm:flex-row">
      {/* main */}
      <div className="relative min-w-0 flex-1 space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            <FileText className="h-3 w-3" />
            {evt.track}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses}`}>
            <CheckCircle2 className="h-3 w-3" />
            <span>{evt.status}</span>
          </span>
        </div>

        <h3 className="font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-journey-text sm:text-xl">{evt.title}</h3>

        <p className="inline-flex items-center gap-2 text-xs font-medium text-journey-muted sm:text-[13px]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-journey-accent/10 text-journey-accent">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <span className="text-journey-text">{formatEventDate(evt.start_time || evt.date)}</span>
        </p>

        {(canRate || hasCertificate || canCancel || cancelClosed) && (
          <div className="flex flex-wrap gap-2">
            {canRate && (
              <button type="button" onClick={onRate} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-journey-accent/40 px-4 py-2 text-xs font-bold text-journey-accent transition hover:bg-journey-accent/10 sm:min-h-9">
                <Star className="h-3.5 w-3.5" aria-hidden="true" /> Rate this event
              </button>
            )}
            {canCancel && (
              <button type="button" onClick={onCancel} disabled={cancelling} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400 sm:min-h-9">
                {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />} Cancel registration
              </button>
            )}
            {hasCertificate && (
              <Link href={`/events/${evt.event_slug}/certificate`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-journey-accent/40 px-4 py-2 text-xs font-bold text-journey-accent transition hover:bg-journey-accent/10 sm:min-h-9">
                <Award className="h-3.5 w-3.5" aria-hidden="true" /> Certificate
              </Link>
            )}
          </div>
        )}

        {canCancel && cancellation?.closes_at && (
          <p className="text-xs text-journey-muted">You can cancel until {formatEventDate(cancellation.closes_at)} IST.</p>
        )}
        {cancelClosed && (
          <p role="note" className="text-xs text-journey-muted">
            {cancellation?.reason === 'CANCELLATION_LOCKED' ? 'Cancelling is closed for this event.' : 'Cancelling has closed for this event.'} Ask the organizers if you cannot come.
          </p>
        )}
      </div>

      {/* tear line + stub */}
      <div
        className="relative flex items-center justify-center border-t border-dashed border-journey-text/20 p-4 sm:w-44 sm:border-l sm:border-t-0"
        style={{ backgroundColor: `${accent}0d` }}
      >
        {/* punched notches */}
        <span
          aria-hidden="true"
          className="absolute -left-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-journey-bg sm:-top-3 sm:left-0 sm:-translate-x-1/2 sm:translate-y-0"
        />
        <span
          aria-hidden="true"
          className="absolute -right-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-journey-bg sm:-bottom-3 sm:left-0 sm:right-auto sm:top-auto sm:-translate-x-1/2 sm:translate-y-0"
        />

        {canShowQr ? (
          <button
            type="button"
            onClick={onShowQr}
            className={`flex w-full flex-row items-center justify-center gap-3 rounded-2xl bg-journey-accent px-4 py-3 text-journey-on-accent shadow-[0_10px_26px_-10px_rgba(255,122,0,0.8)] transition hover:brightness-110 active:scale-[0.98] sm:aspect-square sm:h-28 sm:w-28 sm:flex-col sm:gap-1.5 sm:px-2 sm:py-2 ${focusRing}`}
          >
            <QrCode className="h-7 w-7" />
            <span className="text-xs font-bold sm:text-center sm:leading-tight">View QR Badge</span>
          </button>
        ) : (
          <div className="flex flex-row items-center gap-2 sm:flex-col sm:gap-1.5" style={{ color: accent }}>
            <CheckCircle2 className="h-8 w-8" />
            <span className="text-xs font-bold uppercase tracking-wider">Registered</span>
          </div>
        )}
      </div>
    </article>
  );
}
