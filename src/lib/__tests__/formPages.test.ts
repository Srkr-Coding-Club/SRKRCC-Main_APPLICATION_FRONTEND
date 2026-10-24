import { describe, expect, it } from 'vitest';
import { computeLayout } from '../formConditional';
import { nextReachable, pageIndexByField, pageProgress, previousReachable, reachablePages, settlePage } from '../formPages';
import type { FormField } from '../types';

const q = (id: number, over: Partial<FormField> = {}): FormField => ({
  id, label: `Q${id}`, type: 'TEXT', is_required: false, order: id, ...over,
});

const route = (action: string, value: any, field: number, expected: string) => ({
  logic: 'AND', action, ...(value === undefined ? {} : { action_value: value }),
  rules: [{ field, operator: 'equals', value: expected }],
});

// page 0: Q1 | page 1: break 2, Q3 | page 2: break 4, Q5 | page 3: break 6, Q7
const fields: FormField[] = [
  q(1, { type: 'RADIO', options: ['a', 'b', 'end'] }),
  q(2, { type: 'PAGE_BREAK', conditional_logic: route('skip_to_section', 6, 1, 'b') }),
  q(3),
  q(4, { type: 'PAGE_BREAK' }),
  q(5),
  q(6, { type: 'PAGE_BREAK', conditional_logic: route('end_form', undefined, 1, 'end') }),
  q(7),
];

describe('page navigation', () => {
  it('splits the form into pages headed by their page break', () => {
    const layout = computeLayout(fields, {});
    expect(layout.pages).toEqual([['1'], ['2', '3'], ['4', '5'], ['6', '7']]);
    expect([...pageIndexByField(layout)]).toContainEqual(['5', 2]);
  });

  it('visits every page in order when nothing routes', () => {
    const layout = computeLayout(fields, { '1': 'a' });
    expect(reachablePages(layout)).toEqual([0, 1, 2, 3]);
    expect(nextReachable(layout, 0)).toBe(1);
    expect(nextReachable(layout, 3)).toBeNull();
    expect(previousReachable(layout, 2)).toBe(1);
    expect(previousReachable(layout, 0)).toBeNull();
    expect(pageProgress(layout, 2)).toEqual({ number: 3, total: 4 });
  });

  it('steps over pages a route skips, in both directions, and counts only the pages left', () => {
    const layout = computeLayout(fields, { '1': 'b' });
    expect(reachablePages(layout)).toEqual([0, 3]);
    expect(nextReachable(layout, 0)).toBe(3);
    expect(previousReachable(layout, 3)).toBe(0);
    expect(pageProgress(layout, 3)).toEqual({ number: 2, total: 2 });
  });

  it('ends the form where end_form routes', () => {
    const layout = computeLayout(fields, { '1': 'end' });
    expect(reachablePages(layout)).toEqual([0, 1, 2]);
    expect(nextReachable(layout, 2)).toBeNull();
  });

  it('moves a wanted page that is no longer reachable to the next one that is', () => {
    const layout = computeLayout(fields, { '1': 'b' });
    expect(settlePage(layout, 1)).toBe(3);
    expect(settlePage(layout, 3)).toBe(3);
    expect(settlePage(layout, 9)).toBe(3);
    expect(settlePage(layout, 0)).toBe(0);
  });

  it('treats a form without page breaks as a single page', () => {
    const layout = computeLayout([q(1), q(2)], {});
    expect(layout.pages).toEqual([['1', '2']]);
    expect(reachablePages(layout)).toEqual([0]);
    expect(nextReachable(layout, 0)).toBeNull();
    expect(pageProgress(layout, 0)).toEqual({ number: 1, total: 1 });
  });

  it('orders pages by the questions\' display order, not the array order', () => {
    const shuffled = [fields[3], fields[0], fields[2], fields[1], fields[6], fields[4], fields[5]];
    expect(computeLayout(shuffled, {}).pages).toEqual([['1'], ['2', '3'], ['4', '5'], ['6', '7']]);
  });

  it('hides the questions on skipped pages', () => {
    const layout = computeLayout(fields, { '1': 'b' });
    expect([...layout.visible].sort()).toEqual(['1', '6', '7']);
  });
});
