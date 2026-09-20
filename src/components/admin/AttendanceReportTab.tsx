'use client';

import React from 'react';
import { Download, Users, CalendarDays } from 'lucide-react';
import { AttendanceReport } from '@/lib/types';
import { downloadCSV } from '@/lib/dataManagement';

interface AttendanceReportTabProps {
  report: AttendanceReport | null;
  loading: boolean;
  formTitle?: string;
}

function sessionColumnLabel(day_index: number, session_label: string): string {
  const label = session_label.charAt(0) + session_label.slice(1).toLowerCase();
  return `Day ${day_index + 1} ${label}`;
}

/**
 * Per-session summary cards + a per-registrant present/absent grid, both
 * rendered from the single GET /api/forms/<id>/attendance/report/ payload —
 * see apps/attendance/views.py's AttendanceReportView for the exact shape.
 */
export function AttendanceReportTab({ report, loading, formTitle }: AttendanceReportTabProps) {
  // The report endpoint returns only a present/absent boolean per session per
  // registrant (no per-cell scan timestamp) — see AttendanceReportView in
  // apps/attendance/views.py — so the CSV records "Present"/"Absent" only.
  const handleExportCSV = () => {
    if (!report) return;
    const rows = report.registrants.map((r) => {
      const row: Record<string, string> = {
        'Response ID': String(r.response_id),
        'Registrant': r.display_name,
      };
      report.sessions.forEach((s) => {
        const key = sessionColumnLabel(s.day_index, s.session_label);
        row[key] = r.sessions[s.id] ? 'Present' : 'Absent';
      });
      return row;
    });
    downloadCSV(rows, `attendance-report-${(formTitle || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.csv`);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading attendance report…</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-400">
        Select an attendance-enabled form to view its report.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Per-session summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {report.sessions.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] p-5 space-y-2"
          >
            <div className="flex items-center gap-1.5 text-slate-400">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {sessionColumnLabel(s.day_index, s.session_label)}
              </span>
            </div>
            <p className="text-2xl font-black font-mono text-[#1A1A2E] dark:text-white">
              {s.attended_count}
              <span className="text-sm text-slate-400 font-semibold"> / {s.total_registrants}</span>
            </p>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF7A00] to-emerald-500"
                style={{ width: `${Math.min(100, s.percentage)}%` }}
              />
            </div>
            <p className="text-xs font-bold text-emerald-500">{s.percentage}%</p>
          </div>
        ))}
        {report.sessions.length === 0 && (
          <div className="col-span-full text-center text-sm text-slate-400 py-6">
            No attendance sessions have been generated for this form yet.
          </div>
        )}
      </div>

      {/* Per-registrant grid */}
      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
          <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FF7A00]" />
            Registrant Attendance ({report.registrants.length})
          </h3>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={report.registrants.length === 0}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-[#FAFAFC] dark:bg-[#0D0E15] text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Registrant</th>
                {report.sessions.map((s) => (
                  <th key={s.id} className="px-4 py-4 font-bold text-center whitespace-nowrap">
                    {sessionColumnLabel(s.day_index, s.session_label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.registrants.length === 0 ? (
                <tr>
                  <td colSpan={report.sessions.length + 1} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No registrants yet.
                  </td>
                </tr>
              ) : (
                report.registrants.map((r) => (
                  <tr key={r.response_id} className="hover:bg-[#FAFAFC] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-xs font-bold text-[#1A1A2E] dark:text-white whitespace-nowrap">
                      {r.display_name}
                    </td>
                    {report.sessions.map((s) => {
                      const present = !!r.sessions[s.id];
                      return (
                        <td key={s.id} className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              present
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {present ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
