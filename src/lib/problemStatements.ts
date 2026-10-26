import type { ProblemStatement } from '@/lib/types';

export const ALL_TRACKS = 'ALL';

/** Fewer tracks than this and section headings add noise, so the list stays flat. */
export const MIN_TRACKS_TO_GROUP = 3;

/** Cards shown at first, and added by each "Show more". */
export const PROBLEM_PAGE_SIZE = 25;

export type ProblemSort = 'track' | 'code' | 'title';
export type SortDirection = 'asc' | 'desc';

export const PROBLEM_SORT_LABELS: Record<ProblemSort, string> = {
  track: 'Track',
  code: 'Code',
  title: 'Title',
};

/** Every order starts A to Z (or lowest first). */
export const DEFAULT_SORT_DIRECTION: Record<ProblemSort, SortDirection> = {
  track: 'asc',
  code: 'asc',
  title: 'asc',
};

export interface ProblemFilters {
  query: string;
  domain: string;
  sort: ProblemSort;
  dir: SortDirection;
}

export const DEFAULT_PROBLEM_FILTERS: ProblemFilters = {
  query: '',
  domain: ALL_TRACKS,
  sort: 'track',
  dir: DEFAULT_SORT_DIRECTION.track,
};

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

/** Markdown as one plain line of text, for previews that must not render block elements. */
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
    return matchesQuery(problem, filters.query);
  });
}

const byCode = (a: ProblemStatement, b: ProblemStatement) => a.code.localeCompare(b.code, undefined, { numeric: true });

export function sortProblems(
  problems: ProblemStatement[],
  sort: ProblemSort,
  dir: SortDirection,
  domainOrder: string[] = [],
): ProblemStatement[] {
  const order = orderDomains(problems, domainOrder);
  const trackRank = (problem: ProblemStatement) => order.findIndex((domain) => sameDomain(domain, problem.domain));
  const primary = (a: ProblemStatement, b: ProblemStatement) => {
    if (sort === 'code') return byCode(a, b);
    if (sort === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    return trackRank(a) - trackRank(b) || a.order - b.order;
  };
  // Only the chosen column flips with the direction; ties always fall back to code order.
  const sign = dir === 'asc' ? 1 : -1;
  return [...problems].sort((a, b) => {
    const diff = primary(a, b);
    return diff !== 0 ? sign * diff : byCode(a, b);
  });
}

export interface ProblemGroup {
  domain: string;
  items: ProblemStatement[];
}

/** Splits a list already sorted by track into one group per run of the same track; it never reorders. */
export function groupByTrack(sorted: ProblemStatement[]): ProblemGroup[] {
  const groups: ProblemGroup[] = [];
  for (const problem of sorted) {
    const last = groups[groups.length - 1];
    if (last && sameDomain(last.domain, problem.domain)) last.items.push(problem);
    else groups.push({ domain: problem.domain, items: [problem] });
  }
  return groups;
}

/** Finds the problem a shared link points at: by code (PS-014, any case) or by id. */
export function findProblem(problems: ProblemStatement[], ref: string | null): ProblemStatement | null {
  const wanted = ref?.trim().toLowerCase();
  if (!wanted) return null;
  return problems.find((problem) => problem.code.toLowerCase() === wanted || String(problem.id) === wanted) ?? null;
}

const isSort = (value: string | null): value is ProblemSort => value !== null && value in PROBLEM_SORT_LABELS;

/** Reads filters from a query string; unknown tracks fall back to all so a stale link never shows an empty list. */
export function parseProblemFilters(params: URLSearchParams, knownDomains: string[]): ProblemFilters {
  const track = params.get('track');
  const sortParam = params.get('sort');
  const sort = isSort(sortParam) ? sortParam : DEFAULT_PROBLEM_FILTERS.sort;
  const dirParam = params.get('dir');
  const domain = track && knownDomains.find((name) => sameDomain(name, track));
  return {
    query: params.get('q')?.slice(0, 100) ?? '',
    domain: domain || ALL_TRACKS,
    sort,
    dir: dirParam === 'asc' || dirParam === 'desc' ? dirParam : DEFAULT_SORT_DIRECTION[sort],
  };
}

/** Writes the filters onto a copy of `base`, leaving unrelated params alone and omitting defaults. */
export function applyProblemFilters(base: URLSearchParams, filters: ProblemFilters): URLSearchParams {
  const params = new URLSearchParams(base);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set('q', filters.query.trim() || null);
  set('track', filters.domain !== ALL_TRACKS ? filters.domain : null);
  set('sort', filters.sort !== DEFAULT_PROBLEM_FILTERS.sort ? filters.sort : null);
  set('dir', filters.dir !== DEFAULT_SORT_DIRECTION[filters.sort] ? filters.dir : null);
  return params;
}
