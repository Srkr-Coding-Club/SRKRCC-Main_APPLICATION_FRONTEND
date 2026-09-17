'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

interface AuditLogRecord {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

interface AuditLogsTabProps {
  filteredAuditLogs: AuditLogRecord[];
  isLoading?: boolean;
}

const DETAILS_TRUNCATE_LENGTH = 150;

export function AuditLogsTab({ filteredAuditLogs, isLoading = false }: AuditLogsTabProps) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredAuditLogs;
    return filteredAuditLogs.filter((l) =>
      l.actor.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.target.toLowerCase().includes(q)
    );
  }, [filteredAuditLogs, search]);

  return (
    <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Mutation Audit Logs</h3>
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by actor, action, or target…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>
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
            ) : visibleLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                  {filteredAuditLogs.length === 0 ? 'No audit logs recorded yet.' : 'No audit logs match your search.'}
                </td>
              </tr>
            ) : (
              visibleLogs.map((l) => {
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
    </div>
  );
}
