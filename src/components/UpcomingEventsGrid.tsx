'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';

export default function UpcomingEventsGrid() {
  const events = [
    {
      id: 'web-dev-workshop',
      title: 'Web Development Workshop',
      poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
      badge: 'WEB DEV WORKSHOP',
      date: '24 May, 2025',
      time: '10:00 AM',
      location: 'SRKR Campus',
    },
    {
      id: 'code-challenge-2025',
      title: 'Code Challenge 2025',
      poster: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
      badge: 'CODE CHALLENGE',
      date: '07 Jun, 2025',
      time: '09:30 AM',
      location: 'Online',
    },
    {
      id: 'aiml-seminar',
      title: 'AI/ML Seminar',
      poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      badge: 'AI/ML SEMINAR',
      date: '21 Jun, 2025',
      time: '11:00 AM',
      location: 'Seminar Hall, SRKR',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#FAFAFC] dark:bg-[#0D0E15] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">
              UPCOMING EVENTS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A2E] dark:text-white mt-1">
              Don&apos;t Miss What&apos;s Next
            </h2>
          </div>

          <div className="mt-4 sm:mt-0">
            <Link
              href="/events"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#8B2E3B] hover:bg-[#742530] text-white font-semibold text-sm shadow-sm transition"
            >
              <span>View All Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Events Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                {/* Poster Box */}
                <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-900">
                  <img
                    src={evt.poster}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/80 via-transparent to-transparent"></div>
                  <span className="absolute bottom-3 left-4 text-xs font-mono font-bold tracking-wider text-amber-400 bg-black/60 px-3 py-1 rounded-md backdrop-blur-sm border border-amber-400/30">
                    {evt.badge}
                  </span>
                </div>

                {/* Content Box */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
                    {evt.title}
                  </h3>

                  {/* Details List */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-[#FF7A00]" />
                      <span>{evt.date}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <Clock className="w-4 h-4 text-[#FF7A00]" />
                      <span>{evt.time}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#FF7A00]" />
                      <span>{evt.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="px-6 pb-6 pt-2">
                <Link
                  href={`/events#${evt.id}`}
                  className="inline-flex items-center space-x-1.5 text-sm font-bold text-[#8B2E3B] dark:text-[#FF7A00] hover:text-[#FF7A00] transition"
                >
                  <span>Register Now</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
