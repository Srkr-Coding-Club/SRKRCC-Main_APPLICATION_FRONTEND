import { describe, expect, it } from 'vitest';
import type { ProblemStatement } from '@/lib/types';
import {
  ALL_TRACKS,
  DEFAULT_PROBLEM_FILTERS,
  DEFAULT_SORT_DIRECTION,
  applyProblemFilters,
  filterProblems,
  findProblem,
  groupByTrack,
  orderDomains,
  parseProblemFilters,
  plainSummary,
  sortProblems,
} from '../problemStatements';

const ps = (id: number, over: Partial<ProblemStatement> = {}): ProblemStatement => ({
  id,
  code: `PS-${String(id).padStart(3, '0')}`,
  title: `Problem ${id}`,
  description: `Description ${id}`,
  domain: 'EdTech',
  tags: [],
  max_teams: null,
  is_active: true,
  order: id,
  team_count: 0,
  slots_left: null,
  ...over,
});

const sample = [
  ps(1, { domain: 'EdTech', tags: ['vision'] }),
  ps(2, { domain: 'Civic', max_teams: 2, slots_left: 0 }),
  ps(3, { domain: 'Security', max_teams: 5, slots_left: 4 }),
  ps(10, { domain: 'EdTech', max_teams: 3, slots_left: 1, title: 'Credential locker' }),
];

describe('plainSummary', () => {
  it('flattens markdown into one line of text', () => {
    expect(plainSummary('# Title\n\n**Bold** and [a link](http://x.y) with `code`\n- item one\n- item two')).toBe(
      'Title. Bold and a link with code. item one. item two.',
    );
  });

  it('drops fenced code blocks and keeps image alt text', () => {
    expect(plainSummary('before ```js\nconst a = 1;\n``` after ![diagram](x.png)')).toBe('before after diagram.');
  });
});

describe('filterProblems', () => {
  const filters = DEFAULT_PROBLEM_FILTERS;

  it('filters by track, ignoring case', () => {
    expect(filterProblems(sample, { ...filters, domain: 'edtech' }).map((p) => p.id)).toEqual([1, 10]);
  });

  it('searches code, title, tags and the plain description', () => {
    expect(filterProblems(sample, { ...filters, query: 'ps-003' }).map((p) => p.id)).toEqual([3]);
    expect(filterProblems(sample, { ...filters, query: 'locker' }).map((p) => p.id)).toEqual([10]);
    expect(filterProblems(sample, { ...filters, query: 'VISION' }).map((p) => p.id)).toEqual([1]);
    expect(filterProblems(sample, { ...filters, query: 'description 2' }).map((p) => p.id)).toEqual([2]);
  });
});

describe('ordering', () => {
  it('orders tracks by the admin list, then alphabetically', () => {
    expect(orderDomains(sample, ['Security'])).toEqual(['Security', 'Civic', 'EdTech']);
  });

  it('sorts by code numerically, in either direction', () => {
    expect(sortProblems(sample, 'code', 'asc').map((p) => p.id)).toEqual([1, 2, 3, 10]);
    expect(sortProblems(sample, 'code', 'desc').map((p) => p.id)).toEqual([10, 3, 2, 1]);
  });

  it('sorts by title regardless of case', () => {
    expect(sortProblems(sample, 'title', 'asc').map((p) => p.id)).toEqual([10, 1, 2, 3]);
  });

  it('sorts by track in the admin order, keeping each track together', () => {
    expect(sortProblems(sample, 'track', 'asc', ['EdTech', 'Security']).map((p) => p.id)).toEqual([1, 10, 3, 2]);
    expect(sortProblems(sample, 'track', 'desc', ['EdTech', 'Security']).map((p) => p.id)).toEqual([2, 3, 10, 1]);
  });

  it('keeps equal rows in code order whichever way the column runs', () => {
    const tied = [ps(5, { title: 'Same' }), ps(4, { title: 'Same' }), ps(6, { title: 'Same' })];
    expect(sortProblems(tied, 'title', 'asc').map((p) => p.id)).toEqual([4, 5, 6]);
    expect(sortProblems(tied, 'title', 'desc').map((p) => p.id)).toEqual([4, 5, 6]);
  });

  it('groups a track-sorted list into one group per track, without reordering', () => {
    const groups = groupByTrack(sortProblems(sample, 'track', 'asc', ['EdTech', 'Security']));
    expect(groups.map((g) => [g.domain, g.items.map((p) => p.id)])).toEqual([
      ['EdTech', [1, 10]],
      ['Security', [3]],
      ['Civic', [2]],
    ]);
  });

  it('does not change the list it is given', () => {
    const before = sample.map((p) => p.id);
    sortProblems(sample, 'code', 'desc');
    expect(sample.map((p) => p.id)).toEqual(before);
  });

  it('starts every order A to Z', () => {
    expect(DEFAULT_SORT_DIRECTION).toEqual({ track: 'asc', code: 'asc', title: 'asc' });
  });
});

describe('URL state', () => {
  const domains = ['EdTech', 'Civic'];

  it('round-trips the filters and leaves other params alone', () => {
    const filters = { query: 'api', domain: 'Civic', sort: 'code' as const, dir: 'desc' as const };
    const params = applyProblemFilters(new URLSearchParams('utm=1'), filters);
    expect(params.get('utm')).toBe('1');
    expect(parseProblemFilters(params, domains)).toEqual(filters);
  });

  it('omits defaults, including the default direction of each column', () => {
    expect(applyProblemFilters(new URLSearchParams('q=old&track=Civic&dir=desc'), DEFAULT_PROBLEM_FILTERS).toString()).toBe('');
    const title = applyProblemFilters(new URLSearchParams(), { ...DEFAULT_PROBLEM_FILTERS, sort: 'title' });
    expect(title.toString()).toBe('sort=title');
  });

  it('ignores unknown tracks, sorts and directions from a stale link', () => {
    const parsed = parseProblemFilters(new URLSearchParams('track=Gone&sort=weird&dir=sideways'), domains);
    expect(parsed.domain).toBe(ALL_TRACKS);
    expect(parsed.sort).toBe(DEFAULT_PROBLEM_FILTERS.sort);
    expect(parsed.dir).toBe(DEFAULT_PROBLEM_FILTERS.dir);
  });

  it('uses the default direction of the column when the link names none', () => {
    expect(parseProblemFilters(new URLSearchParams('sort=title'), domains).dir).toBe('asc');
  });

  it('no longer reads or writes an open-slots filter', () => {
    expect(applyProblemFilters(new URLSearchParams('open=1'), DEFAULT_PROBLEM_FILTERS).get('open')).toBe('1');
    expect(parseProblemFilters(new URLSearchParams('open=1'), domains)).toEqual(DEFAULT_PROBLEM_FILTERS);
  });
});

describe('findProblem', () => {
  it('finds a problem by code in any case, or by id', () => {
    expect(findProblem(sample, 'ps-003')?.id).toBe(3);
    expect(findProblem(sample, 'PS-010')?.id).toBe(10);
    expect(findProblem(sample, '2')?.id).toBe(2);
  });

  it('returns nothing for a missing or unknown reference', () => {
    expect(findProblem(sample, null)).toBeNull();
    expect(findProblem(sample, '  ')).toBeNull();
    expect(findProblem(sample, 'PS-999')).toBeNull();
  });
});
