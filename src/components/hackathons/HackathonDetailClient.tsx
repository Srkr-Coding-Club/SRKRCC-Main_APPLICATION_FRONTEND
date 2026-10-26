'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Check,
  Globe,
  Lightbulb,
  MapPin,
  Share2,
  Trophy,
  UsersRound,
  Wifi,
} from 'lucide-react';
import type { Hackathon, HackathonAnnouncement, HackathonResults, ProblemStatement, PublicStage, ShowcaseProject } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { HackathonCTA } from '@/components/hackathons/HackathonCTA';
import { HackathonAnnouncementsFeed, formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { ProblemStatementsExplorer } from '@/components/hackathons/ProblemStatementsExplorer';
import { HackathonFAQSection } from '@/components/hackathons/HackathonFAQSection';
import { PageSectionCard, SectionNav, type PageSection } from '@/components/hackathons/page/SectionNav';
import { StagesTimeline } from '@/components/hackathons/page/StagesTimeline';
import { DatesList, PrizeCards } from '@/components/hackathons/page/DatesAndPrizes';
import { HACKATHON_MODE_LABEL, buildDateRows } from '@/lib/hackathonPage';
import { profileFieldLabel } from '@/lib/profileFields';
import BannerImage from '@/components/ui/BannerImage';
import { downloadHackathonCalendar } from '@/lib/calendar';
import { StaffShortcuts } from '@/components/hackathons/StaffShortcuts';
import { ContactBlock, PeopleGrid, SponsorsGrid } from '@/components/hackathons/page/PeopleSections';
import { ProjectShowcase, WinnersList } from '@/components/hackathons/page/ResultsSection';

interface HackathonDetailClientProps {
  hackathon: Hackathon;
  problems: ProblemStatement[];
  announcements: HackathonAnnouncement[];
  stages: PublicStage[];
  results?: HackathonResults | null;
  showcase?: ShowcaseProject[];
}

const DEFAULT_ORGANIZER = 'SRKR Coding Club, SRKR Engineering College';

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-journey-text/10 bg-journey-surface text-journey-accent shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-journey-text">{label}</p>
        <p className="text-sm text-journey-muted">{value}</p>
      </div>
    </div>
  );
}

export function HackathonDetailClient({ hackathon, problems, announcements, stages, results = null, showcase = [] }: HackathonDetailClientProps) {
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const headerCtaRef = useRef<HTMLDivElement>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  // On a phone this page is thousands of pixels tall: once the header's register button scrolls away, keep one in reach.
  useEffect(() => {
    const target = headerCtaRef.current;
    if (!target) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Anchor jumps skip the "visible" state, so read the position instead of waiting for an intersection change.
      setShowStickyCta(target.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const registrationOpen = hackathon.is_registration_open ?? hackathon.status !== 'CLOSED';
  const mode = hackathon.mode ?? 'ONLINE';
  const ModeIcon = mode === 'OFFLINE' ? MapPin : mode === 'HYBRID' ? Globe : Wifi;
  const showVenue = mode !== 'ONLINE' && !!hackathon.venue;
  const minSize = hackathon.min_team_size ?? 1;
  const maxSize = hackathon.max_team_size ?? minSize;
  const teams = hackathon.registered_team_count ?? hackathon.team_count ?? 0;
  const tags = hackathon.tags ?? [];
  const hasPrizes = (hackathon.prizes?.length ?? 0) > 0 || !!hackathon.prize_pool?.trim();
  const dateRows = useMemo(() => buildDateRows(hackathon, stages), [hackathon, stages]);
  const rules = hackathon.rules?.trim() ?? '';
  const mentors = hackathon.mentors ?? [];
  const judges = hackathon.judges ?? [];
  const sponsors = hackathon.sponsors ?? [];
  const contacts = hackathon.contacts ?? [];
  const communityLinks = hackathon.community_links ?? [];
  const hasContact = contacts.length > 0 || communityLinks.length > 0 || !!hackathon.venue_map_url;
  const hasResults = !!results?.published && results.winners.length > 0;
  const placesLeft = hackathon.max_teams ? Math.max(hackathon.max_teams - (hackathon.team_count ?? 0) + (hackathon.waitlisted_team_count ?? 0), 0) : null;

  const deadline = hackathon.registration_closes_at
    ? formatDateTime(hackathon.registration_closes_at)
    : registrationOpen
      ? 'Open until the event starts'
      : 'Closed';

  const sections = useMemo<PageSection[]>(
    () => [
      ...(stages.length > 0 ? [{ id: 'stages', label: 'Stages & Timeline' }] : []),
      { id: 'details', label: 'Details' },
      { id: 'dates', label: 'Dates & Deadlines' },
      ...(hasPrizes ? [{ id: 'prizes', label: 'Prizes' }] : []),
      ...(problems.length > 0 || hackathon.allow_open_innovation
        ? [{ id: 'problems', label: problems.length > 0 ? `Problem Statements (${problems.length})` : 'Problem Statements' }]
        : []),
      ...(hasResults ? [{ id: 'results', label: 'Results' }] : []),
      ...(showcase.length > 0 ? [{ id: 'showcase', label: `Projects (${showcase.length})` }] : []),
      ...(rules ? [{ id: 'rules', label: 'Rules' }] : []),
      ...(mentors.length > 0 ? [{ id: 'mentors', label: 'Mentors' }] : []),
      ...(judges.length > 0 ? [{ id: 'judges', label: 'Judges' }] : []),
      ...(sponsors.length > 0 ? [{ id: 'sponsors', label: 'Sponsors' }] : []),
      ...(announcements.length > 0 ? [{ id: 'announcements', label: `Announcements (${announcements.length})` }] : []),
      ...(hasContact ? [{ id: 'contact', label: 'Contact' }] : []),
      { id: 'faq', label: 'FAQs' },
    ],
    [stages.length, hasPrizes, problems.length, hackathon.allow_open_innovation, announcements.length, hasResults, showcase.length, rules, mentors.length, judges.length, sponsors.length, hasContact],
  );

  const shareLink = async () => {
    const url = window.location.href;
    try {
      // Phones get the native share sheet; desktops copy the link.
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: hackathon.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState('copied');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      setShareState('failed');
    }
    setTimeout(() => setShareState('idle'), 2500);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 transition-colors duration-300">
      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-24 sm:px-6 lg:px-8">
        <Link
          href="/hackathons"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted sm:min-h-8 transition hover:text-journey-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          All Hackathons
        </Link>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            {/* Banner */}
            <div className="relative aspect-[16/6] w-full overflow-hidden rounded-3xl border border-journey-text/10 bg-journey-surface">
              {hackathon.banner_image ? (
                <BannerImage src={hackathon.banner_image} alt={hackathon.title} crop={hackathon.banner_crop} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-journey-surface">
                  <Trophy className="h-20 w-20 text-journey-accent/30" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Header card */}
            <header className="space-y-5 rounded-3xl border border-journey-text/10 bg-journey-surface/60 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-journey-text/80">
                  <ModeIcon className="h-4 w-4 text-journey-accent" aria-hidden="true" />
                  {HACKATHON_MODE_LABEL[mode]}
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${
                      registrationOpen
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
                        : 'bg-journey-text/10 text-journey-text/80'
                    }`}
                  >
                    {registrationOpen ? 'Registration open' : 'Registration closed'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadHackathonCalendar(hackathon)}
                    aria-label="Add key dates to your calendar"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-journey-text/10 px-3 py-1.5 text-xs font-bold text-journey-text/80 transition hover:border-journey-accent/50 hover:text-journey-accent active:scale-95"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Add to calendar
                  </button>
                  <button
                    type="button"
                    onClick={shareLink}
                    aria-label="Share this hackathon"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-journey-text/10 px-3 py-1.5 text-xs font-bold text-journey-text/80 transition hover:border-journey-accent/50 hover:text-journey-accent active:scale-95"
                  >
                    {shareState === 'copied' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                    {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Share'}
                  </button>
                </div>
              </div>

              <StaffShortcuts slug={hackathon.slug} />

              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0 space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-journey-text sm:text-4xl">{hackathon.title}</h1>
                  <p className="text-base font-medium text-journey-text/80">{hackathon.organizer_name || DEFAULT_ORGANIZER}</p>
                  {hackathon.theme && <p className="text-sm text-journey-muted">{hackathon.theme}</p>}
                </div>
                {hackathon.logo_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hackathon.logo_image}
                    alt={`${hackathon.title} logo`}
                    className="hidden h-24 w-24 shrink-0 rounded-2xl border border-journey-text/10 bg-journey-surface object-cover shadow-sm sm:block"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Fact icon={UsersRound} label="Team size" value={minSize === maxSize ? `${maxSize} ${maxSize === 1 ? 'Member' : 'Members'}` : `${minSize}–${maxSize} Members`} />
                <Fact icon={Calendar} label="Registration deadline" value={deadline} />
                {showVenue && <Fact icon={MapPin} label="Venue" value={hackathon.venue} />}
                {teams > 0 && <Fact icon={UsersRound} label="Teams registered" value={`${teams} ${teams === 1 ? 'team' : 'teams'}`} />}
                {hackathon.max_teams ? (
                  <Fact
                    icon={UsersRound}
                    label="Places"
                    value={hackathon.is_full ? (hackathon.waitlist_enabled ? 'Full: new teams join the waitlist' : 'Full') : `${placesLeft} of ${hackathon.max_teams} left`}
                  />
                ) : null}
              </div>

              {(tags.length > 0 || hackathon.allow_open_innovation) && (
                <ul className="flex flex-wrap gap-x-2 gap-y-1 rounded-xl bg-journey-text/10 px-4 py-3 text-sm text-journey-text/80">
                  {tags.map((tag, index) => (
                    <li key={tag} className="flex items-center gap-2">
                      {index > 0 && <span className="text-journey-muted" aria-hidden="true">&bull;</span>}
                      {tag}
                    </li>
                  ))}
                  {hackathon.allow_open_innovation && (
                    <li className="flex items-center gap-2">
                      {tags.length > 0 && <span className="text-journey-muted" aria-hidden="true">&bull;</span>}
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> Open innovation welcome
                    </li>
                  )}
                </ul>
              )}

              <div ref={headerCtaRef} className="lg:hidden">
                <HackathonCTA hackathon={hackathon} />
              </div>
            </header>

            <SectionNav sections={sections} />

            {stages.length > 0 && (
              <PageSectionCard id="stages" title="Stages and Timelines">
                <StagesTimeline stages={stages} />
              </PageSectionCard>
            )}

            <PageSectionCard id="details" title={`All that you need to know about ${hackathon.title}`}>
              {hackathon.description?.trim() ? (
                <div className="prose max-w-none text-sm leading-relaxed text-journey-text/80 dark:prose-invert sm:text-base">
                  <MarkdownRenderer content={hackathon.description} />
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-journey-text/10 p-6 text-center text-sm text-journey-muted">
                  The organizing committee will publish the official overview shortly.
                </p>
              )}
              {hackathon.required_profile_fields && hackathon.required_profile_fields.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div className="space-y-1 text-sm">
                    <h3 className="font-bold text-amber-900 dark:text-amber-200">Complete your profile first</h3>
                    <p className="text-amber-800 dark:text-amber-300">
                      Every team member needs these on their club profile before creating or joining a team:{' '}
                      <strong>{hackathon.required_profile_fields.map(profileFieldLabel).join(', ')}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </PageSectionCard>

            <PageSectionCard id="dates" title="Dates and Deadlines">
              <DatesList rows={dateRows} />
              <p className="text-xs text-journey-muted">All times are in IST (Indian Standard Time).</p>
            </PageSectionCard>

            {hasPrizes && (
              <PageSectionCard id="prizes" title="Prizes">
                <PrizeCards hackathon={hackathon} />
              </PageSectionCard>
            )}

            {(problems.length > 0 || hackathon.allow_open_innovation) && (
              <PageSectionCard id="problems" title="Problem Statements">
                <p className="text-sm text-journey-muted">
                  Pick an official problem statement{hackathon.allow_open_innovation ? ' or bring your own idea through Open Innovation' : ''}.
                </p>
                <ProblemStatementsExplorer
                  problems={problems}
                  allowOpenInnovation={!!hackathon.allow_open_innovation}
                  hackathonSlug={hackathon.slug}
                  isRegistrationOpen={registrationOpen}
                  domainOrder={hackathon.problem_domains}
                />
              </PageSectionCard>
            )}

            {announcements.length > 0 && (
              <PageSectionCard id="announcements" title="Announcements">
                <HackathonAnnouncementsFeed announcements={announcements} />
              </PageSectionCard>
            )}

            {hasResults && results && (
              <PageSectionCard id="results" title="Results">
                <WinnersList results={results} />
              </PageSectionCard>
            )}

            {showcase.length > 0 && (
              <PageSectionCard id="showcase" title="Project showcase">
                <ProjectShowcase projects={showcase} />
              </PageSectionCard>
            )}

            {rules && (
              <PageSectionCard id="rules" title="Rules and code of conduct">
                <div className="prose max-w-none text-sm leading-relaxed text-journey-text/80 dark:prose-invert">
                  <MarkdownRenderer content={rules} />
                </div>
              </PageSectionCard>
            )}

            {mentors.length > 0 && (
              <PageSectionCard id="mentors" title="Mentors">
                <PeopleGrid people={mentors} />
              </PageSectionCard>
            )}

            {judges.length > 0 && (
              <PageSectionCard id="judges" title="Judges">
                <PeopleGrid people={judges} />
              </PageSectionCard>
            )}

            {sponsors.length > 0 && (
              <PageSectionCard id="sponsors" title="Sponsors and partners">
                <SponsorsGrid sponsors={sponsors} />
              </PageSectionCard>
            )}

            {hasContact && (
              <PageSectionCard id="contact" title="Contact and community">
                <ContactBlock contacts={contacts} links={communityLinks} mapUrl={hackathon.venue_map_url} />
              </PageSectionCard>
            )}

            <PageSectionCard id="faq" title="FAQs">
              <HackathonFAQSection hackathon={hackathon} />
            </PageSectionCard>
          </div>

          {/* Registration card: stays in view while reading on large screens */}
          <aside className="hidden space-y-4 lg:sticky lg:top-[140px] lg:block">
            <div className="space-y-4 rounded-2xl border border-journey-text/10 bg-journey-surface/60 p-5 shadow-lg">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-journey-accent">Team registration</h2>
              <HackathonCTA hackathon={hackathon} />
              <dl className="space-y-2 border-t border-journey-text/10 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-journey-muted">Deadline</dt>
                  <dd className="text-right font-semibold text-journey-text">{deadline}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-journey-muted">Team size</dt>
                  <dd className="font-semibold text-journey-text">{minSize === maxSize ? maxSize : `${minSize}–${maxSize}`}</dd>
                </div>
                {hackathon.prize_pool && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-journey-muted">Prize pool</dt>
                    <dd className="font-semibold text-journey-text">{hackathon.prize_pool}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {showStickyCta && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-journey-text/10 bg-[var(--background)]/95 px-4 pt-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto max-w-md pr-14">
            <HackathonCTA hackathon={hackathon} />
          </div>
        </div>
      )}
    </div>
  );
}
