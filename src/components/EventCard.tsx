'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Calendar, Clock, MapPin, Ticket, Users } from 'lucide-react';
import type { Event } from '@/lib/types';
import { markdownToPreview } from '@/lib/utils';
import { eventAvailability, eventPoster, formatEventDay, formatEventTimeRange, registrationWindowLine, seatsLabel, seatsLeft } from '@/lib/eventListing';
import BannerImage from '@/components/ui/BannerImage';
import { EventRegisterButton } from '@/components/events/EventRegisterButton';
import { useScrollEntrance } from '@/lib/hooks/useScrollEntrance';
import { coverWipe, drawTimeline, fadeIn, footerRise, popIn, riseFromMask } from '@/lib/entranceMotion';
import { pushWithProgress } from '@/lib/routeProgress';

interface EventCardProps {
  event: Event;
  accent?: string;
  index?: number;
  /** `wide` lays a lone event out poster-beside-details (from the medium breakpoint up). */
  layout?: 'card' | 'wide';
}

/** The grid fades the whole card in first; the inner sequence follows it (the same beat as the hackathon and form cards). */
const INNER_START_DELAY_SECONDS = 0.15;

/** An event in the listing: poster, what it is, when and where, and how to register. Opens the event's page. */
export default function EventCard({ event, accent = '#FF7A00', index = 0, layout = 'card' }: EventCardProps) {
  const wide = layout === 'wide';
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const detailHref = `/events/${event.slug}`;
  const poster = eventPoster(event);
  const availability = eventAvailability(event);
  const description = markdownToPreview(event.description);
  const left = seatsLeft(event);
  const windowLine = registrationWindowLine(event);
  const dated = !!event.start_time;

  useScrollEntrance(
    cardRef,
    (tl) => {
      coverWipe(tl, '.ec-media', '.ec-img');
      popIn(tl, '.ec-chip');
      riseFromMask(tl, '.ec-title');
      fadeIn(tl, '.ec-desc');
      drawTimeline(tl, { line: '.ec-line', dots: '.ec-dot', steps: '.ec-step' });
      fadeIn(tl, '.ec-meta', '-=0.3');
      footerRise(tl, '.ec-footer');
    },
    { index, delay: INNER_START_DELAY_SECONDS, start: 'top 85%' },
  );

  return (
    <div ref={cardRef} className="h-full w-full py-2">
      <article
        onClick={(click) => {
          if (!(click.target as HTMLElement).closest('a, button')) pushWithProgress(router, detailHref);
        }}
        className={[
          'ec-shell group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] p-2',
          wide ? 'md:flex-row md:gap-2' : '',
          'border border-journey-text/10 bg-journey-surface/60 backdrop-blur-sm',
          'shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_20px_45px_-28px_rgba(30,41,59,0.35)]',
          'transition-shadow duration-500 hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_26px_55px_-26px_rgba(255,122,0,0.28)]',
          'dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_45px_-28px_rgba(0,0,0,0.8)]',
          'dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_26px_55px_-26px_rgba(255,122,0,0.18)]',
        ].join(' ')}
      >
        <div className={`ec-media relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-[20px] bg-slate-200/60 dark:bg-slate-800/60 ${wide ? 'md:aspect-auto md:min-h-[22rem] md:w-[46%]' : ''}`}>
          <div className="ec-img absolute inset-0">
            <div className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transform-none">
              {poster ? (
                <BannerImage src={poster} alt="" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFF1E2] to-[#FFE0C2] dark:from-slate-800 dark:to-slate-900">
                  <Ticket className="h-14 w-14 text-journey-accent/40" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />

          <div className={`ec-chip absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-md ${availability.className}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${availability.dot}`} aria-hidden="true" />
            <span className="truncate">{availability.label}</span>
          </div>

          <div className="absolute inset-x-4 bottom-3.5 z-10 overflow-hidden">
            <div className="ec-title">
              <p className="mb-1 inline-flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
                <Ticket className="h-3 w-3" aria-hidden="true" />
                {event.category}
              </p>
              <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.85)] sm:text-xl">
                {event.title}
              </h3>
            </div>
          </div>
        </div>

        <div className={`flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 ${wide ? 'md:justify-center md:px-8 md:py-6' : ''}`}>
          {description && <p className="ec-desc line-clamp-3 text-sm leading-relaxed text-journey-text/80">{description}</p>}

          <ol className="relative mt-5 grid gap-4 pl-6">
            <li className="ec-step relative">
              <span aria-hidden="true" className="ec-line absolute -bottom-[26px] -left-[19px] top-[10px] w-px origin-top bg-gradient-to-b from-journey-accent to-journey-text/20" />
              <span aria-hidden="true" className="ec-dot absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-journey-accent bg-journey-bg" />
              <p className="text-xs font-medium text-journey-muted">When</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold leading-none text-journey-text">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                  {formatEventDay(event.start_time)}
                </span>
                {dated && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                    {formatEventTimeRange(event.start_time, event.end_time)}
                  </span>
                )}
              </p>
            </li>
            <li className="ec-step relative">
              <span aria-hidden="true" className="ec-dot absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-journey-text/30 bg-journey-bg" />
              <p className="text-xs font-medium text-journey-muted">Where</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold leading-none text-journey-text">
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                <span className="line-clamp-1">{event.venue || 'Venue to be announced'}</span>
              </p>
            </li>
          </ol>

          <div className="ec-meta mt-5 grid gap-2 border-t border-journey-text/10 pt-4 text-sm text-journey-text/80">
            <p className="flex items-center gap-2 font-medium">
              <Users className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
              {availability.kind === 'OPEN' || availability.kind === 'NOT_YET_OPEN'
                ? `${left} of ${seatsLabel(event.capacity)} left${availability.fillingFast ? ' · filling fast' : ''}`
                : seatsLabel(event.capacity)}
            </p>
            {windowLine && (
              <p className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
                {windowLine}
              </p>
            )}
          </div>

          <div className={`ec-footer mt-auto flex flex-wrap items-stretch gap-2 pt-5 ${wide ? 'md:mt-6 md:max-w-lg md:flex-nowrap' : ''}`}>
            <Link
              href={detailHref}
              aria-label={`View details for ${event.title}`}
              className="inline-flex min-h-11 grow items-center justify-center gap-1 rounded-full border border-journey-text/10 px-4 text-xs font-semibold text-journey-text/80 transition hover:text-journey-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/70"
            >
              Details
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <EventRegisterButton event={event} size="card" />
          </div>
        </div>
      </article>
    </div>
  );
}
