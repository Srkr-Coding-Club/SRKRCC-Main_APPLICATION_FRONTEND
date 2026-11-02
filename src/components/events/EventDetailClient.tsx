'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, CalendarPlus, Check, Clock, Flame, MapPin, Share2, Ticket, Users } from 'lucide-react';
import type { Event } from '@/lib/types';
import { downloadEventCalendar } from '@/lib/calendar';
import {
  eventAvailability, eventPoster, formatEventDay, formatEventDayWithYear, formatEventTimeRange, registrationWindowLine, seatsLabel, seatsLeft,
} from '@/lib/eventListing';
import { riseIn } from '@/lib/entranceMotion';
import { useScrollEntrance } from '@/lib/hooks/useScrollEntrance';
import BannerImage from '@/components/ui/BannerImage';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import EventCard from '@/components/EventCard';
import { EventRegisterButton } from '@/components/events/EventRegisterButton';

const SHARE_STATE_RESET_MS = 2500;
const PANEL = 'rounded-3xl border border-journey-text/10 bg-journey-surface/60 p-5 sm:p-7';
const QUIET_BUTTON = 'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-journey-text/10 px-4 text-xs font-bold text-journey-text/80 transition hover:text-journey-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/70';

/** A block of the page drifts up as it scrolls into view, like the cards on the listing. */
function Rise({ className = '', index = 0, children }: { className?: string; index?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollEntrance(ref, (tl, element) => riseIn(tl, element, { y: 22, duration: 0.6 }), { index, start: 'top 92%' });
  return <div ref={ref} className={className}>{children}</div>;
}

function Fact({ icon: Icon, label, value, note }: { icon: React.ElementType; label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-journey-text/10 bg-journey-bg/40 p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-journey-accent" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-journey-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold leading-snug text-journey-text">
          {value}
          {note && <span className="ml-1 text-[11px] font-medium text-journey-muted">{note}</span>}
        </dd>
      </div>
    </div>
  );
}

interface EventDetailClientProps {
  event: Event;
  /** Other events to suggest under this one. */
  more: Event[];
}

/** One event's own page: poster, the facts, what it is about, and a registration panel that stays in reach. */
export function EventDetailClient({ event, more }: EventDetailClientProps) {
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const poster = eventPoster(event);
  const availability = eventAvailability(event);
  const left = seatsLeft(event);
  const registered = event.registration_count ?? 0;
  const filled = event.capacity > 0 ? Math.min(100, Math.round((registered / event.capacity) * 100)) : 0;
  const windowLine = registrationWindowLine(event);
  const dated = !!event.start_time;

  const share = async () => {
    const url = window.location.href;
    try {
      // Phones get the share sheet; desktops copy the link.
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: event.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState('copied');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      setShareState('failed');
    }
    window.setTimeout(() => setShareState('idle'), SHARE_STATE_RESET_MS);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 transition-colors duration-300">
      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-24 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted transition hover:text-journey-accent sm:min-h-8"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All events
          </Link>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
            <Rise className="min-w-0 space-y-5 lg:col-start-1">
              <div className="relative aspect-[16/7] w-full overflow-hidden rounded-3xl border border-journey-text/10 bg-journey-surface sm:aspect-[16/6]">
                {poster ? (
                  <BannerImage src={poster} alt="" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFF1E2] to-[#FFE0C2] dark:from-slate-800 dark:to-slate-900">
                    <Ticket className="h-20 w-20 text-journey-accent/40" aria-hidden="true" />
                  </div>
                )}
              </div>

              <header className={`${PANEL} space-y-5`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-journey-accent/30 bg-journey-accent/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-journey-accent">
                    <Ticket className="h-3 w-3" aria-hidden="true" />
                    {event.category}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${availability.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${availability.dot}`} aria-hidden="true" />
                    {availability.label}
                  </span>
                </div>
                <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-journey-text sm:text-4xl">{event.title}</h1>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Fact icon={Calendar} label="Date" value={dated ? formatEventDayWithYear(event.start_time) : formatEventDay(event.start_time)} />
                  <Fact icon={Clock} label="Time" value={formatEventTimeRange(event.start_time, event.end_time)} note={dated ? 'IST' : undefined} />
                  <Fact icon={MapPin} label="Venue" value={event.venue || 'To be announced'} />
                  <Fact icon={Users} label="Seats" value={`${seatsLabel(event.capacity)} in total`} />
                </dl>
              </header>
            </Rise>

            <Rise index={1} className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <aside aria-label="Registration" className={`${PANEL} space-y-5`}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-journey-muted">Seats left</p>
                  <p className="mt-1 flex items-baseline gap-2 font-display text-4xl font-bold text-journey-text">
                    {left}
                    <span className="text-sm font-medium text-journey-muted">of {event.capacity}</span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Seats taken"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={filled}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-journey-text/10"
                  >
                    <div className="h-full rounded-full bg-gradient-to-r from-[#8B2E3B] to-journey-accent" style={{ width: `${filled}%` }} />
                  </div>
                  {availability.fillingFast && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Flame className="h-3.5 w-3.5" aria-hidden="true" /> Filling fast
                    </p>
                  )}
                </div>

                {windowLine && <p className="flex items-start gap-2 text-sm font-medium text-journey-text/80"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-journey-accent" aria-hidden="true" />{windowLine}</p>}

                <EventRegisterButton event={event} size="panel" />

                <div className="flex gap-2">
                  {dated && availability.kind !== 'CLOSED' && availability.kind !== 'PAST' && (
                    <button type="button" onClick={() => downloadEventCalendar(event)} className={QUIET_BUTTON}>
                      <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                      Add to calendar
                    </button>
                  )}
                  <button type="button" onClick={share} className={QUIET_BUTTON}>
                    {shareState === 'copied' ? <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
                    {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Share'}
                  </button>
                </div>
              </aside>
            </Rise>

            <Rise index={2} className="min-w-0 lg:col-start-1">
              <section aria-labelledby="about-event" className={PANEL}>
                <h2 id="about-event" className="flex items-center gap-2 font-display text-lg font-bold text-journey-text">
                  <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#8B2E3B] to-journey-accent" aria-hidden="true" />
                  About this event
                </h2>
                <div className="mt-4 text-sm leading-relaxed text-journey-text/80 sm:text-base">
                  {event.description?.trim() ? <MarkdownRenderer content={event.description} /> : <p className="italic text-journey-muted">Details for this event will be posted soon.</p>}
                </div>
              </section>
            </Rise>
          </div>
        </div>

        {more.length > 0 && (
          <section aria-labelledby="more-events" className="space-y-5">
            <h2 id="more-events" className="font-display text-xl font-bold text-journey-text">More events</h2>
            <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((other, index) => (
                <li key={other.id} className="h-full">
                  <EventCard event={other} index={index} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
