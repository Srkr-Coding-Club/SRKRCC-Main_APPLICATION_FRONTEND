'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Target,
  Lightbulb,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { ProblemStatement } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Modal } from '@/components/ui/Modal';

interface ProblemStatementsExplorerProps {
  problems: ProblemStatement[];
  allowOpenInnovation: boolean;
  hackathonSlug: string;
  isRegistrationOpen: boolean;
  /** The admin's domain order; domains not in it follow alphabetically. */
  domainOrder?: string[];
}

export function ProblemStatementsExplorer({
  problems,
  allowOpenInnovation,
  hackathonSlug,
  isRegistrationOpen,
  domainOrder = [],
}: ProblemStatementsExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [activeProblem, setActiveProblem] = useState<ProblemStatement | null>(null);

  // Compute unique domains
  const domains = useMemo(() => {
    const used = Array.from(new Set(problems.map((p) => p.domain).filter(Boolean)));
    const rank = (domain: string) => {
      const index = domainOrder.findIndex((name) => name.toLowerCase() === domain.toLowerCase());
      return index === -1 ? domainOrder.length : index;
    };
    return ['ALL', ...used.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))];
  }, [problems, domainOrder]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    return problems.filter((ps) => {
      // Domain filter
      if (selectedDomain !== 'ALL' && ps.domain.toLowerCase() !== selectedDomain.toLowerCase()) {
        return false;
      }
      // Availability filter
      if (onlyAvailable && ps.slots_left === 0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inCode = ps.code.toLowerCase().includes(query);
        const inTitle = ps.title.toLowerCase().includes(query);
        const inDomain = ps.domain.toLowerCase().includes(query);
        const inDesc = ps.description.toLowerCase().includes(query);
        const inTags = ps.tags.some((t) => t.toLowerCase().includes(query));
        if (!inCode && !inTitle && !inDomain && !inDesc && !inTags) {
          return false;
        }
      }
      return true;
    });
  }, [problems, selectedDomain, onlyAvailable, searchQuery]);

  const registerUrl = `/hackathons/${hackathonSlug}/dashboard`;
  const registerUrlFor = (problemId: number) => `${registerUrl}?ps=${problemId}`;

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="glass-panel rounded-2xl border border-journey-text/10 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-journey-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problem statements by keyword, domain, code (e.g. PS-001) or tag..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-journey-text/10 bg-journey-surface/60 text-sm text-journey-text placeholder:text-journey-muted focus:outline-none focus:ring-2 focus:ring-journey-accent/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-journey-muted hover:text-journey-text"
              >
                Clear
              </button>
            )}
          </div>

          {/* Availability Toggle */}
          <button
            type="button"
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition whitespace-nowrap ${
              onlyAvailable
                ? 'border-journey-accent bg-journey-accent/10 text-journey-accent'
                : 'border-journey-text/10 bg-journey-surface/50 text-journey-text/80 hover:border-journey-text/25'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {onlyAvailable ? 'Showing: Open Slots Only' : 'Filter: Open Slots'}
          </button>
        </div>

        {/* Domain Filter Pills */}
        {domains.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-journey-muted mr-1 shrink-0">
              Tracks:
            </span>
            {domains.map((domain) => {
              const active = selectedDomain === domain;
              const count =
                domain === 'ALL'
                  ? problems.length
                  : problems.filter((p) => p.domain.toLowerCase() === domain.toLowerCase()).length;

              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shrink-0 transition ${
                    active
                      ? 'bg-journey-accent text-white shadow-sm'
                      : 'bg-journey-text/5 text-journey-text/80 hover:bg-journey-text/10'
                  }`}
                >
                  <span>{domain === 'ALL' ? 'All Tracks' : domain}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      active ? 'bg-white/20 text-white' : 'bg-journey-text/10 text-journey-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-journey-muted px-1">
        <span>
          Showing <strong>{filteredProblems.length}</strong> of <strong>{problems.length}</strong> problem statements
        </span>
        {allowOpenInnovation && (
          <span className="inline-flex items-center gap-1 text-journey-accent font-semibold">
            <Sparkles className="h-3 w-3" /> Open Innovation Supported
          </span>
        )}
      </div>

      {/* Problem Statements Cards Grid */}
      {filteredProblems.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredProblems.map((ps) => {
            const isFull = ps.slots_left === 0;
            return (
              <article
                key={ps.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-journey-text/10 bg-journey-surface/50 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-journey-accent/50 hover:shadow-lg dark:hover:shadow-journey-accent/5"
              >
                <div className="space-y-3">
                  {/* Top Bar: Code + Domain + Slots */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-journey-accent/10 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-journey-accent border border-journey-accent/30">
                        {ps.code}
                      </span>
                      {ps.domain && (
                        <span className="rounded-full bg-journey-text/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-journey-text/80">
                          {ps.domain}
                        </span>
                      )}
                    </div>

                    {/* Slots left badge */}
                    {ps.max_teams ? (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isFull
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isFull ? (
                          <>
                            <AlertTriangle className="h-3 w-3" /> Full
                          </>
                        ) : (
                          <>
                            <Users className="h-3 w-3" />
                            {ps.slots_left} slot{ps.slots_left === 1 ? '' : 's'} left
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-journey-muted">Unlimited slots</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-journey-text group-hover:text-journey-accent transition line-clamp-2">
                    {ps.title}
                  </h3>

                  {/* Description Clamped */}
                  {ps.description?.trim() && (
                    <div className="text-xs text-journey-text/80 line-clamp-3 leading-relaxed">
                      <MarkdownRenderer content={ps.description} />
                    </div>
                  )}

                  {/* Tags */}
                  {ps.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ps.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-journey-text/5 px-2 py-0.5 text-[10px] font-medium text-journey-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-4 border-t border-journey-text/5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveProblem(ps)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-journey-accent hover:opacity-80 transition group-hover:underline"
                  >
                    View Full Details
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>

                  {isRegistrationOpen && !isFull && (
                    <Link
                      href={registerUrlFor(ps.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-journey-accent/40 px-3 py-1.5 text-xs font-bold text-journey-accent transition hover:bg-journey-accent hover:text-white active:scale-95"
                    >
                      Choose Problem <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-journey-text/10 py-12 text-center space-y-3">
          <Target className="mx-auto h-8 w-8 text-journey-muted" />
          <p className="text-sm font-bold text-journey-text/80">No matching problem statements found.</p>
          <p className="text-xs text-journey-muted max-w-sm mx-auto">
            Try adjusting your search query or reset the track filter to view all available challenges.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedDomain('ALL');
              setOnlyAvailable(false);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-journey-accent hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Open Innovation Card */}
      {allowOpenInnovation && (
        <div className="relative overflow-hidden rounded-2xl border border-journey-accent/30 bg-journey-accent/5 p-6 sm:p-7 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-journey-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-journey-accent">
                <Lightbulb className="h-3.5 w-3.5" />
                Open Innovation Track
              </div>
              <h4 className="text-lg font-bold text-journey-text">
                Have your own innovative idea or research project?
              </h4>
              <p className="text-xs sm:text-sm text-journey-text/80 leading-relaxed">
                You are not limited to predefined problem statements! Select <strong>Open Innovation</strong> during team
                registration to define your own custom problem title, track, and description. You will be assigned a unique{' '}
                <code className="text-journey-accent font-mono font-bold">OI-xxx</code> ID.
              </p>
            </div>

            {isRegistrationOpen && (
              <Link
                href={registerUrl}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-journey-accent px-5 py-3 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95"
              >
                Register Custom Idea
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Full Problem Details Modal */}
      {activeProblem && (
        <Modal
          isOpen={!!activeProblem}
          onClose={() => setActiveProblem(null)}
          title={activeProblem.title}
          icon={Target}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-journey-text/5 pb-3">
              <span className="rounded-md bg-journey-accent/10 px-3 py-1 text-xs font-mono font-bold text-journey-accent border border-journey-accent/30">
                {activeProblem.code}
              </span>
              {activeProblem.domain && (
                <span className="rounded-full bg-journey-text/5 px-3 py-1 text-xs font-bold uppercase text-journey-text/80">
                  {activeProblem.domain}
                </span>
              )}
              {activeProblem.max_teams ? (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                    activeProblem.slots_left === 0
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {activeProblem.slots_left === 0
                    ? 'All slots taken'
                    : `${activeProblem.slots_left} of ${activeProblem.max_teams} slots remaining`}
                </span>
              ) : (
                <span className="text-xs font-semibold text-journey-muted">Unlimited team registrations allowed</span>
              )}
            </div>

            {/* Problem Description with Markdown rendering */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-journey-muted">
                Detailed Problem Specification & Guidelines
              </h4>
              <div className="rounded-xl border border-journey-text/10 bg-journey-text/[0.03] p-4 sm:p-5 text-sm text-journey-text/90 leading-relaxed max-h-[50vh] overflow-y-auto">
                <MarkdownRenderer content={activeProblem.description || 'No detailed description provided.'} />
              </div>
            </div>

            {/* Tags */}
            {activeProblem.tags.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-journey-muted">Related Technologies & Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {activeProblem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-journey-text/5 px-2.5 py-1 text-xs font-semibold text-journey-text/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-journey-text/5">
              <button
                type="button"
                onClick={() => setActiveProblem(null)}
                className="px-4 py-2.5 rounded-xl border border-journey-text/10 text-xs font-bold text-journey-text/80 hover:bg-journey-text/5 transition"
              >
                Close
              </button>

              {isRegistrationOpen && activeProblem.slots_left !== 0 && (
                <Link
                  href={registerUrlFor(activeProblem.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-journey-accent px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Select this Statement in Registration
                </Link>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
