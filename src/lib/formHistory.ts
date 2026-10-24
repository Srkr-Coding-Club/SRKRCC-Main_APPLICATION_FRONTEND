/** Shapes returned by the form history / review endpoints (`apps/forms/versions.py`) and how to read them aloud. */

export interface SettingChange { key: string; label: string; before: unknown; after: unknown }

export type FieldChange =
  | { key: string; label: string; before: unknown; after: unknown }
  | { key: 'options' | 'rows'; label: string; added: string[]; removed: string[] }
  | { key: 'validation_rules'; label: string; changed: { rule: string; before: unknown; after: unknown }[] };

export interface FormDiff {
  form: SettingChange[];
  fields: {
    added: { id: number | null; label: string; type: string }[];
    removed: { id: number; label: string; type: string }[];
    changed: { id: number; label: string; type: string; changes: FieldChange[] }[];
    reordered: boolean;
  };
  summary: { settings: number; added: number; removed: number; changed: number; reordered: boolean };
  is_empty: boolean;
}

export interface ChangeImpact {
  response_count: number;
  new_required: { id: number | null; label: string }[];
  now_required: { id: number; label: string }[];
  removed_with_answers: { id: number; label: string; answers: number }[];
  options_removed_with_answers: { id: number; label: string; option: string; answers: number }[];
  type_changes_blocked: { id: number; label: string; from: string; to: string; answers: number }[];
}

export interface ChangeReview { diff: FormDiff; impact: ChangeImpact; current_version: number }

export interface VersionRow {
  version: number;
  note: string;
  created_at: string;
  created_by: string | null;
  summary: FormDiff['summary'] | null;
  is_current: boolean;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A value as it would be said in a sentence: blank, yes/no, a list, or short text. */
export function showValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'nothing';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : 'nothing';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/** One line for a change to a question. */
export function describeFieldChange(change: FieldChange): string {
  if ('changed' in change) {
    return change.changed
      .map((c) => (c.before === undefined || c.before === null ? `${c.rule} set to ${showValue(c.after)}` : c.after === undefined || c.after === null ? `${c.rule} removed` : `${c.rule}: ${showValue(c.before)} -> ${showValue(c.after)}`))
      .join('; ');
  }
  if ('added' in change) {
    const parts = [];
    if (change.added.length) parts.push(`added ${change.added.join(', ')}`);
    if (change.removed.length) parts.push(`removed ${change.removed.join(', ')}`);
    return `${change.label.toLowerCase()}: ${parts.join('; ')}`;
  }
  if (change.key === 'conditional_logic') {
    const had = change.before && Object.keys(change.before as object).length;
    const has = change.after && Object.keys(change.after as object).length;
    return has ? (had ? 'conditions edited' : 'conditions added') : 'conditions removed';
  }
  if (change.key === 'is_required') return change.after ? 'now required' : 'no longer required';
  return `${change.label.toLowerCase()}: ${showValue(change.before)} -> ${showValue(change.after)}`;
}

/** The warnings worth stopping for before a change goes live, each as one sentence. */
export function impactWarnings(impact: ChangeImpact): string[] {
  const out: string[] = [];
  for (const q of impact.new_required) out.push(`"${q.label}" is new and required, but the ${plural(impact.response_count, 'existing response')} will not have an answer to it.`);
  for (const q of impact.now_required) out.push(`"${q.label}" becomes required; some of the ${plural(impact.response_count, 'existing response')} left it empty.`);
  for (const q of impact.removed_with_answers) out.push(`"${q.label}" is removed. The answers already given (${q.answers}) stay stored but are no longer shown.`);
  for (const o of impact.options_removed_with_answers) out.push(`The option "${o.option}" of "${o.label}" is removed, but ${plural(o.answers, 'response')} chose it.`);
  for (const t of impact.type_changes_blocked) out.push(`"${t.label}" cannot change from ${t.from} to ${t.to}: it already has ${plural(t.answers, 'answer')}.`);
  return out;
}

export function whenText(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
