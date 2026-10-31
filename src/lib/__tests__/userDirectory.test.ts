import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, fromSearchParams, hasActiveFilters, toQuery } from '../userDirectory';

describe('toQuery', () => {
  it('leaves out blank filters, the default order and the first page', () => {
    expect(toQuery(EMPTY_FILTERS, 'users')).toBe('');
  });

  it('writes only what is set, and the members scope for the members page', () => {
    const query = new URLSearchParams(toQuery({ ...EMPTY_FILTERS, q: 'sita rao', email: 'unverified', page: 3, ordering: 'name' }, 'members'));
    expect(Object.fromEntries(query)).toEqual({ q: 'sita rao', email: 'unverified', page: '3', ordering: 'name', scope: 'members' });
  });

  it('adds extra parameters last', () => {
    expect(new URLSearchParams(toQuery(EMPTY_FILTERS, 'users', { page_size: '100' })).get('page_size')).toBe('100');
  });
});

describe('fromSearchParams', () => {
  it('reads the filters back from an address', () => {
    expect(fromSearchParams(new URLSearchParams('q=a&role=ADMIN&member=yes&year=3&page=2&ordering=email'))).toEqual({
      ...EMPTY_FILTERS, q: 'a', role: 'ADMIN', member: 'yes', year: '3', page: 2, ordering: 'email',
    });
  });

  it('ignores a bad page, an unknown membership value and a missing order', () => {
    const filters = fromSearchParams(new URLSearchParams('page=-4&member=maybe'));
    expect(filters.page).toBe(1);
    expect(filters.member).toBe('');
    expect(filters.ordering).toBe('newest');
    expect(fromSearchParams(new URLSearchParams('page=abc')).page).toBe(1);
  });

  it('round-trips through toQuery', () => {
    const filters = { ...EMPTY_FILTERS, q: 'x', membership_status: 'ALUMNI', branch: 'CSE', page: 4 };
    expect(fromSearchParams(new URLSearchParams(toQuery(filters, 'users')))).toEqual(filters);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the page and the order alone, true for anything else', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, page: 5, ordering: 'email' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, branch: 'IT' })).toBe(true);
  });
});
