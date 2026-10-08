'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BarChart3, ExternalLink, Flag, Megaphone, Settings, Target, Users } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { hackathonApi } from '@/lib/api/hackathons';
import { StatusPill } from '@/components/ui/StatusPill';
import { HackathonOverviewTab } from '@/components/admin/hackathon/HackathonOverviewTab';
import { HackathonSettingsTab } from '@/components/admin/hackathon/HackathonSettingsTab';
import { ProblemStatementsAdminTab } from '@/components/admin/hackathon/ProblemStatementsAdminTab';
import { TeamsAdminTab } from '@/components/admin/hackathon/TeamsAdminTab';
import { RoundsAdminTab } from '@/components/admin/hackathon/RoundsAdminTab';
import { HackathonAnnouncementsAdminTab } from '@/components/admin/hackathon/HackathonAnnouncementsAdminTab';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'settings', label: 'Settings & Details', icon: Settings },
  { key: 'problems', label: 'Problem Statements', icon: Target },
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'rounds', label: 'Rounds & Shortlisting', icon: Flag },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function AdminHackathonManagePage() {
  return (
    <Suspense fallback={null}>
      <ManageHackathon />
    </Suspense>
  );
}

function ManageHackathon() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'overview';

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    hackathonApi.get(slug).then(setHackathon).catch((e) => setError(e?.message || 'Could not load hackathon.'));
  }, [slug]);

  useEffect(() => { reload(); }, [reload]);

  const setTab = (key: TabKey) => router.replace(`/admin/hackathons/${slug}?tab=${key}`, { scroll: false });

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link href="/admin/hackathons" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7A00] transition">
          <ArrowLeft className="h-4 w-4" /> All hackathons
        </Link>

        {error && <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{error}</p>}

        {hackathon && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{hackathon.title}</h1>
                <p className="text-sm text-slate-500">{hackathon.theme}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={hackathon.is_registration_open ? 'green' : 'slate'}>
                  {hackathon.is_registration_open ? 'Registration open' : 'Registration closed'}
                </StatusPill>
                {hackathon.team_edits_locked && <StatusPill tone="amber">Team edits locked</StatusPill>}
                <a
                  href={`/hackathons/${hackathon.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#FF7A00] hover:underline"
                >
                  Public page <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 glass-panel p-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                    tab === key ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-500 hover:text-[#1A1A2E] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === 'overview' && <HackathonOverviewTab slug={slug} onNavigate={setTab} />}
            {tab === 'settings' && <HackathonSettingsTab hackathon={hackathon} onSaved={setHackathon} />}
            {tab === 'problems' && <ProblemStatementsAdminTab slug={slug} />}
            {tab === 'teams' && <TeamsAdminTab hackathon={hackathon} />}
            {tab === 'rounds' && <RoundsAdminTab slug={slug} />}
            {tab === 'announcements' && <HackathonAnnouncementsAdminTab slug={slug} />}
          </>
        )}
      </div>
    </div>
  );
}
