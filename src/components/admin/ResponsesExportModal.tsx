'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';
import Portal from '@/components/ui/Portal';

export type ResponseExportFormat = 'csv' | 'xlsx' | 'json';
export type ResponseExportScope = 'all' | 'selected';

export interface ResponseExportColumn {
  key: string;
  label: string;
  group: 'details' | 'questions';
}

/** Mirrors the response-detail columns the export endpoint offers (apps/forms/adapter COMMON_COLUMNS). */
export const RESPONSE_DETAIL_COLUMNS: ResponseExportColumn[] = [
  { key: 'id', label: 'Response ID', group: 'details' },
  { key: 'form_title', label: 'Form', group: 'details' },
  { key: 'name', label: 'Full Name', group: 'details' },
  { key: 'email', label: 'Email', group: 'details' },
  { key: 'roll_number', label: 'Roll Number', group: 'details' },
  { key: 'is_manual_entry', label: 'Manual Entry', group: 'details' },
  { key: 'submitted_at', label: 'Submitted At', group: 'details' },
];

const FORMATS: { value: ResponseExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV File' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'json', label: 'JSON Data' },
];

const GROUP_LABELS: Record<ResponseExportColumn['group'], string> = {
  details: 'Response details',
  questions: 'Questions',
};

interface ResponsesExportModalProps {
  open: boolean;
  onClose: () => void;
  initialScope: ResponseExportScope;
  columns: ResponseExportColumn[];
  matchingCount: number;
  selectedCount: number;
  activeFilterCount: number;
  exporting: boolean;
  onExport: (
    format: ResponseExportFormat,
    scope: ResponseExportScope,
    columnKeys: string[],
  ) => Promise<boolean>;
}

export default function ResponsesExportModal({
  open,
  onClose,
  initialScope,
  columns,
  matchingCount,
  selectedCount,
  activeFilterCount,
  exporting,
  onExport,
}: ResponsesExportModalProps) {
  const [format, setFormat] = useState<ResponseExportFormat>('csv');
  const [scope, setScope] = useState<ResponseExportScope>(initialScope);
  // Tracks what the admin unticked, not what they ticked, so a question that
  // appears later (or a poll that rebuilds the column list) keeps its default.
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(() => new Set());

  // Each time the modal opens, start from the scope the caller asked for
  // and with every column ticked.
  useEffect(() => {
    if (!open) return;
    setScope(initialScope);
    setExcludedKeys(new Set());
  }, [open, initialScope]);

  const selectedColumns = useMemo(
    () => columns.filter((c) => !excludedKeys.has(c.key)),
    [columns, excludedKeys],
  );

  if (!open) return null;

  const hasSelection = selectedCount > 0;
  const hasColumns = selectedColumns.length > 0;

  const toggleColumn = (key: string) => {
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    const ok = await onExport(format, scope, selectedColumns.map((c) => c.key));
    if (ok) onClose();
  };

  const groups = (['details', 'questions'] as const)
    .map((group) => ({ group, items: columns.filter((c) => c.group === group) }))
    .filter(({ items }) => items.length > 0);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="responses-export-title"
          onClick={(e) => e.stopPropagation()}
          className="glass-panel-solid flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span id="responses-export-title" className="text-base font-bold text-slate-900 dark:text-white">Export Responses</span>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex items-center justify-center min-h-9 min-w-9 p-1.5 transition-transform duration-100 active:scale-90">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">Export Format</p>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer
                      ${format === value ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">Export Scope</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95
                    ${scope === 'all' ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'}`}
                >
                  All matching ({matchingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  disabled={!hasSelection}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                    ${scope === 'selected' ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'}`}
                >
                  Selected rows only ({selectedCount})
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Columns <span className="font-normal normal-case text-slate-500">({selectedColumns.length} of {columns.length})</span>
                </p>
                <div className="flex gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setExcludedKeys(new Set())}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcludedKeys(new Set(columns.map((c) => c.key)))}
                    className="text-slate-500 hover:underline dark:text-slate-400"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-60 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/60">
                {groups.map(({ group, items }) => (
                  <div key={group}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {GROUP_LABELS[group]}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {items.map((column) => (
                        <label key={column.key} className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={!excludedKeys.has(column.key)}
                            onChange={() => toggleColumn(column.key)}
                            className="mt-0.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                          />
                          <span className="break-words">{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!hasColumns && (
                <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">Select at least one column to export.</p>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {scope === 'all' && activeFilterCount > 0 && (
                <p>Filters: <span className="text-blue-600 dark:text-blue-400 font-bold">{activeFilterCount} active</span></p>
              )}
              {scope === 'selected' && (
                <p>Exports only the {selectedCount} ticked {selectedCount === 1 ? 'row' : 'rows'}, including rows on other pages.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !hasColumns || (scope === 'all' && matchingCount === 0) || (scope === 'selected' && !hasSelection)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
