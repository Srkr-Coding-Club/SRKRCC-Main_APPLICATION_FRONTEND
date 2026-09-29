'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import PillButton from './PillButton';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';

interface EventItem {
  id: string;
  title: string;
  poster: string;
  badge: string;
  date: string;
  time: string;
  location: string;
  accent: string;
  formSlug?: string;
  closed: boolean;
  /** When the linked form stops accepting submissions — distinct from `date`/`time` above (when the event itself happens). */
  registrationClosesLabel: string | null;
}

// Cycled by index onto whichever events come back from the API (which carries
// no per-event color/poster of its own) so the slider keeps its existing look.
const ACCENT_PALETTE = ['#FF7A00', '#8B2E3B', '#FFA500'];
const FALLBACK_POSTERS = [
  'https://images.unsplash.com/photo-1631350397792-8e0c2de5b637?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1637073849667-91120a924221?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1695144244472-a4543101ef35?auto=format&fit=crop&w=1200&q=80',
];

// Mirrors the curated catalog in src/app/events/page.tsx's getEvents() fallback,
// so if the live API is unavailable this still points "Register Now" at real,
// existing form slugs rather than a dead anchor.
const FALLBACK_EVENTS: Event[] = [
  {
    id: 1,
    title: 'Full Stack React & Next.js 15 Hands-on Workshop',
    slug: 'full-stack-react-nextjs-workshop',
    category: 'Hands-on Workshop',
    description: 'Master modern frontend development, App Router server components, and Tailwind CSS glassmorphism styling in SRKR main seminar hall.',
    venue: 'SRKR Central Seminar Hall',
    capacity: 150,
    start_time: '2025-05-20T09:30:00Z',
    end_time: '2025-05-20T16:30:00Z',
    poster_image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    form_slug: 'hands-on-nextjs-workshop-2025',
  },
  {
    id: 2,
    title: 'AI & Generative LLMs Model Fine-Tuning Seminar',
    slug: 'ai-generative-llm-seminar',
    category: 'Tech Seminar',
    description: 'Explore PyTorch, LoRA fine-tuning, and open-source model deployment strategies presented by SRKRCC AI research leads.',
    venue: 'CSE Department Lab 3',
    capacity: 100,
    start_time: '2025-05-28T10:00:00Z',
    end_time: '2025-05-28T13:00:00Z',
    poster_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    title: 'IconCoders 2025 Flagship Hackathon Orientation & Kickoff',
    slug: 'iconcoders-2025-kickoff',
    category: 'Flagship Event',
    description: 'Official launch event for the annual 36-hour IconCoders Hackathon. Track announcements, mentor assignments, and rulebook distribution.',
    venue: 'SRKR Main Auditorium',
    capacity: 500,
    start_time: '2025-06-01T10:00:00Z',
    end_time: '2025-06-01T12:30:00Z',
    poster_image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    form_slug: 'iconcoders-2025-registration',
  },
];

function mapEventToItem(event: Event, index: number): EventItem {
  const start = event.start_time ? new Date(event.start_time) : null;
  return {
    id: event.slug || String(event.id),
    title: event.title,
    poster: event.poster_image || FALLBACK_POSTERS[index % FALLBACK_POSTERS.length],
    badge: (event.category || 'Event').toUpperCase(),
    date: start ? start.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBA',
    time: start ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
    location: event.venue,
    accent: ACCENT_PALETTE[index % ACCENT_PALETTE.length],
    formSlug: event.form_slug,
    closed: event.status === 'CLOSED',
    registrationClosesLabel: event.registration_closes_at
      ? new Date(event.registration_closes_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) +
        ' · ' +
        new Date(event.registration_closes_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : null,
  };
}

const AUTO_ADVANCE_MS = 5500;

export default function UpcomingEventsGrid() {
  const reduceMotion = useReducedMotion();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const paused = hovered || focused || !autoPlay;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (i: number) => {
    if (!events) return;
    setDirection(i > index ? 1 : -1);
    setIndex((i + events.length) % events.length);
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fetched = await fetchApi<Event[]>('/events/');
        if (!cancelled && fetched && fetched.length > 0) {
          setEvents(fetched.map(mapEventToItem));
          return;
        }
      } catch (error) {
        // Fall back to the curated catalog below.
      }
      if (!cancelled) setEvents(FALLBACK_EVENTS.map(mapEventToItem));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [events]);

  // Prime the browser cache for every slide's poster up front, so switching
  // slides never shows a blank/loading flash for images that haven't been
  // requested yet (only the active slide's <img> exists in the DOM at a time).
  useEffect(() => {
    if (!events) return;
    events.forEach((evt) => {
      const img = new Image();
      img.src = evt.poster;
    });
  }, [events]);

  useEffect(() => {
    if (paused || !events) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % events.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, events]);

  if (!events) {
    return (
      <section className="relative py-20 sm:py-28 bg-[var(--background)] transition-colors duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-20 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_30%,#000_15%,transparent_100%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-6">
            <div>
              <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">Upcoming Events</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-poppins text-[#1A1A2E] dark:text-white mt-1">
                Don&apos;t Miss What&apos;s <span className="ember-text">Next</span>
              </h2>
            </div>
            <PillButton href="/events" variant="outline">
              View All Events
            </PillButton>
          </div>

          <div className="relative rounded-3xl p-[1.5px] overflow-hidden bg-black/10 dark:bg-white/10">
            <div className="relative rounded-3xl overflow-hidden bg-[var(--card-bg)] min-h-[34rem] sm:min-h-[30rem] lg:min-h-[27rem] grid grid-cols-1 lg:grid-cols-2 animate-pulse">
              <div className="h-56 sm:h-64 lg:h-full bg-black/10 dark:bg-white/10" />
              <div className="p-6 sm:p-9 lg:p-12 flex flex-col justify-center gap-4">
                <div className="h-3 w-24 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-8 w-3/4 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-3 w-1/3 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-11 w-40 rounded-full bg-black/10 dark:bg-white/10 mt-3" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const evt = events[index];

  return (
    <section className="relative py-20 sm:py-28 bg-[var(--background)] transition-colors duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-20 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_30%,#000_15%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-6"
        >
          <div>
            <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">Upcoming Events</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-poppins text-[#1A1A2E] dark:text-white mt-1">
              Don&apos;t Miss What&apos;s <span className="ember-text">Next</span>
            </h2>
          </div>
          <PillButton href="/events" variant="outline">
            View All Events
          </PillButton>
        </motion.div>

        {/* Slider stage */}
        <div
          className="relative rounded-3xl p-[1.5px] overflow-hidden"
          style={{ background: `linear-gradient(150deg, ${evt.accent}55, transparent 40%, transparent 70%, ${evt.accent}30)` }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setFocused(false);
            }
          }}
        >
          {/* Fixed-height frame — keeps the card from collapsing during a slide  */}
          {/* swap, which is what made the Register button appear to flicker in   */}
          {/* and out. Both slides are absolutely stacked so the new one can      */}
          {/* enter while the old one leaves (no empty gap).                      */}
          <div className="relative rounded-3xl overflow-hidden bg-[var(--card-bg)] min-h-[34rem] sm:min-h-[30rem] lg:min-h-[27rem]">
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={evt.id}
                custom={direction}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0, pointerEvents: 'none' } : { opacity: 0, x: direction * -40, pointerEvents: 'none' }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2"
              >
                {/* Image */}
                <div className="relative h-56 sm:h-64 lg:h-full overflow-hidden bg-slate-900">
                  <img src={evt.poster} alt={evt.title} className="w-full h-full object-cover opacity-90" draggable={false} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[var(--card-bg)]/20" />
                  <span
                    className="absolute top-5 left-5 text-[11px] font-mono font-bold tracking-wider px-3 py-1.5 rounded-md backdrop-blur-sm border"
                    style={{ color: evt.accent, background: 'rgba(0,0,0,0.55)', borderColor: `${evt.accent}55` }}
                  >
                    {evt.badge}
                  </span>
                </div>

                {/* Details */}
                <div className="p-6 sm:p-9 lg:p-12 flex flex-col justify-center">
                  <span className="font-mono text-xs uppercase tracking-[0.25em]" style={{ color: evt.accent }}>
                    Event {String(index + 1).padStart(2, '0')} / {String(events.length).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold font-poppins text-[#1A1A2E] dark:text-white leading-tight">
                    <Link href={`/events/${evt.id}`} className="hover:text-[#FF7A00] transition-colors">
                      {evt.title}
                    </Link>
                  </h3>

                  <div className="mt-5 space-y-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: evt.accent }} />
                      <span>{evt.date}</span>
                      {evt.time && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: evt.accent }} />
                          <span>{evt.time}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: evt.accent }} />
                      <span>{evt.location}</span>
                    </div>
                    {evt.registrationClosesLabel && !evt.closed && (
                      <p className="text-xs">
                        <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Registration Closes:</span>{' '}
                        {evt.registrationClosesLabel}
                      </p>
                    )}
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    {evt.closed ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/5 px-6 py-3 text-sm font-semibold text-slate-400">
                        Registration Closed
                      </span>
                    ) : (
                      <PillButton href={evt.formSlug ? `/forms/${evt.formSlug}` : '/forms'} variant="solid">
                        Register Now
                      </PillButton>
                    )}
                    <PillButton href={`/events/${evt.id}`} variant="outline">
                      View Details
                    </PillButton>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Arrows */}
            <button
              onClick={(e) => {
                prev();
                e.currentTarget.blur();
              }}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition z-10 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Previous event"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                next();
                e.currentTarget.blur();
              }}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition z-10 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Next event"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dots + progress */}
        <div className="flex items-center justify-center gap-3 mt-7">
          <div className="flex items-center gap-2.5">
            {events.map((s, i) => (
              <button
                key={s.id}
                onClick={(e) => {
                  goTo(i);
                  e.currentTarget.blur();
                }}
                className="relative h-1.5 rounded-full overflow-hidden transition-all duration-400 active:scale-y-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                style={{ width: i === index ? 36 : 8, background: 'rgba(128,128,128,0.25)' }}
                aria-label={`Go to ${s.title}`}
              >
                {i === index && (
                  <motion.span
                    key={`${s.id}-${paused}`}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: s.accent }}
                    initial={{ width: '0%' }}
                    animate={{ width: paused ? '0%' : '100%' }}
                    transition={{ duration: paused ? 0 : AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoPlay((p) => !p)}
            aria-label={autoPlay ? 'Pause auto-advance' : 'Resume auto-advance'}
            aria-pressed={!autoPlay}
            className="flex items-center justify-center w-11 h-11 rounded-full text-slate-500 dark:text-slate-400 hover:text-[#FF7A00] hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
