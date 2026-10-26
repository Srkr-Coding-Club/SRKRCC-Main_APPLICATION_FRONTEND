'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Target,
  Lightbulb,
  Users,
  Infinity as InfinityIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import type { ProblemStatement } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useSiteNavbarOffset } from '@/lib/hooks/useSiteNavbarOffset';
import {
  ALL_TRACKS,
  DEFAULT_PROBLEM_FILTERS,
  LOW_SLOTS_THRESHOLD,
  MIN_TRACKS_TO_GROUP,
  PROBLEM_SORT_LABELS,
  activeFilterCount,
  applyProblemFilters,
  filterProblems,
  groupByTrack,
  isProblemFull,
  orderDomains,
  parseProblemFilters,
  plainSummary,
  sortProblems,
  type ProblemSort,
} from '@/lib/problemStatements';

interface ProblemStatementsExplorerProps {
  problems: ProblemStatement[];
  allowOpenInnovation: boolean;
  hackathonSlug: string;
  isRegistrationOpen: boolean;
  /** The admin's domain order; domains not in it follow alphabetically. */
  domainOrder?: string[];
}

const SEARCH_DEBOUNCE_MS = 200;
const MAX_CARD_TAGS = 3;
const SORT_OPTIONS = Object.keys(PROBLEM_SORT_LABELS) as ProblemSort[];

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/60';
const accentText = 'text-orange-800 dark:text-journey-accent';

/** Where a sticky track heading must stop: under the site navbar and any sticky bar the page marks `data-sticky-bar`. */
function useStickyHeadingTop() {
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

/** Remaining capacity as a badge that never wraps: unlimited, plenty, filling up, or full. */
function SlotsBadge({ problem, size = 'sm' }: { problem: ProblemStatement; size?: 'sm' | 'md' }) {
  const pad = size === 'md' ? 'px-3 py-1' : 'px-2.5 py-1';
  const base = `inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border text-xs font-bold ${pad}`;
  if (!problem.max_teams) {
    return (
      <span className={`${base} border-journey-text/10 bg-journey-text/5 text-journey-text/80`}>
        <InfinityIcon className="h-3.5 w-3.5" aria-hidden="true" /> Unlimited slots
      </span>
    );
  }
  if (isProblemFull(problem)) {
    return (
      <span className={`${base} border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400`}>
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Full
      </span>
    );
  }
  const left = problem.slots_left ?? problem.max_teams;
  const low = left <= LOW_SLOTS_THRESHOLD;
  return (
    <span
      className={`${base} ${
        low
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
      }`}
    >
      <Users className="h-3.5 w-3.5" aria-hidden="true" />
      {size === 'md' ? `${left} of ${problem.max_teams} slots left` : `${left} slot${left === 1 ? '' : 's'} left`}
    </span>
  );
}

function CodeBadge({ code }: { code: string }) {
  return (
    <span className={`shrink-0 rounded-md border border-journey-accent/30 bg-journey-accent/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider ${accentText}`}>
      {code}
    </span>
  );
}

interface ProblemCardProps {
  problem: ProblemStatement;
  registerHref: string | null;
  onOpen: (problem: ProblemStatement) => void;
}

function ProblemCard({ problem, registerHref, onOpen }: ProblemCardProps) {
  const summary = useMemo(() => plainSummary(problem.description), [problem.description]);
  const shownTags = problem.tags.slice(0, MAX_CARD_TAGS);
  const hiddenTags = problem.tags.length - shownTags.length;

  return (
    <article
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button')) onOpen(problem);
      }}
      className="group flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border border-journey-text/10 bg-journey-surface/50 p-4 backdrop-blur-sm transition-all duration-200 hover:border-journey-accent/50 hover:shadow-lg motion-safe:hover:-translate-y-0.5 sm:p-5 dark:hover:shadow-journey-accent/5"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CodeBadge code={problem.code} />
          {problem.domain && (
            <span className="min-w-0 max-w-full truncate rounded-full bg-journey-text/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-journey-text/80">
              {problem.domain}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold leading-snug text-journey-text transition group-hover:text-journey-accent sm:text-lg">
          {problem.title}
        </h3>

        {summary && <p className="line-clamp-2 text-sm leading-relaxed text-journey-text/80">{summary}</p>}

        <div className="flex flex-wrap items-center gap-1.5">
          <SlotsBadge problem={problem} />
          {shownTags.map((tag) => (
            <span key={tag} className="rounded-md bg-journey-text/5 px-2 py-1 text-xs font-medium text-journey-muted">
              #{tag}
            </span>
          ))}
          {hiddenTags > 0 && <span className="text-xs font-semibold text-journey-muted">+{hiddenTags} more</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-journey-text/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {registerHref && (
          <Link
            href={registerHref}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-journey-accent px-4 text-sm font-bold text-journey-on-accent shadow-sm transition active:scale-95 sm:order-2 sm:min-h-9 sm:text-xs ${focusRing}`}
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

function ChoiceRow({
  name,
  checked,
  onSelect,
  label,
  count,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-journey-accent/60 ${
        checked
          ? 'border-journey-accent bg-journey-accent/10 text-journey-text'
          : 'border-journey-text/10 bg-journey-surface/50 text-journey-text/80 hover:border-journey-text/25'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-journey-accent' : 'border-journey-text/30'}`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-journey-accent" />}
        </span>
        <span className="min-w-0 break-words">{label}</span>
      </span>
      {count !== undefined && (
        <span className="shrink-0 rounded-full bg-journey-text/10 px-2 py-0.5 text-xs font-extrabold text-journey-muted">{count}</span>
      )}
    </label>
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
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<ProblemSort>(DEFAULT_PROBLEM_FILTERS.sort);
  const [activeProblem, setActiveProblem] = useState<ProblemStatement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState({ domain: ALL_TRACKS, onlyAvailable: false, sort: DEFAULT_PROBLEM_FILTERS.sort });
  const hydrated = useRef(false);
  const stickyTop = useStickyHeadingTop();

  const query = useDebouncedValue(queryInput, SEARCH_DEBOUNCE_MS);
  const filters = useMemo(() => ({ query, domain, onlyAvailable, sort }), [query, domain, onlyAvailable, sort]);

  const domains = useMemo(() => orderDomains(problems, domainOrder), [problems, domainOrder]);
  const trackCounts = useMemo(() => {
    const counts = new Map<string, number>();
    problems.forEach((p) => counts.set(p.domain.toLowerCase(), (counts.get(p.domain.toLowerCase()) ?? 0) + 1));
    return counts;
  }, [problems]);
  const countFor = (name: string) => (name === ALL_TRACKS ? problems.length : (trackCounts.get(name.toLowerCase()) ?? 0));

  // Restore a shared or bookmarked view once, after hydration, so server and client markup match.
  useEffect(() => {
    const restored = parseProblemFilters(new URLSearchParams(window.location.search), domains);
    setQueryInput(restored.query);
    setDomain(restored.domain);
    setOnlyAvailable(restored.onlyAvailable);
    setSort(restored.sort);
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address bar in step with the view (no router navigation, so no re-render or scroll jump).
  useEffect(() => {
    if (!hydrated.current) return;
    const params = applyProblemFilters(new URLSearchParams(window.location.search), filters);
    const search = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }, [filters]);

  const visible = useMemo(() => filterProblems(problems, filters), [problems, filters]);
  const grouped = domain === ALL_TRACKS && sort === 'track' && !query.trim() && domains.length >= MIN_TRACKS_TO_GROUP;
  const groups = useMemo(() => (grouped ? groupByTrack(visible, domainOrder) : []), [grouped, visible, domainOrder]);
  const flat = useMemo(() => (grouped ? [] : sortProblems(visible, sort, domainOrder)), [grouped, visible, sort, domainOrder]);

  const filterCount = activeFilterCount(filters);
  const draftResultCount = useMemo(
    () => filterProblems(problems, { ...draft, query }).length,
    [problems, draft, query],
  );

  const registerUrl = `/hackathons/${hackathonSlug}/dashboard`;
  const registerUrlFor = (problemId: number) => `${registerUrl}?ps=${problemId}`;
  const registerHrefFor = (problem: ProblemStatement) =>
    isRegistrationOpen && !isProblemFull(problem) ? registerUrlFor(problem.id) : null;

  const openSheet = () => {
    setDraft({ domain, onlyAvailable, sort });
    setSheetOpen(true);
  };
  const applyDraft = () => {
    setDomain(draft.domain);
    setOnlyAvailable(draft.onlyAvailable);
    setSort(draft.sort);
    setSheetOpen(false);
  };
  const resetFilters = () => {
    setQueryInput('');
    setDomain(ALL_TRACKS);
    setOnlyAvailable(false);
    setSort(DEFAULT_PROBLEM_FILTERS.sort);
  };

  const renderCard = (problem: ProblemStatement) => (
    <ProblemCard key={problem.id} problem={problem} registerHref={registerHrefFor(problem)} onOpen={setActiveProblem} />
  );

  const chipClass = `inline-flex min-h-9 items-center gap-1.5 rounded-full border border-journey-accent/40 bg-journey-accent/10 pl-3 pr-2 text-xs font-bold text-journey-text ${focusRing}`;

  return (
    <div className="space-y-5">
      <div className="glass-panel space-y-3 rounded-2xl border border-journey-text/10 p-3 sm:space-y-4 sm:p-5">
        <div className="flex gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1">
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

          <button
            type="button"
            onClick={openSheet}
            aria-haspopup="dialog"
            className={`relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition sm:hidden ${
              filterCount > 0
                ? 'border-journey-accent bg-journey-accent/10 text-journey-text'
                : 'border-journey-text/10 bg-journey-surface/60 text-journey-text/80'
            } ${focusRing}`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {filterCount > 0 && (
              <span
                aria-label={`${filterCount} active`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-journey-accent px-1 text-xs font-extrabold text-journey-on-accent"
              >
                {filterCount}
              </span>
            )}
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <label htmlFor={`${searchId}-sort`} className="sr-only">
              Sort problem statements
            </label>
            <select
              id={`${searchId}-sort`}
              value={sort}
              onChange={(e) => setSort(e.target.value as ProblemSort)}
              className={`min-h-10 rounded-xl border border-journey-text/10 bg-journey-surface/60 px-3 text-xs font-bold text-journey-text ${focusRing}`}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Sort: {PROBLEM_SORT_LABELS[option]}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={onlyAvailable}
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border px-4 text-xs font-bold transition ${
                onlyAvailable
                  ? `border-journey-accent bg-journey-accent/10 ${accentText}`
                  : 'border-journey-text/10 bg-journey-surface/50 text-journey-text/80 hover:border-journey-text/25'
              } ${focusRing}`}
            >
              Open slots only
            </button>
          </div>
        </div>

        {domains.length > 1 && (
          <div role="group" aria-label="Filter by track" className="hidden flex-wrap items-center gap-1.5 sm:flex">
            {[ALL_TRACKS, ...domains].map((name) => {
              const active = domain === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDomain(name)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                    active ? 'bg-journey-accent text-journey-on-accent shadow-sm' : 'bg-journey-text/5 text-journey-text/80 hover:bg-journey-text/10'
                  } ${focusRing}`}
                >
                  <span>{name === ALL_TRACKS ? 'All Tracks' : name}</span>
                  <span className={`rounded-full px-1.5 text-xs font-extrabold ${active ? 'bg-white/20' : 'bg-journey-text/10 text-journey-muted'}`}>
                    {countFor(name)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {filterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:hidden">
            {domain !== ALL_TRACKS && (
              <button type="button" onClick={() => setDomain(ALL_TRACKS)} aria-label={`Remove track filter ${domain}`} className={chipClass}>
                <span className="max-w-[12rem] truncate">{domain}</span>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {onlyAvailable && (
              <button type="button" onClick={() => setOnlyAvailable(false)} aria-label="Remove open slots filter" className={chipClass}>
                Open slots only <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {sort !== DEFAULT_PROBLEM_FILTERS.sort && (
              <button type="button" onClick={() => setSort(DEFAULT_PROBLEM_FILTERS.sort)} aria-label="Reset sort order" className={chipClass}>
                Sort: {PROBLEM_SORT_LABELS[sort]} <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={resetFilters} className={`min-h-9 px-2 text-xs font-bold ${accentText} hover:underline ${focusRing}`}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-xs text-journey-muted">
        <p role="status" aria-live="polite" aria-atomic="true">
          Showing <strong>{visible.length}</strong> of <strong>{problems.length}</strong> problem statements
        </p>
        {allowOpenInnovation && (
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-journey-accent">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Open Innovation
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-journey-text/10 px-4 py-12 text-center">
          <Target className="mx-auto h-8 w-8 text-journey-muted" aria-hidden="true" />
          <p className="text-sm font-bold text-journey-text/80">No matching problem statements found.</p>
          <p className="mx-auto max-w-sm text-xs text-journey-muted">
            Try a different search or reset the filters to see every challenge.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className={`inline-flex min-h-11 items-center gap-1 px-3 text-sm font-bold ${accentText} hover:underline ${focusRing}`}
          >
            Reset Filters
          </button>
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.domain} aria-label={`${group.domain} problem statements`} className="space-y-3">
              <h3
                style={{ top: stickyTop }}
                className="sticky z-10 -mx-1 flex items-center justify-between gap-3 bg-journey-bg/90 px-1 py-2 text-xs font-extrabold uppercase tracking-wider text-journey-text/80 backdrop-blur"
              >
                <span className="min-w-0 truncate">{group.domain}</span>
                <span className="shrink-0 rounded-full bg-journey-text/10 px-2 py-0.5 text-journey-muted">{group.items.length}</span>
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">{group.items.map(renderCard)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">{flat.map(renderCard)}</div>
      )}

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
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        icon={SlidersHorizontal}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft({ domain: ALL_TRACKS, onlyAvailable: false, sort: DEFAULT_PROBLEM_FILTERS.sort })}
              className={`min-h-11 rounded-xl border border-journey-text/10 px-4 text-sm font-bold text-journey-text/80 transition hover:bg-journey-text/5 ${focusRing}`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applyDraft}
              className={`min-h-11 flex-1 rounded-xl bg-journey-accent px-4 text-sm font-bold text-journey-on-accent shadow-md transition active:scale-95 ${focusRing}`}
            >
              Show {draftResultCount} problem{draftResultCount === 1 ? '' : 's'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-journey-muted">Track</legend>
            {[ALL_TRACKS, ...domains].map((name) => (
              <ChoiceRow
                key={name}
                name="problem-track"
                checked={draft.domain === name}
                onSelect={() => setDraft((d) => ({ ...d, domain: name }))}
                label={name === ALL_TRACKS ? 'All Tracks' : name}
                count={countFor(name)}
              />
            ))}
          </fieldset>

          <Switch
            checked={draft.onlyAvailable}
            onChange={(checked) => setDraft((d) => ({ ...d, onlyAvailable: checked }))}
            label="Open slots only"
            description="Hide problem statements that are full."
          />

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-journey-muted">Sort by</legend>
            {SORT_OPTIONS.map((option) => (
              <ChoiceRow
                key={option}
                name="problem-sort"
                checked={draft.sort === option}
                onSelect={() => setDraft((d) => ({ ...d, sort: option }))}
                label={PROBLEM_SORT_LABELS[option]}
              />
            ))}
          </fieldset>
        </div>
      </Modal>

      <Modal
        isOpen={!!activeProblem}
        onClose={() => setActiveProblem(null)}
        title={activeProblem?.title ?? ''}
        icon={Target}
        maxWidth="max-w-3xl"
        footer={
          activeProblem && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setActiveProblem(null)}
                className={`min-h-11 rounded-xl border border-journey-text/10 px-4 text-sm font-bold text-journey-text/80 transition hover:bg-journey-text/5 sm:text-xs ${focusRing}`}
              >
                Close
              </button>
              {registerHrefFor(activeProblem) && (
                <Link
                  href={registerHrefFor(activeProblem)!}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-journey-accent px-5 text-sm font-bold text-journey-on-accent shadow-md transition active:scale-95 sm:text-xs ${focusRing}`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Select this Statement in Registration
                </Link>
              )}
            </div>
          )
        }
      >
        {activeProblem && (
          <div className="space-y-5">
            <p className="text-lg font-bold leading-snug text-journey-text sm:hidden">{activeProblem.title}</p>
            <div className="flex flex-wrap items-center gap-2 border-b border-journey-text/5 pb-4">
              <CodeBadge code={activeProblem.code} />
              {activeProblem.domain && (
                <span className="rounded-full bg-journey-text/5 px-3 py-1 text-xs font-bold uppercase text-journey-text/80">
                  {activeProblem.domain}
                </span>
              )}
              <SlotsBadge problem={activeProblem} size="md" />
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
