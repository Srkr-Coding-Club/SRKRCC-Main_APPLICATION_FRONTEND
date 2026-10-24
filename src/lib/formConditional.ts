/**
 * Client-side mirror of the backend conditional engine
 * (`apps/forms/validation/conditional.py` + `schema.py`).
 *
 * Used by the public form renderer to decide which fields are visible/required
 * and by the builder's live preview. The backend re-computes all of this on
 * submit - this is purely for UX (don't show, don't validate, don't submit a
 * field the condition hides).
 */

import { FormField } from './types';

// ---------------------------------------------------------------------------
// Normalizer - accepts every shape the backend accepts
// ---------------------------------------------------------------------------

const OPERATOR_ALIASES: Record<string, string> = {
  greater_than: 'gt', greater_than_or_equal: 'gte',
  less_than: 'lt', less_than_or_equal: 'lte',
  eq: 'equals', ne: 'not_equals', neq: 'not_equals',
  '==': 'equals', '!=': 'not_equals', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte',
};

// set_value / restrict_options are also enforced by the server on submit; display_message is UI only.
// skip_to_section / end_form route between pages and only mean something on a PAGE_BREAK.
const ENFORCED_ACTIONS = new Set([
  'show', 'hide', 'require', 'optional', 'set_value', 'restrict_options', 'display_message',
  'skip_to_section', 'end_form',
]);
const ROUTING_ACTIONS = new Set(['skip_to_section', 'end_form']);
// Stored for old forms, but nothing acts on it.
const DEFERRED_ACTIONS = new Set(['skip']);

/** `value_field`: compare against another question's answer instead of a fixed `value`. */
export interface NLeaf { field: number | string | null; operator: string; value: any; value_field?: number | string; }
export interface NGroup { logic: 'AND' | 'OR'; rules: (NLeaf | NGroup)[]; }
/** `action_value`: what set_value stores, which options restrict_options allows, or the display_message text. */
export interface NConditional extends NGroup { action: string; action_value?: any; }

function coerceRef(raw: any): number | string | null {
  const n = Number(raw);
  if (Number.isInteger(n)) return n;
  // The old builder's unfinished-rule placeholder: "no field chosen yet", never a real reference.
  if (typeof raw === 'string' && raw.trim().toLowerCase() === 'parent') return null;
  // Other non-numeric ids only exist for unsaved questions in the builder's live preview.
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

function normalizeNode(node: any): NLeaf | NGroup | null {
  if (!node || typeof node !== 'object') return null;

  if (Array.isArray(node.rules)) {
    const sub = node.rules.map(normalizeNode).filter(Boolean) as (NLeaf | NGroup)[];
    if (!sub.length) return null;
    return { logic: (String(node.logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND'), rules: sub };
  }

  const refRaw = node.field ?? node.if;
  const field = coerceRef(refRaw);

  let operator: string;
  let value: any;
  if ('equals' in node && !('operator' in node)) {
    operator = 'equals';
    value = node.equals;
  } else {
    operator = String(node.operator ?? 'equals').trim().toLowerCase();
    operator = OPERATOR_ALIASES[operator] ?? operator;
    value = node.value;
  }
  const leaf: NLeaf = { field, operator, value };
  if (node.value_field !== undefined && node.value_field !== null && node.value_field !== '') {
    const valueField = coerceRef(node.value_field);
    if (valueField !== null) leaf.value_field = valueField;
  }
  return leaf;
}

function withActionValue(out: NConditional, raw: any): NConditional {
  if (raw.action_value !== undefined && raw.action_value !== null) out.action_value = raw.action_value;
  return out;
}

export function normalizeConditional(raw: any): NConditional | null {
  if (!raw || typeof raw !== 'object') return null;

  let action = String(raw.action ?? 'show').trim().toLowerCase() || 'show';
  if (!ENFORCED_ACTIONS.has(action) && !DEFERRED_ACTIONS.has(action)) action = 'show';

  if (Array.isArray(raw.rules)) {
    const rules = raw.rules.map(normalizeNode).filter(Boolean) as (NLeaf | NGroup)[];
    if (!rules.length) return null;
    const logic = String(raw.logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
    return withActionValue({ logic, rules, action }, raw);
  }

  const leaf = normalizeNode(raw);
  if (!leaf || 'rules' in leaf) return null;
  if (leaf.field === null && (leaf as NLeaf).operator === 'equals' && (raw.field ?? raw.if) === undefined) {
    return null; // genuinely no condition
  }
  return withActionValue({ logic: 'AND', rules: [leaf], action }, raw);
}

// ---------------------------------------------------------------------------
// Operators (mirror conditional.evaluate_operator)
// ---------------------------------------------------------------------------

const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const GROUPED_NUMBER = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;

// Mirrors values.parse_number: plain decimals (or well-formed 1,234 groups) only - no hex, no
// NaN/Infinity, nothing huge or over-precise - so both engines call the same things numbers.
export function asNum(v: any): number | null {
  if (typeof v === 'boolean') return null;
  let t = typeof v === 'number' ? String(v) : String(v ?? '').trim();
  if (t === '' || t.length > 64) return null;
  if (t.includes(',')) {
    if (!GROUPED_NUMBER.test(t)) return null;
    t = t.replace(/,/g, '');
  }
  if (!PLAIN_NUMBER.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || Math.abs(n) >= 1e31) return null;
  if (!Number.isInteger(n)) {
    const [whole, fraction = ''] = t.replace(/^[+-]/, '').split(/e/i)[0].split('.');
    if (fraction.length > 15 || (whole.replace(/^0+/, '') + fraction).length > 15) return null;
  }
  return n;
}

// Mirrors values.parse_date: a real YYYY-MM-DD, optionally followed by a time of day (ignored).
function asDate(v: any): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(String(v ?? '').trim());
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(year, month - 1, day);
  const d = new Date(t);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? t : null;
}
function asList(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return [v];
}
function s(v: any): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
function pair(a: any, b: any): [any, any] {
  const an = asNum(a), bn = asNum(b);
  if (an !== null && bn !== null) return [an, bn];
  const ad = asDate(a), bd = asDate(b);
  if (ad !== null && bd !== null) return [ad, bd];
  return [s(a).trim().toLowerCase(), s(b).trim().toLowerCase()];
}

export function evaluateOperator(op: string, left: any, right: any): boolean {
  try {
    switch (op) {
      case 'equals': { const [l, r] = pair(left, right); return l === r; }
      case 'not_equals': { const [l, r] = pair(left, right); return l !== r; }
      case 'gt': { const [l, r] = pair(left, right); return l > r; }
      case 'gte': { const [l, r] = pair(left, right); return l >= r; }
      case 'lt': { const [l, r] = pair(left, right); return l < r; }
      case 'lte': { const [l, r] = pair(left, right); return l <= r; }
      case 'between':
      case 'not_between':
      case 'date_between': {
        const bounds = Array.isArray(right) ? right : s(right).split(',');
        if (bounds.length < 2) return false;
        const [lv] = pair(left, bounds[0]);
        const [, lo] = pair(left, bounds[0]);
        const [, hi] = pair(left, bounds[1]);
        const inside = lo <= lv && lv <= hi;
        return op === 'not_between' ? !inside : inside;
      }
      case 'contains': return s(left).toLowerCase().includes(s(right).toLowerCase());
      case 'not_contains': return !s(left).toLowerCase().includes(s(right).toLowerCase());
      case 'starts_with': return s(left).toLowerCase().startsWith(s(right).toLowerCase());
      case 'ends_with': return s(left).toLowerCase().endsWith(s(right).toLowerCase());
      case 'matches_regex': try { return new RegExp(s(right)).test(s(left)); } catch { return false; }
      case 'not_matches_regex': try { return !new RegExp(s(right)).test(s(left)); } catch { return false; }
      case 'is_empty': return isEmpty(left);
      case 'is_not_empty': return !isEmpty(left);
      case 'selected':
      case 'includes':
        return new Set(asList(left).map((x) => s(x).trim().toLowerCase())).has(s(right).trim().toLowerCase());
      case 'not_selected':
      case 'not_includes':
        return !new Set(asList(left).map((x) => s(x).trim().toLowerCase())).has(s(right).trim().toLowerCase());
      case 'includes_any': {
        const have = new Set(asList(left).map((x) => s(x).trim().toLowerCase()));
        return asList(right).some((x) => have.has(s(x).trim().toLowerCase()));
      }
      case 'includes_all': {
        const have = new Set(asList(left).map((x) => s(x).trim().toLowerCase()));
        return asList(right).every((x) => have.has(s(x).trim().toLowerCase()));
      }
      case 'before': { const l = asDate(left), r = asDate(right); return l !== null && r !== null && l < r; }
      case 'after': { const l = asDate(left), r = asDate(right); return l !== null && r !== null && l > r; }
      case 'on': { const l = asDate(left), r = asDate(right); return l !== null && r !== null && l === r; }
      case 'before_or_equal': { const l = asDate(left), r = asDate(right); return l !== null && r !== null && l <= r; }
      case 'after_or_equal': { const l = asDate(left), r = asDate(right); return l !== null && r !== null && l >= r; }
      default: return false;
    }
  } catch {
    return false;
  }
}

export function isEmpty(value: any): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// ---------------------------------------------------------------------------
// Tree evaluation + layout
// ---------------------------------------------------------------------------

// Operators that are meaningful (and may be true) even when the trigger field
// is still blank. Every other operator can only fire once the field is answered
// - so a `show`/`require` rule stays dormant until the user actually picks a
// value, instead of appearing on first render.
const EMPTY_OK_OPERATORS = new Set(['is_empty', 'is_not_empty']);

function evalNode(node: NLeaf | NGroup, values: Map<number | string, any>): boolean | null {
  if ('rules' in node) {
    const results = node.rules.map((r) => evalNode(r, values)).filter((r): r is boolean => r !== null);
    if (!results.length) return null;
    return node.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }
  if (node.field === null) return null; // broken {if:"parent"} placeholder - ignore
  const left = values.get(node.field);
  if (isEmpty(left) && !EMPTY_OK_OPERATORS.has(node.operator)) return false;
  let right = node.value;
  if (node.value_field !== undefined) {
    // Compare against another answer; dormant until that one is answered too.
    right = values.get(node.value_field);
    if (isEmpty(right) && !EMPTY_OK_OPERATORS.has(node.operator)) return false;
  }
  return evaluateOperator(node.operator, left, right);
}

export interface Layout {
  visible: Set<string>;
  requiredOverrides: Map<string, boolean>;
  /** set_value: question id -> the answer a condition assigns to it. */
  setValues: Map<string, any>;
  /** restrict_options: question id -> the only options currently allowed. */
  allowedOptions: Map<string, string[]>;
  /** display_message: question id -> the note to show. */
  messages: Map<string, string>;
  /** Question ids per page. A PAGE_BREAK heads the page it starts; page 0 has no break. */
  pages: string[][];
  /** Indexes of the pages that routing skips given the answers so far. */
  skippedPages: Set<number>;
}

/** Fields in display order (stable for equal `order`), without deleted ones. */
function inDisplayOrder(fields: FormField[]): FormField[] {
  return fields
    .filter((f) => !f.is_deleted)
    .map((f, index) => ({ f, index }))
    .sort((a, b) => (Number(a.f.order) || 0) - (Number(b.f.order) || 0) || a.index - b.index)
    .map(({ f }) => f);
}

export function splitPages(fields: FormField[]): string[][] {
  const pages: string[][] = [[]];
  for (const f of inDisplayOrder(fields)) {
    if (f.type === 'PAGE_BREAK') pages.push([String(f.id)]);
    else pages[pages.length - 1].push(String(f.id));
  }
  return pages;
}

/**
 * Walk the pages from the start. Leaving a page, the PAGE_BREAK that starts the next one may route:
 * `skip_to_section` jumps ahead to a later PAGE_BREAK, `end_form` ends the form there. A rule that
 * cannot be evaluated never routes. Only answers on reachable pages count.
 */
function skippedPagesFor(
  pages: string[][],
  norm: Map<string, NConditional>,
  visible: Set<string>,
  values: Map<number | string, any>,
): Set<number> {
  const breakPage = new Map<string, number>();
  pages.forEach((page, index) => { if (index > 0) breakPage.set(page[0], index); });
  const effective = new Map<number | string, any>();
  for (const [k, v] of values) if (visible.has(String(k))) effective.set(k, v);

  const skipped = new Set<number>();
  let current = 0;
  while (current < pages.length - 1) {
    let following = current + 1;
    const n = norm.get(pages[following][0]);
    if (n && ROUTING_ACTIONS.has(n.action) && evalNode(n, effective) === true) {
      if (n.action === 'end_form') {
        for (let p = following; p < pages.length; p++) skipped.add(p);
        break;
      }
      const target = breakPage.get(String(Number.parseInt(String(n.action_value), 10)));
      if (target !== undefined && target > following) {
        for (let p = following; p < target; p++) skipped.add(p);
        following = target;
      }
    }
    current = following;
  }
  return skipped;
}

/**
 * `valuesByStrId` - the form's current answers keyed by String(field.id).
 * Returns which fields are visible, any require/optional overrides, the values and notes conditions
 * produce, and which pages routing skips. Mirrors `compute_layout` on the server.
 */
export function computeLayout(fields: FormField[], valuesByStrId: Record<string, any>): Layout {
  const active = inDisplayOrder(fields);
  const norm = new Map<string, NConditional>();
  for (const f of active) {
    const n = normalizeConditional(f.conditional_logic);
    if (n) norm.set(String(f.id), n);
  }

  const currentValues = new Map<number | string, any>();
  for (const f of active) {
    const v = valuesByStrId[String(f.id)];
    const n = Number(f.id);
    currentValues.set(Number.isInteger(n) ? n : String(f.id), v);
  }

  const pages = splitPages(fields);
  let skippedPages = new Set<number>();
  let visible = new Set<string>();
  let overrides = new Map<string, boolean>();

  for (let routePass = 0; routePass <= pages.length; routePass++) {
    const forcedHidden = new Set<string>();
    skippedPages.forEach((index) => pages[index].forEach((id) => forcedHidden.add(id)));
    visible = new Set<string>(active.map((f) => String(f.id)).filter((id) => !forcedHidden.has(id)));
    overrides = new Map<string, boolean>();

    const maxPasses = active.length + 1;
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;
      const effective = new Map<number | string, any>();
      for (const [k, v] of currentValues) {
        // Only visible fields feed conditions.
        if (visible.has(String(k))) effective.set(k, v);
      }

      for (const f of active) {
        const key = String(f.id);
        const n = norm.get(key);
        if (!n || forcedHidden.has(key)) continue;
        const satisfied = evalNode(n, effective);
        const truth = satisfied === null ? true : satisfied;
        const action = n.action;

        if (action === 'show') {
          if (truth && !visible.has(key)) { visible.add(key); changed = true; }
          else if (!truth && visible.has(key)) { visible.delete(key); changed = true; }
        } else if (action === 'hide') {
          if (truth && visible.has(key)) { visible.delete(key); changed = true; }
          else if (!truth && !visible.has(key)) { visible.add(key); changed = true; }
        } else if (action === 'require') {
          const want = truth ? true : undefined;
          if (overrides.get(key) !== want) {
            if (want === undefined) overrides.delete(key); else overrides.set(key, true);
            changed = true;
          }
        } else if (action === 'optional') {
          const want = truth ? false : undefined;
          if ((overrides.has(key) ? overrides.get(key) : undefined) !== want) {
            if (want === undefined) overrides.delete(key); else overrides.set(key, false);
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    const routed = skippedPagesFor(pages, norm, visible, currentValues);
    const same = routed.size === skippedPages.size && [...routed].every((p) => skippedPages.has(p));
    if (same) break;
    skippedPages = routed;
  }

  // Value-style actions read the settled visibility, so they run once, after the fixpoint.
  const setValues = new Map<string, any>();
  const allowedOptions = new Map<string, string[]>();
  const messages = new Map<string, string>();
  const finalValues = new Map<number | string, any>();
  for (const f of active) {
    if (!visible.has(String(f.id))) continue;
    const n = Number(f.id);
    finalValues.set(Number.isInteger(n) ? n : String(f.id), valuesByStrId[String(f.id)]);
  }
  for (const f of active) {
    const key = String(f.id);
    const n = norm.get(key);
    if (!n || !visible.has(key) || n.action_value === undefined) continue;
    if (n.action !== 'set_value' && n.action !== 'restrict_options' && n.action !== 'display_message') continue;
    const satisfied = evalNode(n, finalValues);
    if (!(satisfied === null ? true : satisfied)) continue;
    if (n.action === 'set_value') setValues.set(key, n.action_value);
    else if (n.action === 'restrict_options') allowedOptions.set(key, (Array.isArray(n.action_value) ? n.action_value : [n.action_value]).map(String));
    else messages.set(key, String(n.action_value));
  }

  return { visible, requiredOverrides: overrides, setValues, allowedOptions, messages, pages, skippedPages };
}

export function isFieldRequired(field: FormField, layout: Layout): boolean {
  const o = layout.requiredOverrides.get(String(field.id));
  return o === undefined ? !!field.is_required : o;
}
