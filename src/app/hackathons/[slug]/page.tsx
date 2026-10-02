import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Trophy, Users, Flame, Sparkles, Target, Megaphone, UsersRound } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Hackathon, HackathonAnnouncement, ProblemStatement } from '@/lib/types';
import { isModuleEnabled } from '@/lib/moduleFlags';
import { isSafeHref } from '@/lib/urlSafety';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import { HackathonCTA } from '@/components/hackathons/HackathonCTA';
import { HackathonAnnouncementsFeed } from '@/components/hackathons/HackathonAnnouncementsFeed';

export const dynamic = 'force-dynamic';

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80';

// Server-rendered: pin the zone, or production (Render runs in UTC) shows every time 5h30m off.
const HACKATHON_TIME_ZONE = 'Asia/Kolkata';

async function getHackathon(slug: string): Promise<Hackathon | null> {
  try {
    return await fetchApi<Hackathon>(`/hackathons/${encodeURIComponent(slug)}/`);
  } catch {
    return null;
  }
}

async function getPublicExtras(slug: string) {
  const [problems, announcements] = await Promise.all([
    fetchApi<ProblemStatement[]>(`/hackathons/${encodeURIComponent(slug)}/problem-statements/`).catch(() => []),
    fetchApi<HackathonAnnouncement[]>(`/hackathons/${encodeURIComponent(slug)}/announcements/`).catch(() => []),
  ]);
  return { problems: problems || [], announcements: announcements || [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = await getHackathon(slug);
  if (!hackathon) notFound();
  return {
    title: hackathon.title,
    description: `${hackathon.theme} — prize pool ${hackathon.prize_pool}. SRKR Coding Club hackathon.`,
  };
}

function formatSchedule(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: HACKATHON_TIME_ZONE });
  const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: HACKATHON_TIME_ZONE });

  if (date(start) === date(end)) {
    return [
      { icon: Calendar, label: 'Date', value: date(start) },
      { icon: Clock, label: 'Time', value: `${time(start)} – ${time(end)} IST` },
    ];
  }
  return [
    { icon: Calendar, label: 'Starts', value: `${date(start)} · ${time(start)} IST` },
    { icon: Clock, label: 'Ends', value: `${date(end)} · ${time(end)} IST` },
  ];
}

export default async function HackathonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const enabled = await isModuleEnabled('hackathons');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="Hackathons Engine"
        icon={Trophy}
        description="The hackathons engine is paused between seasons. Check back once the next hackathon window opens."
      />
    );
  }

  const { slug } = await params;
  const hackathon = await getHackathon(slug);
  if (!hackathon) notFound();

  const { problems, announcements } = await getPublicExtras(slug);
  const isClosed = !(hackathon.is_registration_open ?? hackathon.status !== 'CLOSED');
  const teams = hackathon.team_count ?? 0;
  const banner = hackathon.banner_image && isSafeHref(hackathon.banner_image) ? hackathon.banner_image : FALLBACK_BANNER;

  const facts = [
    ...formatSchedule(hackathon.start_date, hackathon.end_date),
    { icon: Sparkles, label: 'Theme', value: hackathon.theme },
    { icon: Trophy, label: 'Prize Pool', value: hackathon.prize_pool },
    { icon: Users, label: 'Teams', value: `${teams} team${teams === 1 ? '' : 's'} registered` },
    ...(hackathon.max_team_size
      ? [{
          icon: UsersRound,
          label: 'Team Size',
          value: hackathon.min_team_size === hackathon.max_team_size
            ? `${hackathon.max_team_size} members`
            : `${hackathon.min_team_size}–${hackathon.max_team_size} members`,
        }]
      : []),
    ...(hackathon.registration_closes_at
      ? [{
          icon: Clock,
          label: 'Registration Closes',
          value: new Date(hackathon.registration_closes_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: HACKATHON_TIME_ZONE,
          }) + ' IST',
        }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Link
          href="/hackathons"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7A00] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          All hackathons
        </Link>

        {/* Banner header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary host, not in next/image remotePatterns */}
          <img src={banner} alt={hackathon.title} className="h-64 sm:h-80 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/95 via-[#1A1A2E]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                <Trophy className="h-3 w-3" />
                Prize: {hackathon.prize_pool}
              </span>
              {hackathon.is_flagship && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#8B2E3B] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  <Flame className="h-3 w-3" />
                  IconCoders Flagship
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  isClosed ? 'bg-slate-700/80 text-slate-200' : 'bg-emerald-500/90 text-white'
                }`}
              >
                {isClosed ? 'Closed' : 'Registrations Open'}
              </span>
            </div>
            <h1 className="font-poppins text-2xl sm:text-4xl font-extrabold leading-tight text-white">{hackathon.title}</h1>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* About */}
          <section className="self-start glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00]">About this hackathon</h2>
            {hackathon.description?.trim() ? (
              <MarkdownRenderer content={hackathon.description} />
            ) : (
              <p className="text-sm text-slate-500">Rules, tracks and judging criteria will be posted soon.</p>
            )}
          </section>

          {/* Facts + CTA */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{value}</p>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <HackathonCTA hackathon={hackathon} />
              </div>
            </div>
          </aside>
        </div>

        {problems.length > 0 && (
          <section className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00]">
              <Target className="h-4 w-4" /> Problem Statements
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {problems.map((ps) => (
                <article key={ps.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-[#8B2E3B]/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#8B2E3B] dark:text-rose-300">{ps.code}</span>
                    {ps.slots_left !== null && (
                      <span className={`text-[10px] font-bold ${ps.slots_left === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {ps.slots_left === 0 ? 'Full' : `${ps.slots_left} slot${ps.slots_left === 1 ? '' : 's'} left`}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-[#1A1A2E] dark:text-white">{ps.title}</h3>
                  {ps.category && <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{ps.category}</p>}
                  {ps.description?.trim() && (
                    <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-6">
                      <MarkdownRenderer content={ps.description} />
                    </div>
                  )}
                  {ps.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ps.tags.map((t) => (
                        <span key={t} className="rounded-full bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-500">#{t}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {announcements.length > 0 && (
          <section className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#FF7A00]">
              <Megaphone className="h-4 w-4" /> Announcements
            </h2>
            <HackathonAnnouncementsFeed announcements={announcements} />
          </section>
        )}
      </div>
    </div>
  );
}
