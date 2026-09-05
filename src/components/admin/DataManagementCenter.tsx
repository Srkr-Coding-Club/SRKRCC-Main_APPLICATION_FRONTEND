'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns,
  Database, Download, Eye, EyeOff, Filter, MoreHorizontal, RefreshCw,
  Search, Settings, SlidersHorizontal, X, Info, AlertCircle,
  CheckCircle2, Circle, Minus, HelpCircle, ArrowUpDown, ArrowUp, ArrowDown,
  ExternalLink, Users, FileSpreadsheet, Trophy, Calendar, Code2, Briefcase,
  Layers, ShieldAlert, Sparkles, Mail
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
import EmailTemplateEditor, { EmailRecipient } from '@/components/admin/EmailTemplateEditor';

// ============================================================================
// Group Icons mapping
// ============================================================================
const GROUP_ICONS: Record<string, React.ElementType> = {
  Users: Users,
  Forms: FileSpreadsheet,
  Hackathons: Trophy,
  Events: Calendar,
  CodeQuest: Code2,
  Careers: Briefcase,
};

// ============================================================================
// Utility helpers & High-Contrast Cell Formatter
// ============================================================================

function formatCell(cv: CanonicalValue | undefined): { text: string; state: string } {
  if (!cv) return { text: '—', state: 'not_applicable' };
  if (cv.state === 'not_applicable') return { text: '—', state: 'not_applicable' };
  if (cv.state === 'empty') return { text: '—', state: 'empty' };
  if (cv.state === 'unknown') return { text: 'Unavailable', state: 'unknown' };
  return { text: cv.display_value || String(cv.value ?? ''), state: 'value' };
}

function StateIcon({ state }: { state: string }) {
  if (state === 'not_applicable') return <Minus className="w-3 h-3 text-slate-400 dark:text-slate-500 inline" />;
  if (state === 'empty') return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs select-none">—</span>;
  if (state === 'unknown') return <HelpCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 inline" />;
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
      <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-mono select-none">
        <StateIcon state={state} />
        {state === 'unknown' ? text : ''}
      </span>
    );
  }

  if (isBoolean) {
    const val = cv?.value;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border shadow-xs ${val ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'}`}>
        {val ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
        {val ? 'Yes' : 'No'}
      </span>
    );
  }

  if (isBadge) {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
      CLUB_LEAD: 'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
      VOLUNTEER: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
      JUDGE: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      MEMBER: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
      ACTIVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      INACTIVE: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
      SUSPENDED: 'bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30',
      PENDING: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      Leader: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
      Member: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
      CSE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      ECE: 'bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
      IT: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
      AIDS: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      AIML: 'bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
      PASSED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      FAILED: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    };
    const cls = colors[text] ?? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs whitespace-nowrap ${cls}`}>{text}</span>;
  }

  if (isLink || col.renderer === 'email') {
    const href = col.renderer === 'email' ? `mailto:${text}` : text;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline underline-offset-2 text-xs flex items-center gap-1 truncate max-w-[200px]"
      >
        <span className="truncate">{text}</span>
        <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
      </a>
    );
  }

  return <span className="text-slate-900 dark:text-slate-100 font-medium text-xs sm:text-sm truncate">{text}</span>;
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

function Sidebar({ grouped, active, onSelect, loading }: SidebarProps) {
  const groups = Object.keys(grouped);
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Datasets Explorer</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Select a dataset to view and manage</p>
      </div>
      <div className="flex-1 py-3 px-2 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 dark:text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-xs font-medium">Loading datasets…</span>
          </div>
        ) : (
          groups.map(group => {
            const GroupIcon = GROUP_ICONS[group] || Database;
            return (
              <div key={group} className="space-y-1">
                <div className="px-3 py-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <GroupIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{group}</span>
                </div>
                <div className="space-y-0.5">
                  {grouped[group].map(d => {
                    const isActive = active?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => onSelect(d)}
                        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150
                          ${isActive
                            ? 'bg-blue-600 text-white shadow-sm font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isActive
                                ? 'bg-white ring-2 ring-white/30'
                                : d.health === 'OK'
                                ? 'bg-emerald-500'
                                : d.health === 'DEGRADED'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="truncate">{d.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
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
    <div className="absolute right-0 top-11 z-40 w-76 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Visible Columns</span>
        <div className="flex items-center gap-2">
          <button onClick={showAll} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">Select All</button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button onClick={resetToDefaults} className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">Reset</button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto py-2">
        {categories.map(cat => (
          <div key={cat} className="mb-2">
            <div className="px-4 py-1 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{cat}</span>
            </div>
            {allColumns.filter(c => c.category === cat).map(col => (
              <label key={col.key} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                <input
                  type="checkbox"
                  checked={visibleKeys.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{col.label}</p>
                  {col.description && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{col.description}</p>}
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
          <div key={idx} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 rounded-lg px-3 py-1.5 text-xs shadow-xs">
            <span className="text-blue-900 dark:text-blue-300 font-bold">{def.label}:</span>
            {def.type === 'select' && (
              <select
                value={String(af.value)}
                onChange={e => updateFilter(idx, { value: e.target.value })}
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-medium outline-none cursor-pointer"
              >
                {def.options.map(o => <option key={String(o.value)} value={String(o.value)} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{o.label}</option>)}
              </select>
            )}
            {def.type === 'boolean' && (
              <select
                value={String(af.value)}
                onChange={e => updateFilter(idx, { value: e.target.value === 'true' })}
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-medium outline-none cursor-pointer"
              >
                <option value="true" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Yes</option>
                <option value="false" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">No</option>
              </select>
            )}
            {def.type === 'text' && (
              <input
                value={String(af.value)}
                onChange={e => updateFilter(idx, { value: e.target.value })}
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-medium outline-none w-28 placeholder-slate-400"
                placeholder="Type value..."
              />
            )}
            <button onClick={() => removeFilter(idx)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-1"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
      })}
      {availableFilters.length > 0 && (
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 hover:border-slate-400 bg-white dark:bg-slate-800 shadow-xs transition-colors">
            <Filter className="w-3 h-3 text-blue-500" /> Add Filter
          </button>
          <div className="absolute top-10 left-0 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-52 py-1 hidden group-hover:block">
            {availableFilters.map(f => (
              <button key={f.key} onClick={() => addFilter(f)} className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition">
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeFilters.length > 0 && (
        <button onClick={onClearAll} className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 ml-1">
          <X className="w-3 h-3" /> Clear All
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Export Modal
// ============================================================================

function ExportModal({
  open, onClose, dataset, visibleKeys, activeFilters, search, sort, selectedIds,
}: {
  open: boolean;
  onClose: () => void;
  dataset: DatasetDefinition | null;
  visibleKeys: string[];
  activeFilters: FilterClause[];
  search: string;
  sort: SortClause;
  selectedIds: Set<string>;
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
        selected_record_ids: rowScope === 'selected' ? [...selectedIds] : [],
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
    { fmt: 'csv', label: 'CSV File', enabled: caps.export_csv },
    { fmt: 'xlsx', label: 'Excel (XLSX)', enabled: caps.export_xlsx },
    { fmt: 'json', label: 'JSON Data', enabled: caps.export_json },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-base font-bold text-slate-900 dark:text-white">Export Dataset</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
        </div>
        <div className="p-6 space-y-5">
          {asyncJob ? (
            <div className="text-center py-6">
              <RefreshCw className={`w-9 h-9 mx-auto mb-3 ${asyncJob.status === 'COMPLETED' ? 'text-emerald-500' : 'text-blue-600 animate-spin'}`} />
              <p className="text-sm text-slate-900 dark:text-white font-bold">{asyncJob.status === 'COMPLETED' ? 'Export Ready! Downloading…' : `Exporting ${asyncJob.status.toLowerCase()}…`}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Large datasets are prepared asynchronously in the background.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map(({ fmt, label, enabled }) => (
                    <button
                      key={fmt}
                      disabled={!enabled}
                      onClick={() => setFormat(fmt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all
                        ${format === fmt ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800'}
                        ${!enabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">Export Scope</label>
                <div className="flex gap-2">
                  {(['all_filtered', 'selected'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setRowScope(s)}
                      disabled={s === 'selected' && selectedIds.size === 0}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
                        ${rowScope === s ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'}`}
                    >
                      {s === 'all_filtered' ? 'All (Matching Filters)' : `Selected Rows Only (${selectedIds.size})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p>Columns: <span className="text-slate-900 dark:text-slate-100 font-bold">{visibleKeys.length} visible columns</span></p>
                {activeFilters.length > 0 && <p>Filters: <span className="text-blue-600 dark:text-blue-400 font-bold">{activeFilters.length} active filters</span></p>}
              </div>
              {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</p>}
            </>
          )}
        </div>
        {!asyncJob && (
          <div className="px-6 pb-5 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Start Export
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// High-Contrast Data Grid
// ============================================================================

function DataGrid({
  records, columns, sort, onSort, loading, empty, selectedIds, onToggleSelect, onToggleSelectAll,
}: {
  records: import('@/lib/types/dmc').DMCRecord[];
  columns: ColumnDefinition[];
  sort: SortClause;
  onSort: (field: string) => void;
  loading: boolean;
  empty: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-600 dark:text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Loading dataset records…</p>
      </div>
    );
  }
  if (empty || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 dark:text-slate-400 gap-2">
        <Database className="w-12 h-12 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No records found</p>
        <p className="text-xs text-slate-500">Try adjusting your search or active filters.</p>
      </div>
    );
  }

  const recordIds = records.map((r) => String(r.id?.value ?? ''));
  const allOnPageSelected = recordIds.length > 0 && recordIds.every((id) => selectedIds.has(id));

  return (
    <div className="overflow-auto flex-1 bg-white dark:bg-slate-950">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 shadow-xs">
            <th className="px-4 py-3.5 w-10">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={() => onToggleSelectAll(recordIds)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                aria-label="Select all rows on this page"
              />
            </th>
            {columns.map(col => {
              const isActive = sort.field === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort(col.key)}
                  className={`text-left px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider whitespace-nowrap select-none
                    ${col.sortable ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition' : ''}
                    ${isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      isActive
                        ? (sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />)
                        : <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
          {records.map((record, rowIdx) => {
            const id = recordIds[rowIdx];
            return (
              <motion.tr
                key={rowIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className={`hover:bg-blue-50/60 dark:hover:bg-slate-900/80 transition-colors ${selectedIds.has(id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
              >
                <td className="px-4 py-3.5 w-10">
                  {id && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={() => onToggleSelect(id)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      aria-label="Select row"
                    />
                  )}
                </td>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3.5 max-w-[240px] truncate align-middle">
                    <StateBadge cv={record[col.key]} col={col} />
                  </td>
                ))}
              </motion.tr>
            );
          })}
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 shadow-xs">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Showing <span className="text-slate-900 dark:text-white font-bold">{start}–{end}</span> of <span className="text-slate-900 dark:text-white font-bold">{total.toLocaleString()}</span> records
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 px-2.5">{page} / {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const { columns: allColumns, filters: filterDefs, loading: schemaLoading } = useDMCSchema(activeDataset?.id ?? null);
  const { visibleKeys, visibleColumns, toggleColumn, showAll, resetToDefaults, isVisible } = useDMCColumns(allColumns);
  const { records, total, page, totalPages, loading: queryLoading, error: queryError, fetch: runQuery, pageSize } = useDMCQuery({ datasetId: activeDataset?.id ?? null });

  const hasEmailColumn = allColumns.some((c) => c.type === 'email');
  const selectedRecipients: EmailRecipient[] = records
    .filter((r) => selectedIds.has(String(r.id?.value ?? '')))
    .map((r) => ({ email: String(r.email?.value ?? ''), name: r.name?.value ? String(r.name.value) : undefined }))
    .filter((r) => !!r.email);

  // When dataset changes, reset everything and run query
  useEffect(() => {
    if (!activeDataset) return;
    setSearch('');
    setDebouncedSearch('');
    setActiveFilters([]);
    setSort({ field: activeDataset.default_sort_field, direction: activeDataset.default_sort_direction as 'asc' | 'desc' });
    setShowFilters(false);
    setSelectedIds(new Set());
  }, [activeDataset]);

  // When schema loads, run initial query
  useEffect(() => {
    if (!activeDataset || schemaLoading || allColumns.length === 0) return;
    const visColKeys = allColumns.filter(c => c.visible_by_default).map(c => c.key);
    runQuery(1, '', { field: activeDataset.default_sort_field, direction: activeDataset.default_sort_direction as 'asc' | 'desc' }, [], visColKeys);
  }, [activeDataset, schemaLoading, allColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  // Row selection is scoped to whichever records are currently loaded (selectedRecipients
  // reads name/email straight out of `records`), so any change to what's loaded clears it
  // rather than risk emailing a stale, no-longer-visible selection.
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(val);
      setSelectedIds(new Set());
      runQuery(1, val, sort, activeFilters, [...visibleKeys]);
    }, 350);
  };

  const handleSort = (field: string) => {
    const next: SortClause = sort.field === field
      ? { field, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'desc' };
    setSort(next);
    setSelectedIds(new Set());
    runQuery(1, debouncedSearch, next, activeFilters, [...visibleKeys]);
  };

  const handleFilterChange = (clauses: FilterClause[]) => {
    setActiveFilters(clauses);
    setSelectedIds(new Set());
    runQuery(1, debouncedSearch, sort, clauses, [...visibleKeys]);
  };

  const handlePage = (p: number) => {
    setSelectedIds(new Set());
    runQuery(p, debouncedSearch, sort, activeFilters, [...visibleKeys]);
  };

  const handleRefresh = () => {
    runQuery(page, debouncedSearch, sort, activeFilters, [...visibleKeys]);
  };

  const isLoading = schemaLoading || queryLoading;
  const hasDataset = !!activeDataset;

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar grouped={grouped} active={activeDataset} onSelect={setActiveDataset} loading={catalogLoading} />

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-950">
        {!hasDataset ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-850 border border-blue-100 dark:border-slate-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Data Management Center</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Select any dataset from the left sidebar to explore records, apply multi-criteria filters, and export high-resolution CSV/Excel files.
              </p>
            </motion.div>
          </div>
        ) : (
          <motion.div key={activeDataset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3.5 shrink-0 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-slate-900 dark:text-white">{activeDataset.label}</h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeDataset.health === 'OK' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : activeDataset.health === 'DEGRADED' ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'}`}>
                      {activeDataset.health}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{activeDataset.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleRefresh} title="Refresh dataset" className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
                  </button>
                  {hasEmailColumn && selectedIds.size > 0 && (
                    <button onClick={() => setShowEmailEditor(true)} className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06B00] text-white shadow-sm transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Email Selected ({selectedIds.size})
                    </button>
                  )}
                  {(activeDataset.capabilities.export_csv || activeDataset.capabilities.export_xlsx || activeDataset.capabilities.export_json) && (
                    <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export Data
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search records…"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  {search && (
                    <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters toggle */}
                {filterDefs.length > 0 && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors shadow-xs
                      ${showFilters || activeFilters.length > 0
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                    {activeFilters.length > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {activeFilters.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Columns toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnPanel(!showColumnPanel)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors shadow-xs
                      ${showColumnPanel
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}
                  >
                    <Columns className="w-3.5 h-3.5" />
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

                {/* Record count badge */}
                {total > 0 && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-auto bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    {total.toLocaleString()} record{total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Filter bar dropdown */}
              <AnimatePresence>
                {showFilters && filterDefs.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <FilterBar filters={filterDefs} activeFilters={activeFilters} onFilterChange={handleFilterChange} onClearAll={() => handleFilterChange([])} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Banner */}
            {queryError && (
              <div className="flex items-center gap-2 px-5 py-3 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-800/50 text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" /> {queryError}
              </div>
            )}

            {/* High-Contrast Data Grid */}
            <DataGrid
              records={records}
              columns={visibleColumns}
              sort={sort}
              onSort={handleSort}
              loading={isLoading}
              empty={!isLoading && records.length === 0}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAllOnPage}
            />

            {/* Pagination Footer */}
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
        selectedIds={selectedIds}
      />

      {/* Bulk Email Composer */}
      <EmailTemplateEditor
        open={showEmailEditor}
        onClose={() => setShowEmailEditor(false)}
        mode="send"
        recipients={selectedRecipients}
        onSent={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
