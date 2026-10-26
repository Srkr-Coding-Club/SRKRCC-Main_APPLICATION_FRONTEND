'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Link2,
  Search,
  SearchX,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type { ProblemStatement } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useScrollEntrance } from '@/lib/hooks/useScrollEntrance';
import { useSiteNavbarOffset } from '@/lib/hooks/useSiteNavbarOffset';
import { riseIn } from '@/lib/entranceMotion';
import {
  ALL_TRACKS,
  DEFAULT_PROBLEM_FILTERS,
  DEFAULT_SORT_DIRECTION,
  MIN_TRACKS_TO_GROUP,
  PROBLEM_PAGE_SIZE,
  PROBLEM_SORT_LABELS,
  applyProblemFilters,
  filterProblems,
  findProblem,
  groupByTrack,
  isProblemFull,
  orderDomains,
  parseProblemFilters,
  plainSummary,
  sortProblems,
  type ProblemSort,
  type SortDirection,
} from '@/lib/problemStatements';
import { trackColorAt, type TrackColor } from '@/components/hackathons/trackColors';

interface ProblemStatementsExplorerProps {
  problems: ProblemStatement[];
  allowOpenInnovation: boolean;
  hackathonSlug: string;
  isRegistrationOpen: boolean;
  /** The admin's domain order; domains not in it follow alphabetically. */
  domainOrder?: string[];
}

const SEARCH_DEBOUNCE_MS = 200;
const COPIED_FEEDBACK_MS = 2000;
const MAX_CARD_TAGS = 3;
const SUGGESTED_TRACKS = 3;
const SORT_OPTIONS = Object.keys(PROBLEM_SORT_LABELS) as ProblemSort[];

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/60';
const accentText = 'text-orange-800 dark:text-journey-accent';
/** Matches the search box: one 44px control height on a phone, 40px from tablet up. */
const triggerClass = 'min-h-11 sm:min-h-10 text-sm font-semibold';

/** Where a sticky track heading must stop: under the site navbar and any sticky bar the page marks `data-sticky-bar`. */
function useStickyHeaderTop() {
  const navbarOffset = useSiteNavbarOffset(true);
  const [barBottom, setBarBottom] = useState(0);

  useLayoutEffect(() => {
    const bars = Array.from(document.querySelectorAll<HTMLElement>('[data-sticky-bar]'));
    if (bars.length === 0) return;
    const measure = () =>
      setBarBottom(Math.max(...bars.map((bar) => (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    bars.forEach((bar) => observer.observe(bar));
    return () => observer.disconnect();
  }, []);

  return Math.max(navbarOffset, barBottom);
}

/** The address of one problem on this page: opening it shows the problem's dialog straight away. */
function problemLink(problem: ProblemStatement): string {
  const url = new URL(window.location.href);
  url.search = `?problem=${encodeURIComponent(problem.code)}`;
  url.hash = 'problems';
  return url.toString();
}

function CopyLinkButton({ problem, variant }: { problem: ProblemStatement; variant: 'icon' | 'text' }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(problemLink(problem));
      setState('copied');
    } catch {
      setState('failed');
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), COPIED_FEEDBACK_MS);
  };

  const Icon = state === 'copied' ? Check : Link2;
  const label = state === 'copied' ? 'Link copied' : state === 'failed' ? 'Copy failed' : 'Copy link';
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={variant === 'icon' ? `${label}: ${problem.code}` : undefined}
        title={label}
        className={
          variant === 'icon'
            ? `flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-journey-muted transition hover:bg-journey-text/5 hover:text-journey-text active:scale-90 sm:h-9 sm:w-9 ${focusRing}`
            : `inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-journey-text/10 px-3 text-sm font-bold text-journey-text/80 transition hover:bg-journey-text/5 sm:min-h-9 sm:text-xs ${focusRing}`
        }
      >
        <Icon className={`h-4 w-4 ${state === 'copied' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} aria-hidden="true" />
        {variant === 'text' && label}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Link copied' : state === 'failed' ? 'Could not copy the link' : ''}
      </span>
    </>
  );
}

function CodeBadge({ code, color }: { code: string; color: TrackColor }) {
  return <span className={`shrink-0 rounded-lg border px-3 py-1.5 font-mono text-sm font-extrabold tracking-wider ${color.badge}`}>{code}</span>;
}

function TrackLabel({ domain, color }: { domain: string; color: TrackColor }) {
  if (!domain) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-journey-text/80">
      <span className={`h-2 w-2 shrink-0 rounded-full ${color.solid}`} aria-hidden="true" />
      <span className="truncate">{domain}</span>
    </span>
  );
}

interface ProblemCardProps {
  problem: ProblemStatement;
  index: number;
  color: TrackColor;
  registerHref: string | null;
  onOpen: (problem: ProblemStatement) => void;
}

function ProblemCard({ problem, index, color, registerHref, onOpen }: ProblemCardProps) {
  const ref = useRef<HTMLElement>(null);
  // Stagger within a row only, so a card further down starts the moment it scrolls into view.
  useScrollEntrance(ref, (timeline, element) => riseIn(timeline, element, { y: 20, duration: 0.55 }), { index: index % 2, start: 'top 94%' });
  const summary = useMemo(() => plainSummary(problem.description), [problem.description]);
  const shownTags = problem.tags.slice(0, MAX_CARD_TAGS);
  const hiddenTags = problem.tags.length - shownTags.length;

  return (
    <article
      ref={ref}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button')) onOpen(problem);
      }}
      className={`group relative flex cursor-pointer flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-journey-text/10 bg-journey-surface/50 py-4 pl-5 pr-4 backdrop-blur-sm transition-all duration-200 hover:shadow-lg motion-safe:hover:-translate-y-0.5 sm:py-5 sm:pl-6 sm:pr-5 ${color.hover}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${color.solid}`} />

      <div className="min-w-0 space-y-3">
        <div className="-mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <CodeBadge code={problem.code} color={color} />
            <TrackLabel domain={problem.domain} color={color} />
          </div>
          <div className="-mr-2 -mt-1">
            <CopyLinkButton problem={problem} variant="icon" />
          </div>
        </div>

        <h3 className="text-lg font-bold leading-snug text-journey-text sm:text-xl">{problem.title}</h3>

        {summary && <p className="line-clamp-3 text-sm leading-relaxed text-journey-text/80">{summary}</p>}

        {problem.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {shownTags.map((tag) => (
              <span key={tag} className="rounded-md bg-journey-text/5 px-2 py-1 text-xs font-medium text-journey-muted">
                #{tag}
              </span>
            ))}
            {hiddenTags > 0 && <span className="text-xs font-semibold text-journey-muted">+{hiddenTags} more</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-journey-text/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {registerHref && (
          <Link
            href={registerHref}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-journey-accent px-4 text-sm font-bold text-journey-on-accent shadow-sm transition active:scale-95 hover:opacity-90 sm:order-2 sm:min-h-9 sm:text-xs ${focusRing}`}
          >
            Choose Problem <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => onOpen(problem)}
          aria-label={`View full details of ${problem.code} ${problem.title}`}
          className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-xl text-sm font-bold sm:min-h-9 sm:justify-start sm:text-xs ${accentText} hover:underline ${focusRing}`}
        >
          View Full Details <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export function ProblemStatementsExplorer({
  problems,
  allowOpenInnovation,
  hackathonSlug,
  isRegistrationOpen,
  domainOrder = [],
}: ProblemStatementsExplorerProps) {
  const searchId = useId();
  const [queryInput, setQueryInput] = useState('');
  const [domain, setDomain] = useState(ALL_TRACKS);
  const [sort, setSort] = useState<ProblemSort>(DEFAULT_PROBLEM_FILTERS.sort);
  const [dir, setDir] = useState<SortDirection>(DEFAULT_PROBLEM_FILTERS.dir);
  const [shown, setShown] = useState(PROBLEM_PAGE_SIZE);
  const [activeProblem, setActiveProblem] = useState<ProblemStatement | null>(null);
  const hydrated = useRef(false);
  const stickyTop = useStickyHeaderTop();

  const query = useDebouncedValue(queryInput, SEARCH_DEBOUNCE_MS);
  const filters = useMemo(() => ({ query, domain, sort, dir }), [query, domain, sort, dir]);

  const domains = useMemo(() => orderDomains(problems, domainOrder), [problems, domainOrder]);
  const trackCounts = useMemo(() => {
    const counts = new Map<string, number>();
    problems.forEach((p) => counts.set(p.domain.toLowerCase(), (counts.get(p.domain.toLowerCase()) ?? 0) + 1));
    return counts;
  }, [problems]);
  const countFor = (name: string) => (name === ALL_TRACKS ? problems.length : (trackCounts.get(name.toLowerCase()) ?? 0));
  /** A track keeps its colour whatever is filtered, because its place in the hackathon's own track list never changes. */
  const colorFor = (name: string) => trackColorAt(domains.findIndex((d) => d.toLowerCase() === name.toLowerCase()));

  // Restore a shared or bookmarked view once, after hydration, so server and client markup match.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restored = parseProblemFilters(params, domains);
    setQueryInput(restored.query);
    setDomain(restored.domain);
    setSort(restored.sort);
    setDir(restored.dir);
    setActiveProblem(findProblem(problems, params.get('problem')));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address bar in step with the view (no router navigation, so no re-render or scroll jump).
  useEffect(() => {
    if (!hydrated.current) return;
    const params = applyProblemFilters(new URLSearchParams(window.location.search), filters);
    if (activeProblem) params.set('problem', activeProblem.code);
    else params.delete('problem');
    const search = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }, [filters, activeProblem]);

  // A different view starts again from the first page of cards.
  useEffect(() => setShown(PROBLEM_PAGE_SIZE), [filters]);

  const matching = useMemo(() => sortProblems(filterProblems(problems, filters), sort, dir, domainOrder), [problems, filters, sort, dir, domainOrder]);
  const visible = matching.slice(0, shown);
  const remaining = matching.length - visible.length;
  const filtered = matching.length !== problems.length;
  const grouped = sort === 'track' && domain === ALL_TRACKS && !query.trim() && domains.length >= MIN_TRACKS_TO_GROUP;
  const groups = useMemo(() => (grouped ? groupByTrack(visible) : []), [grouped, visible]);
  const isFiltered = !!query.trim() || domain !== ALL_TRACKS;

  const registerUrl = `/hackathons/${hackathonSlug}/dashboard`;
  const registerHrefFor = (problem: ProblemStatement) =>
    isRegistrationOpen && !isProblemFull(problem) ? `${registerUrl}?ps=${problem.id}` : null;

  const resetFilters = () => {
    setQueryInput('');
    setDomain(ALL_TRACKS);
    setSort(DEFAULT_PROBLEM_FILTERS.sort);
    setDir(DEFAULT_PROBLEM_FILTERS.dir);
  };

  // Moving through the dialog follows the list as it is filtered and sorted, not just the cards shown so far.
  const activeIndex = activeProblem ? matching.findIndex((p) => p.id === activeProblem.id) : -1;
  const goTo = (offset: number) => {
    const next = matching[activeIndex + offset];
    if (next) setActiveProblem(next);
  };
  useEffect(() => {
    if (!activeProblem) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [role="listbox"]')) return;
      if (event.key === 'ArrowLeft') goTo(-1);
      if (event.key === 'ArrowRight') goTo(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProblem, matching]);

  const chipBase = `inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition ${focusRing}`;
  const chipIdle = 'border-journey-text/10 bg-journey-surface/60 text-journey-text/80 hover:border-journey-text/25';
  const countPill = 'rounded-full bg-journey-text/10 px-1.5 text-xs font-extrabold text-journey-text/80';

  const renderCard = (problem: ProblemStatement, index: number) => (
    <ProblemCard
      key={problem.id}
      problem={problem}
      index={index}
      color={colorFor(problem.domain)}
      registerHref={registerHrefFor(problem)}
      onOpen={setActiveProblem}
    />
  );

  const activeColor = activeProblem ? colorFor(activeProblem.domain) : null;
  const activeRegisterHref = activeProblem ? registerHrefFor(activeProblem) : null;

  return (
    <div className="space-y-5">
      <div className="glass-panel space-y-3 rounded-2xl border border-journey-text/10 p-3 sm:p-4">
        <div className="relative min-w-0">
          <label htmlFor={searchId} className="sr-only">
            Search problem statements
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search title, code or tag"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-11 w-full rounded-xl border border-journey-text/10 bg-journey-surface/60 py-2.5 pl-10 pr-11 text-base text-journey-text transition placeholder:text-journey-muted focus:outline-none focus:ring-2 focus:ring-journey-accent/50 sm:min-h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput('')}
              aria-label="Clear search"
              className={`absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-journey-muted hover:text-journey-text ${focusRing}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {domains.length > 1 && (
            <>
              <div role="group" aria-label="Tracks" className="hidden min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex">
                <button
                  type="button"
                  aria-pressed={domain === ALL_TRACKS}
                  onClick={() => setDomain(ALL_TRACKS)}
                  className={`${chipBase} ${domain === ALL_TRACKS ? 'border-journey-accent bg-journey-accent/10 text-journey-text' : chipIdle}`}
                >
                  All tracks <span className={countPill}>{countFor(ALL_TRACKS)}</span>
                </button>
                {domains.map((name) => {
                  const color = colorFor(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={domain === name}
                      onClick={() => setDomain(domain === name ? ALL_TRACKS : name)}
                      className={`${chipBase} ${domain === name ? color.active : chipIdle}`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${color.solid}`} aria-hidden="true" />
                      <span className="max-w-[12rem] truncate">{name}</span>
                      <span className={countPill}>{countFor(name)}</span>
                    </button>
                  );
                })}
              </div>
              <FormSelect
                aria-label="Filter by track"
                className="w-full sm:hidden"
                triggerClassName={triggerClass}
                value={domain === ALL_TRACKS ? '' : domain}
                placeholder={`All tracks (${countFor(ALL_TRACKS)})`}
                options={domains.map((name) => ({ value: name, label: name, hint: `${countFor(name)}` }))}
                onChange={(value) => setDomain(value || ALL_TRACKS)}
              />
            </>
          )}

          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-journey-muted" aria-hidden="true">
              Sort
            </span>
            <FormSelect
              aria-label="Sort problem statements"
              className="min-w-[8.5rem]"
              triggerClassName={triggerClass}
              value={sort}
              placeholder="Sort"
              allowClear={false}
              options={SORT_OPTIONS.map((option) => ({ value: option, label: PROBLEM_SORT_LABELS[option] }))}
              onChange={(value) => {
                const column = value as ProblemSort;
                setSort(column);
                setDir(DEFAULT_SORT_DIRECTION[column]);
              }}
            />
            <button
              type="button"
              onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}
              aria-label={`Sorted ${dir === 'asc' ? 'ascending' : 'descending'}. Reverse the order`}
              title="Reverse the order"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-journey-text/10 bg-journey-surface/60 text-journey-text/80 transition hover:border-journey-accent/50 hover:text-journey-accent active:scale-95 sm:h-10 sm:w-10 ${focusRing}`}
            >
              {dir === 'asc' ? <ArrowUp className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-xs text-journey-muted">
        <p role="status" aria-live="polite" aria-atomic="true">
          Showing <strong>{visible.length}</strong> of <strong>{matching.length}</strong> problem statements
          {filtered && <> ({problems.length} in total)</>}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {isFiltered && (
            <button type="button" onClick={resetFilters} className={`min-h-9 rounded px-1 font-bold ${accentText} hover:underline ${focusRing}`}>
              Clear filters
            </button>
          )}
          {allowOpenInnovation && (
            <span className="inline-flex items-center gap-1 font-semibold text-journey-accent">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Open Innovation
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {matching.length === 0 ? (
          <div className="space-y-4 rounded-2xl border border-dashed border-journey-text/15 px-4 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-journey-text/5 text-journey-muted">
              <SearchX className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-bold text-journey-text">No matching problem statements found.</p>
              <p className="mx-auto max-w-sm text-sm text-journey-muted">
                {query.trim() ? `Nothing matches "${query.trim()}"` : 'Nothing matches these filters'}. Try a shorter search, or pick a track.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {domains.slice(0, SUGGESTED_TRACKS).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setQueryInput('');
                    setDomain(name);
                  }}
                  className={`${chipBase} ${chipIdle}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${colorFor(name).solid}`} aria-hidden="true" />
                  {name}
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className={`inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-bold ${accentText} hover:underline ${focusRing}`}
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : grouped ? (
          <div className="space-y-6">
            {groups.map((group) => {
              const color = colorFor(group.domain);
              return (
                <section key={group.domain} aria-label={`${group.domain} problem statements`} className="space-y-3">
                  <h3
                    style={{ top: stickyTop }}
                    className="sticky z-10 -mx-1 flex items-center justify-between gap-3 bg-journey-bg/90 px-1 py-2 text-xs font-extrabold uppercase tracking-wider text-journey-text/80 backdrop-blur"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.solid}`} aria-hidden="true" />
                      <span className="truncate">{group.domain}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-journey-text/10 px-2 py-0.5 text-journey-text/80">{countFor(group.domain)}</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">{group.items.map(renderCard)}</div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">{visible.map(renderCard)}</div>
        )}

        {remaining > 0 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShown(shown + PROBLEM_PAGE_SIZE)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-journey-text/10 bg-journey-surface/60 px-5 text-sm font-bold text-journey-text transition hover:border-journey-accent/50 active:scale-95 sm:min-h-10 sm:text-xs ${focusRing}`}
            >
              Show {Math.min(PROBLEM_PAGE_SIZE, remaining)} more ({remaining} left)
            </button>
          </div>
        )}
      </div>

      {allowOpenInnovation && (
        <div className="relative overflow-hidden rounded-2xl border border-journey-accent/30 bg-journey-accent/5 p-5 backdrop-blur-sm sm:p-7">
          <div className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
            <div className="max-w-2xl space-y-2">
              <div className={`inline-flex items-center gap-1.5 rounded-full bg-journey-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wider ${accentText}`}>
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                Open Innovation Track
              </div>
              <h3 className="text-lg font-bold text-journey-text">Have your own innovative idea or research project?</h3>
              <p className="text-sm leading-relaxed text-journey-text/80">
                You are not limited to predefined problem statements! Select <strong>Open Innovation</strong> during team
                registration to define your own custom problem title, track, and description. You will be assigned a unique{' '}
                <code className={`font-mono font-bold ${accentText}`}>OI-xxx</code> ID.
              </p>
            </div>

            {isRegistrationOpen && (
              <Link
                href={registerUrl}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-journey-accent px-5 text-sm font-bold text-journey-on-accent shadow-md transition active:scale-95 motion-safe:hover:-translate-y-0.5 sm:text-xs ${focusRing}`}
              >
                Register Custom Idea
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={!!activeProblem}
        onClose={() => setActiveProblem(null)}
        title={activeProblem?.title ?? ''}
        icon={Target}
        maxWidth="max-w-3xl"
        footer={
          activeProblem && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goTo(-1)}
                    disabled={activeIndex <= 0}
                    aria-label="Previous problem"
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-journey-text/10 text-journey-text/80 transition hover:bg-journey-text/5 disabled:opacity-40 sm:h-9 sm:w-9 ${focusRing}`}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-[4.5rem] text-center text-xs font-semibold tabular-nums text-journey-muted">
                    {activeIndex + 1} of {matching.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    disabled={activeIndex < 0 || activeIndex >= matching.length - 1}
                    aria-label="Next problem"
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-journey-text/10 text-journey-text/80 transition hover:bg-journey-text/5 disabled:opacity-40 sm:h-9 sm:w-9 ${focusRing}`}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <CopyLinkButton problem={activeProblem} variant="text" />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setActiveProblem(null)}
                  className={`hidden min-h-11 rounded-xl border border-journey-text/10 px-4 text-sm font-bold text-journey-text/80 transition hover:bg-journey-text/5 sm:inline-flex sm:items-center sm:text-xs ${focusRing}`}
                >
                  Close
                </button>
                {activeRegisterHref && (
                  <Link
                    href={activeRegisterHref}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-journey-accent px-5 text-sm font-bold text-journey-on-accent shadow-md transition active:scale-95 sm:text-xs ${focusRing}`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Select this Statement in Registration
                  </Link>
                )}
              </div>
            </div>
          )
        }
      >
        {activeProblem && activeColor && (
          <div className="space-y-5">
            <p className="text-lg font-bold leading-snug text-journey-text sm:hidden">{activeProblem.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-journey-text/5 pb-4">
              <CodeBadge code={activeProblem.code} color={activeColor} />
              <TrackLabel domain={activeProblem.domain} color={activeColor} />
            </div>

            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-journey-muted">Problem Specification &amp; Guidelines</h4>
              <div className="text-sm leading-relaxed text-journey-text/90">
                <MarkdownRenderer content={activeProblem.description || 'No detailed description provided.'} />
              </div>
            </section>

            {activeProblem.tags.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-journey-muted">Related Technologies &amp; Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {activeProblem.tags.map((tag) => (
                    <span key={tag} className="rounded-lg bg-journey-text/5 px-2.5 py-1 text-xs font-semibold text-journey-text/80">
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
