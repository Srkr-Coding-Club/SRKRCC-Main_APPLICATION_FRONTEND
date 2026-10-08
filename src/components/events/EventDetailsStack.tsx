'use client';

import Link from 'next/link';
import {
  Calendar,
  Clock,
  Flame,
  Lock,
  MapPin,
  Ticket,
} from 'lucide-react';
import type { Event } from '@/lib/types';
import { isSafeHref } from '@/lib/urlSafety';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import DetailsStack from '@/components/ui/StackCards';

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80';
const EVENT_TIME_ZONE = 'Asia/Kolkata';

interface EventDetailsStackProps {
  events: Event[];
  initialEventId: number;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'To be announced';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: EVENT_TIME_ZONE,
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: EVENT_TIME_ZONE,
  });
}

function getRegistrationWindow(
  opensIso: string | null | undefined,
  closesIso: string | null | undefined,
): { label: string; date: string; time: string } | null {
  if (!opensIso && !closesIso) return null;
  const opensInFuture = opensIso ? new Date(opensIso).getTime() > Date.now() : false;
  if (opensInFuture && opensIso) {
    return { label: 'Opens', date: formatDate(opensIso), time: formatTime(opensIso) };
  }
  if (closesIso) {
    return { label: 'Closes', date: formatDate(closesIso), time: formatTime(closesIso) };
  }
  return null;
}

function EventDetailCard({ event }: { event: Event }) {
  const isClosed = event.status === 'CLOSED';
  const poster =
    event.poster_image && isSafeHref(event.poster_image)
      ? event.poster_image
      : FALLBACK_POSTER;
  const registered = event.registration_count ?? 0;
  const seatsLeft = Math.max(0, event.capacity - registered);
  const filledPct =
    event.capacity > 0 ? Math.min(100, Math.round((registered / event.capacity) * 100)) : 0;
  const isFull = !isClosed && event.capacity > 0 && seatsLeft === 0;
  const fillingFast =
    !isClosed && !isFull && event.capacity > 0 && seatsLeft / event.capacity <= 0.15;
  const stubInactive = isClosed || isFull;

  const registrationWindow = getRegistrationWindow(
    event.registration_opens_at,
    event.registration_closes_at,
  );

  const dateValue = formatDate(event.start_time);
  const timeValue = event.start_time
    ? `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ''}`
    : 'To be announced';
  const venueValue = event.venue || 'To be announced';

  const stubButtonBase =
    'flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all';

  return (
    <article className="flex h-auto flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
      {/* Top row: poster (left) + vertical registration ticket (right) */}
      <div className="flex min-h-[14rem] shrink-0 sm:min-h-[15.5rem]">
        {/* Poster */}
        <div className="relative min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- event posters may come from admin-configured hosts */}
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-2.5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF7A00] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                <Ticket className="h-3 w-3" />
                {event.category}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm ${
                  isClosed ? 'bg-slate-700/90' : isFull ? 'bg-amber-500/90' : 'bg-emerald-500/90'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                {isClosed ? 'Closed' : isFull ? 'Fully booked' : 'Registrations open'}
              </span>
            </div>
            <h2 className="font-poppins text-lg font-bold leading-snug tracking-tight text-white sm:text-xl drop-shadow-sm">
              {event.title}
            </h2>
          </div>
        </div>

        {/* Vertical ticket stub */}
        <div
          className={`relative flex w-[9rem] shrink-0 flex-col justify-between gap-3 p-4 text-white sm:w-48 sm:p-5 ${
            stubInactive
              ? 'bg-gradient-to-b from-slate-700 to-slate-800'
              : 'bg-gradient-to-b from-[#8B2E3B] to-[#FF7A00]'
          }`}
        >
          {/* perforation + notches */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-4 left-0 border-l-2 border-dashed border-white/30" />
          <span aria-hidden="true" className="absolute -left-2.5 -top-2.5 z-10 h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow-inner" />
          <span aria-hidden="true" className="absolute -bottom-2.5 -left-2.5 z-10 h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow-inner" />

          <div className="space-y-3">
            {/* Seats */}
            <div>
              <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider">Seats left</p>
              <p className="font-poppins text-3xl font-extrabold leading-tight tracking-tight">
                {isFull ? 0 : seatsLeft}
              </p>
              <p className="text-[11px] text-white/75 font-medium">of {event.capacity} capacity</p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={filledPct}
                aria-label="Seats filled"
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20"
              >
                <div className="h-full rounded-full bg-white shadow-sm transition-all duration-500" style={{ width: `${filledPct}%` }} />
              </div>
              {fillingFast && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold tracking-wide backdrop-blur-sm">
                  <Flame className="h-3 w-3 text-amber-200 fill-amber-200" />
                  Filling fast
                </span>
              )}
            </div>

            {/* Registration window */}
            {registrationWindow && (
              <div className="border-t border-dashed border-white/25 pt-2.5">
                <p className="text-[10px] font-medium text-white/80 uppercase tracking-wider">
                  Registration {registrationWindow.label.toLowerCase()}
                </p>
                <p className="text-xs font-bold leading-snug mt-0.5">{registrationWindow.date}</p>
                <p className="text-[11px] leading-snug text-white/85">{registrationWindow.time}</p>
              </div>
            )}
          </div>

          {/* Action */}
          {isClosed ? (
            <span className={`${stubButtonBase} bg-white/15 text-white/70 cursor-not-allowed`}>
              <Lock className="h-3.5 w-3.5" />
              Closed
            </span>
          ) : isFull ? (
            <span className={`${stubButtonBase} bg-white/15 text-white/70 cursor-not-allowed`}>
              <Lock className="h-3.5 w-3.5" />
              Event full
            </span>
          ) : event.form_slug ? (
            <Link
              href={`/forms/${event.form_slug}`}
              className={`${stubButtonBase} bg-white text-[#8B2E3B] shadow-lg hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95`}
            >
              <Ticket className="h-3.5 w-3.5" />
              Register now
            </Link>
          ) : (
            <span className={`${stubButtonBase} bg-white/15 text-white/90`}>Opens soon</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
        {/* Date / time / venue: one segmented info bar */}
        <dl className="grid shrink-0 grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-3">
          <div className="flex items-start gap-2.5 border-r border-slate-200 px-3.5 py-2.5 dark:border-white/10">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</dt>
              <dd className="text-xs font-semibold leading-snug text-[#1A1A2E] dark:text-white mt-0.5">
                {dateValue}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 sm:border-r sm:border-slate-200 sm:dark:border-white/10">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</dt>
              <dd className="text-xs font-semibold leading-snug text-[#1A1A2E] dark:text-white mt-0.5">
                {timeValue}
                {event.start_time && (
                  <span className="ml-1 text-[10px] font-medium text-slate-400">IST</span>
                )}
              </dd>
            </div>
          </div>
          <div className="col-span-2 flex items-start gap-2.5 border-t border-slate-200 px-3.5 py-2.5 dark:border-white/10 sm:col-span-1 sm:border-t-0">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Venue</dt>
              <dd className="text-xs font-semibold leading-snug text-[#1A1A2E] dark:text-white mt-0.5 truncate">
                {venueValue}
              </dd>
            </div>
          </div>
        </dl>

        {/* About */}
        <section>
          <div className="flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-gradient-to-b from-[#8B2E3B] to-[#FF7A00]" />
            <h3 className="font-poppins text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              About this event
            </h3>
          </div>
          <div className="mt-2.5 max-h-[120px] overflow-y-auto border-l-2 border-slate-200/80 pl-3.5 pr-1 text-[13px] leading-relaxed text-slate-600 dark:border-white/10 dark:text-slate-300">
            {event.description?.trim() ? (
              <MarkdownRenderer content={event.description} />
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-slate-400 italic">
                Details for this event will be posted soon.
              </p>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

export default function EventDetailsStack({ events, initialEventId }: EventDetailsStackProps) {
  return (
    <DetailsStack
      items={events.map((event) => ({
        id: event.id,
        content: <EventDetailCard event={event} />,
      }))}
      initialItemId={initialEventId}
    />
  );
}