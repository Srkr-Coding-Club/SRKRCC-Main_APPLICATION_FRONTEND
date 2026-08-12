'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Event, Hackathon } from '@/lib/types';
import { Trophy, Calendar, MapPin, Award, Users, Flame, Plus } from 'lucide-react';

export function EventsHackathonsTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedEvents, fetchedHackathons] = await Promise.all([
          fetchApi<Event[]>('/events/').catch(() => []),
          fetchApi<Hackathon[]>('/hackathons/').catch(() => []),
        ]);
        setEvents(fetchedEvents || []);
        setHackathons(fetchedHackathons || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hackathons Engine Section */}
      <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-[#FF7A00]" />
              <span>Hackathons & IconCoders Engine ({hackathons.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Live hackathon contests and team submissions fetched from REST API.</p>
          </div>

          <button
            onClick={() => alert('New Hackathon creation modal')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Hackathon</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live hackathons from backend...</div>
        ) : hackathons.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No hackathons currently registered in backend.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hackathons.map((h) => (
              <div key={h.id} className="p-5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border border-orange-200 dark:border-orange-800">
                    Prize: {h.prize_pool}
                  </span>
                  {h.is_flagship && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#8B2E3B] text-white flex items-center space-x-1">
                      <Flame className="w-3 h-3" />
                      <span>IconCoders Flagship</span>
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-[#1A1A2E] dark:text-white text-base">{h.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{h.description}</p>
                <div className="text-[11px] font-mono text-slate-400">Theme: {h.theme}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events Hub Section */}
      <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#8B2E3B]" />
              <span>Workshops & Technical Seminars ({events.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Live scheduled events fetched from REST API backend.</p>
          </div>

          <button
            onClick={() => alert('New Event creation modal')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#8B2E3B] hover:bg-rose-900 text-white font-bold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live events from backend...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No scheduled events currently registered in backend.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((e) => (
              <div key={e.id} className="p-5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-[#FF7A00]">{e.category}</span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Capacity: {e.capacity}</span>
                  </span>
                </div>

                <h4 className="font-bold text-[#1A1A2E] dark:text-white text-base">{e.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{e.description}</p>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>{e.venue}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
