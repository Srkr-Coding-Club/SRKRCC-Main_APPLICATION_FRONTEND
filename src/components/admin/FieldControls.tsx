'use client';

import React from 'react';
import type { CrossFieldOp, CrossFieldRule, FormField, ValidationRules } from '@/lib/types';
import { isSavedFieldId } from '@/lib/fieldTypes';
import { MAX_FORMULA_LENGTH, evaluateFormula, formulaReferences, parseFormula } from '@/lib/formula';

/**
 * Per-question controls beyond the basic rules: must-be-unique, places per option, a default answer, the
 * wording of each error message, and the editors for hidden and calculated questions.
 */

const inputClass =
  'w-full px-2 py-1.5 rounded border text-xs glass-panel text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]';
const labelClass = 'block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1';

const UNIQUE_TYPES = ['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'URL'];
const LIMITED_TYPES = ['RADIO', 'DROPDOWN', 'CHECKBOX'];
const DEFAULT_TYPES = [
  'TEXT', 'PARAGRAPH', 'EMAIL', 'PHONE', 'URL', 'NUMBER', 'DATE', 'TIME', 'RADIO', 'DROPDOWN', 'CHECKBOX', 'RATING', 'LINEAR_SCALE',
];
const TYPED_VALUE_TYPES = ['EMAIL', 'PHONE', 'URL', 'NUMBER', 'DATE', 'TIME', 'RATING', 'LINEAR_SCALE'];

/** What each rule's error is called when the admin words it themselves. */
const RULE_MESSAGE_LABELS: Record<string, string> = {
  minLength: 'Too short', maxLength: 'Too long', exactLength: 'Wrong length', minWords: 'Too few words', maxWords: 'Too many words',
  pattern: 'Wrong format', format: 'Wrong format', allowedChars: 'Character not allowed', disallowedChars: 'Character not allowed',
  startsWith: 'Must start with', endsWith: 'Must end with', contains: 'Must contain', notContains: 'Must not contain',
  minValue: 'Too small', maxValue: 'Too large', exactValue: 'Not the exact value', step: 'Not a valid step',
  integerOnly: 'Not a whole number', positiveOnly: 'Not positive', allowNegative: 'Negative number',
  allowedDomains: 'Domain not allowed', blockedDomains: 'Domain blocked', minDigits: 'Too few digits', maxDigits: 'Too many digits',
  numericOnly: 'Digits only', requireHttps: 'Must be https', minDate: 'Date too early', maxDate: 'Date too late',
  pastOnly: 'Must be in the past', futureOnly: 'Must be in the future', minTime: 'Time too early', maxTime: 'Time too late',
  minSelected: 'Too few choices', maxSelected: 'Too many choices', exactSelected: 'Wrong number of choices',
  allowedFileTypes: 'File type not allowed', maxFileSizeMB: 'File too large', maxFiles: 'Too many files', minFiles: 'Too few files',
};

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value === undefined || value === null || value === '' ? [] : [String(value)];
}

export function messageKeysFor(field: FormField): { key: string; label: string }[] {
  const rules = (field.validation_rules || {}) as ValidationRules & Record<string, unknown>;
  const keys: { key: string; label: string }[] = [];
  if (field.is_required) keys.push({ key: 'required', label: 'Left empty' });
  if (TYPED_VALUE_TYPES.includes(field.type)) keys.push({ key: 'type', label: 'Not a valid value' });
  if (LIMITED_TYPES.includes(field.type)) keys.push({ key: 'options', label: 'Not one of the options' });
  if (rules.unique) keys.push({ key: 'unique', label: 'Already used by someone else' });
  if (rules.optionLimits && Object.keys(rules.optionLimits).length) keys.push({ key: 'optionLimits', label: 'Option is full' });
  for (const rule of Object.keys(RULE_MESSAGE_LABELS)) {
    if (rules[rule] !== undefined && rules[rule] !== '' && rules[rule] !== false) keys.push({ key: rule, label: RULE_MESSAGE_LABELS[rule] });
  }
  return keys;
}

function DefaultValueInput({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: string | string[] | undefined) => void }) {
  const options = field.options ?? [];
  if (field.type === 'CHECKBOX') {
    const chosen = asList(value);
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#FF7A00]"
              checked={chosen.includes(opt)}
              onChange={(e) => {
                const next = e.target.checked ? [...chosen, opt] : chosen.filter((c) => c !== opt);
                onChange(next.length ? next : undefined);
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === 'RADIO' || field.type === 'DROPDOWN') {
    return (
      <select className={inputClass} value={String(value ?? '')} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">No default</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  const type = field.type === 'DATE' ? 'date' : field.type === 'TIME' ? 'time' : ['NUMBER', 'RATING', 'LINEAR_SCALE'].includes(field.type) ? 'number' : 'text';
  return <input type={type} className={inputClass} placeholder="No default" value={String(value ?? '')} onChange={(e) => onChange(e.target.value || undefined)} />;
}

export function FieldControls({ field, onChange }: { field: FormField; onChange: (patch: Partial<ValidationRules>) => void }) {
  const rules: ValidationRules = field.validation_rules || {};
  const options = field.options ?? [];
  const limits = rules.optionLimits || {};
  const messageKeys = messageKeysFor(field);
  const messages = rules.messages || {};

  const setLimit = (option: string, raw: string) => {
    const next = { ...limits };
    const n = Number(raw);
    if (raw === '' || !Number.isFinite(n) || n < 1) delete next[option];
    else next[option] = Math.floor(n);
    onChange({ optionLimits: Object.keys(next).length ? next : undefined });
  };

  const setMessage = (key: string, text: string) => {
    const next = { ...messages };
    if (text.trim()) next[key] = text; else delete next[key];
    onChange({ messages: Object.keys(next).length ? next : undefined });
  };

  const showUnique = UNIQUE_TYPES.includes(field.type);
  const showLimits = LIMITED_TYPES.includes(field.type) && options.length > 0;
  const showDefault = DEFAULT_TYPES.includes(field.type);
  if (!showUnique && !showLimits && !showDefault && messageKeys.length === 0) return null;

  return (
    <div className="pt-2 border-t border-orange-200/60 dark:border-orange-900/40 space-y-3">
      {showUnique && (
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" className="accent-[#FF7A00]" checked={!!rules.unique} onChange={(e) => onChange({ unique: e.target.checked || undefined })} />
          Each answer can be used only once (case-insensitive)
        </label>
      )}

      {showLimits && (
        <div className="space-y-1">
          <p className={labelClass}>Places per option (leave blank for no limit)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="truncate">{opt}</span>
                <input
                  type="number"
                  min={1}
                  aria-label={`Places for ${opt}`}
                  className="w-20 px-2 py-1 rounded border text-xs glass-panel border-slate-200 dark:border-slate-800"
                  value={limits[opt] ?? ''}
                  onChange={(e) => setLimit(opt, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {showDefault && (
        <div>
          <p className={labelClass}>Default answer (pre-filled, the person can change it)</p>
          <DefaultValueInput field={field} value={rules.defaultValue} onChange={(v) => onChange({ defaultValue: v })} />
        </div>
      )}

      {messageKeys.length > 0 && (
        <div className="space-y-1.5">
          <p className={labelClass}>Your own error messages (optional)</p>
          {messageKeys.map(({ key, label }) => (
            <label key={key} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] items-center gap-1 sm:gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
              <input
                className={inputClass}
                maxLength={200}
                aria-label={`Message: ${label}`}
                placeholder="Built-in message"
                value={messages[key] ?? ''}
                onChange={(e) => setMessage(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** HIDDEN question: no input for the respondent; the answer comes from a link parameter or a default. */
export function HiddenFieldEditor({ field, onChange }: { field: FormField; onChange: (patch: Partial<ValidationRules>) => void }) {
  const rules = field.validation_rules || {};
  return (
    <div className="space-y-2 text-xs">
      <p className="text-slate-500 dark:text-slate-400">
        The respondent never sees this. It records a value from the link they opened (for example <code>?ref=poster</code>), so you
        can tell where responses came from. Anyone can edit a link, so treat it as a hint, not proof.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label>
          <span className={labelClass}>Link parameter</span>
          <input className={inputClass} placeholder="ref" value={rules.queryParam ?? ''} onChange={(e) => onChange({ queryParam: e.target.value.trim() || undefined })} />
        </label>
        <label>
          <span className={labelClass}>Value when the link has none</span>
          <input className={inputClass} placeholder="website" value={String(rules.defaultValue ?? '')} onChange={(e) => onChange({ defaultValue: e.target.value || undefined })} />
        </label>
      </div>
    </div>
  );
}

/** CALCULATED question: worked out from other answers with + - * / and brackets. */
export function CalculatedFieldEditor({ field, earlierFields, onChange }: {
  field: FormField; earlierFields: FormField[]; onChange: (patch: Partial<ValidationRules>) => void;
}) {
  const rules = field.validation_rules || {};
  const formula = String(rules.formula ?? '');
  const usable = earlierFields.filter((f) => ['NUMBER', 'RATING', 'LINEAR_SCALE', 'CALCULATED'].includes(f.type) && isSavedFieldId(f.id));

  let problem: string | null = null;
  let sample: number | null = null;
  if (formula.trim()) {
    try {
      const refs = formulaReferences(parseFormula(formula));
      const known = new Set(earlierFields.map((f) => Number(f.id)));
      const unknown = [...refs].filter((r) => !known.has(r) || r === Number(field.id));
      if (unknown.length) problem = `{${unknown[0]}} is not another question on this form.`;
      else sample = evaluateFormula(formula, Object.fromEntries([...refs].map((r) => [String(r), 1])), Number(rules.decimals ?? 2));
    } catch (error) {
      problem = error instanceof Error ? error.message : 'The formula is not valid.';
    }
  }

  return (
    <div className="space-y-2 text-xs">
      <p className="text-slate-500 dark:text-slate-400">
        Worked out automatically from other answers and shown to the respondent as read-only. The server recalculates it when the form is
        submitted. Use <code>+ - * /</code>, brackets and <code>{'{'}id{'}'}</code> for a question's answer; blank answers count as 0.
      </p>
      <label className="block">
        <span className={labelClass}>Formula</span>
        <input
          className={inputClass}
          maxLength={MAX_FORMULA_LENGTH}
          placeholder="{12} * {13}"
          value={formula}
          onChange={(e) => onChange({ formula: e.target.value || undefined })}
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label>
          <span className={labelClass}>Insert an answer</span>
          <select
            className={inputClass}
            value=""
            onChange={(e) => e.target.value && onChange({ formula: `${formula}${formula && !formula.endsWith(' ') ? ' ' : ''}{${e.target.value}}` })}
          >
            <option value="">{usable.length ? 'Pick a question...' : 'Save the form so earlier number questions get ids'}</option>
            {usable.map((f) => <option key={f.id} value={String(f.id)}>{f.label || `Question ${f.order}`} ({'{'}{f.id}{'}'})</option>)}
          </select>
        </label>
        <label>
          <span className={labelClass}>Decimal places (0-6)</span>
          <input
            type="number"
            min={0}
            max={6}
            className={inputClass}
            value={rules.decimals ?? 2}
            onChange={(e) => onChange({ decimals: Math.min(Math.max(Math.trunc(Number(e.target.value) || 0), 0), 6) })}
          />
        </label>
      </div>
      {problem && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{problem}</p>}
      {!problem && formula.trim() && sample !== null && (
        <p className="text-[11px] text-slate-400">Example: with every answer set to 1 the result is {sample}.</p>
      )}
    </div>
  );
}

/** Drop-down that inserts `{{id}}` into a title or help text: shows that earlier answer on the form. */
export function PipeInsert({ earlierFields, onInsert }: { earlierFields: FormField[]; onInsert: (token: string) => void }) {
  const usable = earlierFields.filter((f) => isSavedFieldId(f.id));
  if (!usable.length) return null;
  return (
    <select
      aria-label="Insert an earlier answer"
      className="px-2 py-1 rounded border text-[11px] glass-panel border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
      value=""
      onChange={(e) => e.target.value && onInsert(`{{${e.target.value}}}`)}
    >
      <option value="">Insert an earlier answer...</option>
      {usable.map((f) => <option key={f.id} value={String(f.id)}>{f.label || `Question ${f.order}`}</option>)}
    </select>
  );
}

const CROSS_FIELD_OPS: { value: CrossFieldOp; label: string }[] = [
  { value: 'eq', label: 'must equal' },
  { value: 'ne', label: 'must differ from' },
  { value: 'lte', label: 'must be at most' },
  { value: 'gte', label: 'must be at least' },
  { value: 'lt', label: 'must be less than' },
  { value: 'gt', label: 'must be greater than' },
  { value: 'required_if', label: 'is required when' },
];

/** Comparisons with other questions - as many as needed, each with its own wording. */
export function CrossFieldRulesEditor({ field, siblingFields, onChange }: {
  field: FormField; siblingFields: FormField[]; onChange: (patch: Partial<ValidationRules>) => void;
}) {
  const rules: CrossFieldRule[] = (field.validation_rules?.crossField as CrossFieldRule[]) || [];
  if (siblingFields.length === 0) return null;

  const save = (next: CrossFieldRule[]) => onChange({ crossField: next.length ? next : undefined });
  const replace = (index: number, patch: Partial<CrossFieldRule>) => {
    const next = rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule));
    // "equals" only means something for required_if
    if (next[index].op !== 'required_if') delete next[index].equals;
    save(next);
  };
  const refOf = (id: string) => (Number.isInteger(Number(id)) ? Number(id) : id);

  return (
    <div className="pt-2 border-t border-orange-200/60 dark:border-orange-900/40 space-y-2">
      <p className={labelClass}>Compare with other questions</p>
      {rules.map((rule, index) => (
        <div key={index} className="rounded border border-slate-200 dark:border-slate-800 p-2 space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <select className={inputClass} aria-label="Comparison" value={rule.op} onChange={(e) => replace(index, { op: e.target.value as CrossFieldOp })}>
              {CROSS_FIELD_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={inputClass} aria-label="Compared with" value={String(rule.field ?? '')} onChange={(e) => replace(index, { field: refOf(e.target.value) })}>
              <option value="">Select question</option>
              {siblingFields.map((f) => <option key={f.id} value={String(f.id)}>{f.label || `Question ${f.order}`}</option>)}
            </select>
            <button
              type="button"
              aria-label="Remove comparison"
              className="px-2 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
              onClick={() => save(rules.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          {rule.op === 'required_if' && (
            <input
              className={inputClass}
              aria-label="Value that makes it required"
              placeholder="answer that makes this required (blank: any answer)"
              value={rule.equals ?? ''}
              onChange={(e) => replace(index, { equals: e.target.value || undefined })}
            />
          )}
          <input
            className={inputClass}
            aria-label="Message for this comparison"
            maxLength={200}
            placeholder="Your own message if it fails (optional)"
            value={rule.message ?? ''}
            onChange={(e) => replace(index, { message: e.target.value || undefined })}
          />
        </div>
      ))}
      <button
        type="button"
        className="text-[11px] font-bold text-journey-accent hover:underline"
        onClick={() => save([...rules, { op: 'eq', field: siblingFields[0].id }])}
      >
        + Add a comparison
      </button>
    </div>
  );
}
