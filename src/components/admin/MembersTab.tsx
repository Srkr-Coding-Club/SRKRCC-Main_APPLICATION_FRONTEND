'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Download,
  Mail,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  Layers,
  FileText,
  Save,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Form, MemberRecord, PaginatedResponse } from '@/lib/types';
import { relativeTime, downloadCSV } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { DetailDrawer } from './DetailDrawer';

interface MembersTabProps {
  forms: Form[];
}

function MemberDetailContent({ member }: { member: MemberRecord }) {
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState(false);

  // GDPR export as JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(member, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `member-${member.user_id}-${member.email}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-lg flex-shrink-0">
          {(member.name || member.email || 'M').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white truncate">{member.name || 'Club Member'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Last Active: {member.last_active ? relativeTime(member.last_active) : 'Never'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submissions</span>
          <div className="text-xl font-bold text-[#1A1A2E] dark:text-white mt-0.5">{member.total_submissions}</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forms Joined</span>
          <div className="text-xl font-bold text-orange-400 mt-0.5">{member.forms_submitted.length}</div>
        </div>
      </div>

      {/* Form Submissions List */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Form Submissions ({member.forms_submitted.length})
        </p>
        <div className="space-y-2">
          {member.forms_submitted.length === 0 ? (
            <p className="text-xs text-slate-500">No submissions recorded.</p>
          ) : (
            member.forms_submitted.map((sub, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1A1A2E] dark:text-white truncate">{sub.form_title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(sub.submitted_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold flex-shrink-0">
                  Submitted
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Admin Notes */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Admin Internal Note
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add an internal club administration note for this member..."
          className="w-full px-3.5 py-2.5 bg-[#FAFAFC] dark:bg-[#0f0f1a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={handleSaveNote}
            disabled={!note.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold transition"
          >
            <Save className="w-3.5 h-3.5" /> Save Note
          </button>
          {savedNote && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Note saved
            </span>
          )}
        </div>
      </div>

      {/* GDPR Data Export */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleExportJSON}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#1A1A2E] dark:hover:text-white transition"
        >
          <Download className="w-3.5 h-3.5" /> Export Member Data (JSON)
        </button>
      </div>
    </div>
  );
}

export function MembersTab({ forms }: MembersTabProps) {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<MemberRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [page, setPage] = useState(1);
  const [drawerMember, setDrawerMember] = useState<MemberRecord | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
        ...(search && { search }),
        ...(selectedFormId && { form_id: selectedFormId }),
      });
      const res = await fetchApi<PaginatedResponse<MemberRecord> | MemberRecord[]>(
        `/members/?${params}`
      );
      if (Array.isArray(res)) {
        setData({
          count: res.length,
          next: null,
          previous: null,
          results: res,
        });
      } else {
        setData(res);
      }
    } catch (err: any) {
      setData(null);
      toast.error('Failed to Load Members', err?.message || 'Is the backend running?');
    }
    setLoading(false);
  }, [page, search, selectedFormId, toast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedFormId]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  if (!loading && (!data || data.results.length === 0) && !search && !selectedFormId) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <Users className="w-12 h-12 text-slate-700" />
        <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">No members found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Members appear here after they submit their first form.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search member by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
            />
          </div>
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="px-3.5 py-2 bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500/60"
          >
            <option value="">All Form Submissions</option>
            {forms.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.title}
              </option>
            ))}
          </select>
        </div>

        {/* Table / Results */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading member directory…</p>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800">
            No members matched &quot;{search}&quot;.
            <button
              onClick={() => {
                setSearch('');
                setSelectedFormId('');
              }}
              className="block mx-auto mt-2 text-orange-400 underline text-xs"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-[#FAFAFC] dark:bg-[#0f0f1a] border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Member</th>
                    <th className="px-5 py-3.5 font-bold">Forms Submitted</th>
                    <th className="px-5 py-3.5 font-bold">Total Submissions</th>
                    <th className="px-5 py-3.5 font-bold">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {data.results.map((member) => (
                    <tr
                      key={member.user_id}
                      className="hover:bg-slate-800/20 transition cursor-pointer"
                      onClick={() => setDrawerMember(member)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#1A1A2E] dark:text-white">
                          {member.name || 'Anonymous User'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{member.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-[340px]">
                          {member.forms_submitted.slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[150px]"
                              title={f.form_title}
                            >
                              {f.form_title}
                            </span>
                          ))}
                          {member.forms_submitted.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold">
                              +{member.forms_submitted.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {member.total_submissions}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {member.last_active ? relativeTime(member.last_active) : '—'}
                      </td>
                    </tr>
                  ))}
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
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page <span className="font-bold text-[#1A1A2E] dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-[#1A1A2E] dark:text-white">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Member Detail Drawer */}
      <AnimatePresence>
        {drawerMember && (
          <DetailDrawer
            isOpen={!!drawerMember}
            onClose={() => setDrawerMember(null)}
            title={drawerMember.name || drawerMember.email}
          >
            <MemberDetailContent member={drawerMember} />
          </DetailDrawer>
        )}
      </AnimatePresence>
    </>
  );
}
