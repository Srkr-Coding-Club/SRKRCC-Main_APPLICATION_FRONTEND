'use client';

import React, { useState, useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye,
  Layers,
  Trash2,
  Copy,
  Type,
  Mail,
  AlignLeft,
  List,
  CheckCircle,
  CheckSquare,
  Calendar,
  Upload,
  Smartphone,
  Monitor,
  GitFork,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Undo2,
  Redo2,
  ChevronsUpDown,
  Settings2,
  Plus,
  X,
  Star,
  Sliders,
  LayoutGrid,
  PenLine,
  Phone,
  Link,
  Hash,
  Clock,
} from 'lucide-react';
import { Form, FormField, FieldType, ConditionalLogic } from '@/lib/types';

// ---------------------------------------------------------------------------
// Field type metadata
// ---------------------------------------------------------------------------

const FIELD_TYPE_COLOR: Record<string, string> = {
  TEXT: 'border-blue-500',
  PARAGRAPH: 'border-blue-400',
  EMAIL: 'border-emerald-500',
  NUMBER: 'border-purple-500',
  PHONE: 'border-purple-400',
  URL: 'border-cyan-500',
  DROPDOWN: 'border-amber-500',
  RADIO: 'border-orange-500',
  CHECKBOX: 'border-orange-400',
  DATE: 'border-indigo-500',
  TIME: 'border-indigo-400',
  FILE: 'border-[#FF7A00]',
  MULTI_FILE: 'border-orange-600',
  SECTION: 'border-slate-400',
  RATING: 'border-yellow-500',
  LINEAR_SCALE: 'border-teal-500',
  MATRIX_RADIO: 'border-cyan-600',
  MATRIX_CHECKBOX: 'border-cyan-500',
  SIGNATURE: 'border-rose-500',
};

const FIELD_TYPE_ICON: Record<string, React.ElementType> = {
  TEXT: Type,
  PARAGRAPH: AlignLeft,
  EMAIL: Mail,
  NUMBER: Hash,
  PHONE: Phone,
  URL: Link,
  DROPDOWN: List,
  RADIO: CheckCircle,
  CHECKBOX: CheckSquare,
  DATE: Calendar,
  TIME: Clock,
  FILE: Upload,
  MULTI_FILE: Upload,
  SECTION: Layers,
  RATING: Star,
  LINEAR_SCALE: Sliders,
  MATRIX_RADIO: LayoutGrid,
  MATRIX_CHECKBOX: LayoutGrid,
  SIGNATURE: PenLine,
};

interface PaletteItem {
  type: FieldType;
  label: string;
  desc: string;
  icon: React.ElementType;
}

const PALETTE_CATEGORIES: { label: string; items: PaletteItem[] }[] = [
  {
    label: 'Basic',
    items: [
      { type: 'TEXT', label: 'Short Text', icon: Type, desc: 'Single-line text entry' },
      { type: 'EMAIL', label: 'Email Address', icon: Mail, desc: 'Validated email format' },
      { type: 'PHONE', label: 'Phone Number', icon: Phone, desc: 'Phone / mobile number input' },
      { type: 'NUMBER', label: 'Number', icon: Hash, desc: 'Numeric input with optional min/max' },
      { type: 'PARAGRAPH', label: 'Long Paragraph', icon: AlignLeft, desc: 'Multi-line text area' },
      { type: 'URL', label: 'URL / Link', icon: Link, desc: 'Website or portfolio link' },
    ],
  },
  {
    label: 'Choice',
    items: [
      { type: 'DROPDOWN', label: 'Dropdown List', icon: List, desc: 'Select one from a list' },
      { type: 'RADIO', label: 'Radio Choice', icon: CheckCircle, desc: 'Single-selection radio buttons' },
      { type: 'CHECKBOX', label: 'Checkboxes', icon: CheckSquare, desc: 'Multiple-selection checkboxes' },
      { type: 'RATING', label: 'Star Rating', icon: Star, desc: '1–5 star click selector' },
      { type: 'LINEAR_SCALE', label: 'Linear Scale', icon: Sliders, desc: 'Slider with min/max labels' },
      { type: 'MATRIX_RADIO', label: 'Matrix Radio', icon: LayoutGrid, desc: 'Rows with shared radio columns' },
      { type: 'MATRIX_CHECKBOX', label: 'Matrix Checkbox', icon: LayoutGrid, desc: 'Rows with shared checkbox columns' },
    ],
  },
  {
    label: 'Media',
    items: [
      { type: 'FILE', label: 'File Upload', icon: Upload, desc: 'Single PDF / document' },
      { type: 'MULTI_FILE', label: 'Multi File Upload', icon: Upload, desc: 'Multiple attachments' },
      { type: 'SIGNATURE', label: 'Signature', icon: PenLine, desc: 'Canvas draw for signature capture' },
    ],
  },
  {
    label: 'Layout',
    items: [
      { type: 'SECTION', label: 'Section Header', icon: Layers, desc: 'Visual divider with title' },
      { type: 'DATE', label: 'Date Picker', icon: Calendar, desc: 'Calendar date selector' },
      { type: 'TIME', label: 'Time Picker', icon: Clock, desc: 'Time format selector' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Undo/Redo history reducer
// ---------------------------------------------------------------------------

interface HistoryState {
  past: FormField[][];
  present: FormField[];
  future: FormField[][];
}

type HistoryAction =
  | { type: 'SET'; payload: FormField[] }
  | { type: 'PUSH'; payload: FormField[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const MAX_HISTORY = 50;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET':
      return { ...state, present: action.payload };
    case 'PUSH': {
      const newPast = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past: newPast, present: action.payload, future: [] };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Client-side conditional logic evaluator (mirrors backend)
// ---------------------------------------------------------------------------

function evaluateSingleRule(
  rule: { if?: any; operator?: string; equals?: string; value?: string },
  answers: Record<string, any>
): boolean {
  const triggerKey = String(rule.if ?? '');
  if (!triggerKey) return true;
  const triggerVal = String(answers[triggerKey] ?? '');
  if ('equals' in rule && !('operator' in rule)) {
    return triggerVal === String(rule.equals ?? '');
  }
  const op = rule.operator ?? 'equals';
  const expected = String(rule.value ?? '');
  if (op === 'equals') return triggerVal === expected;
  if (op === 'not_equals') return triggerVal !== expected;
  if (op === 'greater_than') { try { return parseFloat(triggerVal) > parseFloat(expected); } catch { return false; } }
  if (op === 'less_than') { try { return parseFloat(triggerVal) < parseFloat(expected); } catch { return false; } }
  if (op === 'contains') return triggerVal.toLowerCase().includes(expected.toLowerCase());
  return true;
}

function evaluateVisible(fields: FormField[], answers: Record<string, any>): Set<string | number> {
  const visible = new Set<string | number>();
  const MAX_PASSES = fields.length + 1;
  let changed = true;
  let passes = 0;
  while (changed && passes < MAX_PASSES) {
    changed = false;
    passes++;
    for (const field of fields) {
      const cl = field.conditional_logic;
      let shouldShow = true;
      if (cl && (cl.rules?.length || cl.if)) {
        if (cl.rules?.length) {
          const results = cl.rules.map((r) => evaluateSingleRule(r, answers));
          shouldShow = (cl.logic === 'OR') ? results.some(Boolean) : results.every(Boolean);
        } else {
          shouldShow = evaluateSingleRule(cl as any, answers);
        }
      }
      if (shouldShow && !visible.has(field.id)) { visible.add(field.id); changed = true; }
      else if (!shouldShow && visible.has(field.id)) { visible.delete(field.id); changed = true; }
    }
  }
  return visible;
}

// ---------------------------------------------------------------------------
// Debounce utility
// ---------------------------------------------------------------------------

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Ghost card shown under the cursor during drag */
function FieldCardGhost({ type, label }: { type: FieldType; label: string }) {
  const Icon = FIELD_TYPE_ICON[type] ?? Type;
  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-[#1A1A2E] border-l-4 ${FIELD_TYPE_COLOR[type] ?? 'border-slate-400'} border border-slate-200 dark:border-slate-700 shadow-2xl opacity-90 cursor-grabbing`}>
      <GripVertical className="w-4 h-4 text-slate-400" />
      <div className="p-1.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-bold text-[#1A1A2E] dark:text-white">{label}</span>
    </div>
  );
}

/** Inline conditional logic rule builder */
function ConditionalRuleBuilder({
  field,
  allFields,
  onChange,
}: {
  field: FormField;
  allFields: FormField[];
  onChange: (cl: ConditionalLogic) => void;
}) {
  const cl = field.conditional_logic ?? {};
  const rules = cl.rules ?? [];
  const logic = cl.logic ?? 'AND';
  const precedingFields = allFields.filter((f) => f.id !== field.id && f.type !== 'SECTION');

  // Collapsed summary
  const hasCl = rules.length > 0 || cl.if;
  const summary = hasCl
    ? rules.length > 0
      ? `👁 Shown if (${logic}): ${rules.map((r) => {
          const lbl = allFields.find((f) => String(f.id) === String(r.if))?.label ?? String(r.if);
          return `"${lbl}" ${r.operator ?? 'equals'} "${r.value ?? ''}"`;
        }).join(` ${logic} `)}`
      : `👁 Legacy rule: field ${cl.if} ${cl.equals ? `= "${cl.equals}"` : ''}`
    : null;

  const addRule = () => {
    const newRules = [...rules, { if: '', operator: 'equals' as const, value: '' }];
    onChange({ logic, rules: newRules });
  };

  const removeRule = (idx: number) => {
    const newRules = rules.filter((_, i) => i !== idx);
    onChange(newRules.length ? { logic, rules: newRules } : {});
  };

  const updateRule = (idx: number, key: string, val: string) => {
    const newRules = rules.map((r, i) => (i === idx ? { ...r, [key]: val } : r));
    onChange({ logic, rules: newRules });
  };

  const toggleLogic = () => {
    onChange({ logic: logic === 'AND' ? 'OR' : 'AND', rules });
  };

  return (
    <div className="p-3 rounded-lg bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#FF7A00] uppercase tracking-wider">Conditional Visibility</p>
        {rules.length > 1 && (
          <button
            onClick={toggleLogic}
            className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#FF7A00] text-[#FF7A00] hover:bg-orange-50"
          >
            {logic} — click to toggle
          </button>
        )}
      </div>

      {summary && rules.length === 0 && (
        <p className="text-[11px] text-slate-500 italic">{summary}</p>
      )}

      {rules.map((rule, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
          <select
            value={String(rule.if ?? '')}
            onChange={(e) => updateRule(idx, 'if', e.target.value)}
            className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-700 text-[#1A1A2E] dark:text-white"
          >
            <option value="">— Select field —</option>
            {precedingFields.map((f) => (
              <option key={f.id} value={String(f.id)}>{f.label}</option>
            ))}
          </select>
          <select
            value={rule.operator ?? 'equals'}
            onChange={(e) => updateRule(idx, 'operator', e.target.value)}
            className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-700 text-[#1A1A2E] dark:text-white"
          >
            <option value="equals">equals</option>
            <option value="not_equals">≠ not equals</option>
            <option value="greater_than">&gt; greater than</option>
            <option value="less_than">&lt; less than</option>
            <option value="contains">contains</option>
          </select>
          <input
            type="text"
            placeholder="value"
            value={rule.value ?? ''}
            onChange={(e) => updateRule(idx, 'value', e.target.value)}
            className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-700 text-[#1A1A2E] dark:text-white"
          />
          <button onClick={() => removeRule(idx)} className="p-1 text-rose-400 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {rules.length > 0 && summary && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">{summary}</p>
      )}

      <button
        onClick={addRule}
        className="flex items-center space-x-1 text-[11px] font-bold text-[#FF7A00] hover:underline"
      >
        <Plus className="w-3 h-3" />
        <span>Add Rule</span>
      </button>

      {(rules.length > 0 || cl.if) && (
        <button
          onClick={() => onChange({})}
          className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold"
        >
          × Clear all rules
        </button>
      )}
    </div>
  );
}

/** A single sortable field card on the canvas */
function SortableFieldCard({
  field,
  index,
  allFields,
  isExpanded,
  onToggleExpand,
  onFieldChange,
  onRemove,
  onDuplicate,
}: {
  field: FormField;
  index: number;
  allFields: FormField[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onFieldChange: (id: number | string, key: keyof FormField, value: any) => void;
  onRemove: (id: number | string) => void;
  onDuplicate: (field: FormField) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(field.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = FIELD_TYPE_ICON[field.type] ?? Type;
  const borderColor = FIELD_TYPE_COLOR[field.type] ?? 'border-slate-400';
  const hasCl = !!(field.conditional_logic?.rules?.length || field.conditional_logic?.if);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 overflow-hidden transition-shadow ${isDragging ? 'shadow-2xl ring-2 ring-[#FF7A00]/40' : 'shadow-sm hover:shadow-md'}`}
    >
      {/* Colored left border indicator */}
      <div className={`w-1 flex-shrink-0 ${borderColor.replace('border-', 'bg-')}`} />

      <div className="flex-1 p-3 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Type icon */}
          <div className="p-1 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
            <Icon className="w-3.5 h-3.5" />
          </div>

          {/* Field number badge */}
          <span className="text-[10px] font-mono font-bold text-[#FF7A00] bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-900/30">
            #{index + 1}
          </span>

          {/* Label (collapsed shows label here) */}
          <span className="flex-1 text-xs font-bold text-[#1A1A2E] dark:text-white truncate">
            {field.label || <span className="text-slate-400 italic">Untitled Field</span>}
          </span>

          {/* Badges */}
          {field.is_required && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200 dark:border-rose-900/30">
              REQ
            </span>
          )}
          {hasCl && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-500 border border-purple-200 dark:border-purple-900/30">
              COND
            </span>
          )}

          {/* Actions */}
          <button onClick={() => onDuplicate(field)} className="p-1 text-slate-400 hover:text-[#FF7A00]" title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onRemove(field.id)} className="p-1 text-slate-400 hover:text-rose-500" title="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand toggle */}
          <button onClick={onToggleExpand} className="p-1 text-slate-400 hover:text-[#FF7A00]" title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded config */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Field Label</label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => onFieldChange(field.id, 'label', e.target.value)}
                  className="w-full px-3 py-1.5 rounded border text-xs font-bold bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              </div>
              {field.type !== 'SECTION' && field.type !== 'RATING' && field.type !== 'SIGNATURE' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => onFieldChange(field.id, 'placeholder', e.target.value)}
                    className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Options for choice types */}
            {(field.type === 'DROPDOWN' || field.type === 'RADIO' || field.type === 'CHECKBOX') && (
              <div>
                <label className="block text-[10px] font-bold text-[#FF7A00] uppercase mb-1">Options (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Option 1, Option 2, Option 3"
                  value={(field.options || []).join(', ')}
                  onChange={(e) => {
                    const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    onFieldChange(field.id, 'options', opts);
                  }}
                  className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              </div>
            )}

            {/* Rating / LinearScale bounds */}
            {(field.type === 'RATING' || field.type === 'LINEAR_SCALE') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min Value</label>
                  <input type="number" value={field.min_value ?? (field.type === 'RATING' ? 1 : 1)} onChange={(e) => onFieldChange(field.id, 'min_value', Number(e.target.value))} className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Value</label>
                  <input type="number" value={field.max_value ?? (field.type === 'RATING' ? 5 : 10)} onChange={(e) => onFieldChange(field.id, 'max_value', Number(e.target.value))} className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                </div>
                {field.type === 'LINEAR_SCALE' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min Label</label>
                      <input type="text" placeholder="e.g. Not likely" value={(field.options || [])[0] || ''} onChange={(e) => onFieldChange(field.id, 'options', [e.target.value, (field.options || [])[1] || ''])} className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Label</label>
                      <input type="text" placeholder="e.g. Very likely" value={(field.options || [])[1] || ''} onChange={(e) => onFieldChange(field.id, 'options', [(field.options || [])[0] || '', e.target.value])} className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Matrix rows + columns */}
            {(field.type === 'MATRIX_RADIO' || field.type === 'MATRIX_CHECKBOX') && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Row Labels (comma-separated)</label>
                  <input type="text" placeholder="Row 1, Row 2, Row 3" value={(field.rows || []).join(', ')} onChange={(e) => onFieldChange(field.id, 'rows', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#FF7A00] uppercase mb-1">Column Labels (comma-separated)</label>
                  <input type="text" placeholder="Column A, Column B, Column C" value={(field.options || []).join(', ')} onChange={(e) => onFieldChange(field.id, 'options', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                </div>
              </div>
            )}

            {/* Required toggle + Conditional rule */}
            <div className="flex items-center justify-between pt-1">
              {field.type !== 'SECTION' ? (
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={(e) => onFieldChange(field.id, 'is_required', e.target.checked)}
                    className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                  />
                  <span>Required</span>
                </label>
              ) : <div />}
              <button
                onClick={() => onFieldChange(field.id, 'conditional_logic', field.conditional_logic?.rules?.length || field.conditional_logic?.if ? field.conditional_logic : { logic: 'AND', rules: [{ if: '', operator: 'equals', value: '' }] })}
                className="text-[11px] font-bold text-[#FF7A00] hover:underline flex items-center space-x-1"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>{hasCl ? 'Edit Rule' : '+ Add Condition'}</span>
              </button>
            </div>

            {/* Conditional logic panel */}
            {(field.conditional_logic?.rules?.length !== undefined || field.conditional_logic?.if) && (
              <ConditionalRuleBuilder
                field={field}
                allFields={allFields}
                onChange={(cl) => onFieldChange(field.id, 'conditional_logic', cl)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Drop zone indicator between fields */
function DropZone({ isOver }: { isOver: boolean }) {
  return (
    <div
      className={`h-1.5 rounded-full transition-all duration-200 mx-2 ${
        isOver ? 'bg-[#FF7A00] opacity-100 h-2' : 'bg-transparent opacity-0'
      }`}
    />
  );
}

// ---------------------------------------------------------------------------
// Preview field renderers
// ---------------------------------------------------------------------------

function PreviewRating({ field, value, onChange }: { field: FormField; value: any; onChange: (v: number) => void }) {
  const max = field.max_value ?? 5;
  const min = field.min_value ?? 1;
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110"
        >
          <span className={star <= (hover || value || 0) ? 'text-yellow-400' : 'text-slate-300'}>★</span>
        </button>
      ))}
      {value ? <span className="text-xs text-slate-400 ml-2">{value}/{max}</span> : null}
    </div>
  );
}

function PreviewLinearScale({ field, value, onChange }: { field: FormField; value: any; onChange: (v: number) => void }) {
  const min = field.min_value ?? 1;
  const max = field.max_value ?? 10;
  const minLabel = (field.options || [])[0] || '';
  const maxLabel = (field.options || [])[1] || '';
  return (
    <div className="space-y-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FF7A00]"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min} {minLabel && `— ${minLabel}`}</span>
        <span className="font-bold text-[#FF7A00]">{value ?? '—'}</span>
        <span>{max} {maxLabel && `— ${maxLabel}`}</span>
      </div>
    </div>
  );
}

function PreviewMatrix({ field, value, onChange, isCheckbox }: { field: FormField; value: any; onChange: (v: any) => void; isCheckbox: boolean }) {
  const rows = field.rows ?? ['Row 1', 'Row 2'];
  const cols = field.options ?? ['Column A', 'Column B'];
  const current: Record<string, string | string[]> = value || {};
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-slate-500" />
            {cols.map((col) => (
              <th key={col} className="p-2 text-center text-slate-600 dark:text-slate-300 font-semibold">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t border-slate-100 dark:border-slate-800">
              <td className="p-2 font-semibold text-slate-700 dark:text-slate-300 pr-4">{row}</td>
              {cols.map((col) => (
                <td key={col} className="p-2 text-center">
                  {isCheckbox ? (
                    <input
                      type="checkbox"
                      checked={Array.isArray(current[row]) && (current[row] as string[]).includes(col)}
                      onChange={(e) => {
                        const rowVal = Array.isArray(current[row]) ? (current[row] as string[]) : [];
                        const next = e.target.checked ? [...rowVal, col] : rowVal.filter((c) => c !== col);
                        onChange({ ...current, [row]: next });
                      }}
                      className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                    />
                  ) : (
                    <input
                      type="radio"
                      name={`matrix-${field.id}-${row}`}
                      checked={current[row] === col}
                      onChange={() => onChange({ ...current, [row]: col })}
                      className="w-4 h-4 text-[#FF7A00] focus:ring-[#FF7A00]"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewSignature({ value, onChange }: { value: any; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);
  const startDraw = (e: React.MouseEvent) => {
    drawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const stopDraw = () => {
    drawing.current = false;
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };
  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-crosshair"
      />
      <div className="flex items-center space-x-3">
        <button type="button" onClick={clear} className="text-xs text-slate-400 hover:text-rose-500 font-semibold">Clear</button>
        {value && <span className="text-xs text-emerald-500 font-semibold">✓ Signature captured</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FormBuilderTabProps {
  isPreviewMode: boolean;
  setIsPreviewMode: (val: boolean) => void;
  formMeta: {
    title: string;
    slug: string;
    description: string;
    image_url: string;
    category: string;
    status: Form['status'];
    open_at: string;
    close_at: string;
    allow_multiple_responses?: boolean;
    allow_edits_until?: string;
  };
  setFormMeta: React.Dispatch<React.SetStateAction<any>>;
  builderFields: FormField[];
  setBuilderFields: (fields: FormField[]) => void;
  onAddFieldFromPalette: (type: FormField['type'], label: string) => void;
  onRemoveField: (id: number | string) => void;
  onFieldChange: (id: number | string, key: keyof FormField, value: any) => void;
  onSaveForm: () => void;
  previewAnswers: Record<string, any>;
  setPreviewAnswers: (val: any) => void;
  onTestPreviewSubmit: (e: React.FormEvent) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FormBuilderTab({
  isPreviewMode,
  setIsPreviewMode,
  formMeta,
  setFormMeta,
  builderFields,
  setBuilderFields,
  onAddFieldFromPalette,
  onRemoveField,
  onFieldChange,
  onSaveForm,
  previewAnswers,
  setPreviewAnswers,
  onTestPreviewSubmit,
}: FormBuilderTabProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePaletteItem, setActivePaletteItem] = useState<PaletteItem | null>(null);

  // Undo/redo history
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: builderFields,
    future: [],
  });

  // Sync external builderFields into history present on mount
  useEffect(() => {
    dispatch({ type: 'SET', payload: builderFields });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced history push (500ms) — avoids per-keystroke snapshots
  const pushHistory = useMemo(
    () => debounce((state: FormField[]) => dispatch({ type: 'PUSH', payload: state }), 500),
    []
  );

  const handleFieldChange = useCallback(
    (id: number | string, key: keyof FormField, value: any) => {
      onFieldChange(id, key, value);
      pushHistory(builderFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
    },
    [builderFields, onFieldChange, pushHistory]
  );

  const undo = () => {
    if (history.past.length === 0) return;
    dispatch({ type: 'UNDO' });
    setBuilderFields(history.past[history.past.length - 1]);
  };

  const redo = () => {
    if (history.future.length === 0) return;
    dispatch({ type: 'REDO' });
    setBuilderFields(history.future[0]);
  };

  const handleRemoveField = (id: number | string) => {
    const next = builderFields.filter((f) => f.id !== id);
    onRemoveField(id);
    dispatch({ type: 'PUSH', payload: next });
  };

  const handleDuplicateField = (field: FormField) => {
    const cloned: FormField = {
      ...field,
      id: Date.now().toString(),
      label: `${field.label} (Copy)`,
      order: builderFields.length + 1,
      options: field.options ? [...field.options] : [],
      rows: field.rows ? [...field.rows] : [],
      validation_rules: field.validation_rules ? { ...field.validation_rules } : {},
      conditional_logic: field.conditional_logic ? { ...field.conditional_logic } : {},
    };
    const next = [...builderFields, cloned];
    setBuilderFields(next);
    dispatch({ type: 'PUSH', payload: next });
    setExpandedIds((prev) => new Set([...prev, String(cloned.id)]));
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    // Check if it's a palette item (prefixed with 'palette-')
    if (id.startsWith('palette-')) {
      const type = id.replace('palette-', '') as FieldType;
      for (const cat of PALETTE_CATEGORIES) {
        const found = cat.items.find((i) => i.type === type);
        if (found) { setActivePaletteItem(found); break; }
      }
    } else {
      setActivePaletteItem(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActivePaletteItem(null);

    if (!over) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    // Palette → canvas drop
    if (activeStr.startsWith('palette-')) {
      const type = activeStr.replace('palette-', '') as FieldType;
      const item = PALETTE_CATEGORIES.flatMap((c) => c.items).find((i) => i.type === type);
      if (item && (overStr === 'canvas-drop' || !activeStr.startsWith('palette-') || builderFields.some((f) => String(f.id) === overStr))) {
        onAddFieldFromPalette(item.type, item.label);
        const newId = Date.now().toString();
        dispatch({ type: 'PUSH', payload: [...builderFields, { id: newId, label: item.label, type: item.type, is_required: false, order: builderFields.length + 1 }] });
      }
      return;
    }

    // Canvas reorder
    if (activeStr !== overStr) {
      const oldIdx = builderFields.findIndex((f) => String(f.id) === activeStr);
      const newIdx = builderFields.findIndex((f) => String(f.id) === overStr);
      if (oldIdx !== -1 && newIdx !== -1) {
        const reordered = arrayMove(builderFields, oldIdx, newIdx).map((f, i) => ({ ...f, order: i + 1 }));
        setBuilderFields(reordered);
        dispatch({ type: 'PUSH', payload: reordered });
      }
    }
  };

  // Expand / collapse all
  const expandAll = () => setExpandedIds(new Set(builderFields.map((f) => String(f.id))));
  const collapseAll = () => setExpandedIds(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCategory = (label: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  // Preview: compute visible fields based on answers
  const visiblePreviewIds = useMemo(
    () => evaluateVisible(builderFields, previewAnswers),
    [builderFields, previewAnswers]
  );

  const totalRequired = builderFields.filter((f) => f.is_required).length;
  const totalConditional = builderFields.filter((f) => f.conditional_logic?.rules?.length || f.conditional_logic?.if).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-[#151722] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider">
              Dynamic Form Builder Canvas
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {builderFields.length} Fields · {totalRequired} Required · {totalConditional} Conditional
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {!isPreviewMode && (
            <>
              {/* Undo / Redo */}
              <button onClick={undo} disabled={history.past.length === 0} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#FF7A00] disabled:opacity-30" title="Undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={history.future.length === 0} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#FF7A00] disabled:opacity-30" title="Redo">
                <Redo2 className="w-4 h-4" />
              </button>

              {/* Collapse All / Expand All */}
              <button onClick={collapseAll} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#FF7A00]" title="Collapse All">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={expandAll} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#FF7A00]" title="Expand All">
                <ChevronsUpDown className="w-4 h-4" />
              </button>

              {/* Form Settings */}
              <button
                onClick={() => setShowFormSettings(!showFormSettings)}
                className={`p-2 rounded border text-slate-500 hover:text-[#FF7A00] transition ${showFormSettings ? 'border-[#FF7A00] text-[#FF7A00]' : 'border-slate-200 dark:border-slate-700'}`}
                title="Form Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Viewport toggle in preview */}
          {isPreviewMode && (
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
              <button onClick={() => setViewportMode('desktop')} className={`p-1.5 rounded ${viewportMode === 'desktop' ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow' : 'text-slate-400'}`}>
                <Monitor className="w-4 h-4" />
              </button>
              <button onClick={() => setViewportMode('mobile')} className={`p-1.5 rounded ${viewportMode === 'mobile' ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow' : 'text-slate-400'}`}>
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              isPreviewMode ? 'bg-purple-600 text-white shadow' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isPreviewMode ? 'Exit Preview' : '👁️ Live Preview'}</span>
          </button>
        </div>
      </div>

      {/* Form Settings Panel */}
      {showFormSettings && !isPreviewMode && (
        <div className="bg-white dark:bg-[#151722] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-[#FF7A00] tracking-wider flex items-center space-x-2">
            <Settings2 className="w-4 h-4" />
            <span>Form Settings</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer col-span-full sm:col-span-1">
              <input
                type="checkbox"
                checked={formMeta.allow_multiple_responses ?? false}
                onChange={(e) => setFormMeta({ ...formMeta, allow_multiple_responses: e.target.checked })}
                className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
              />
              <span>Allow Multiple Responses</span>
            </label>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Allow Edits Until</label>
              <input
                type="datetime-local"
                value={formMeta.allow_edits_until || ''}
                onChange={(e) => setFormMeta({ ...formMeta, allow_edits_until: e.target.value })}
                className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Close Form At</label>
              <input
                type="datetime-local"
                value={formMeta.close_at || ''}
                onChange={(e) => setFormMeta({ ...formMeta, close_at: e.target.value })}
                className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {isPreviewMode ? (
        <div
          className={`bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-purple-200 dark:border-purple-900 shadow-xl transition-all duration-300 mx-auto space-y-6 ${
            viewportMode === 'mobile' ? 'max-w-[390px] border-2 border-slate-700 rounded-3xl' : 'max-w-3xl'
          }`}
        >
          <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                {viewportMode === 'mobile' ? '📱 Mobile Preview' : '🖥️ Desktop Preview'}
              </span>
            </div>
            <button onClick={() => setIsPreviewMode(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Exit Preview
            </button>
          </div>

          {formMeta.image_url && (
            <div className="h-44 rounded-lg overflow-hidden bg-slate-900">
              <img src={formMeta.image_url} alt={formMeta.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-orange-50 text-[#FF7A00]">{formMeta.category}</span>
            <h2 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white mt-2">{formMeta.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{formMeta.description}</p>
          </div>

          <form onSubmit={(e) => { onTestPreviewSubmit(e); setShowPayload(true); }} className="space-y-6">
            {builderFields.map((field) => {
              if (!visiblePreviewIds.has(field.id)) return null;

              if (field.type === 'SECTION') {
                return (
                  <div key={field.id} className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-[#FF7A00]">{field.label}</h3>
                    {field.placeholder && <p className="text-xs text-slate-400 mt-0.5">{field.placeholder}</p>}
                  </div>
                );
              }

              const key = String(field.id);
              const inputCls = 'w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800';

              return (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                    {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                  </label>

                  {(field.type === 'TEXT' || field.type === 'EMAIL' || field.type === 'PHONE' || field.type === 'URL' || field.type === 'NUMBER' || field.type === 'DATE' || field.type === 'TIME') && (
                    <input
                      type={field.type === 'TEXT' || field.type === 'PHONE' || field.type === 'URL' ? 'text' : field.type.toLowerCase()}
                      required={field.is_required}
                      placeholder={field.placeholder || ''}
                      value={previewAnswers[key] || ''}
                      onChange={(e) => setPreviewAnswers({ ...previewAnswers, [key]: e.target.value })}
                      className={inputCls}
                    />
                  )}

                  {field.type === 'PARAGRAPH' && (
                    <textarea rows={3} required={field.is_required} placeholder={field.placeholder || ''} value={previewAnswers[key] || ''} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [key]: e.target.value })} className={inputCls} />
                  )}

                  {field.type === 'DROPDOWN' && (
                    <select required={field.is_required} value={previewAnswers[key] || ''} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [key]: e.target.value })} className={inputCls}>
                      <option value="">Select option...</option>
                      {(field.options || ['Option 1', 'Option 2']).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}

                  {field.type === 'RADIO' && (
                    <div className="space-y-2 pt-1">
                      {(field.options || ['Option 1', 'Option 2']).map((opt) => (
                        <label key={opt} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input type="radio" name={`preview-${field.id}`} value={opt} checked={previewAnswers[key] === opt} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [key]: e.target.value })} className="w-4 h-4 text-[#FF7A00] focus:ring-[#FF7A00]" />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.type === 'CHECKBOX' && (
                    <div className="space-y-2 pt-1">
                      {(field.options || ['Option 1', 'Option 2']).map((opt) => (
                        <label key={opt} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input type="checkbox" value={opt} checked={Array.isArray(previewAnswers[key]) && previewAnswers[key].includes(opt)} onChange={(e) => {
                            const curr = Array.isArray(previewAnswers[key]) ? previewAnswers[key] : [];
                            const next = e.target.checked ? [...curr, opt] : curr.filter((i: string) => i !== opt);
                            setPreviewAnswers({ ...previewAnswers, [key]: next });
                          }} className="w-4 h-4 text-[#FF7A00] rounded" />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(field.type === 'FILE' || field.type === 'MULTI_FILE') && (
                    <input type="file" multiple={field.type === 'MULTI_FILE'} onChange={(e) => { const files = Array.from(e.target.files || []).map((f) => f.name); setPreviewAnswers({ ...previewAnswers, [key]: files.join(', ') }); }} className={inputCls} />
                  )}

                  {field.type === 'RATING' && (
                    <PreviewRating field={field} value={previewAnswers[key]} onChange={(v) => setPreviewAnswers({ ...previewAnswers, [key]: v })} />
                  )}

                  {field.type === 'LINEAR_SCALE' && (
                    <PreviewLinearScale field={field} value={previewAnswers[key]} onChange={(v) => setPreviewAnswers({ ...previewAnswers, [key]: v })} />
                  )}

                  {field.type === 'MATRIX_RADIO' && (
                    <PreviewMatrix field={field} value={previewAnswers[key]} onChange={(v) => setPreviewAnswers({ ...previewAnswers, [key]: v })} isCheckbox={false} />
                  )}

                  {field.type === 'MATRIX_CHECKBOX' && (
                    <PreviewMatrix field={field} value={previewAnswers[key]} onChange={(v) => setPreviewAnswers({ ...previewAnswers, [key]: v })} isCheckbox={true} />
                  )}

                  {field.type === 'SIGNATURE' && (
                    <PreviewSignature value={previewAnswers[key]} onChange={(v) => setPreviewAnswers({ ...previewAnswers, [key]: v })} />
                  )}
                </div>
              );
            })}

            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-6 py-3 rounded-lg bg-purple-600 text-white font-bold text-sm shadow-md hover:bg-purple-700 transition">
                Test Submit Response
              </button>
            </div>
          </form>

          {/* Simulated JSON Payload */}
          {showPayload && (
            <div className="mt-4 p-4 rounded-lg bg-slate-900 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">✅ Simulated Payload</p>
                <button onClick={() => setShowPayload(false)} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
              <pre className="text-[10px] font-mono text-slate-300 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(previewAnswers, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        /* Builder Canvas Grid */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Palette Sidebar */}
            <div className="lg:col-span-4 bg-white dark:bg-[#151722] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#FF7A00]" />
                <span>Field Palette</span>
              </h3>
              <p className="text-xs text-slate-500">Click or drag a field type onto the canvas.</p>

              <div className="space-y-3">
                {PALETTE_CATEGORIES.map((cat) => {
                  const isCollapsed = collapsedCategories.has(cat.label);
                  return (
                    <div key={cat.label}>
                      <button
                        onClick={() => toggleCategory(cat.label)}
                        className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-[#FF7A00] py-1 transition"
                      >
                        <span>{cat.label}</span>
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                          {cat.items.map((item) => {
                            const Icon = item.icon;
                            const borderColor = FIELD_TYPE_COLOR[item.type] ?? 'border-slate-400';
                            return (
                              <button
                                key={item.type}
                                id={`palette-${item.type}`}
                                onClick={() => onAddFieldFromPalette(item.type, item.label)}
                                title={item.desc}
                                className={`group p-2.5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 hover:border-[#FF7A00] border-l-4 ${borderColor} flex items-center space-x-3 text-left transition`}
                              >
                                <div className="p-1.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] flex-shrink-0">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] truncate">{item.label}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Builder Canvas */}
            <div className="lg:col-span-8 bg-white dark:bg-[#151722] p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">Form Canvas</h2>
                  <p className="text-xs text-slate-500">Drag fields to reorder. Click ▾ to configure.</p>
                </div>
                <button onClick={onSaveForm} className="px-6 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-xs shadow-md transition">
                  Save &amp; Publish Form
                </button>
              </div>

              {/* Form Meta */}
              <div className="space-y-4 p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Form Title *</label>
                    <input type="text" value={formMeta.title} onChange={(e) => setFormMeta({ ...formMeta, title: e.target.value })} className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Category *</label>
                    <select value={formMeta.category} onChange={(e) => setFormMeta({ ...formMeta, category: e.target.value })} className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800">
                      <option>Hackathon</option>
                      <option>Workshop</option>
                      <option>Recruitment</option>
                      <option>Survey</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Description</label>
                  <textarea rows={2} value={formMeta.description} onChange={(e) => setFormMeta({ ...formMeta, description: e.target.value })} className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Banner Cover Image URL</label>
                  <input type="text" value={formMeta.image_url} onChange={(e) => setFormMeta({ ...formMeta, image_url: e.target.value })} className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800" />
                </div>
              </div>

              {/* Sortable field list */}
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">
                  Canvas Fields ({builderFields.length})
                </h3>

                {builderFields.length === 0 && (
                  <div
                    id="canvas-drop"
                    className="h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm text-slate-400"
                  >
                    Click or drag field types here to start building
                  </div>
                )}

                <SortableContext
                  items={builderFields.map((f) => String(f.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2" id="canvas-drop">
                    {builderFields.map((field, idx) => (
                      <SortableFieldCard
                        key={field.id}
                        field={field}
                        index={idx}
                        allFields={builderFields}
                        isExpanded={expandedIds.has(String(field.id))}
                        onToggleExpand={() => toggleExpand(String(field.id))}
                        onFieldChange={handleFieldChange}
                        onRemove={handleRemoveField}
                        onDuplicate={handleDuplicateField}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>
          </div>

          {/* DragOverlay — ghost card rendered under cursor */}
          <DragOverlay dropAnimation={null}>
            {activeId && activePaletteItem ? (
              <FieldCardGhost type={activePaletteItem.type} label={activePaletteItem.label} />
            ) : activeId ? (
              (() => {
                const draggingField = builderFields.find((f) => String(f.id) === activeId);
                return draggingField ? <FieldCardGhost type={draggingField.type} label={draggingField.label} /> : null;
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
