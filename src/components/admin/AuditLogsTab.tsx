'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

interface AuditLogApi {
  id: number;
  timestamp: string;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  target: string;
  details: unknown;
}

interface PaginatedAuditLogs {
  count: number;
  results: AuditLogApi[];
}

interface AuditLogRecord {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

const DETAILS_TRUNCATE_LENGTH = 150;
/** Matches the backend page size (apps/core/pagination.py). */
const PAGE_SIZE = 50;
/** Live refresh cadence, matching the other admin data pages. */
const REFRESH_MS = 8000;
const SEARCH_DEBOUNCE_MS = 300;

function toRecord(entry: AuditLogApi): AuditLogRecord {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    actor: entry.actor_name || entry.actor_email || 'System',
    action: entry.action || 'System Mutation',
    target: entry.target || 'System',
    details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : String(entry.details || ''),
  };
}

export function AuditLogsTab() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Search runs on the server across the whole log, so debounce typing and go back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set('search', query);

    fetchApi<PaginatedAuditLogs>(`/audit/?${params}`)
      .then((result) => {
        if (cancelled) return;
        setLogs(result.results.map(toRecord));
        setCount(result.count);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load audit logs.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, query, refreshTick]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') setRefreshTick((tick) => tick + 1);
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Mutation Audit Logs</h3>
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by actor, action, or target…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs glass-panel border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {loadError && (
        <p className="text-xs text-rose-500">{loadError}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-[#FAFAFC] dark:bg-[#0D0E15] text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 font-bold">Timestamp</th>
              <th className="px-6 py-4 font-bold">Actor</th>
              <th className="px-6 py-4 font-bold">Action</th>
              <th className="px-6 py-4 font-bold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" /></td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                  {query ? 'No audit logs match your search.' : 'No audit logs recorded yet.'}
                </td>
              </tr>
            ) : (
              logs.map((l) => {
                const isLong = l.details.length > DETAILS_TRUNCATE_LENGTH;
                const isExpanded = expandedIds.has(l.id);
                return (
                  <tr key={l.id}>
                    <td className="px-6 py-4 text-xs font-mono">{l.timestamp}</td>
                    <td className="px-6 py-4 text-xs font-bold text-[#1A1A2E] dark:text-white">{l.actor}</td>
                    <td className="px-6 py-4 text-xs font-bold text-[#FF7A00]">{l.action}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-md">
                      <span className="break-words">
                        {isExpanded || !isLong ? l.details : `${l.details.slice(0, DETAILS_TRUNCATE_LENGTH)}…`}
                      </span>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(l.id)}
                          className="ml-2 text-[11px] font-bold text-orange-500 hover:text-orange-400 underline transition-transform duration-100 active:scale-95 inline-block"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {count} {count === 1 ? 'entry' : 'entries'} · page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:text-[#1A1A2E] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-transform duration-100 active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:text-[#1A1A2E] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-transform duration-100 active:scale-95"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
