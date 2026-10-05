'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Flag, Plus, Users, Trophy } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { HackathonFormPanel } from '@/components/admin/HackathonFormPanel';

export const dynamic = 'force-dynamic';

export default function AdminHackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadHackathons = () => {
    fetchApi<Hackathon[]>('/hackathons/')
      .then((h) => setHackathons(h || []))
      .catch(() => setHackathons([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHackathons();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
              <Flag className="h-6 w-6 text-[#FF7A00]" /> Hackathon Management
            </h1>
            <p className="text-sm text-slate-500">
              Registration, teams, problem statements, rounds, shortlisting and announcements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-bold text-white hover:bg-[#E06B00] transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Create hackathon
          </button>
        </div>

        {createOpen && (
          <HackathonFormPanel
            isOpen={createOpen}
            onClose={() => setCreateOpen(false)}
            onSaved={(saved) => {
              setHackathons((prev) => [saved, ...prev.filter((h) => h.slug !== saved.slug)]);
              setCreateOpen(false);
            }}
          />
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : hackathons.length === 0 ? (
          <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500 space-y-3">
            <Trophy className="h-8 w-8 text-slate-400 mx-auto" />
            <p>No hackathons created yet.</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF7A00] px-3.5 py-1.5 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Create your first hackathon
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {hackathons.map((h) => (
              <Link
                key={h.slug}
                href={`/admin/hackathons/${h.slug}`}
                className="group glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 transition hover:border-[#FF7A00]/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-[#1A1A2E] dark:text-white">{h.title}</h2>
                  <div className="flex gap-1.5">
                    {h.is_hidden && <StatusPill tone="slate">Hidden</StatusPill>}
                    <StatusPill tone={h.is_registration_open ? 'green' : 'slate'}>
                      {h.is_registration_open ? 'Registration open' : h.status === 'CLOSED' ? 'Closed' : 'Registration not open'}
                    </StatusPill>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#FF7A00]" /> {formatDateTime(h.start_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[#FF7A00]" /> {h.team_count ?? 0} active teams
                  </span>
                  <span>
                    Team size {h.min_team_size}–{h.max_team_size}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs font-bold text-[#FF7A00]">
                  Manage <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
