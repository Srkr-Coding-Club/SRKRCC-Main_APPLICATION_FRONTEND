import type { ProblemStatement } from '@/lib/types';

export const ALL_TRACKS = 'ALL';

/** Fewer tracks than this and section headers add noise, so the list stays flat. */
export const MIN_TRACKS_TO_GROUP = 3;

/** A track with at most this many open slots is flagged as filling up. */
export const LOW_SLOTS_THRESHOLD = 3;

export type ProblemSort = 'track' | 'code' | 'slots';

export const PROBLEM_SORT_LABELS: Record<ProblemSort, string> = {
  track: 'Track',
  code: 'Code',
  slots: 'Most slots left',
};

export interface ProblemFilters {
  query: string;
  domain: string;
  onlyAvailable: boolean;
  sort: ProblemSort;
}

export const DEFAULT_PROBLEM_FILTERS: ProblemFilters = {
  query: '',
  domain: ALL_TRACKS,
  onlyAvailable: false,
  sort: 'track',
};

export interface ProblemGroup {
  domain: string;
  items: ProblemStatement[];
}

const sameDomain = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const isProblemFull = (problem: ProblemStatement) => problem.slots_left === 0;

/** Domains in the admin's order; any the admin did not list follow alphabetically. */
export function orderDomains(problems: ProblemStatement[], domainOrder: string[] = []): string[] {
  const used = Array.from(new Set(problems.map((p) => p.domain).filter(Boolean)));
  const rank = (domain: string) => {
    const index = domainOrder.findIndex((name) => sameDomain(name, domain));
    return index === -1 ? domainOrder.length : index;
  };
  return used.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

const MARKDOWN_PATTERNS: Array<[RegExp, string]> = [
  [/```[\s\S]*?```/g, ' '],
  [/!\[([^\]]*)\]\([^)]*\)/g, '$1'],
  [/\[([^\]]+)\]\([^)]*\)/g, '$1'],
  [/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, ''],
  [/(\*\*|__|\*|_|~~|`)/g, ''],
];

/** Markdown as one plain line of text, for card previews that must not render block elements. */
export function plainSummary(markdown: string): string {
  const text = MARKDOWN_PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), markdown ?? '');
  const sentences = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => (/[\p{L}\p{N})]$/u.test(line) ? `${line}.` : line));
  return sentences.join(' ');
}

function matchesQuery(problem: ProblemStatement, rawQuery: string): boolean {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return true;
  return (
    problem.code.toLowerCase().includes(query) ||
    problem.title.toLowerCase().includes(query) ||
    problem.domain.toLowerCase().includes(query) ||
    plainSummary(problem.description).toLowerCase().includes(query) ||
    problem.tags.some((tag) => tag.toLowerCase().includes(query))
  );
}

export function filterProblems(problems: ProblemStatement[], filters: ProblemFilters): ProblemStatement[] {
  return problems.filter((problem) => {
    if (filters.domain !== ALL_TRACKS && !sameDomain(problem.domain, filters.domain)) return false;
    if (filters.onlyAvailable && isProblemFull(problem)) return false;
    return matchesQuery(problem, filters.query);
  });
}

const slotsRank = (problem: ProblemStatement) => (problem.slots_left === null ? Number.POSITIVE_INFINITY : problem.slots_left);

export function sortProblems(
  problems: ProblemStatement[],
  sort: ProblemSort,
  domainOrder: string[] = [],
): ProblemStatement[] {
  const byCode = (a: ProblemStatement, b: ProblemStatement) => a.code.localeCompare(b.code, undefined, { numeric: true });
  if (sort === 'code') return [...problems].sort(byCode);
  if (sort === 'slots') return [...problems].sort((a, b) => slotsRank(b) - slotsRank(a) || byCode(a, b));
  const order = orderDomains(problems, domainOrder);
  const rank = (problem: ProblemStatement) => order.findIndex((domain) => sameDomain(domain, problem.domain));
  return [...problems].sort((a, b) => rank(a) - rank(b) || a.order - b.order || byCode(a, b));
}

export function groupByTrack(problems: ProblemStatement[], domainOrder: string[] = []): ProblemGroup[] {
  const sorted = sortProblems(problems, 'track', domainOrder);
  const groups: ProblemGroup[] = [];
  for (const problem of sorted) {
    const last = groups[groups.length - 1];
    if (last && sameDomain(last.domain, problem.domain)) last.items.push(problem);
    else groups.push({ domain: problem.domain, items: [problem] });
  }
  return groups;
}

/** Number of non-default choices made in the filter sheet (the search box shows its own state). */
export function activeFilterCount(filters: ProblemFilters): number {
  return (
    (filters.domain !== ALL_TRACKS ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0) +
    (filters.sort !== DEFAULT_PROBLEM_FILTERS.sort ? 1 : 0)
  );
}

const isSort = (value: string | null): value is ProblemSort => value === 'track' || value === 'code' || value === 'slots';

/** Reads filters from a query string; unknown tracks fall back to all so a stale link never shows an empty list. */
export function parseProblemFilters(params: URLSearchParams, knownDomains: string[]): ProblemFilters {
  const track = params.get('track');
  const sort = params.get('sort');
  const domain = track && knownDomains.find((name) => sameDomain(name, track));
  return {
    query: params.get('q')?.slice(0, 100) ?? '',
    domain: domain || ALL_TRACKS,
    onlyAvailable: params.get('open') === '1',
    sort: isSort(sort) ? sort : DEFAULT_PROBLEM_FILTERS.sort,
  };
}

/** Writes the filters onto a copy of `base`, leaving unrelated params alone and omitting defaults. */
export function applyProblemFilters(base: URLSearchParams, filters: ProblemFilters): URLSearchParams {
  const params = new URLSearchParams(base);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set('q', filters.query.trim() || null);
  set('track', filters.domain !== ALL_TRACKS ? filters.domain : null);
  set('open', filters.onlyAvailable ? '1' : null);
  set('sort', filters.sort !== DEFAULT_PROBLEM_FILTERS.sort ? filters.sort : null);
  return params;
}
