import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Ticket, Lock, CalendarClock } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { isModuleEnabled } from '@/lib/moduleFlags';
import { isSafeHref } from '@/lib/urlSafety';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import ModuleUnavailable from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80';

async function getEvent(slug: string): Promise<Event | null> {
  try {
    return await fetchApi<Event>(`/events/${encodeURIComponent(slug)}/`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  // Thrown here (before streaming starts) so a missing slug returns a real HTTP 404.
  if (!event) notFound();
  return {
    title: event.title,
    description: `${event.category} at ${event.venue} — SRKR Coding Club`,
  };
}

// Server-rendered: pin the zone, or production (Render runs in UTC) shows every time 5h30m off.
const EVENT_TIME_ZONE = 'Asia/Kolkata';

function formatSchedule(
  startIso: string | null,
  endIso: string | null
): { label: string; value: string; icon: typeof Calendar }[] {
  if (!startIso || !endIso) {
    return [{ icon: Calendar, label: 'Event Date', value: 'To be announced' }];
  }
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: EVENT_TIME_ZONE });
  const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: EVENT_TIME_ZONE });

  if (date(start) === date(end)) {
    return [
      { icon: Calendar, label: 'Event Date', value: date(start) },
      { icon: Clock, label: 'Event Time', value: `${time(start)} – ${time(end)} IST` },
    ];
  }
  return [
    { icon: Calendar, label: 'Event Starts', value: `${date(start)} · ${time(start)} IST` },
    { icon: Clock, label: 'Event Ends', value: `${date(end)} · ${time(end)} IST` },
  ];
}

/** Distinct from formatSchedule above: when the linked FORM accepts
 * submissions, which is frequently a separate (usually earlier) deadline
 * from when the event itself happens. */
function formatRegistrationWindow(
  opensIso: string | null | undefined,
  closesIso: string | null | undefined
): { label: string; value: string; icon: typeof CalendarClock } | null {
  if (!opensIso && !closesIso) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: EVENT_TIME_ZONE }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: EVENT_TIME_ZONE }) +
    ' IST';

  const opensInFuture = opensIso ? new Date(opensIso).getTime() > Date.now() : false;
  if (opensInFuture && opensIso) {
    return { icon: CalendarClock, label: 'Registration Opens', value: fmt(opensIso) };
  }
  if (closesIso) {
    return { icon: CalendarClock, label: 'Registration Closes', value: fmt(closesIso) };
  }
  return null;
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const enabled = await isModuleEnabled('events');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="Events"
        icon={Calendar}
        description="The events hub is paused right now. Check back once the next event window opens."
      />
    );
  }

  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const isClosed = event.status === 'CLOSED';
  const registered = event.registration_count ?? 0;
  const seatsLeft = Math.max(0, event.capacity - registered);
  const poster = event.poster_image && isSafeHref(event.poster_image) ? event.poster_image : FALLBACK_POSTER;

  const registrationWindow = formatRegistrationWindow(event.registration_opens_at, event.registration_closes_at);
  const facts = [
    ...formatSchedule(event.start_time, event.end_time),
    { icon: MapPin, label: 'Venue', value: event.venue || 'To be announced' },
    { icon: Users, label: 'Seats', value: `${event.capacity} total · ${seatsLeft} left` },
    ...(registrationWindow ? [registrationWindow] : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7A00] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          All events
        </Link>

        {/* Poster header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary host, not in next/image remotePatterns */}
          <img src={poster} alt={event.title} className="h-64 sm:h-80 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/95 via-[#1A1A2E]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                <Ticket className="h-3 w-3" />
                {event.category}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  isClosed ? 'bg-slate-700/80 text-slate-200' : 'bg-emerald-500/90 text-white'
                }`}
              >
                {isClosed ? 'Closed' : 'Registrations Open'}
              </span>
            </div>
            <h1 className="font-poppins text-2xl sm:text-4xl font-extrabold leading-tight text-white">{event.title}</h1>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* About */}
          <section className="self-start glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00]">About this event</h2>
            {event.description?.trim() ? (
              <MarkdownRenderer content={event.description} />
            ) : (
              <p className="text-sm text-slate-500">Details for this event will be posted soon.</p>
            )}
          </section>

          {/* Facts + CTA */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{value}</p>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                {isClosed ? (
                  <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400 dark:bg-white/5 dark:text-slate-500">
                    <Lock className="h-4 w-4" />
                    Registration Closed
                  </span>
                ) : event.form_slug ? (
                  <Link
                    href={`/forms/${event.form_slug}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95"
                  >
                    <Ticket className="h-4 w-4" />
                    Register Now
                  </Link>
                ) : (
                  <span className="flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    Registration opens soon
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
