'use client';

import React from 'react';

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

export function AuditLogsTab({ filteredAuditLogs, isLoading = false }: AuditLogsTabProps) {
  return (
    <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
      <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Mutation Audit Logs</h3>
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
            ) : filteredAuditLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              filteredAuditLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-4 text-xs font-mono">{l.timestamp}</td>
                  <td className="px-6 py-4 text-xs font-bold text-[#1A1A2E] dark:text-white">{l.actor}</td>
                  <td className="px-6 py-4 text-xs font-bold text-[#FF7A00]">{l.action}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{l.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
