import { describe, expect, it } from 'vitest';
import type { ProblemStatement } from '@/lib/types';
import {
  ALL_TRACKS,
  DEFAULT_PROBLEM_FILTERS,
  activeFilterCount,
  applyProblemFilters,
  filterProblems,
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

  it('hides full problems when only open slots are wanted', () => {
    expect(filterProblems(sample, { ...filters, onlyAvailable: true }).map((p) => p.id)).toEqual([1, 3, 10]);
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

  it('sorts by code numerically and by most slots left with unlimited first and full last', () => {
    expect(sortProblems(sample, 'code').map((p) => p.id)).toEqual([1, 2, 3, 10]);
    expect(sortProblems(sample, 'slots').map((p) => p.id)).toEqual([1, 3, 10, 2]);
  });

  it('groups by track in the admin order, keeping each track together', () => {
    const groups = groupByTrack(sample, ['EdTech', 'Security']);
    expect(groups.map((g) => [g.domain, g.items.map((p) => p.id)])).toEqual([
      ['EdTech', [1, 10]],
      ['Security', [3]],
      ['Civic', [2]],
    ]);
  });
});

describe('URL state', () => {
  const domains = ['EdTech', 'Civic'];

  it('round-trips the filters and leaves other params alone', () => {
    const filters = { query: 'api', domain: 'Civic', onlyAvailable: true, sort: 'code' as const };
    const params = applyProblemFilters(new URLSearchParams('utm=1'), filters);
    expect(params.get('utm')).toBe('1');
    expect(parseProblemFilters(params, domains)).toEqual(filters);
  });

  it('omits defaults', () => {
    expect(applyProblemFilters(new URLSearchParams('q=old&track=Civic'), DEFAULT_PROBLEM_FILTERS).toString()).toBe('');
  });

  it('ignores unknown tracks and sorts from a stale link', () => {
    const parsed = parseProblemFilters(new URLSearchParams('track=Gone&sort=weird'), domains);
    expect(parsed.domain).toBe(ALL_TRACKS);
    expect(parsed.sort).toBe(DEFAULT_PROBLEM_FILTERS.sort);
  });

  it('counts the non-default sheet choices', () => {
    expect(activeFilterCount(DEFAULT_PROBLEM_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_PROBLEM_FILTERS, domain: 'Civic', onlyAvailable: true, sort: 'code' })).toBe(3);
  });
});
