'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Eye, EyeOff, Flag, Plus, Trash2, Users, Trophy } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { HackathonFormPanel } from '@/components/admin/HackathonFormPanel';
import { useHackathonLifecycle } from '@/components/admin/hackathon/useHackathonLifecycle';
import { BTN_DANGER, BTN_GHOST } from '@/components/admin/hackathon/shared';
import { getStoredUser } from '@/lib/auth';

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

  const canDelete = getStoredUser()?.role === 'ADMIN';
  const { busySlug, toggleVisibility, requestDelete, dialogs } = useHackathonLifecycle({
    onChanged: (updated) => setHackathons((prev) => prev.map((h) => (h.slug === updated.slug ? { ...h, ...updated } : h))),
    onDeleted: (slug) => setHackathons((prev) => prev.filter((h) => h.slug !== slug)),
  });

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-start gap-2 text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
              <Flag className="mt-1 h-6 w-6 shrink-0 text-journey-accent" /> Hackathon Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Registration, teams, problem statements, rounds, shortlisting and announcements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-journey-accent px-4 py-2 text-sm font-bold text-journey-on-accent hover:opacity-90 transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Create hackathon
          </button>
        </div>

        {dialogs}

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : hackathons.length === 0 ? (
          <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400 space-y-3">
            <Trophy className="h-8 w-8 text-slate-500 dark:text-slate-400 mx-auto" />
            <p>No hackathons created yet.</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-journey-accent px-3.5 py-1.5 text-xs font-bold text-journey-on-accent"
            >
              <Plus className="h-3.5 w-3.5" /> Create your first hackathon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {hackathons.map((h) => (
              <div
                key={h.slug}
                className="group glass-panel flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 transition hover:border-[#FF7A00]/60"
              >
                <Link href={`/admin/hackathons/${h.slug}`} className="min-w-0 flex-1 space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="min-w-0 break-words font-bold text-[#1A1A2E] dark:text-white">{h.title}</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {h.is_hidden && <StatusPill tone="slate" icon={EyeOff}>{h.is_manually_hidden ? 'Hidden' : 'Outside visibility window'}</StatusPill>}
                      <StatusPill tone={h.status === 'DRAFT' ? 'amber' : h.is_registration_open ? 'green' : 'slate'}>
                        {h.status === 'DRAFT' ? 'Draft' : h.is_registration_open ? 'Registration open' : h.status === 'CLOSED' ? 'Closed' : 'Registration not open'}
                      </StatusPill>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-journey-accent" /> {formatDateTime(h.start_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-journey-accent" /> {h.team_count ?? 0} active teams
                    </span>
                    <span>
                      Team size {h.min_team_size}–{h.max_team_size}
                    </span>
                  </div>
                  <p className="flex items-center gap-1 text-xs font-bold text-journey-accent">
                    Manage <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </p>
                </Link>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
                  {h.status !== 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => toggleVisibility(h)}
                      disabled={busySlug === h.slug || (h.is_hidden && !h.is_manually_hidden)}
                      title={
                        h.is_manually_hidden
                          ? 'Show this hackathon on the public site again'
                          : h.is_hidden
                            ? 'Hidden by its visible from / until dates. Change them in Settings.'
                            : 'Hide this hackathon from the public site'
                      }
                      className={`${BTN_GHOST} min-h-11 sm:min-h-0`}
                    >
                      {h.is_manually_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {h.is_manually_hidden ? 'Show' : 'Hide'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => requestDelete(h)}
                      disabled={busySlug === h.slug}
                      className={`${BTN_DANGER} ml-auto min-h-11 sm:min-h-0`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
