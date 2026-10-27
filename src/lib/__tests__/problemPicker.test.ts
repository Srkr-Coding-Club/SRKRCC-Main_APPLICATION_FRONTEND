import { describe, expect, it } from 'vitest';
import { ALL_DOMAINS, domainCounts, filterEntries, slotHint, type PickerEntry } from '../problemPicker';

const entry = (over: Partial<PickerEntry>): PickerEntry => ({ id: '1', code: 'PS-01', title: 'Title', domain: '', description: '', tags: [], hint: '', disabled: false, ...over });

const entries = [
  entry({ id: '1', code: 'PS-025', title: 'Develop a real-time digital twin of a city that integrates IoT and GIS', domain: 'Smart City', tags: ['IoT', 'GIS'] }),
  entry({ id: '2', code: 'PS-026', title: 'Smart real-time monitoring and inspection mobile app', domain: 'IoT' }),
  entry({ id: '3', code: 'PS-027', title: 'Health records app that works without internet', domain: 'HealthTech', tags: ['offline'] }),
  entry({ id: '4', code: 'OI-9', title: 'No domain statement', domain: '' }),
];

describe('filterEntries', () => {
  it('returns everything for a blank query and no domain', () => {
    expect(filterEntries(entries, '')).toHaveLength(4);
    expect(filterEntries(entries, '   ')).toHaveLength(4);
  });

  it('needs every typed word to match, in any order and any case', () => {
    expect(filterEntries(entries, 'IOT twin').map((e) => e.id)).toEqual(['1']);
    expect(filterEntries(entries, 'twin iot').map((e) => e.id)).toEqual(['1']);
    expect(filterEntries(entries, 'REAL-TIME').map((e) => e.id)).toEqual(['1', '2']);
    expect(filterEntries(entries, 'twin monitoring')).toEqual([]);
  });

  it('matches the code, the domain and the tags too', () => {
    expect(filterEntries(entries, 'ps-027').map((e) => e.id)).toEqual(['3']);
    expect(filterEntries(entries, 'healthtech').map((e) => e.id)).toEqual(['3']);
    expect(filterEntries(entries, 'offline').map((e) => e.id)).toEqual(['3']);
  });

  it('treats regex characters literally instead of throwing', () => {
    expect(filterEntries(entries, '(.*')).toEqual([]);
    expect(filterEntries(entries, '[')).toEqual([]);
  });

  it('combines the domain filter with the search and ignores extra whitespace', () => {
    expect(filterEntries(entries, '', 'IoT').map((e) => e.id)).toEqual(['2']);
    expect(filterEntries(entries, '  real   time ', 'IoT').map((e) => e.id)).toEqual(['2']);
    expect(filterEntries(entries, 'health', 'IoT')).toEqual([]);
    expect(filterEntries(entries, '', ALL_DOMAINS)).toHaveLength(4);
  });
});

describe('domainCounts', () => {
  it('counts per domain in first-seen order and skips statements without one', () => {
    expect(domainCounts([...entries, entry({ id: '5', domain: 'IoT' })])).toEqual([
      { domain: 'Smart City', count: 1 }, { domain: 'IoT', count: 2 }, { domain: 'HealthTech', count: 1 },
    ]);
    expect(domainCounts([])).toEqual([]);
  });
});

describe('slotHint', () => {
  it('marks a full statement as unavailable unless the team already holds it', () => {
    expect(slotHint(0, false)).toEqual({ hint: 'Full', disabled: true });
    expect(slotHint(0, true)).toEqual({ hint: '0 left', disabled: false });
  });

  it('shows the remaining places, and nothing when uncapped', () => {
    expect(slotHint(3, false)).toEqual({ hint: '3 left', disabled: false });
    expect(slotHint(null, false)).toEqual({ hint: '', disabled: false });
  });
});
