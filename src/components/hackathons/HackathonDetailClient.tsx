'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  Users,
  Flame,
  Target,
  Megaphone,
  UsersRound,
  Lightbulb,
  Share2,
  Check,
  BookOpen,
  HelpCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import type { Hackathon, HackathonAnnouncement, ProblemStatement } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { HackathonCTA } from '@/components/hackathons/HackathonCTA';
import { HackathonAnnouncementsFeed } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { ProblemStatementsExplorer } from '@/components/hackathons/ProblemStatementsExplorer';
import { HackathonFAQSection } from '@/components/hackathons/HackathonFAQSection';
import { HackathonStickyBar } from '@/components/hackathons/HackathonStickyBar';

interface HackathonDetailClientProps {
  hackathon: Hackathon;
  problems: ProblemStatement[];
  announcements: HackathonAnnouncement[];
}

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80';

const HACKATHON_TIME_ZONE = 'Asia/Kolkata';

export function HackathonDetailClient({ hackathon, problems, announcements }: HackathonDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'announcements' | 'faq'>('overview');
  const [copied, setCopied] = useState(false);

  const isClosed = !(hackathon.is_registration_open ?? hackathon.status !== 'CLOSED');
  const teams = hackathon.team_count ?? 0;
  const banner = hackathon.banner_image || FALLBACK_BANNER;

  // Format dates
  const startDate = new Date(hackathon.start_date);
  const endDate = new Date(hackathon.end_date);
  const formattedDates = useMemo(() => {
    const dOpt: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: HACKATHON_TIME_ZONE,
    };
    const tOpt: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: HACKATHON_TIME_ZONE,
    };

    const sDate = startDate.toLocaleDateString('en-US', dOpt);
    const eDate = endDate.toLocaleDateString('en-US', dOpt);
    const sTime = startDate.toLocaleTimeString('en-US', tOpt);
    const eTime = endDate.toLocaleTimeString('en-US', tOpt);

    return {
      dateRange: sDate === eDate ? sDate : `${sDate} – ${eDate}`,
      timeRange: `${sTime} – ${eTime} IST`,
    };
  }, [startDate, endDate]);

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  type TabKey = 'overview' | 'problems' | 'announcements' | 'faq';

  interface TabItem {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    highlight?: boolean;
  }

  const tabs: TabItem[] = [
    { key: 'overview', label: 'Overview & Guidelines', icon: BookOpen },
    {
      key: 'problems',
      label: `Problem Statements (${problems.length})`,
      icon: Target,
      highlight: problems.length > 0,
    },
    ...(announcements.length > 0
      ? [{ key: 'announcements' as TabKey, label: `Announcements (${announcements.length})`, icon: Megaphone }]
      : []),
    { key: 'faq', label: 'FAQs & Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
        {/* Breadcrumb + Share Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/hackathons"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7A00] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            All Hackathons
          </Link>

          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#FF7A00]/50 hover:text-[#FF7A00] transition active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? 'Link Copied!' : 'Share Event'}
          </button>
        </div>

        {/* Hero Banner Showcase */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl bg-[#1A1A2E]">
          {/* Background image with gradient tint */}
          <div className="relative h-64 sm:h-96 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt={hackathon.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-[#1A1A2E]/70 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A2E]/90 via-transparent to-transparent" />
          </div>

          {/* Overlay Content */}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-md">
                <Trophy className="h-3.5 w-3.5" />
                Prize Pool: {hackathon.prize_pool}
              </span>

              {hackathon.is_flagship && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B2E3B] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm border border-rose-400/30">
                  <Flame className="h-3.5 w-3.5 text-amber-300" />
                  IconCoders Flagship
                </span>
              )}

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide border ${
                  isClosed
                    ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                    : 'bg-emerald-500/90 text-white border-emerald-400/40 shadow-sm'
                }`}
              >
                {isClosed ? 'Registrations Closed' : 'Registrations Live'}
              </span>

              {hackathon.allow_open_innovation && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                  <Lightbulb className="h-3 w-3 text-amber-400" />
                  Open Innovation
                </span>
              )}
            </div>

            {/* Title & Theme */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                {hackathon.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-200/90 font-medium">{hackathon.theme}</p>
            </div>
          </div>
        </div>

        {/* Unified Metrics Row (Single source of truth for Schedule, Team Size, Participation, Deadline) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Calendar className="h-4 w-4 text-[#FF7A00]" />
              Schedule
            </div>
            <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{formattedDates.dateRange}</p>
            <p className="text-xs text-slate-500">{formattedDates.timeRange}</p>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <UsersRound className="h-4 w-4 text-[#FF7A00]" />
              Team Size
            </div>
            <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
              {hackathon.min_team_size === hackathon.max_team_size
                ? `${hackathon.max_team_size} Members`
                : `${hackathon.min_team_size} – ${hackathon.max_team_size} Members`}
            </p>
            <p className="text-xs text-slate-500">Per Squad</p>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Users className="h-4 w-4 text-[#FF7A00]" />
              Participation
            </div>
            <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
              {teams} {teams === 1 ? 'Team' : 'Teams'}
            </p>
            <p className="text-xs text-slate-500">Registered</p>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Clock className="h-4 w-4 text-[#FF7A00]" />
              Registration Window
            </div>
            <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
              {hackathon.registration_closes_at
                ? new Date(hackathon.registration_closes_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: HACKATHON_TIME_ZONE,
                  })
                : 'Until Live'}
            </p>
            <p className="text-xs text-slate-500">
              {hackathon.registration_closes_at
                ? `Closes ${new Date(hackathon.registration_closes_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: HACKATHON_TIME_ZONE })}`
                : 'Open'}
            </p>
          </div>
        </div>

        {/* Main Content Layout with Navigation Tabs */}
        <div className="space-y-6">
          {/* Navigation Tabs Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                    active
                      ? 'bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] text-white shadow-md'
                      : 'bg-white/60 dark:bg-white/[0.02] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW & GUIDELINES (Admin's Markdown is the single authoritative source) */}
          {activeTab === 'overview' && (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* Left Column: Markdown & Prerequisites */}
              <div className="space-y-6">
                <section className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00] flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Event Guidelines & Overview
                  </h2>

                  {hackathon.description?.trim() ? (
                    <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
                      <MarkdownRenderer content={hackathon.description} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-sm text-slate-500 space-y-1">
                      <Info className="h-5 w-5 text-slate-400 mx-auto" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Detailed guidelines coming soon.</p>
                      <p className="text-xs">The organizing committee will publish the official event overview shortly.</p>
                    </div>
                  )}
                </section>

                {/* Profile Prerequisites Alert (if configured by admin) */}
                {hackathon.required_profile_fields && hackathon.required_profile_fields.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm">
                      <h4 className="font-bold text-amber-900 dark:text-amber-200">
                        Profile Completion Prerequisite
                      </h4>
                      <p className="text-amber-800 dark:text-amber-300">
                        All participating team members must complete these fields on their club profile:{' '}
                        <strong>{hackathon.required_profile_fields.join(', ')}</strong> before creating or accepting a team invite.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar: Clean Registration CTA without duplicate metric facts */}
              <aside className="space-y-4 lg:sticky lg:top-24 self-start">
                <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF7A00]">Team Registration</h3>

                  <div className="space-y-3 pt-1">
                    <HackathonCTA hackathon={hackathon} />
                    <p className="text-[11px] text-center text-slate-400">
                      {isClosed
                        ? 'Registrations are currently closed.'
                        : 'Team leader registers squad, then invites teammates.'}
                    </p>
                  </div>

                  {hackathon.registration_closes_at && !isClosed && (
                    <div className="border-t border-slate-100 dark:border-white/5 pt-4 text-xs text-slate-500 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#FF7A00] shrink-0" />
                      <span>
                        Deadline:{' '}
                        {new Date(hackathon.registration_closes_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: HACKATHON_TIME_ZONE,
                        })}{' '}
                        IST
                      </span>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: PROBLEM STATEMENTS */}
          {activeTab === 'problems' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#FF7A00]" />
                  Problem Statements & Challenges
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Explore challenge statements across domains. Teams can either pick an official problem statement or
                  bring their own solution via Open Innovation.
                </p>
              </div>

              <ProblemStatementsExplorer
                problems={problems}
                allowOpenInnovation={!!hackathon.allow_open_innovation}
                hackathonSlug={hackathon.slug}
                isRegistrationOpen={!isClosed}
              />
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && announcements.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-[#FF7A00]" />
                  Live Announcements & Broadcasts
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Stay updated with official broadcasts from the hackathon organizing committee.
                </p>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8">
                <HackathonAnnouncementsFeed announcements={announcements} />
              </div>
            </div>
          )}

          {/* TAB 4: FAQS & SUPPORT */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#FF7A00]" />
                  Frequently Asked Questions
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Find answers to common questions regarding registration, problem statements, and the competition.
                </p>
              </div>

              <HackathonFAQSection hackathon={hackathon} />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <HackathonStickyBar hackathon={hackathon} />
    </div>
  );
}
