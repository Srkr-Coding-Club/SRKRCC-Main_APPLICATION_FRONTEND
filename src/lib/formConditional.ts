/**
 * Client-side mirror of the backend conditional engine
 * (`apps/forms/validation/conditional.py` + `schema.py`).
 *
 * Used by the public form renderer to decide which fields are visible/required
 * and by the builder's live preview. The backend re-computes all of this on
 * submit — this is purely for UX (don't show, don't validate, don't submit a
 * field the condition hides).
 */

import { FormField } from './types';

// ---------------------------------------------------------------------------
// Normalizer — accepts every shape the backend accepts
// ---------------------------------------------------------------------------

const OPERATOR_ALIASES: Record<string, string> = {
  greater_than: 'gt', greater_than_or_equal: 'gte',
  less_than: 'lt', less_than_or_equal: 'lte',
  eq: 'equals', ne: 'not_equals', neq: 'not_equals',
  '==': 'equals', '!=': 'not_equals', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte',
};

const ENFORCED_ACTIONS = new Set(['show', 'hide', 'require', 'optional']);
const DEFERRED_ACTIONS = new Set(['skip', 'skip_to_section', 'end_form', 'set_value', 'restrict_options', 'display_message']);

export interface NLeaf { field: number | string | null; operator: string; value: any; }
export interface NGroup { logic: 'AND' | 'OR'; rules: (NLeaf | NGroup)[]; }
export interface NConditional extends NGroup { action: string; }

function coerceRef(raw: any): number | string | null {
  const n = Number(raw);
  if (Number.isInteger(n)) return n;
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
  return { field, operator, value };
}

export function normalizeConditional(raw: any): NConditional | null {
  if (!raw || typeof raw !== 'object') return null;

  let action = String(raw.action ?? 'show').trim().toLowerCase() || 'show';
  if (!ENFORCED_ACTIONS.has(action) && !DEFERRED_ACTIONS.has(action)) action = 'show';

  if (Array.isArray(raw.rules)) {
    const rules = raw.rules.map(normalizeNode).filter(Boolean) as (NLeaf | NGroup)[];
    if (!rules.length) return null;
    const logic = String(raw.logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
    return { logic, rules, action };
  }

  const leaf = normalizeNode(raw);
  if (!leaf || 'rules' in leaf) return null;
  if (leaf.field === null && (leaf as NLeaf).operator === 'equals' && (raw.field ?? raw.if) === undefined) {
    return null; // genuinely no condition
  }
  return { logic: 'AND', rules: [leaf], action };
}

// ---------------------------------------------------------------------------
// Operators (mirror conditional.evaluate_operator)
// ---------------------------------------------------------------------------

function asNum(v: any): number | null {
  if (typeof v === 'boolean') return null;
  const n = Number(String(v ?? '').trim().replace(/,/g, ''));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null;
}
function asDate(v: any): number | null {
  if (v == null || v === '') return null;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
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
// — so a `show`/`require` rule stays dormant until the user actually picks a
// value, instead of appearing on first render.
const EMPTY_OK_OPERATORS = new Set(['is_empty', 'is_not_empty']);

function evalNode(node: NLeaf | NGroup, values: Map<number | string, any>): boolean | null {
  if ('rules' in node) {
    const results = node.rules.map((r) => evalNode(r, values)).filter((r): r is boolean => r !== null);
    if (!results.length) return null;
    return node.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }
  if (node.field === null) return null; // broken {if:"parent"} placeholder — ignore
  const left = values.get(node.field);
  if (isEmpty(left) && !EMPTY_OK_OPERATORS.has(node.operator)) return false;
  return evaluateOperator(node.operator, left, node.value);
}

export interface Layout {
  visible: Set<string>;
  requiredOverrides: Map<string, boolean>;
}

/**
 * `valuesByStrId` — the form's current answers keyed by String(field.id).
 * Returns which fields are visible and any require/optional overrides.
 */
export function computeLayout(fields: FormField[], valuesByStrId: Record<string, any>): Layout {
  const active = fields.filter((f) => !f.is_deleted);
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

  const visible = new Set<string>(active.map((f) => String(f.id)));
  const overrides = new Map<string, boolean>();

  const maxPasses = active.length + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    const effective = new Map<number | string, any>();
    for (const [k, v] of currentValues) {
      // Only visible fields feed conditions.
      const f = active.find((x) => String(x.id) === String(k));
      if (f && visible.has(String(f.id))) effective.set(k, v);
    }

    for (const f of active) {
      const key = String(f.id);
      const n = norm.get(key);
      if (!n) continue;
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

  return { visible, requiredOverrides: overrides };
}

export function isFieldRequired(field: FormField, layout: Layout): boolean {
  const o = layout.requiredOverrides.get(String(field.id));
  return o === undefined ? !!field.is_required : o;
}
