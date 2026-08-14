'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    badge: 'WEB DEV WORKSHOP',
    date: '24 May, 2025',
    time: '10:00 AM',
    location: 'SRKR Campus',
    accent: '#FF7A00',
  },
  {
    id: 'code-challenge-2025',
    title: 'Code Challenge 2025',
    poster: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    badge: 'CODE CHALLENGE',
    date: '07 Jun, 2025',
    time: '09:30 AM',
    location: 'Online',
    accent: '#8B2E3B',
  },
  {
    id: 'aiml-seminar',
    title: 'AI/ML Seminar',
    poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    badge: 'AI/ML SEMINAR',
    date: '21 Jun, 2025',
    time: '11:00 AM',
    location: 'Seminar Hall, SRKR',
    accent: '#FFA500',
  },
];

function EventCard({ evt, index }: { evt: EventItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className="group relative rounded-2xl p-[1.5px] transition-colors duration-300"
      style={{ background: `linear-gradient(160deg, ${evt.accent}55, transparent 40%, transparent 70%, ${evt.accent}30)` }}
    >
      <div className="relative h-full rounded-2xl overflow-hidden bg-[var(--card-bg)] flex flex-col justify-between">
        {/* Poster */}
        <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-900">
          <img
            src={evt.poster}
            alt={evt.title}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-black/10 to-transparent" />

          <span className="absolute top-3 right-3 font-mono text-[10px] text-white/70 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">
            EVT / {String(index + 1).padStart(2, '0')}
          </span>

          <span
            className="absolute bottom-3 left-4 text-[11px] font-mono font-bold tracking-wider px-3 py-1 rounded-md backdrop-blur-sm border"
            style={{ color: evt.accent, background: 'rgba(0,0,0,0.55)', borderColor: `${evt.accent}55` }}
          >
            {evt.badge}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1">
          <h3 className="text-xl font-bold font-poppins text-[#1A1A2E] dark:text-white">{evt.title}</h3>

          <div className="space-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
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
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-6 pt-1">
          <Link
            href={`/events#${evt.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1A1A2E] dark:text-white"
          >
            <span className="relative">
              Register Now
              <span
                className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                style={{ background: evt.accent }}
              />
            </span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: evt.accent }} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function UpcomingEventsGrid() {
  return (
    <section className="py-20 sm:py-28 bg-[var(--background)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 sm:mb-14 gap-6"
        >
          <div>
            <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">Upcoming Events</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-poppins text-[#1A1A2E] dark:text-white mt-1">
              Don&apos;t Miss What&apos;s Next
            </h2>
          </div>

          <PillButton href="/events" variant="outline">
            View All Events
          </PillButton>
        </motion.div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {EVENTS.map((evt, i) => (
            <EventCard key={evt.id} evt={evt} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
