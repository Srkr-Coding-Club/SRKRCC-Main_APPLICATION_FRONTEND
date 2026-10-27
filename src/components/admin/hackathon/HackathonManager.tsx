'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, BarChart3, Copy, ExternalLink, FileUp, Flag, GitBranch, Globe, Gavel, Lightbulb, Mail, Megaphone, ScanLine,
  Settings, ShieldCheck, SlidersHorizontal, Target, Trophy, Users,
} from 'lucide-react';
import type { Hackathon, HackathonFeatureKey, HackathonPermissionKey, MyHackathonPermissions } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { StatusPill } from '@/components/ui/StatusPill';
import { HackathonOverviewTab } from './HackathonOverviewTab';
import { HackathonSettingsTab } from './HackathonSettingsTab';
import { ProblemStatementsAdminTab } from './ProblemStatementsAdminTab';
import { TeamEmailsAdminTab } from './TeamEmailsAdminTab';
import { TeamsAdminTab } from './TeamsAdminTab';
import { TimelineAdminTab } from './TimelineAdminTab';
import { RoundsAdminTab } from './RoundsAdminTab';
import { HackathonAnnouncementsAdminTab } from './HackathonAnnouncementsAdminTab';
import { RegistrationControlsTab } from './RegistrationControlsTab';
import { IdeasAdminTab } from './IdeasAdminTab';
import { SubmissionsAdminTab } from './SubmissionsAdminTab';
import { JudgingAdminTab } from './JudgingAdminTab';
import { ResultsAdminTab } from './ResultsAdminTab';
import { CheckInAdminTab } from './CheckInAdminTab';
import { PublicPageAdminTab } from './PublicPageAdminTab';
import { RolesAdminTab } from './RolesAdminTab';
import { CloneHackathonModal } from './CloneHackathonModal';

interface TabSpec {
  key: string;
  label: string;
  icon: React.ElementType;
  /** What the person needs to open it. */
  permission: HackathonPermissionKey;
  /** The module that must be switched on for the tab to appear. */
  feature?: HackathonFeatureKey;
}

const TABS: TabSpec[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3, permission: 'insights' },
  { key: 'settings', label: 'Settings & Details', icon: Settings, permission: 'settings' },
  { key: 'registration', label: 'Registration controls', icon: SlidersHorizontal, permission: 'settings' },
  { key: 'team', label: 'Team & roles', icon: ShieldCheck, permission: 'staff' },
  { key: 'problems', label: 'Problem Statements', icon: Target, permission: 'content' },
  { key: 'teams', label: 'Teams', icon: Users, permission: 'teams' },
  { key: 'emails', label: 'Team Emails', icon: Mail, permission: 'content' },
  { key: 'timeline', label: 'Public Timeline', icon: GitBranch, permission: 'content' },
  { key: 'rounds', label: 'Rounds & Shortlisting', icon: Flag, permission: 'rounds' },
  { key: 'ideas', label: 'Ideas (phase 1)', icon: Lightbulb, permission: 'ideas', feature: 'ideas' },
  { key: 'submissions', label: 'Projects (phase 2)', icon: FileUp, permission: 'submissions', feature: 'submissions' },
  { key: 'judging', label: 'Judging', icon: Gavel, permission: 'judging', feature: 'judging' },
  { key: 'checkin', label: 'Check-in', icon: ScanLine, permission: 'check_in', feature: 'check_in' },
  { key: 'results', label: 'Results & certificates', icon: Trophy, permission: 'results' },
  { key: 'publicpage', label: 'Public page', icon: Globe, permission: 'settings' },
  { key: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'content' },
];

interface HackathonManagerProps {
  slug: string;
  /** Where tab links point, e.g. /admin/hackathons/my-hack or /hackathons/my-hack/manage. */
  basePath: string;
  backHref: string;
  backLabel: string;
}

/** The whole hackathon control room. Each person sees only the tabs their permissions open. */
export function HackathonManager({ slug, basePath, backHref, backLabel }: HackathonManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [me, setMe] = useState<MyHackathonPermissions | null>(null);
  const [error, setError] = useState('');
  const [cloning, setCloning] = useState(false);

  const reload = useCallback(() => {
    Promise.all([hackathonApi.get(slug), hackathonApi.myPermissions(slug)])
      .then(([loaded, permissions]) => { setHackathon(loaded); setMe(permissions); })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this hackathon.')));
  }, [slug]);

  useEffect(() => { reload(); }, [reload]);

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => me?.permissions.includes(tab.permission) && (!tab.feature || hackathon?.features?.[tab.feature])),
    [me, hackathon],
  );
  const requested = searchParams.get('tab');
  const active = visibleTabs.find((tab) => tab.key === requested) ?? visibleTabs[0];
  const setTab = (key: string) => router.replace(`${basePath}?tab=${key}`, { scroll: false });
  const tabListRef = useRef<HTMLDivElement>(null);

  // Sixteen tabs scroll sideways on a phone: keep the open one in view.
  useEffect(() => {
    const list = tabListRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [active?.key]);

  /** Arrow keys, Home and End move between tabs, as the tab pattern expects. */
  const onTabKeyDown = (event: React.KeyboardEvent) => {
    const keys = visibleTabs.map((tab) => tab.key);
    const at = keys.indexOf(active?.key ?? '');
    const next = event.key === 'ArrowRight' ? (at + 1) % keys.length
      : event.key === 'ArrowLeft' ? (at - 1 + keys.length) % keys.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setTab(keys[next]);
    requestAnimationFrame(() => document.getElementById(`hackathon-tab-${keys[next]}`)?.focus());
  };
  const goToRegistration = () => (me?.permissions.includes('settings') ? setTab('registration') : undefined);

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-journey-accent dark:text-slate-400 sm:min-h-8">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

        {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{error}</p>}

        {hackathon && me && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{hackathon.title}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{hackathon.theme}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {me.roles.map((role) => <StatusPill key={role} tone="purple">{role.charAt(0) + role.slice(1).toLowerCase()}</StatusPill>)}
                {hackathon.status === 'DRAFT' ? (
                  <StatusPill tone="amber">Draft: not public yet</StatusPill>
                ) : (
                  <StatusPill tone={hackathon.is_registration_open ? 'green' : 'slate'}>{hackathon.is_registration_open ? 'Registration open' : 'Registration closed'}</StatusPill>
                )}
                {hackathon.is_hidden && <StatusPill tone="slate">{hackathon.is_manually_hidden ? 'Hidden from public' : 'Outside visibility window'}</StatusPill>}
                {hackathon.team_edits_locked && <StatusPill tone="amber">Team edits locked</StatusPill>}
                {me.is_site_organizer && (
                  <button type="button" onClick={() => setCloning(true)} className="inline-flex min-h-8 items-center gap-1 text-xs font-bold text-slate-600 hover:text-journey-accent dark:text-slate-400">
                    <Copy className="h-3 w-3" /> Clone
                  </button>
                )}
                <a href={`/hackathons/${hackathon.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs font-bold text-journey-accent hover:underline">
                  Public page <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {cloning && <CloneHackathonModal hackathon={hackathon} onClose={() => setCloning(false)} />}

            {!active ? (
              <div className="glass-panel space-y-3 rounded-xl border border-slate-200 p-8 text-center dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-300">Your role here has no management tabs. Use these instead:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {me.permissions.includes('judge') && <Link href={`/hackathons/${slug}/judging`} className="rounded-lg bg-journey-accent px-4 py-2 text-sm font-bold text-journey-on-accent">Score projects</Link>}
                  {me.permissions.includes('check_in') && <Link href={`/hackathons/${slug}/check-in`} className="rounded-lg bg-journey-accent px-4 py-2 text-sm font-bold text-journey-on-accent">Check people in</Link>}
                </div>
              </div>
            ) : (
              <>
                <div ref={tabListRef} role="tablist" aria-label="Hackathon management" onKeyDown={onTabKeyDown} className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 p-1 glass-panel dark:border-slate-800">
                  {visibleTabs.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      id={`hackathon-tab-${key}`}
                      type="button"
                      role="tab"
                      aria-selected={active.key === key}
                      aria-controls="hackathon-tabpanel"
                      tabIndex={active.key === key ? 0 : -1}
                      onClick={() => setTab(key)}
                      className={`relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition sm:min-h-9 ${
                        active.key === key ? 'bg-journey-accent text-journey-on-accent shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-[#1A1A2E] dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>

                <div id="hackathon-tabpanel" role="tabpanel" aria-labelledby={`hackathon-tab-${active.key}`} className="space-y-6">
                <h2 className="sr-only">{active.label}</h2>
                {active.key === 'overview' && <HackathonOverviewTab slug={slug} onNavigate={setTab} />}
                {active.key === 'settings' && <HackathonSettingsTab hackathon={hackathon} onSaved={setHackathon} />}
                {active.key === 'registration' && <RegistrationControlsTab hackathon={hackathon} onSaved={setHackathon} />}
                {active.key === 'team' && <RolesAdminTab hackathon={hackathon} />}
                {active.key === 'problems' && <ProblemStatementsAdminTab slug={slug} />}
                {active.key === 'teams' && <TeamsAdminTab hackathon={hackathon} />}
                {active.key === 'emails' && <TeamEmailsAdminTab slug={slug} />}
                {active.key === 'timeline' && <TimelineAdminTab slug={slug} />}
                {active.key === 'rounds' && <RoundsAdminTab slug={slug} features={hackathon.features ?? {}} />}
                {active.key === 'ideas' && <IdeasAdminTab hackathon={hackathon} onSaved={setHackathon} onEnable={goToRegistration} />}
                {active.key === 'submissions' && <SubmissionsAdminTab hackathon={hackathon} onSaved={setHackathon} onEnable={goToRegistration} />}
                {active.key === 'judging' && <JudgingAdminTab hackathon={hackathon} onEnable={goToRegistration} />}
                {active.key === 'checkin' && <CheckInAdminTab hackathon={hackathon} onSaved={setHackathon} onEnable={goToRegistration} />}
                {active.key === 'results' && <ResultsAdminTab hackathon={hackathon} onSaved={setHackathon} onEnable={goToRegistration} />}
                {active.key === 'publicpage' && <PublicPageAdminTab hackathon={hackathon} onSaved={setHackathon} />}
                {active.key === 'announcements' && <HackathonAnnouncementsAdminTab slug={slug} />}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
