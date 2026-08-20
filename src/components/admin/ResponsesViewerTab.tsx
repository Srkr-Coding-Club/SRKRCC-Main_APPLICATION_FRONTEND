'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Search,
  Download,
  Mail,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { Form, FormField, ResponseDetail, PaginatedResponse } from '@/lib/types';
import { starsDisplay, downloadCSV, groupByDay } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { DetailDrawer } from './DetailDrawer';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';

const ResponseTimelineChart = dynamic(
  () => import('./ResponseTimelineChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface ResponsesViewerTabProps {
  forms: Form[];
  initialFormSlug?: string;
}

function renderCellValue(type: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-600 italic text-[11px]">—</span>;
  }
  if (type === 'RATING') {
    return (
      <span className="text-yellow-400 text-sm tracking-tight" title={String(value)}>
        {starsDisplay(Number(value))}
      </span>
    );
  }
  if (type === 'SIGNATURE') {
    return (
      <img
        src={String(value)}
        alt="Signature"
        className="w-16 h-8 object-contain rounded border border-slate-700 bg-white"
      />
    );
  }
  if (type === 'FILE' || type === 'MULTI_FILE') {
    const files = Array.isArray(value) ? value : [value];
    return (
      <div className="space-y-0.5">
        {files.map((f, i) => (
          <a
            key={i}
            href={String(f)}
            download
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold truncate max-w-[140px]"
          >
            <Download className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{String(f).split('/').pop() || `File ${i + 1}`}</span>
          </a>
        ))}
      </div>
    );
  }
  if (Array.isArray(value)) {
    return <span className="text-[11px]">{value.join(', ')}</span>;
  }
  if (typeof value === 'object') {
    return <span className="text-[11px] font-mono">{JSON.stringify(value)}</span>;
  }
  const str = String(value);
  return (
    <span
      className="text-[11px]"
      title={str.length > 50 ? str : undefined}
    >
      {str.length > 50 ? `${str.slice(0, 50)}…` : str}
    </span>
  );
}

function ResponseDrawerContent({ response, form }: { response: ResponseDetail; form: Form }) {
  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="space-y-2">
        {response.user && (
          <div>
            <p className="text-xs text-slate-500">Respondent</p>
            <p className="text-sm font-bold text-white">{response.user.name}</p>
            <p className="text-xs text-slate-400">{response.user.email}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { label: 'Submitted', value: new Date(response.submitted_at).toLocaleString('en-IN') },
            { label: 'Form Version', value: `v${response.form_version}` },
            { label: 'Type', value: response.is_manual_entry ? 'Manual Entry' : response.is_test_submission ? 'Test' : 'Public' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
              <div className="text-xs font-semibold text-white mt-1">{value}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Answers */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Answers</p>
        {response.answers.map((ans) => (
          <div key={ans.field_id} className="border-b border-slate-800/60 pb-3 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-300">{ans.field_label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-500 font-mono">
                {ans.field_type}
              </span>
            </div>
            <div>{renderCellValue(ans.field_type, ans.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResponsesViewerTab({ forms, initialFormSlug }: ResponsesViewerTabProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(initialFormSlug || '');
  const [data, setData] = useState<PaginatedResponse<ResponseDetail> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [manualOnly, setManualOnly] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerResponse, setDrawerResponse] = useState<ResponseDetail | null>(null);

  const selectedForm = forms.find((f) => f.slug === selectedSlug) ?? null;
  const fieldColumns: FormField[] = useMemo(
    () => (selectedForm?.fields?.filter((f) => f.type !== 'SECTION') ?? []),
    [selectedForm]
  );

  const loadResponses = useCallback(async () => {
    if (!selectedSlug) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
        ...(search && { search }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(manualOnly && { manual_only: 'true' }),
      });
      const result = await fetchApi<PaginatedResponse<ResponseDetail>>(
        `/forms/${selectedSlug}/responses/?${params}`
      );
      setData(result);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [selectedSlug, page, search, dateFrom, dateTo, manualOnly]);

  useEffect(() => { loadResponses(); }, [loadResponses]);
  useEffect(() => { setPage(1); }, [selectedSlug, search, dateFrom, dateTo, manualOnly]);

  const timelineData = useMemo(() => {
    const timestamps = data?.results?.map((r) => r.submitted_at) ?? [];
    return groupByDay(timestamps);
  }, [data]);

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  const hasGap = (resp: ResponseDetail): boolean => {
    const requiredFieldIds = new Set(
      fieldColumns.filter((f) => f.is_required).map((f) => Number(f.id))
    );
    if (requiredFieldIds.size === 0) return false;
    for (const ans of resp.answers) {
      if (requiredFieldIds.has(ans.field_id)) {
        const v = ans.value;
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
          return true;
        }
      }
    }
    return false;
  };

  const getAnswerForField = (resp: ResponseDetail, fieldId: number | string) =>
    resp.answers.find((a) => a.field_id === Number(fieldId));

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkExport = () => {
    const rows = (data?.results ?? []).filter((r) => selectedIds.has(r.id));
    const flat = rows.map((r) => {
      const base: Record<string, unknown> = {
        id: r.id,
        submitted_at: r.submitted_at,
        respondent: r.user?.email ?? 'Anonymous',
        is_manual_entry: r.is_manual_entry,
      };
      r.answers.forEach((a) => { base[a.field_label] = a.value; });
      return base;
    });
    downloadCSV(flat, `responses-${selectedSlug}-${Date.now()}.csv`);
  };

  // --- No form selected ---
  if (!selectedSlug) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <Inbox className="w-12 h-12 text-slate-700" />
        <h3 className="text-base font-bold text-white">Select a form to view responses</h3>
        <p className="text-sm text-slate-400">Choose a form from the dropdown above.</p>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="mt-2 px-4 py-2 bg-[#151722] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/60"
        >
          <option value="">Select a form…</option>
          {forms.map((f) => (
            <option key={f.id} value={f.slug}>{f.title}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSlug}
            onChange={(e) => { setSelectedSlug(e.target.value); setSelectedIds(new Set()); }}
            className="flex-1 min-w-[200px] px-3 py-2 bg-[#151722] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/60"
          >
            <option value="">Select a form…</option>
            {forms.map((f) => (
              <option key={f.id} value={f.slug}>{f.title}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-[#151722] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 w-48"
            />
          </div>

          {/* Date range */}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="py-2 px-3 text-sm bg-[#151722] border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-orange-500/60" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="py-2 px-3 text-sm bg-[#151722] border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-orange-500/60" />

          {/* Toggles */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={manualOnly} onChange={(e) => setManualOnly(e.target.checked)}
              className="rounded border-slate-600 text-orange-500 focus:ring-orange-500" />
            Manual Only
          </label>

          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${showChart ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-700 text-slate-400 hover:text-white'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[#151722] border border-slate-800 text-xs text-slate-400">
            <span><span className="text-white font-bold">{data.count}</span> responses</span>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-xs font-bold text-orange-400">{selectedIds.size} selected</span>
            <button onClick={handleBulkExport} className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white">
              <Download className="w-3 h-3" /> Export
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300">
              <Mail className="w-3 h-3" /> Email
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-500 hover:text-slate-300">Clear</button>
          </div>
        )}

        {/* Timeline chart */}
        {showChart && (
          <div className="bg-[#151722] rounded-xl border border-slate-800 p-5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Submissions Per Day — Last 30 Days</p>
            <ResponseTimelineChart data={timelineData} />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading responses…</p>
          </div>
        ) : !data || data.count === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <Inbox className="w-10 h-10 text-slate-700" />
            <h3 className="text-base font-bold text-white">No responses yet</h3>
            <p className="text-sm text-slate-400 max-w-xs">Share the form link with club members to start collecting.</p>
          </div>
        ) : (
          <div className="bg-[#151722] rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f0f1a] border-b border-slate-800 text-slate-500 uppercase">
                  <tr>
                    <th className="sticky left-0 z-20 bg-[#0f0f1a] px-4 py-3 w-10">
                      <button
                        onClick={() => {
                          const allIds = data.results.map((r) => r.id);
                          if (selectedIds.size === allIds.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(allIds));
                        }}
                        className="text-slate-500 hover:text-orange-400"
                      >
                        {selectedIds.size === data.results.length
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="sticky left-10 z-20 bg-[#0f0f1a] px-4 py-3 font-bold min-w-[160px] border-r border-slate-800">
                      Respondent
                    </th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Submitted</th>
                    {fieldColumns.map((f) => (
                      <th key={f.id} className="px-4 py-3 font-bold whitespace-nowrap min-w-[120px]">
                        {f.label}
                        {f.is_required && <span className="text-rose-400 ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.results.map((resp) => {
                    const gap = hasGap(resp);
                    const isSelected = selectedIds.has(resp.id);
                    const rowBg = resp.is_manual_entry
                      ? 'border-l-2 border-l-purple-500'
                      : resp.is_test_submission
                      ? 'border-l-2 border-l-blue-400'
                      : '';
                    return (
                      <tr
                        key={resp.id}
                        className={`${rowBg} ${gap ? 'bg-rose-500/5' : ''} hover:bg-slate-800/20 transition cursor-pointer`}
                        onClick={() => setDrawerResponse(resp)}
                      >
                        <td className="sticky left-0 z-10 bg-[#151722] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleRow(resp.id)} className="text-slate-500 hover:text-orange-400">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="sticky left-10 z-10 bg-[#151722] px-4 py-3 border-r border-slate-800/60 font-semibold">
                          <div className="flex items-center gap-1.5">
                            {gap && <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                            <span>{resp.user?.email ?? (resp.is_manual_entry ? 'Admin Entry' : 'Anonymous')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {new Date(resp.submitted_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        {fieldColumns.map((f) => {
                          const ans = getAnswerForField(resp, f.id);
                          return (
                            <td key={f.id} className="px-4 py-3">
                              {renderCellValue(f.type, ans?.value ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400">
              Page <span className="font-bold text-white">{page}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Response Detail Drawer */}
      <AnimatePresence>
        {drawerResponse && selectedForm && (
          <DetailDrawer
            isOpen={!!drawerResponse}
            onClose={() => setDrawerResponse(null)}
            title={`Response #${drawerResponse.id}`}
          >
            <ResponseDrawerContent response={drawerResponse} form={selectedForm} />
          </DetailDrawer>
        )}
      </AnimatePresence>
    </>
  );
}
