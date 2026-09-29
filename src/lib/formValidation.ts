/**
 * Client-side mirror of the backend validation engine
 * (`apps/forms/validation/`). The backend is the source of truth and
 * re-validates every submission — this module exists so the user gets instant
 * per-field feedback and we never POST something the server will reject.
 *
 * `validateSubmission()` is the parity entry point; `validateFieldValue()` is a
 * lighter per-field check for on-change/on-blur hints.
 */

import { FormField, SubmissionErrorItem, CrossFieldRule } from './types';
import { computeLayout, isFieldRequired, isEmpty, evaluateOperator, Layout } from './formConditional';

interface FileLike { name: string; size: number }

// ---------------------------------------------------------------------------
// Builder helpers (unchanged public API)
// ---------------------------------------------------------------------------

export function hasConstraintOptions(type: FormField['type']): boolean {
  return [
    'TEXT', 'PARAGRAPH', 'EMAIL', 'NUMBER', 'PHONE', 'URL',
    'CHECKBOX', 'DATE', 'TIME', 'RADIO', 'DROPDOWN',
    'FILE', 'MULTI_FILE', 'RATING', 'LINEAR_SCALE',
    'MATRIX_RADIO', 'MATRIX_CHECKBOX', 'SIGNATURE',
  ].includes(type);
}

export function hasActiveValidation(field: FormField): boolean {
  const r = field.validation_rules;
  if (!r) return false;
  return Object.entries(r).some(([k, v]) => {
    if (k === 'patternError') return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== '' && v !== null;
  });
}

export function getConstraintHint(field: FormField): string | null {
  const r = field.validation_rules;
  if (!r) return null;
  const parts: string[] = [];

  switch (field.type) {
    case 'TEXT':
    case 'PARAGRAPH':
      if (r.format && r.format !== 'any') parts.push(`${r.format} only`);
      if (r.exactLength != null) parts.push(`exactly ${r.exactLength} characters`);
      else if (r.minLength != null && r.maxLength != null) parts.push(`${r.minLength}-${r.maxLength} characters`);
      else if (r.maxLength != null) parts.push(`max ${r.maxLength} characters`);
      else if (r.minLength != null) parts.push(`min ${r.minLength} characters`);
      if (r.minWords != null || r.maxWords != null) parts.push(`${r.minWords ?? 0}-${r.maxWords ?? '∞'} words`);
      if (r.pattern) parts.push('must match a pattern');
      break;
    case 'NUMBER':
      if (r.integerOnly) parts.push('whole numbers');
      if (r.minValue != null && r.maxValue != null) parts.push(`between ${r.minValue} and ${r.maxValue}`);
      else if (r.maxValue != null) parts.push(`up to ${r.maxValue}`);
      else if (r.minValue != null) parts.push(`at least ${r.minValue}`);
      if (r.positiveOnly) parts.push('positive only');
      break;
    case 'EMAIL':
      if (r.allowedDomains) parts.push(`@${(Array.isArray(r.allowedDomains) ? r.allowedDomains : [r.allowedDomains]).join(', @')}`);
      break;
    case 'PHONE':
      if (r.minDigits != null && r.maxDigits != null) {
        parts.push(r.minDigits === r.maxDigits ? `exactly ${r.minDigits} digits` : `${r.minDigits}-${r.maxDigits} digits`);
      } else if (r.maxDigits != null) parts.push(`up to ${r.maxDigits} digits`);
      else if (r.minDigits != null) parts.push(`at least ${r.minDigits} digits`);
      if (r.numericOnly) parts.push('digits only');
      break;
    case 'CHECKBOX':
      if (r.exactSelected != null) parts.push(`choose exactly ${r.exactSelected}`);
      else if (r.minSelected != null && r.maxSelected != null) parts.push(`choose ${r.minSelected}-${r.maxSelected}`);
      else if (r.maxSelected != null) parts.push(`choose up to ${r.maxSelected}`);
      else if (r.minSelected != null) parts.push(`choose at least ${r.minSelected}`);
      break;
    case 'DATE':
      if (r.minDate && r.maxDate) parts.push(`between ${r.minDate} and ${r.maxDate}`);
      else if (r.minDate) parts.push(`on or after ${r.minDate}`);
      else if (r.maxDate) parts.push(`on or before ${r.maxDate}`);
      if (r.pastOnly) parts.push('past dates only');
      if (r.futureOnly) parts.push('future dates only');
      break;
    case 'FILE':
    case 'MULTI_FILE':
      if (r.allowedFileTypes) parts.push(`accepted: ${r.allowedFileTypes}`);
      if (r.maxFileSizeMB) parts.push(`max ${r.maxFileSizeMB}MB`);
      if (r.maxFiles) parts.push(`up to ${r.maxFiles} files`);
      break;
    case 'RATING':
    case 'LINEAR_SCALE':
      if (r.minValue != null && r.maxValue != null) parts.push(`rule: ${r.minValue}-${r.maxValue}`);
      if (r.integerOnly === false) parts.push('decimals allowed');
      break;
    case 'MATRIX_RADIO':
      if (r.allRowsRequired) parts.push('every row required');
      break;
    case 'MATRIX_CHECKBOX':
      if (r.allRowsRequired) parts.push('every row required');
      if (r.minPerRow != null && r.maxPerRow != null) parts.push(`${r.minPerRow}-${r.maxPerRow} per row`);
      else if (r.maxPerRow != null) parts.push(`up to ${r.maxPerRow} per row`);
      else if (r.minPerRow != null) parts.push(`at least ${r.minPerRow} per row`);
      break;
  }
  return parts.length ? parts.join(' • ') : null;
}

// ---------------------------------------------------------------------------
// Value coercion (mirror values.coerce_value, best-effort)
// ---------------------------------------------------------------------------

function toFiles(v: any): FileLike[] { return Array.isArray(v) ? v : v ? [v] : []; }

// ---------------------------------------------------------------------------
// Per-rule checks
// ---------------------------------------------------------------------------

const FORMAT_RE: Record<string, RegExp> = {
  alpha: /^[A-Za-z ]+$/, alphabetic: /^[A-Za-z ]+$/,
  alphanumeric: /^[A-Za-z0-9]+$/, numeric: /^[0-9]+$/,
  integer: /^-?[0-9]+$/, decimal: /^-?[0-9]+(\.[0-9]+)?$/,
  username: /^[A-Za-z0-9._-]{3,}$/, slug: /^[-a-zA-Z0-9_]+$/,
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{5,}$/;
const FORMAT_MSG: Record<string, string> = {
  alpha: 'Only letters and spaces are allowed.', alphabetic: 'Only letters and spaces are allowed.',
  alphanumeric: 'Only letters and digits are allowed.', numeric: 'Only digits are allowed.',
  integer: 'Enter a whole number.', decimal: 'Enter a number.',
  username: 'Use 3+ letters, digits, dots, dashes or underscores.',
  slug: 'Use letters, digits, dashes and underscores only.',
};

function fieldTypeErrors(field: FormField, value: any): string[] {
  const r = field.validation_rules || {};
  const out: string[] = [];
  const str = typeof value === 'string' ? value : String(value ?? '');

  switch (field.type) {
    case 'EMAIL': {
      const parts = r.allowMultiple ? str.split(/[,;]\s*/) : [str];
      for (const a of parts) if (!EMAIL_RE.test(a.trim())) out.push(`'${a.trim()}' is not a valid email address.`);
      break;
    }
    case 'URL':
      if (!URL_RE.test(str.trim())) out.push('Enter a valid URL.');
      break;
    case 'PHONE':
      if (r.pattern) { try { if (!new RegExp(r.pattern).test(str)) out.push(r.patternError || 'Phone number format is invalid.'); } catch {} }
      else if (!PHONE_RE.test(str.trim())) out.push('Enter a valid phone number.');
      break;
    case 'NUMBER':
      if (Number.isNaN(Number(value))) out.push('Must be a valid number.');
      break;
    case 'RADIO':
    case 'DROPDOWN': {
      const opts = (field.options || []).map((o) => String(o));
      if (opts.length && !r.allowOther && !opts.some((o) => o === str || o.toLowerCase() === str.toLowerCase()))
        out.push(`'${value}' is not one of the allowed choices.`);
      break;
    }
    case 'CHECKBOX': {
      const arr: any[] = Array.isArray(value) ? value : [];
      const opts = (field.options || []).map((o) => String(o).toLowerCase());
      const seen = new Set<string>();
      for (const item of arr) {
        const k = String(item).trim().toLowerCase();
        if (seen.has(k)) out.push(`'${item}' is selected more than once.`);
        seen.add(k);
        if (opts.length && !r.allowOther && !opts.includes(k)) out.push(`'${item}' is not one of the allowed choices.`);
      }
      break;
    }
    case 'RATING':
    case 'LINEAR_SCALE': {
      const n = Number(value);
      const lo = field.min_value ?? 1, hi = field.max_value ?? 5;
      if (Number.isNaN(n)) out.push('Must be a number.');
      else {
        if ((r.integerOnly ?? true) && !Number.isInteger(n)) out.push('Must be a whole number.');
        if (n < lo || n > hi) out.push(`Choose a value between ${lo} and ${hi}.`);
      }
      break;
    }
    // Mirrors backend field_types.py::_validate_matrix — unknown row / unknown
    // column checks, plus "one selection per row" for MATRIX_RADIO.
    case 'MATRIX_RADIO':
    case 'MATRIX_CHECKBOX': {
      const rows = (field.rows || []).map((rr) => String(rr).trim());
      const cols = (field.options || []).map((c) => String(c).trim());
      const multi = field.type === 'MATRIX_CHECKBOX';
      const matrixVal: Record<string, any> = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      const matchesCol = (v: string) => cols.some((c) => c === v || c.toLowerCase() === v.toLowerCase());
      const matchesRow = (v: string) => rows.some((rr) => rr === v || rr.toLowerCase() === v.toLowerCase());
      for (const rowKey of Object.keys(matrixVal)) {
        const rk = String(rowKey).trim();
        if (rows.length && !matchesRow(rk)) {
          out.push(`'${rowKey}' is not a row of this question.`);
          continue;
        }
        const cell = matrixVal[rowKey];
        if (!multi && Array.isArray(cell) && cell.length > 1) {
          out.push(`Row '${rowKey}' allows only one selection.`);
        }
        const cellValues = Array.isArray(cell) ? cell : [cell];
        for (const cv of cellValues) {
          if (cv === undefined || cv === null || cv === '') continue;
          const cvStr = String(cv).trim();
          if (cols.length && !matchesCol(cvStr)) out.push(`'${cv}' is not a column of this question.`);
        }
      }
      break;
    }
  }
  return out;
}

function domainOf(v: string): string[] {
  return v.split(/[,;]\s*/).filter((a) => a.includes('@')).map((a) => a.split('@').pop()!.trim().toLowerCase());
}

function ruleErrors(field: FormField, value: any): string[] {
  const r = field.validation_rules || {};
  const out: string[] = [];
  const custom = r.patternError;
  const push = (m: string) => out.push(custom || m);
  const str = typeof value === 'string' ? value : (Array.isArray(value) || (value && typeof value === 'object')) ? null : String(value);
  const num = Number(value);
  const arr = Array.isArray(value) ? value : null;

  // length / words / text-shape
  if (str !== null) {
    if (r.minLength != null && str.length < r.minLength) push(`Must be at least ${r.minLength} characters.`);
    if (r.maxLength != null && str.length > r.maxLength) push(`Must be at most ${r.maxLength} characters.`);
    if (r.exactLength != null && str.length !== r.exactLength) push(`Must be exactly ${r.exactLength} characters.`);
    if (r.minWords != null && str.trim().split(/\s+/).filter(Boolean).length < r.minWords) push(`Must be at least ${r.minWords} words.`);
    if (r.maxWords != null && str.trim().split(/\s+/).filter(Boolean).length > r.maxWords) push(`Must be at most ${r.maxWords} words.`);
    if (r.pattern) { try { if (!new RegExp(r.pattern).test(str)) push('Value does not match the required format.'); } catch {} }
    if (r.format && r.format !== 'any') {
      const f = r.format;
      if (f === 'email') { if (!EMAIL_RE.test(str)) push('Enter a valid email address.'); }
      else if (f === 'url') { if (!URL_RE.test(str)) push('Enter a valid URL.'); }
      else if (f === 'phone') { if (!PHONE_RE.test(str)) push('Enter a valid phone number.'); }
      else if (f === 'date') { if (Number.isNaN(Date.parse(str))) push('Enter a valid date.'); }
      else if (FORMAT_RE[f] && !FORMAT_RE[f].test(str)) push(FORMAT_MSG[f] || 'Invalid format.');
    }
    if (r.allowedChars) { const ok = new Set(r.allowedChars); const bad = [...str].filter((c) => !ok.has(c) && !/\s/.test(c)); if (bad.length) push(`These characters are not allowed: ${[...new Set(bad)].join('')}`); }
    if (r.disallowedChars) { const ban = new Set(r.disallowedChars); const hit = [...str].filter((c) => ban.has(c)); if (hit.length) push(`These characters are not allowed: ${[...new Set(hit)].join('')}`); }
    if (r.startsWith && !str.startsWith(r.startsWith)) push(`Must start with '${r.startsWith}'.`);
    if (r.endsWith && !str.endsWith(r.endsWith)) push(`Must end with '${r.endsWith}'.`);
    if (r.contains && !str.includes(r.contains)) push(`Must contain '${r.contains}'.`);
    if (r.notContains && str.includes(r.notContains)) push(`Must not contain '${r.notContains}'.`);
  }

  // numeric
  if (!Number.isNaN(num) && str !== null && field.type !== 'DATE' && field.type !== 'TIME') {
    if (r.minValue != null && num < r.minValue) push(`Must be at least ${r.minValue}.`);
    if (r.maxValue != null && num > r.maxValue) push(`Must be at most ${r.maxValue}.`);
    if (r.exactValue != null && num !== r.exactValue) push(`Must be exactly ${r.exactValue}.`);
    if (r.gt != null && !(num > r.gt)) push(`Must be greater than ${r.gt}.`);
    if (r.gte != null && !(num >= r.gte)) push(`Must be greater than or equal to ${r.gte}.`);
    if (r.lt != null && !(num < r.lt)) push(`Must be less than ${r.lt}.`);
    if (r.lte != null && !(num <= r.lte)) push(`Must be less than or equal to ${r.lte}.`);
    if (r.integerOnly && !Number.isInteger(num)) push('Must be a whole number.');
    if (r.positiveOnly && num <= 0) push('Must be a positive number.');
    if (r.allowNegative === false && num < 0) push('Negative numbers are not allowed.');
    if (r.step && r.step > 0) { const base = r.minValue ?? 0; if (Math.abs((num - base) % r.step) > 1e-9) push(`Must be in increments of ${r.step}.`); }
  }

  // email domains
  if (field.type === 'EMAIL' && typeof value === 'string') {
    const allow = r.allowedDomains ? (Array.isArray(r.allowedDomains) ? r.allowedDomains : String(r.allowedDomains).split(/[,;]\s*/)) : null;
    const block = r.blockedDomains ? (Array.isArray(r.blockedDomains) ? r.blockedDomains : String(r.blockedDomains).split(/[,;]\s*/)) : null;
    for (const d of domainOf(value)) {
      if (allow && allow.length && !allow.map((x) => x.toLowerCase().replace(/^@/, '')).includes(d)) push(`Email must be on: ${allow.join(', ')}.`);
      if (block && block.map((x) => x.toLowerCase().replace(/^@/, '')).includes(d)) push(`Emails from '${d}' are not accepted.`);
    }
  }

  // phone digits
  if ((field.type === 'PHONE') && str !== null) {
    const digits = (str.match(/[0-9]/g) || []).length;
    if (r.minDigits != null && digits < r.minDigits) push(`Must contain at least ${r.minDigits} digits.`);
    if (r.maxDigits != null && digits > r.maxDigits) push(`Must contain at most ${r.maxDigits} digits.`);
    if (r.numericOnly && !/^\+?[0-9\s\-().]+$/.test(str)) push('Only digits and phone punctuation are allowed.');
  }
  if (field.type === 'URL' && r.requireHttps && str !== null && !/^https:\/\//i.test(str)) push('URL must start with https://.');

  // date / time
  if (field.type === 'DATE' && str !== null) {
    const d = str; // YYYY-MM-DD lexicographic
    const bound = (b?: string) => (b === 'today' ? new Date().toISOString().slice(0, 10) : b);
    const mn = bound(r.minDate || r.notBefore), mx = bound(r.maxDate || r.notAfter);
    if (mn && d < mn) push(`Date must be on or after ${mn}.`);
    if (mx && d > mx) push(`Date must be on or before ${mx}.`);
    const today = new Date().toISOString().slice(0, 10);
    if (r.pastOnly && d >= today) push('Date must be in the past.');
    if (r.futureOnly && d <= today) push('Date must be in the future.');
    if (r.allowToday === false && d === today) push("Today's date is not allowed.");
  }
  if (field.type === 'TIME' && str !== null) {
    if (r.minTime && str < r.minTime) push(`Time must be at or after ${r.minTime}.`);
    if (r.maxTime && str > r.maxTime) push(`Time must be at or before ${r.maxTime}.`);
  }

  // selection counts
  if (arr) {
    if (r.minSelected != null && arr.length < r.minSelected) push(`Select at least ${r.minSelected} option(s).`);
    if (r.maxSelected != null && arr.length > r.maxSelected) push(`Select at most ${r.maxSelected} option(s).`);
    if (r.exactSelected != null && arr.length !== r.exactSelected) push(`Select exactly ${r.exactSelected} option(s).`);
  }

  // matrix — mirrors backend rules.py::_required_rows / _all_rows_required / _min_per_row / _max_per_row
  if (field.type === 'MATRIX_RADIO' || field.type === 'MATRIX_CHECKBOX') {
    const matrixVal: Record<string, any> | null = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    if (matrixVal) {
      const cellIsAnswered = (v: any) => !(v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0));
      const answered = new Set(
        Object.entries(matrixVal).filter(([, v]) => cellIsAnswered(v)).map(([k]) => String(k).trim().toLowerCase()),
      );
      if (Array.isArray(r.requiredRows) && r.requiredRows.length) {
        const missing = r.requiredRows.filter((row) => !answered.has(String(row).trim().toLowerCase()));
        if (missing.length) push(`These rows require an answer: ${missing.join(', ')}.`);
      }
      if (r.allRowsRequired) {
        const rows = (field.rows || []).map((row) => String(row));
        const missing = rows.filter((row) => !answered.has(row.trim().toLowerCase()));
        if (missing.length) push(`Every row requires an answer; missing: ${missing.join(', ')}.`);
      }
      const cellCount = (cell: any) => (Array.isArray(cell) ? cell.length : cell !== null && cell !== undefined && cell !== '' ? 1 : 0);
      if (r.minPerRow != null) {
        for (const [k, cell] of Object.entries(matrixVal)) {
          if (cellCount(cell) < r.minPerRow) { push(`Row '${k}' needs at least ${r.minPerRow} selection(s).`); break; }
        }
      }
      if (r.maxPerRow != null) {
        for (const [k, cell] of Object.entries(matrixVal)) {
          if (cellCount(cell) > r.maxPerRow) { push(`Row '${k}' allows at most ${r.maxPerRow} selection(s).`); break; }
        }
      }
    }
  }

  // files
  if (field.type === 'FILE' || field.type === 'MULTI_FILE') {
    const files = toFiles(value);
    const ext = (n: string) => (n.includes('.') ? '.' + n.split('.').pop()!.toLowerCase() : '');
    const allowed = r.allowedFileTypes ? r.allowedFileTypes.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).map((e) => (e.startsWith('.') ? e : `.${e}`)) : [];
    const blocked = r.blockedFileTypes ? r.blockedFileTypes.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).map((e) => (e.startsWith('.') ? e : `.${e}`)) : [];
    for (const f of files) {
      if (allowed.length && !allowed.includes(ext(f.name))) push(`Allowed file types: ${r.allowedFileTypes}.`);
      if (blocked.includes(ext(f.name))) push(`'${f.name}' is a blocked file type.`);
      if (r.maxFileSizeMB && f.size > r.maxFileSizeMB * 1024 * 1024) push(`'${f.name}' exceeds the ${r.maxFileSizeMB} MB limit.`);
      if (r.minFileSizeKB && f.size > 0 && f.size < r.minFileSizeKB * 1024) push(`'${f.name}' is smaller than the ${r.minFileSizeKB} KB minimum.`);
    }
    if (r.maxFiles != null && files.length > r.maxFiles) push(`Attach at most ${r.maxFiles} file(s).`);
    if (r.minFiles != null && files.length < r.minFiles) push(`Attach at least ${r.minFiles} file(s).`);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Per-field (light) — kept for on-change hints
// ---------------------------------------------------------------------------

export function validateFieldValue(field: FormField, value: any, requiredOverride?: boolean): string | null {
  if (field.type === 'SECTION') return null;
  const required = requiredOverride ?? field.is_required;
  if (isEmpty(value)) return required ? `${field.label} is required.` : null;
  const errs = [...fieldTypeErrors(field, value), ...ruleErrors(field, value)];
  return errs[0] ?? null;
}

/**
 * Single-field cross-field check — the same crossField logic `validateSubmission`
 * applies across the whole form, scoped to one field so it can be re-run cheaply
 * whenever the field it depends on changes (see page.tsx::handleInputChange).
 */
export function getCrossFieldError(
  field: FormField,
  fields: FormField[],
  valuesByStrId: Record<string, any>,
  layout?: Layout,
): string | null {
  const cross = field.validation_rules?.crossField as CrossFieldRule[] | undefined;
  if (!Array.isArray(cross) || !cross.length) return null;
  const key = String(field.id);
  if (layout && !layout.visible.has(key)) return null;
  const byId = new Map<string, FormField>(fields.map((f) => [String(f.id), f]));

  for (const rule of cross) {
    const other = byId.get(String(rule.field));
    if (!other) continue;
    if (layout && !layout.visible.has(String(rule.field))) continue;
    const thisVal = valuesByStrId[key];
    const otherVal = valuesByStrId[String(rule.field)];
    if (rule.op === 'required_if') {
      const trig = rule.equals;
      const matches = trig == null || trig === '' ? !isEmpty(otherVal) : String(otherVal).trim().toLowerCase() === String(trig).trim().toLowerCase();
      if (matches && isEmpty(thisVal)) {
        return rule.message || `'${field.label}' is required when '${other.label}' is answered.`;
      }
      continue;
    }
    if (isEmpty(thisVal) || isEmpty(otherVal)) continue;
    const opMap: Record<string, string> = { eq: 'equals', ne: 'not_equals', lt: 'lt', lte: 'lte', gt: 'gt', gte: 'gte' };
    const ok = evaluateOperator(opMap[rule.op] || 'equals', thisVal, otherVal);
    if (!ok) {
      return rule.message || `'${field.label}' fails its comparison with '${other.label}'.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Full submission validation (parity with the backend engine)
// ---------------------------------------------------------------------------

export interface ClientValidationResult {
  errors: SubmissionErrorItem[];
  layout: Layout;
  /** answers to actually submit — visible, non-empty fields only */
  payload: Record<string, any>;
}

export function validateSubmission(
  fields: FormField[],
  valuesByStrId: Record<string, any>,
): ClientValidationResult {
  const active = fields.filter((f) => !f.is_deleted && f.type !== 'SECTION');
  const layout = computeLayout(fields, valuesByStrId);
  const errors: SubmissionErrorItem[] = [];
  const payload: Record<string, any> = {};
  const byId = new Map<string, FormField>(active.map((f) => [String(f.id), f]));

  for (const field of active) {
    const key = String(field.id);
    if (!layout.visible.has(key)) continue;
    const value = valuesByStrId[key] ?? valuesByStrId[field.id as any];
    const required = isFieldRequired(field, layout);

    if (isEmpty(value)) {
      if (required) {
        errors.push({ field_id: Number(field.id) || null, label: field.label, code: 'REQUIRED', rule: 'required', message: `'${field.label}' is required.` });
      }
      continue;
    }

    payload[key] = value;
    for (const m of fieldTypeErrors(field, value)) errors.push({ field_id: Number(field.id) || null, label: field.label, code: 'TYPE', message: m });
    for (const m of ruleErrors(field, value)) errors.push({ field_id: Number(field.id) || null, label: field.label, code: 'RULE', message: m });
  }

  // cross-field
  for (const field of active) {
    const key = String(field.id);
    if (!layout.visible.has(key)) continue;
    const cross = field.validation_rules?.crossField as CrossFieldRule[] | undefined;
    if (!Array.isArray(cross)) continue;
    for (const rule of cross) {
      const other = byId.get(String(rule.field));
      if (!other || !layout.visible.has(String(rule.field))) continue;
      const thisVal = valuesByStrId[key];
      const otherVal = valuesByStrId[String(rule.field)];
      if (rule.op === 'required_if') {
        const trig = rule.equals;
        const matches = trig == null || trig === '' ? !isEmpty(otherVal) : String(otherVal).trim().toLowerCase() === String(trig).trim().toLowerCase();
        if (matches && isEmpty(thisVal)) {
          errors.push({ field_id: Number(field.id) || null, label: field.label, code: 'CROSS_FIELD_REQUIRED', rule: 'crossField', message: rule.message || `'${field.label}' is required when '${other.label}' is answered.` });
        }
        continue;
      }
      if (isEmpty(thisVal) || isEmpty(otherVal)) continue;
      const opMap: Record<string, string> = { eq: 'equals', ne: 'not_equals', lt: 'lt', lte: 'lte', gt: 'gt', gte: 'gte' };
      const ok = evaluateOperator(opMap[rule.op] || 'equals', thisVal, otherVal);
      if (!ok) {
        errors.push({ field_id: Number(field.id) || null, label: field.label, code: 'CROSS_FIELD', rule: 'crossField', message: rule.message || `'${field.label}' fails its comparison with '${other.label}'.` });
      }
    }
  }

  return { errors, layout, payload };
}
