'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormField } from '@/lib/types';
import { normalizeConditional, type NConditional, type NGroup, type NLeaf } from '@/lib/formConditional';
import {
  CHOICE_TYPES, OPERATOR_LABELS, operatorsFor, operatorValueKind, ruleProblem,
} from '@/lib/conditionOperators';

/**
 * Editor for a question's conditional_logic: any number of rules, grouped with AND / OR (groups can
 * be nested), each rule comparing a watched question with a fixed value or with another question,
 * and an action to run when the whole condition holds.
 *
 * Reads and writes the canonical shape the backend stores:
 *   { logic: 'AND'|'OR', rules: [leaf | group], action, action_value? }
 */

type Node = NLeaf | NGroup;
const isGroup = (node: Node): node is NGroup => 'rules' in node;

const MAX_DEPTH = 3;
const MESSAGE_LIMIT = 500;

const inputClass =
  'w-full px-2 py-1.5 rounded border text-xs glass-panel text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]';
const smallButton =
  'inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7A00] hover:underline transition-transform duration-100 active:scale-95';

const NO_FILL_TYPES = ['SECTION', 'FILE', 'MULTI_FILE', 'SIGNATURE', 'CALCULATED'];

function actionsFor(field: FormField): { value: string; label: string }[] {
  if (field.type === 'PAGE_BREAK') {
    return [
      { value: 'skip_to_section', label: 'Skip ahead to a later page' },
      { value: 'end_form', label: 'End the form after the page before this one' },
    ];
  }
  const isSection = field.type === 'SECTION';
  return [
    { value: 'show', label: isSection ? 'Show this section' : 'Show this question' },
    { value: 'hide', label: isSection ? 'Hide this section' : 'Hide this question' },
    ...(isSection ? [] : [
      { value: 'require', label: 'Make it required' },
      { value: 'optional', label: 'Make it optional' },
    ]),
    ...(NO_FILL_TYPES.includes(field.type) ? [] : [{ value: 'set_value', label: 'Fill it in automatically' }]),
    ...(CHOICE_TYPES.includes(field.type) ? [{ value: 'restrict_options', label: 'Limit the options offered' }] : []),
    { value: 'display_message', label: 'Show a note' },
  ];
}

const refOf = (id: number | string) => (Number.isInteger(Number(id)) ? Number(id) : id);
const questionName = (f: FormField) => f.label || `Question ${f.order}`;

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return String(value ?? '').split(',').map((p) => p.trim()).filter(Boolean);
}

/* ---------------------------------------------------------------- */
/* One value input, shaped by the watched question and the operator  */
/* ---------------------------------------------------------------- */

function plainInputType(target: FormField | undefined, operator: string): 'date' | 'number' | 'text' {
  if (target?.type === 'DATE' || ['before', 'after', 'on', 'before_or_equal', 'after_or_equal', 'date_between'].includes(operator)) return 'date';
  if (target && ['NUMBER', 'RATING', 'LINEAR_SCALE'].includes(target.type)) return 'number';
  return 'text';
}

function ValueEditor({ rule, target, onChange }: { rule: NLeaf; target?: FormField; onChange: (patch: Partial<NLeaf>) => void }) {
  const kind = operatorValueKind(rule.operator);
  const options = target?.options ?? [];
  const inputType = plainInputType(target, rule.operator);

  if (kind === 'none') return null;

  if (kind === 'range') {
    const [from = '', to = ''] = asList(rule.value);
    const set = (a: string, b: string) => onChange({ value: [a, b] });
    return (
      <div className="grid grid-cols-2 gap-2">
        <input type={inputType} className={inputClass} placeholder="from" aria-label="From" value={from} onChange={(e) => set(e.target.value, to)} />
        <input type={inputType} className={inputClass} placeholder="to" aria-label="To" value={to} onChange={(e) => set(from, e.target.value)} />
      </div>
    );
  }

  if (kind === 'list') {
    const chosen = asList(rule.value);
    if (options.length) {
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#FF7A00]"
                checked={chosen.includes(opt)}
                onChange={(e) => onChange({ value: e.target.checked ? [...chosen, opt] : chosen.filter((c) => c !== opt) })}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    return (
      <input
        className={inputClass}
        aria-label="Values to compare with"
        placeholder="comma-separated values"
        value={chosen.join(', ')}
        onChange={(e) => onChange({ value: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })}
      />
    );
  }

  if (options.length && CHOICE_TYPES.includes(target!.type) && !['contains', 'not_contains', 'starts_with', 'ends_with', 'matches_regex', 'not_matches_regex'].includes(rule.operator)) {
    return (
      <select className={inputClass} aria-label="Value to compare with" value={String(rule.value ?? '')} onChange={(e) => onChange({ value: e.target.value })}>
        <option value="">Select value</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  return (
    <input
      type={inputType}
      className={inputClass}
      aria-label="Value to compare with"
      placeholder={rule.operator.endsWith('regex') ? 'regular expression' : 'value to compare with'}
      value={String(rule.value ?? '')}
      onChange={(e) => onChange({ value: e.target.value })}
    />
  );
}

/* ---------------------------------------------------------------- */
/* One rule                                                          */
/* ---------------------------------------------------------------- */

function RuleRow({ rule, fields, onChange, onRemove }: {
  rule: NLeaf; fields: FormField[]; onChange: (rule: NLeaf) => void; onRemove: () => void;
}) {
  const target = fields.find((f) => String(f.id) === String(rule.field));
  const operators = operatorsFor(target?.type);
  const comparing = rule.value_field !== undefined;
  const problem = ruleProblem(rule);
  const others = fields.filter((f) => String(f.id) !== String(rule.field));

  const patch = (p: Partial<NLeaf>) => onChange({ ...rule, ...p });

  const changeField = (id: string) => {
    const next = fields.find((f) => String(f.id) === id);
    const allowed = operatorsFor(next?.type);
    const { value_field: _unused, ...rest } = rule;
    onChange({ ...rest, field: id ? refOf(id) : null, operator: allowed.includes(rule.operator) ? rule.operator : 'equals', value: '' });
  };

  const toggleComparing = (on: boolean) => {
    if (on) {
      const first = others[0];
      patch({ value_field: first ? refOf(first.id) : undefined, value: undefined });
    } else {
      const { value_field: _unused, ...rest } = rule;
      onChange({ ...rest, value: '' });
    }
  };

  return (
    <div className="rounded border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 p-2 space-y-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
        <select className={inputClass} aria-label="Question to watch" value={rule.field === null ? '' : String(rule.field)} onChange={(e) => changeField(e.target.value)}>
          <option value="">Select question</option>
          {fields.map((f) => <option key={f.id} value={String(f.id)}>{questionName(f)}</option>)}
        </select>
        <select className={inputClass} aria-label="Operator" value={rule.operator} onChange={(e) => patch({ operator: e.target.value, value: '' })}>
          {(operators.includes(rule.operator) ? operators : [rule.operator, ...operators]).map((op) => (
            <option key={op} value={op}>{OPERATOR_LABELS[op] ?? op}</option>
          ))}
        </select>
        <button type="button" onClick={onRemove} title="Remove this rule" aria-label="Remove this rule"
          className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform duration-100 active:scale-90">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {operatorValueKind(rule.operator) !== 'none' && (
        <>
          {comparing ? (
            <select className={inputClass} aria-label="Question to compare with" value={String(rule.value_field ?? '')} onChange={(e) => patch({ value_field: refOf(e.target.value) })}>
              {others.map((f) => <option key={f.id} value={String(f.id)}>{questionName(f)}</option>)}
            </select>
          ) : (
            <ValueEditor rule={rule} target={target} onChange={patch} />
          )}
          {operatorValueKind(rule.operator) === 'single' && others.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
              <input type="checkbox" className="accent-[#FF7A00]" checked={comparing} onChange={(e) => toggleComparing(e.target.checked)} />
              Compare with another question instead of a fixed value
            </label>
          )}
        </>
      )}
      {problem && <p className="text-[11px] font-semibold text-rose-500">{problem}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* A group of rules (recursive)                                      */
/* ---------------------------------------------------------------- */

function newRule(fields: FormField[]): NLeaf {
  return { field: fields[0] ? refOf(fields[0].id) : null, operator: 'equals', value: '' };
}

function GroupEditor({ group, fields, depth, onChange, onRemove }: {
  group: NGroup; fields: FormField[]; depth: number; onChange: (group: NGroup) => void; onRemove?: () => void;
}) {
  const replace = (index: number, node: Node | null) => {
    const rules = [...group.rules];
    if (node === null) rules.splice(index, 1); else rules[index] = node;
    onChange({ ...group, rules });
  };

  return (
    <div className={depth > 0 ? 'rounded border border-dashed border-orange-300 dark:border-orange-800/60 p-2 space-y-2' : 'space-y-2'}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          Match
          <select
            aria-label="Match all or any of this group"
            className="px-1.5 py-1 rounded border text-[11px] glass-panel border-slate-200 dark:border-slate-800"
            value={group.logic}
            onChange={(e) => onChange({ ...group, logic: e.target.value === 'OR' ? 'OR' : 'AND' })}
          >
            <option value="AND">all</option>
            <option value="OR">any</option>
          </select>
          of these
        </label>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[11px] font-bold text-rose-500 hover:underline">Remove group</button>
        )}
      </div>

      {group.rules.map((node, i) => (isGroup(node) ? (
        <GroupEditor key={i} group={node} fields={fields} depth={depth + 1} onChange={(g) => replace(i, g)} onRemove={() => replace(i, null)} />
      ) : (
        <RuleRow key={i} rule={node} fields={fields} onChange={(r) => replace(i, r)} onRemove={() => replace(i, null)} />
      )))}

      <div className="flex gap-3">
        <button type="button" className={smallButton} onClick={() => onChange({ ...group, rules: [...group.rules, newRule(fields)] })}>
          <Plus className="w-3 h-3" /> Add rule
        </button>
        {depth + 1 < MAX_DEPTH && (
          <button type="button" className={smallButton} onClick={() => onChange({ ...group, rules: [...group.rules, { logic: 'AND', rules: [newRule(fields)] }] })}>
            <Plus className="w-3 h-3" /> Add group
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* The action and what it needs                                      */
/* ---------------------------------------------------------------- */

function ActionValueEditor({ field, action, value, onChange, laterPageBreaks, hasUnsavedLaterPageBreaks }: {
  field: FormField; action: string; value: unknown; onChange: (value: unknown) => void;
  laterPageBreaks?: FormField[]; hasUnsavedLaterPageBreaks?: boolean;
}) {
  const options = field.options ?? [];

  if (action === 'skip_to_section') {
    const targets = laterPageBreaks ?? [];
    return (
      <div className="space-y-1">
        <select className={inputClass} aria-label="Page to skip to" value={String(value ?? '')} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Select the page to jump to</option>
          {targets.map((t) => <option key={t.id} value={String(t.id)}>{t.label || `Page starting at question ${t.order}`}</option>)}
        </select>
        {(targets.length === 0 || hasUnsavedLaterPageBreaks) && (
          <p className="text-[11px] text-slate-500">
            {targets.length === 0 ? 'Add a later page break' : 'Some later page breaks are new'} and save the form first, so each page has an id to jump to.
          </p>
        )}
      </div>
    );
  }

  if (action === 'display_message') {
    return (
      <div>
        <textarea
          className={`${inputClass} min-h-[56px]`}
          maxLength={MESSAGE_LIMIT}
          placeholder="Note shown under this question while the condition holds"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-[10px] text-slate-400 text-right">{String(value ?? '').length}/{MESSAGE_LIMIT}</p>
      </div>
    );
  }

  if (action === 'restrict_options') {
    const allowed = asList(value);
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-slate-500">Only offer these options:</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#FF7A00]"
                checked={allowed.includes(opt)}
                onChange={(e) => onChange(e.target.checked ? [...allowed, opt] : allowed.filter((a) => a !== opt))}
              />
              {opt}
            </label>
          ))}
          {options.length === 0 && <p className="text-[11px] text-slate-400">Add options to this question first.</p>}
        </div>
      </div>
    );
  }

  if (action === 'set_value') {
    if (field.type === 'CHECKBOX') {
      const chosen = asList(value);
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" className="accent-[#FF7A00]" checked={chosen.includes(opt)}
                onChange={(e) => onChange(e.target.checked ? [...chosen, opt] : chosen.filter((c) => c !== opt))} />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    if (options.length && (field.type === 'RADIO' || field.type === 'DROPDOWN')) {
      return (
        <select className={inputClass} aria-label="Value to fill in" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select the value to fill in</option>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    const type = field.type === 'DATE' ? 'date' : field.type === 'TIME' ? 'time' : ['NUMBER', 'RATING', 'LINEAR_SCALE'].includes(field.type) ? 'number' : 'text';
    return <input type={type} className={inputClass} aria-label="Value to fill in" placeholder="value to fill in" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
  }

  return null;
}

function actionProblem(action: string, value: unknown): string | null {
  if (!['set_value', 'restrict_options', 'display_message', 'skip_to_section'].includes(action)) return null;
  const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  return empty ? 'This action needs a value.' : null;
}

/* ---------------------------------------------------------------- */
/* Public component                                                  */
/* ---------------------------------------------------------------- */

export default function ConditionBuilder({ field, siblingFields, onChange, laterPageBreaks, hasUnsavedLaterPageBreaks }: {
  field: FormField;
  siblingFields: FormField[];
  onChange: (logic: any) => void;
  /** PAGE_BREAK only: saved page breaks further down the form, the pages a route can jump to. */
  laterPageBreaks?: FormField[];
  hasUnsavedLaterPageBreaks?: boolean;
}) {
  const current: NConditional | null = normalizeConditional(field.conditional_logic);
  const actions = actionsFor(field);
  const isRouting = field.type === 'PAGE_BREAK';

  const emit = (next: NConditional) => {
    const { action_value, ...rest } = next;
    onChange(action_value === undefined ? rest : { ...rest, action_value });
  };

  if (siblingFields.length === 0) {
    return (
      <div className="p-3 rounded bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs mt-2">
        <p className="font-bold text-[#FF7A00]">{isRouting ? 'Page routing' : 'Conditions'}</p>
        <p className="text-slate-500 mt-1">
          {isRouting
            ? 'Routing reacts to answers on earlier pages. Add a question above this page break first.'
            : 'Add another question first. A condition needs a question to depend on.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#FF7A00]">{isRouting ? 'Page routing' : 'Conditions'}</p>
        {current && (
          <button type="button" onClick={() => onChange({})} className="text-[11px] font-bold text-rose-500 hover:underline">
            {isRouting ? 'Remove routing' : 'Remove all conditions'}
          </button>
        )}
      </div>

      {!current ? (
        <button
          type="button"
          className={smallButton}
          onClick={() => onChange({ logic: 'AND', action: isRouting ? 'end_form' : 'show', rules: [newRule(siblingFields)] })}
        >
          <Plus className="w-3 h-3" /> {isRouting ? 'Add routing' : 'Add a condition'}
        </button>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {isRouting ? 'When the rules below hold, after the page before this one:' : 'When the rules below hold:'}
            </span>
            <select
              className={inputClass}
              value={current.action}
              onChange={(e) => {
                const { action_value: _dropped, ...rest } = current;
                emit({ ...rest, action: e.target.value });
              }}
            >
              {(actions.some((a) => a.value === current.action) ? actions : [{ value: current.action, label: current.action }, ...actions]).map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>

          <ActionValueEditor
            field={field}
            action={current.action}
            value={current.action_value}
            onChange={(value) => emit({ ...current, action_value: value })}
            laterPageBreaks={laterPageBreaks}
            hasUnsavedLaterPageBreaks={hasUnsavedLaterPageBreaks}
          />
          {actionProblem(current.action, current.action_value) && (
            <p className="text-[11px] font-semibold text-rose-500">{actionProblem(current.action, current.action_value)}</p>
          )}

          <GroupEditor
            group={{ logic: current.logic, rules: current.rules }}
            fields={siblingFields}
            depth={0}
            onChange={(group) => (group.rules.length ? emit({ ...current, ...group }) : onChange({}))}
          />
        </>
      )}
    </div>
  );
}
