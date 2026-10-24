/**
 * Which condition operators make sense for which kind of question, and what kind of value each one
 * takes. Mirrors `_OPERATOR_TARGETS` in the backend's definition checks
 * (apps/forms/validation/definition.py), which refuses a mismatched rule when the form is published.
 */

import type { FieldType } from './types';

export const OPERATOR_LABELS: Record<string, string> = {
  equals: 'is',
  not_equals: 'is not',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  between: 'is between',
  not_between: 'is not between',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  matches_regex: 'matches pattern',
  not_matches_regex: 'does not match pattern',
  is_empty: 'is empty',
  is_not_empty: 'is answered',
  selected: 'has selected',
  not_selected: 'has not selected',
  includes: 'includes',
  not_includes: 'does not include',
  includes_any: 'includes any of',
  includes_all: 'includes all of',
  before: 'is before',
  after: 'is after',
  on: 'is on',
  before_or_equal: 'is on or before',
  after_or_equal: 'is on or after',
  date_between: 'is between dates',
};

const UNIVERSAL = ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
const NUMERIC = ['gt', 'gte', 'lt', 'lte', 'between', 'not_between'];
const TEXT = ['contains', 'not_contains', 'starts_with', 'ends_with', 'matches_regex', 'not_matches_regex'];
const SELECTION = ['selected', 'not_selected', 'includes', 'not_includes', 'includes_any', 'includes_all'];
const DATE = ['before', 'after', 'on', 'before_or_equal', 'after_or_equal', 'date_between'];

const NUMERIC_TYPES: FieldType[] = ['NUMBER', 'RATING', 'LINEAR_SCALE', 'CALCULATED', 'DATE', 'TIME', 'RADIO', 'DROPDOWN'];
const TEXT_TYPES: FieldType[] = ['TEXT', 'PARAGRAPH', 'EMAIL', 'PHONE', 'URL', 'CLUB_ID', 'HIDDEN', 'RADIO', 'DROPDOWN', 'CHECKBOX'];
const SELECTION_TYPES: FieldType[] = ['CHECKBOX', 'RADIO', 'DROPDOWN'];
const DATE_TYPES: FieldType[] = ['DATE'];

/** Operators offered for a rule that watches a question of this type, in a sensible order. */
export function operatorsFor(type: FieldType | undefined): string[] {
  if (!type) return UNIVERSAL;
  return [
    ...UNIVERSAL.slice(0, 2),
    ...(SELECTION_TYPES.includes(type) ? SELECTION : []),
    ...(NUMERIC_TYPES.includes(type) ? NUMERIC : []),
    ...(DATE_TYPES.includes(type) ? DATE : []),
    ...(TEXT_TYPES.includes(type) ? TEXT : []),
    ...UNIVERSAL.slice(2),
  ];
}

export type ValueKind = 'none' | 'single' | 'range' | 'list';

export function operatorValueKind(operator: string): ValueKind {
  if (operator === 'is_empty' || operator === 'is_not_empty') return 'none';
  if (operator === 'between' || operator === 'not_between' || operator === 'date_between') return 'range';
  if (operator === 'includes_any' || operator === 'includes_all') return 'list';
  return 'single';
}

export const CHOICE_TYPES: FieldType[] = ['RADIO', 'DROPDOWN', 'CHECKBOX'];

function toParts(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? '').split(',').map((p) => p.trim()).filter(Boolean);
}

/** What is still missing from a rule before the form can be published, or null when it is complete. */
export function ruleProblem(
  rule: { field: unknown; operator: string; value?: unknown; value_field?: unknown },
): string | null {
  if (rule.field === null || rule.field === undefined || rule.field === '') return 'Pick a question to watch.';
  const kind = operatorValueKind(rule.operator);
  if (kind === 'none') return null;
  if (rule.value_field !== undefined && rule.value_field !== null && rule.value_field !== '') return null;
  const parts = toParts(rule.value);
  if (kind === 'range') return parts.length === 2 ? null : 'Needs a start and an end value.';
  if (kind === 'list') return parts.length ? null : 'Pick at least one option.';
  return parts.length || (typeof rule.value === 'number') ? null : 'Needs a value to compare with.';
}
