import type { FormField } from './types';
import { isEmpty } from './formConditional';
import { isNonAnswerType } from './fieldTypes';

const MAX_PARAM_LENGTH = 500;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** A value taken from the page address: trimmed, free of control characters, and no longer than the server accepts. */
export function cleanQueryValue(raw: string | null | undefined): string | undefined {
  const value = (raw ?? '').replace(CONTROL_CHARS, '').trim().slice(0, MAX_PARAM_LENGTH);
  return value || undefined;
}

/**
 * Default values for questions that are still blank. A default is a convenience on the form, never something
 * the server invents, so it is only ever pre-filled here.
 */
export function defaultAnswers(fields: FormField[], current: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const fallback = f.validation_rules?.defaultValue;
    if (f.is_deleted || fallback === undefined || f.profile_field || isNonAnswerType(f.type) || f.type === 'HIDDEN' || f.type === 'CALCULATED') continue;
    if (!isEmpty(current[String(f.id)])) continue;
    const list = Array.isArray(fallback) ? fallback : [fallback];
    out[String(f.id)] = f.type === 'CHECKBOX' ? list : list[0];
  }
  return out;
}

/**
 * Values for HIDDEN questions: the link parameter they name (`?ref=poster`), else their default. A question
 * that is already filled keeps its value unless the link carries one - a fresh link should win over an old draft.
 */
export function hiddenAnswers(fields: FormField[], search: string, current: Record<string, any> = {}): Record<string, string> {
  const query = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (f.is_deleted || f.type !== 'HIDDEN') continue;
    const rules = f.validation_rules || {};
    const fromLink = rules.queryParam ? cleanQueryValue(query.get(rules.queryParam)) : undefined;
    const value = fromLink ?? (isEmpty(current[String(f.id)]) ? cleanQueryValue(Array.isArray(rules.defaultValue) ? rules.defaultValue[0] : rules.defaultValue) : undefined);
    if (value !== undefined) out[String(f.id)] = value;
  }
  return out;
}
