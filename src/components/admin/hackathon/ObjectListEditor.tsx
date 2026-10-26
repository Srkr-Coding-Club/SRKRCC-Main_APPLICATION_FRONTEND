'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { FormSelect } from '@/components/ui/FormSelect';
import { BTN_GHOST, INPUT, LABEL } from './shared';

export interface ListField<T> {
  key: Extract<keyof T, string>;
  label: string;
  type?: 'text' | 'textarea' | 'url' | 'email' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Spans both columns instead of sharing a row. */
  wide?: boolean;
  min?: number;
  max?: number;
}

interface ObjectListEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  fields: ListField<T>[];
  blank: () => T;
  addLabel: string;
  itemLabel: (item: T, index: number) => string;
  max?: number;
  emptyText?: string;
  /** Show up/down buttons when the order matters. */
  reorderable?: boolean;
}

/** Edit a list of small records (people, sponsors, questions, criteria…) with one shared look. */
export function ObjectListEditor<T extends object>({
  items, onChange, fields, blank, addLabel, itemLabel, max, emptyText = 'Nothing added yet.', reorderable = false,
}: ObjectListEditorProps<T>) {
  const update = (index: number, key: string, value: unknown) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:text-slate-400 dark:border-slate-700">{emptyText}</p>}
      {items.map((item, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{itemLabel(item, index)}</p>
            <div className="flex shrink-0 items-center gap-1">
              {reorderable && (
                <>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" className="rounded p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down" className="rounded p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove" className="rounded p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const value = (item as Record<string, unknown>)[field.key];
              const id = `${field.key}-${index}`;
              return (
                <div key={field.key} className={field.wide || field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A2E] dark:text-white">
                      <input type="checkbox" checked={Boolean(value)} onChange={(e) => update(index, field.key, e.target.checked)} className="h-4 w-4 accent-[#FF7A00]" />
                      {field.label}
                    </label>
                  ) : (
                    <>
                      <label htmlFor={id} className={LABEL}>{field.label}</label>
                      {field.type === 'select' ? (
                        <FormSelect value={String(value ?? '')} onChange={(v) => update(index, field.key, v)} options={field.options ?? []} placeholder={field.placeholder ?? 'Choose'} allowClear={false} />
                      ) : field.type === 'textarea' ? (
                        <textarea id={id} rows={3} value={String(value ?? '')} placeholder={field.placeholder} onChange={(e) => update(index, field.key, e.target.value)} className={INPUT} />
                      ) : (
                        <input
                          id={id}
                          type={field.type ?? 'text'}
                          value={value === undefined || value === null ? '' : String(value)}
                          min={field.min}
                          max={field.max}
                          placeholder={field.placeholder}
                          onChange={(e) => update(index, field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                          className={INPUT}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, blank()])} disabled={max !== undefined && items.length >= max} className={BTN_GHOST}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}
