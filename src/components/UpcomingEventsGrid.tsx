'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PillButton from './PillButton';

interface EventItem {
  id: string;
  title: string;
  poster: string;
  badge: string;
  date: string;
  time: string;
  location: string;
  accent: string;
}

const EVENTS: EventItem[] = [
  {
    id: 'web-dev-workshop',
    title: 'Web Development Workshop',
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    badge: 'WEB DEV WORKSHOP',
    date: '24 May, 2025',
    time: '10:00 AM',
    location: 'SRKR Campus',
    accent: '#FF7A00',
  },
  {
    id: 'code-challenge-2025',
    title: 'Code Challenge 2025',
    poster: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    badge: 'CODE CHALLENGE',
    date: '07 Jun, 2025',
    time: '09:30 AM',
    location: 'Online',
    accent: '#8B2E3B',
  },
  {
    id: 'aiml-seminar',
    title: 'AI/ML Seminar',
    poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    badge: 'AI/ML SEMINAR',
    date: '21 Jun, 2025',
    time: '11:00 AM',
    location: 'Seminar Hall, SRKR',
    accent: '#FFA500',
  },
];

const AUTO_ADVANCE_MS = 5500;

export default function UpcomingEventsGrid() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex((i + EVENTS.length) % EVENTS.length);
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Prime the browser cache for every slide's poster up front, so switching
  // slides never shows a blank/loading flash for images that haven't been
  // requested yet (only the active slide's <img> exists in the DOM at a time).
  useEffect(() => {
    EVENTS.forEach((evt) => {
      const img = new Image();
      img.src = evt.poster;
    });
  }, []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % EVENTS.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const evt = EVENTS[index];

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
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative rounded-3xl overflow-hidden bg-[var(--card-bg)]">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={evt.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 lg:grid-cols-2"
              >
                {/* Image */}
                <div className="relative h-64 sm:h-80 lg:h-[26rem] overflow-hidden bg-slate-900">
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
                <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                  <span className="font-mono text-xs uppercase tracking-[0.25em]" style={{ color: evt.accent }}>
                    Event {String(index + 1).padStart(2, '0')} / {String(EVENTS.length).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold font-poppins text-[#1A1A2E] dark:text-white leading-tight">
                    {evt.title}
                  </h3>

                  <div className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: evt.accent }} />
                      <span>{evt.date}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <Clock className="w-4 h-4 flex-shrink-0" style={{ color: evt.accent }} />
                      <span>{evt.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: evt.accent }} />
                      <span>{evt.location}</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <PillButton href={`/events#${evt.id}`} variant="solid">
                      Register Now
                    </PillButton>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Arrows */}
            <button
              onClick={prev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
              aria-label="Previous event"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
              aria-label="Next event"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dots + progress */}
        <div className="flex items-center justify-center gap-2.5 mt-7">
          {EVENTS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-400"
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
      </div>
    </section>
  );
}
