'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ExternalLink, History, LayoutDashboard, Users } from 'lucide-react';
import { CodeQuestOverview } from '@/components/admin/CodeQuestOverview';
import { CodeQuestMembers } from '@/components/admin/CodeQuestMembers';
import { CodeQuestMonitoring } from '@/components/admin/CodeQuestMonitoring';
import { CodeQuestGamification } from '@/components/admin/CodeQuestGamification';
import { CodeQuestAudit } from '@/components/admin/CodeQuestAudit';

type StatsTab = 'OVERVIEW' | 'MEMBERS' | 'INSIGHTS' | 'AUDIT';

const tabs: { id: StatsTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
  { id: 'MEMBERS', label: 'Members', icon: Users },
  { id: 'INSIGHTS', label: 'Insights', icon: BarChart3 },
  { id: 'AUDIT', label: 'Audit', icon: History },
];

export function CodeQuestStats() {
  const [tab, setTab] = useState<StatsTab>('OVERVIEW');

  return (
    <>
      <Link
        href="/admin/codequest"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF7A00]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to CodeQuest
      </Link>

      <header className="rounded-2xl glass-panel p-6 shadow-sm">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#FF7A00]">
          <BarChart3 className="h-4 w-4" /> CodeQuest analytics
        </p>
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
          Stats &amp; insights
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Club-wide overview, member directory, streak/gamification insights and the audit trail.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-xl glass-panel p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
              tab === id
                ? 'bg-[#FF7A00] text-white'
                : 'text-slate-500 hover:text-[#FF7A00]'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {tab === 'OVERVIEW' && (
        <div className="rounded-2xl glass-panel p-6 shadow-sm">
          <CodeQuestOverview />
        </div>
      )}

      {tab === 'MEMBERS' && <CodeQuestMembers />}

      {tab === 'INSIGHTS' && (
        <>
          <Link
            href="/admin/codequest/analytics"
            className="group flex items-center justify-between gap-4 rounded-2xl glass-panel p-6 shadow-sm transition hover:border-[#FF7A00]/60"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4EA] text-[#FF7A00] dark:bg-[#FF7A00]/10">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
                  Club analytics
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Engagement, acceptance and difficulty trends across the club.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FF7A00] px-3 py-2 text-xs font-bold text-white transition group-hover:bg-[#FFA500]">
              Open analytics <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </Link>
          <div className="rounded-2xl glass-panel p-6 shadow-sm">
            <CodeQuestMonitoring />
          </div>
          <div className="rounded-2xl glass-panel p-6 shadow-sm">
            <CodeQuestGamification />
          </div>
        </>
      )}

      {tab === 'AUDIT' && <CodeQuestAudit />}
    </>
  );
}
