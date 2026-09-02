'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns,
  Database, Download, Eye, EyeOff, Filter, MoreHorizontal, RefreshCw,
  Search, Settings, SlidersHorizontal, X, Info, AlertCircle,
  CheckCircle2, Circle, Minus, HelpCircle, ArrowUpDown, ArrowUp, ArrowDown,
  ExternalLink
} from 'lucide-react';

import { useDMCCatalog } from '@/hooks/dmc/useDMCCatalog';
import { useDMCColumns } from '@/hooks/dmc/useDMCColumns';
import { useDMCQuery } from '@/hooks/dmc/useDMCQuery';
import { useDMCSchema } from '@/hooks/dmc/useDMCSchema';
import { dmcApi } from '@/lib/dmc-api';
import type {
  CanonicalValue, ColumnDefinition, DatasetDefinition,
  ExportFormat, FilterClause, FilterDefinition, SortClause
} from '@/lib/types/dmc';

// ============================================================================
// Utility helpers
// ============================================================================

function formatCell(cv: CanonicalValue | undefined): { text: string; state: string } {
  if (!cv) return { text: '—', state: 'not_applicable' };
  if (cv.state === 'not_applicable') return { text: '—', state: 'not_applicable' };
  if (cv.state === 'empty') return { text: '(empty)', state: 'empty' };
  if (cv.state === 'unknown') return { text: '[Unavailable]', state: 'unknown' };
  return { text: cv.display_value || String(cv.value ?? ''), state: 'value' };
}

function StateIcon({ state }: { state: string }) {
  if (state === 'not_applicable') return <Minus className="w-3 h-3 text-slate-500 inline" />;
  if (state === 'empty') return <Circle className="w-3 h-3 text-slate-400 inline" />;
  if (state === 'unknown') return <HelpCircle className="w-3 h-3 text-amber-400 inline" />;
  return null;
}

function StateBadge({ cv, col }: { cv: CanonicalValue | undefined; col: ColumnDefinition }) {
  const { text, state } = formatCell(cv);
  const isEmpty = state !== 'value';
  const isBoolean = cv?.type === 'boolean';
  const isBadge = col.renderer === 'badge';
  const isLink = col.renderer === 'link' || col.renderer === 'email';

  if (isEmpty) {
    return (
      <span className="flex items-center gap-1 text-slate-500 text-xs italic">
        <StateIcon state={state} />
        {state === 'not_applicable' ? '' : text}
      </span>
    );
  }

  if (isBoolean) {
    const val = cv?.value;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${val ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
        {val ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {val ? 'Yes' : 'No'}
      </span>
    );
  }

  if (isBadge) {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-500/20 text-purple-300', CLUB_LEAD: 'bg-violet-500/20 text-violet-300',
      VOLUNTEER: 'bg-blue-500/20 text-blue-300', JUDGE: 'bg-amber-500/20 text-amber-300',
      MEMBER: 'bg-slate-500/20 text-slate-300', Leader: 'bg-cyan-500/20 text-cyan-300',
      Member: 'bg-slate-500/20 text-slate-300', CSE: 'bg-emerald-500/20 text-emerald-300',
      ECE: 'bg-orange-500/20 text-orange-300', IT: 'bg-sky-500/20 text-sky-300',
      PASSED: 'bg-emerald-500/20 text-emerald-300', FAILED: 'bg-red-500/20 text-red-300',
    };
    const cls = colors[text] ?? 'bg-slate-500/20 text-slate-300';
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
  }

  if (col.renderer === 'link' || col.renderer === 'email') {
    const href = col.renderer === 'email' ? `mailto:${text}` : text;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 text-xs flex items-center gap-1 truncate max-w-[180px]">
        <span className="truncate">{text}</span>
        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
      </a>
    );
  }

  return <span className="text-slate-200 text-sm truncate">{text}</span>;
}

// ============================================================================
// Sidebar
// ============================================================================

interface SidebarProps {
  grouped: Record<string, DatasetDefinition[]>;
  active: DatasetDefinition | null;
  onSelect: (d: DatasetDefinition) => void;
  loading: boolean;
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  Users: Database, Forms: Database, Hackathons: Activity, Events: Database,
  CodeQuest: Database, Careers: Database,
};

function Sidebar({ grouped, active, onSelect, loading }: SidebarProps) {
  const groups = Object.keys(grouped);
  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-100">Datasets</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">Select a dataset to explore</p>
      </div>
      <div className="flex-1 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
          </div>
        ) : (
          groups.map(group => (
            <div key={group} className="mb-3">
              <div className="px-4 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{group}</span>
              </div>
              {grouped[group].map(d => {
                const isActive = active?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm transition-all
                      ${isActive
                        ? 'bg-blue-600/20 text-blue-300 border-r-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.health === 'OK' ? 'bg-emerald-500' : d.health === 'DEGRADED' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="truncate">{d.label}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// ============================================================================
// Column Visibility Panel
// ============================================================================

function ColumnPanel({
  open, onClose, allColumns, visibleKeys, toggleColumn, showAll, resetToDefaults,
}: {
  open: boolean;
  onClose: () => void;
  allColumns: ColumnDefinition[];
  visibleKeys: Set<string>;
  toggleColumn: (key: string) => void;
  showAll: () => void;
  resetToDefaults: () => void;
}) {
  if (!open) return null;
  const categories = [...new Set(allColumns.map(c => c.category))];

  return (
    <div className="absolute right-0 top-10 z-40 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-semibold text-slate-100">Column Visibility</span>
        <div className="flex gap-2">
          <button onClick={showAll} className="text-xs text-blue-400 hover:text-blue-300">All</button>
          <span className="text-slate-600">|</span>
          <button onClick={resetToDefaults} className="text-xs text-slate-400 hover:text-slate-200">Reset</button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto py-2">
        {categories.map(cat => (
          <div key={cat} className="mb-2">
            <div className="px-4 py-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{cat}</span>
            </div>
            {allColumns.filter(c => c.category === cat).map(col => (
              <label key={col.key} className="flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={visibleKeys.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="w-3.5 h-3.5 accent-blue-500"
                />
                <div>
                  <p className="text-xs text-slate-200">{col.label}</p>
                  {col.description && <p className="text-[10px] text-slate-500 truncate">{col.description}</p>}
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Filter Bar
// ============================================================================

function FilterBar({
  filters, activeFilters, onFilterChange, onClearAll
}: {
  filters: FilterDefinition[];
  activeFilters: FilterClause[];
  onFilterChange: (clauses: FilterClause[]) => void;
  onClearAll: () => void;
}) {
  const addFilter = (filter: FilterDefinition) => {
    if (activeFilters.find(f => f.field === filter.key)) return;
    const def = filter.options[0];
    onFilterChange([...activeFilters, { field: filter.key, operator: filter.operators[0], value: def?.value ?? '' }]);
  };

  const updateFilter = (idx: number, partial: Partial<FilterClause>) => {
    const updated = [...activeFilters];
    updated[idx] = { ...updated[idx], ...partial };
    onFilterChange(updated);
  };

  const removeFilter = (idx: number) => {
    onFilterChange(activeFilters.filter((_, i) => i !== idx));
  };

  const availableFilters = filters.filter(f => !activeFilters.find(a => a.field === f.key));

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-1">
      {activeFilters.map((af, idx) => {
        const def = filters.find(f => f.key === af.field);
        if (!def) return null;
        return (
          <div key={idx} className="flex items-center gap-1.5 bg-blue-600/15 border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-blue-300 font-medium">{def.label}:</span>
            {def.type === 'select' && (
              <select
                value={String(af.value)}
                onChange={e => updateFilter(idx, { value: e.target.value })}
                className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer"
              >
                {def.options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
              </select>
            )}
            {def.type === 'boolean' && (
              <select
                value={String(af.value)}
                onChange={e => updateFilter(idx, { value: e.target.value === 'true' })}
                className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            )}
            {def.type === 'text' && (
              <input
                value={String(af.value)}
                onChange={e => updateFilter(idx, { value: e.target.value })}
                className="bg-transparent text-slate-200 text-xs outline-none w-24"
                placeholder="value..."
              />
            )}
            <button onClick={() => removeFilter(idx)} className="text-slate-400 hover:text-red-400 ml-1"><X className="w-3 h-3" /></button>
          </div>
        );
      })}
      {availableFilters.length > 0 && (
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-dashed border-slate-600 rounded-lg px-2.5 py-1.5 hover:border-slate-400 transition-colors">
            <Filter className="w-3 h-3" /> Add filter
          </button>
          <div className="absolute top-9 left-0 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-48 py-1 hidden group-hover:block">
            {availableFilters.map(f => (
              <button key={f.key} onClick={() => addFilter(f)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeFilters.length > 0 && (
        <button onClick={onClearAll} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
          <X className="w-3 h-3" /> Clear all
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Export Modal
// ============================================================================

function ExportModal({
  open, onClose, dataset, visibleKeys, activeFilters, search, sort,
}: {
  open: boolean;
  onClose: () => void;
  dataset: DatasetDefinition | null;
  visibleKeys: string[];
  activeFilters: FilterClause[];
  search: string;
  sort: SortClause;
}) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [rowScope, setRowScope] = useState<'all_filtered' | 'selected'>('all_filtered');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asyncJob, setAsyncJob] = useState<{ jobId: number; status: string } | null>(null);

  if (!open || !dataset) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dmcApi.export(dataset.id, {
        format,
        row_scope: rowScope,
        column_scope: 'visible',
        selected_record_ids: [],
        visible_column_keys: visibleKeys,
        search,
        sort,
        filters: activeFilters,
      });
      if (result.mode === 'sync') {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      } else {
        setAsyncJob({ jobId: result.jobId, status: 'QUEUED' });
        // Poll for completion
        const poll = setInterval(async () => {
          const status = await dmcApi.getExportJobStatus(result.jobId);
          setAsyncJob({ jobId: result.jobId, status: status.status });
          if (status.downloadable) {
            clearInterval(poll);
            window.location.href = dmcApi.getExportDownloadUrl(result.jobId);
            setTimeout(onClose, 1000);
          }
          if (status.status === 'FAILED') {
            clearInterval(poll);
            setError(status.error_message ?? 'Export failed.');
          }
        }, 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const caps = dataset.capabilities;
  const formats: { fmt: ExportFormat; label: string; enabled: boolean }[] = [
    { fmt: 'csv', label: 'CSV', enabled: caps.export_csv },
    { fmt: 'xlsx', label: 'XLSX', enabled: caps.export_xlsx },
    { fmt: 'json', label: 'JSON', enabled: caps.export_json },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-100">Export Dataset</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-200" /></button>
        </div>
        <div className="p-6 space-y-5">
          {asyncJob ? (
            <div className="text-center py-4">
              <RefreshCw className={`w-8 h-8 mx-auto mb-3 ${asyncJob.status === 'COMPLETED' ? 'text-emerald-400' : 'text-blue-400 animate-spin'}`} />
              <p className="text-sm text-slate-200 font-medium">{asyncJob.status === 'COMPLETED' ? 'Export ready! Downloading…' : `Export ${asyncJob.status.toLowerCase()}…`}</p>
              <p className="text-xs text-slate-500 mt-1">Large exports are processed in the background.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">Format</label>
                <div className="flex gap-2">
                  {formats.map(({ fmt, label, enabled }) => (
                    <button
                      key={fmt}
                      disabled={!enabled}
                      onClick={() => setFormat(fmt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                        ${format === fmt ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}
                        ${!enabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">Rows</label>
                <div className="flex gap-2">
                  {(['all_filtered', 'selected'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setRowScope(s)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all
                        ${rowScope === s ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      {s === 'all_filtered' ? 'All (matching filters)' : 'Selected rows'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-xs text-slate-400">
                <p>Columns exported: <span className="text-slate-200 font-medium">{visibleKeys.length} visible columns</span></p>
                {activeFilters.length > 0 && <p className="mt-0.5">Filters applied: <span className="text-blue-300">{activeFilters.length} active</span></p>}
              </div>
              {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
            </>
          )}
        </div>
        {!asyncJob && (
          <div className="px-6 pb-5 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-slate-400 border border-slate-700 hover:border-slate-500">Cancel</button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Data Grid
// ============================================================================

function DataGrid({
  records, columns, sort, onSort, loading, empty,
}: {
  records: import('@/lib/types/dmc').DMCRecord[];
  columns: ColumnDefinition[];
  sort: SortClause;
  onSort: (field: string) => void;
  loading: boolean;
  empty: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading data…</p>
      </div>
    );
  }
  if (empty || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Database className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">No records found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-900 border-b border-slate-800">
            {columns.map(col => {
              const isActive = sort.field === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort(col.key)}
                  className={`text-left px-4 py-3 font-medium text-slate-400 text-xs whitespace-nowrap select-none
                    ${col.sortable ? 'cursor-pointer hover:text-slate-200 hover:bg-slate-800/60' : ''}
                    ${isActive ? 'text-blue-400' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      isActive
                        ? (sort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                        : <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {records.map((record, rowIdx) => (
            <motion.tr
              key={rowIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rowIdx * 0.01, duration: 0.15 }}
              className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 max-w-[240px] truncate">
                  <StateBadge cv={record[col.key]} col={col} />
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Pagination
// ============================================================================

function Pagination({ page, totalPages, total, pageSize, onPage }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
      <p className="text-xs text-slate-500">
        Showing <span className="text-slate-300">{start}–{end}</span> of <span className="text-slate-300">{total.toLocaleString()}</span> records
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 px-2">{page} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main DMC Workspace
// ============================================================================

export default function DataManagementCenter() {
  const { grouped, loading: catalogLoading } = useDMCCatalog();
  const [activeDataset, setActiveDataset] = useState<DatasetDefinition | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortClause>({ field: 'created_at', direction: 'desc' });
  const [activeFilters, setActiveFilters] = useState<FilterClause[]>([]);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { columns: allColumns, filters: filterDefs, loading: schemaLoading } = useDMCSchema(activeDataset?.id ?? null);
  const { visibleKeys, visibleColumns, toggleColumn, showAll, resetToDefaults, isVisible } = useDMCColumns(allColumns);
  const { records, total, page, totalPages, loading: queryLoading, error: queryError, fetch: runQuery, pageSize } = useDMCQuery({ datasetId: activeDataset?.id ?? null });

  // When dataset changes, reset everything and run query
  useEffect(() => {
    if (!activeDataset) return;
    setSearch('');
    setDebouncedSearch('');
    setActiveFilters([]);
    setSort({ field: activeDataset.default_sort_field, direction: activeDataset.default_sort_direction as 'asc' | 'desc' });
    setShowFilters(false);
  }, [activeDataset]);

  // When schema loads, run initial query
  useEffect(() => {
    if (!activeDataset || schemaLoading || allColumns.length === 0) return;
    const visColKeys = allColumns.filter(c => c.visible_by_default).map(c => c.key);
    runQuery(1, '', { field: activeDataset.default_sort_field, direction: activeDataset.default_sort_direction as 'asc' | 'desc' }, [], visColKeys);
  }, [activeDataset, schemaLoading, allColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(val);
      runQuery(1, val, sort, activeFilters, [...visibleKeys]);
    }, 350);
  };

  const handleSort = (field: string) => {
    const next: SortClause = sort.field === field
      ? { field, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'desc' };
    setSort(next);
    runQuery(1, debouncedSearch, next, activeFilters, [...visibleKeys]);
  };

  const handleFilterChange = (clauses: FilterClause[]) => {
    setActiveFilters(clauses);
    runQuery(1, debouncedSearch, sort, clauses, [...visibleKeys]);
  };

  const handlePage = (p: number) => {
    runQuery(p, debouncedSearch, sort, activeFilters, [...visibleKeys]);
  };

  const handleRefresh = () => {
    runQuery(page, debouncedSearch, sort, activeFilters, [...visibleKeys]);
  };

  const isLoading = schemaLoading || queryLoading;
  const hasDataset = !!activeDataset;

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar grouped={grouped} active={activeDataset} onSelect={setActiveDataset} loading={catalogLoading} />

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!hasDataset ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2">Data Management Center</h2>
              <p className="text-sm text-slate-500">Select a dataset from the sidebar to begin exploring, filtering, and exporting platform data.</p>
            </motion.div>
          </div>
        ) : (
          <motion.div key={activeDataset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-sm font-semibold text-slate-100">{activeDataset.label}</h1>
                  <p className="text-xs text-slate-500">{activeDataset.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${activeDataset.health === 'OK' ? 'bg-emerald-500/15 text-emerald-400' : activeDataset.health === 'DEGRADED' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                    {activeDataset.health}
                  </span>
                  <button onClick={handleRefresh} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                  {(activeDataset.capabilities.export_csv || activeDataset.capabilities.export_xlsx || activeDataset.capabilities.export_json) && (
                    <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                  {search && <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-500 hover:text-slate-300" /></button>}
                </div>

                {/* Filters toggle */}
                {filterDefs.length > 0 && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors
                      ${showFilters || activeFilters.length > 0 ? 'border-blue-500/50 bg-blue-600/10 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                  >
                    <Filter className="w-3 h-3" />
                    Filters
                    {activeFilters.length > 0 && <span className="bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeFilters.length}</span>}
                  </button>
                )}

                {/* Columns toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnPanel(!showColumnPanel)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors
                      ${showColumnPanel ? 'border-blue-500/50 bg-blue-600/10 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                  >
                    <Columns className="w-3 h-3" />
                    Columns
                    <span className="text-slate-500 text-[10px]">({visibleKeys.size}/{allColumns.length})</span>
                  </button>
                  <ColumnPanel
                    open={showColumnPanel}
                    onClose={() => setShowColumnPanel(false)}
                    allColumns={allColumns}
                    visibleKeys={visibleKeys}
                    toggleColumn={toggleColumn}
                    showAll={showAll}
                    resetToDefaults={resetToDefaults}
                  />
                </div>

                {/* Record count */}
                {total > 0 && <span className="text-xs text-slate-500 ml-auto">{total.toLocaleString()} record{total !== 1 ? 's' : ''}</span>}
              </div>
              {/* Filter bar */}
              <AnimatePresence>
                {showFilters && filterDefs.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <FilterBar filters={filterDefs} activeFilters={activeFilters} onFilterChange={handleFilterChange} onClearAll={() => handleFilterChange([])} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error */}
            {queryError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border-b border-red-800/40 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" /> {queryError}
              </div>
            )}

            {/* Grid */}
            <DataGrid
              records={records}
              columns={visibleColumns}
              sort={sort}
              onSort={handleSort}
              loading={isLoading}
              empty={!isLoading && records.length === 0}
            />

            {/* Pagination */}
            {total > 0 && (
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={handlePage} />
            )}
          </motion.div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        dataset={activeDataset}
        visibleKeys={[...visibleKeys]}
        activeFilters={activeFilters}
        search={debouncedSearch}
        sort={sort}
      />
    </div>
  );
}
