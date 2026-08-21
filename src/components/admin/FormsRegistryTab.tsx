'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  ExternalLink,
  Eye,
  Trash2,
  XCircle,
  Copy,
  Plus,
  Clock,
  Sparkles,
  Undo2,
  Calendar,
  Layers,
  ChevronDown,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  Share2,
  Edit3,
  Inbox,
  Lock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Form, FormField } from '@/lib/types';
import { relativeTime } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface FormsRegistryTabProps {
  forms: Form[];
  onSwitchSubtab: (tab: string, formSlug?: string) => void;
  onOpenManualModal: (form: Form) => void;
  onStatusTransition?: (formSlug: string, action: 'publish' | 'unpublish' | 'close' | 'schedule' | 'reopen', data?: any) => Promise<any>;
  onEditInBuilder?: (form: Form) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'SCHEDULED' | 'CLOSED';

const STATUS_BORDER: Record<string, string> = {
  PUBLISHED: 'border-l-emerald-500',
  CLOSED: 'border-l-slate-600',
  DRAFT: 'border-l-amber-500',
  SCHEDULED: 'border-l-blue-500',
  ARCHIVED: 'border-l-rose-500',
};

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  CLOSED: 'bg-slate-700/60 text-slate-300 border border-slate-600/40',
  DRAFT: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  SCHEDULED: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  ARCHIVED: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
};

function formatForDateTimeLocal(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function FormsRegistryTab({
  forms,
  onSwitchSubtab,
  onOpenManualModal,
  onStatusTransition,
  onEditInBuilder,
  isLoading = false,
  onRefresh,
}: FormsRegistryTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedFormId, setSelectedFormId] = useState<number | string | null>(forms[0]?.id ?? null);
  const [localFormOverrides, setLocalFormOverrides] = useState<Record<string, Partial<Form>>>({});
  const [slugCopied, setSlugCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedOpenAt, setSchedOpenAt] = useState('');
  const [schedCloseAt, setSchedCloseAt] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filteredForms = useMemo(() => {
    return forms.map((f) => ({ ...f, ...(localFormOverrides[f.slug] || {}) })).filter((f) => {
      const matchSearch =
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        f.slug.toLowerCase().includes(search.toLowerCase()) ||
        (f.category || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [forms, search, statusFilter, localFormOverrides]);

  const selectedFormRaw = forms.find((f) => f.id === selectedFormId) || forms[0];
  const selectedForm = selectedFormRaw
    ? { ...selectedFormRaw, ...(localFormOverrides[selectedFormRaw.slug] || {}) }
    : null;

  const openScheduleModal = (formToSchedule?: Form | null) => {
    const target = formToSchedule || selectedForm;
    if (!target) return;
    setSchedOpenAt(formatForDateTimeLocal(target.open_at));
    setSchedCloseAt(formatForDateTimeLocal(target.close_at));
    setShowScheduleModal(true);
  };

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug).then(() => {
      setSlugCopied(true);
      setTimeout(() => setSlugCopied(false), 2000);
    });
  };

  const copyLiveLink = (slug: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/forms/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleAction = async (
    action: 'publish' | 'unpublish' | 'close' | 'schedule' | 'reopen',
    extraData?: any
  ) => {
    if (!selectedForm) return;
    setActionLoading(true);
    try {
      if (onStatusTransition) {
        await onStatusTransition(selectedForm.slug, action, extraData);
      } else {
        await fetchApi(`/forms/${selectedForm.slug}/${action}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extraData || {}),
        });
      }
    } catch (err: any) {
      toast.error('Action Failed', err?.message || `Could not ${action} "${selectedForm.title}".`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedForm) return;
    if (confirm(`Permanently delete form "${selectedForm.title}"? This cannot be undone.`)) {
      try {
        await fetchApi(`/forms/${selectedForm.slug}/`, { method: 'DELETE' });
        toast.success('Form Removed', `Form "${selectedForm.title}" deleted.`);
        window.location.reload();
      } catch (err: any) {
        toast.error('Delete Failed', err?.message || `Could not delete "${selectedForm.title}".`);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Schedule Modal */}
      {showScheduleModal && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#151722] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-500 font-bold text-base">
                <Clock className="w-5 h-5" />
                <h3>Schedule Launch Window</h3>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set automated publication start and close dates for <strong>{selectedForm.title}</strong>:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Open Date (Start Submissions)</label>
                <input
                  type="datetime-local"
                  value={schedOpenAt}
                  onChange={(e) => setSchedOpenAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 rounded-xl text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Close Date (Auto Lock)</label>
                <input
                  type="datetime-local"
                  value={schedCloseAt}
                  onChange={(e) => setSchedCloseAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 rounded-xl text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setSchedOpenAt('');
                  setSchedCloseAt('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 hover:text-rose-400 transition"
              >
                Clear Dates
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    if (!schedOpenAt && !schedCloseAt) {
                      toast.warning('Schedule Required', 'Please set at least an Open Date or Close Date.');
                      return;
                    }
                    if (schedOpenAt && schedCloseAt && new Date(schedOpenAt) > new Date(schedCloseAt)) {
                      toast.error('Invalid Range', 'Open Date cannot be later than Close Date.');
                      return;
                    }
                    setShowScheduleModal(false);
                    handleAction('schedule', {
                      open_at: schedOpenAt ? new Date(schedOpenAt).toISOString() : null,
                      close_at: schedCloseAt ? new Date(schedCloseAt).toISOString() : null,
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split View: Left list, Right detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: All Forms Registry List (lg:col-span-5) */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* List Header & Search */}
          <div className="bg-white dark:bg-[#151722] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Forms Directory ({isLoading ? '...' : filteredForms.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Refresh Forms"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => onSwitchSubtab('builder')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Form</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title, slug, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {(['ALL', 'PUBLISHED', 'DRAFT', 'SCHEDULED', 'CLOSED'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    statusFilter === s
                      ? 'bg-orange-500 text-white'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Forms Card List */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {isLoading ? (
              /* Skeleton Loader Cards */
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="p-4 rounded-2xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/5" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-10" />
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No forms found matching filters</p>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                  className="text-xs text-orange-400 underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredForms.map((f) => {
                const isSelected = selectedForm?.id === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFormId(f.id)}
                    className={`p-4 rounded-2xl border-l-4 transition-all cursor-pointer ${
                      STATUS_BORDER[f.status] || 'border-l-slate-700'
                    } ${
                      isSelected
                        ? 'bg-orange-500/10 border border-orange-500/40 shadow-lg scale-[1.01]'
                        : 'bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 hover:border-slate-600/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {f.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            /{f.slug}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-500 dark:text-slate-400">
                            {f.category || 'General'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-500">
                            v{f.version || 1}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${STATUS_BADGE[f.status] || 'bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {f.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                        <Inbox className="w-3.5 h-3.5 text-orange-400" />
                        <span>{f.response_count ?? 0} responses</span>
                      </div>
                      <span>{f.created_at ? relativeTime(f.created_at) : 'Saved'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Selected Form Detail & Management (lg:col-span-7) */}
        {/* ============================================================ */}
        <div className="lg:col-span-7">
          {isLoading ? (
            <div className="bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-pulse">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                </div>
                <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
                ))}
              </div>
              <div className="flex gap-2">
                <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-32" />
                <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-28" />
              </div>
            </div>
          ) : selectedForm ? (
            <div className="bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6 space-y-6">
              
              {/* Form Title & Metadata Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_BADGE[selectedForm.status] || 'bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {selectedForm.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/10 text-orange-400">
                        {selectedForm.category || 'General'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-500 dark:text-slate-400">
                        v{selectedForm.version || 1}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {selectedForm.title}
                    </h2>
                  </div>

                  {/* Slug copy pill */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex-shrink-0">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 max-w-[150px] truncate">{selectedForm.slug}</span>
                    <button
                      onClick={() => copySlug(selectedForm.slug)}
                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-orange-400 transition"
                      title="Copy Slug"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {slugCopied && <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>}
                  </div>
                </div>

                {selectedForm.description && (
                  <div className="pt-1">
                    <MarkdownRenderer content={selectedForm.description} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed" />
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* Active Management Controls Toolbar */}
              {/* ============================================================ */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Form Management &amp; Lifecycle Controls
                </p>

                <div className="flex items-center flex-wrap gap-2 pt-1">
                  
                  {/* Edit in Builder */}
                  <button
                    onClick={() => {
                      if (onEditInBuilder) {
                        onEditInBuilder(selectedForm);
                      }
                      onSwitchSubtab('builder', selectedForm.slug);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Edit in Builder</span>
                  </button>

                  {/* Manual Data Entry (Always enabled for live or closed) */}
                  <button
                    onClick={() => onOpenManualModal(selectedForm)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Manual Entry</span>
                  </button>

                  {/* Lifecycle: If DRAFT */}
                  {selectedForm.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => handleAction('publish')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] hover:brightness-110 text-white text-xs font-bold shadow transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Publish Live</span>
                      </button>
                      <button
                        onClick={() => openScheduleModal(selectedForm)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Schedule Launch</span>
                      </button>
                    </>
                  )}

                  {/* Lifecycle: If PUBLISHED */}
                  {selectedForm.status === 'PUBLISHED' && (
                    <>
                      <button
                        onClick={() => handleAction('unpublish')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold border border-amber-500/30 transition"
                        title="Undo publish and revert back to Draft"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Undo Publish (Draft)</span>
                      </button>
                      <button
                        onClick={() => openScheduleModal(selectedForm)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Reschedule Window</span>
                      </button>
                      <button
                        onClick={() => handleAction('close')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-600 transition"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Close Form</span>
                      </button>
                    </>
                  )}

                  {/* Lifecycle: If SCHEDULED */}
                  {selectedForm.status === 'SCHEDULED' && (
                    <>
                      <button
                        onClick={() => handleAction('publish')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] hover:brightness-110 text-white text-xs font-bold shadow transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Publish Immediately</span>
                      </button>
                      <button
                        onClick={() => openScheduleModal(selectedForm)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Modify Schedule</span>
                      </button>
                      <button
                        onClick={() => handleAction('unpublish')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/30 transition"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Cancel Schedule</span>
                      </button>
                    </>
                  )}

                  {/* Lifecycle: If CLOSED */}
                  {selectedForm.status === 'CLOSED' && (
                    <>
                      <button
                        onClick={() => handleAction('publish')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] text-white text-xs font-bold shadow transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Re-Publish Live</span>
                      </button>
                      <button
                        onClick={() => openScheduleModal(selectedForm)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Schedule Re-open</span>
                      </button>
                      <button
                        onClick={() => handleAction('reopen', { status: 'DRAFT' })}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Re-open as Draft</span>
                      </button>
                    </>
                  )}

                  {/* View Responses Button */}
                  <button
                    onClick={() => onSwitchSubtab('responses', selectedForm.slug)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
                  >
                    <Inbox className="w-3.5 h-3.5 text-blue-400" />
                    <span>View Responses</span>
                  </button>

                  {/* View Live (if published) */}
                  {selectedForm.status === 'PUBLISHED' && (
                    <Link
                      href={`/forms/${selectedForm.slug}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Live Form</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* ============================================================ */}
              {/* Status-Driven Insights Row: Published vs Non-Published */}
              {/* ============================================================ */}
              {selectedForm.status === 'PUBLISHED' ? (
                /* Published State: Live Metrics & Public Sharing */
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Form is Active &amp; Receiving Submissions</span>
                    </div>

                    <button
                      onClick={() => copyLiveLink(selectedForm.slug)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{linkCopied ? 'Link Copied!' : 'Copy Live Link'}</span>
                    </button>
                  </div>

                  {/* Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-[#151722] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Responses</span>
                      <div className="text-xl font-black text-[#1A1A2E] dark:text-white mt-1">{selectedForm.response_count ?? 0}</div>
                    </div>
                    <div className="bg-white dark:bg-[#151722] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Schema Fields</span>
                      <div className="text-xl font-black text-orange-400 mt-1">
                        {selectedForm.fields?.filter((f) => f.type !== 'SECTION' && !f.is_deleted).length || 0}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#151722] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Opens</span>
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1.5 truncate">
                        {selectedForm.open_at ? new Date(selectedForm.open_at).toLocaleDateString('en-IN') : 'Always Open'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#151722] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deadline</span>
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1.5 truncate">
                        {selectedForm.close_at ? new Date(selectedForm.close_at).toLocaleDateString('en-IN') : 'No Deadline'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedForm.status === 'SCHEDULED' ? (
                /* Scheduled State */
                <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Scheduled for Automatic Launch</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    This form will automatically open on{' '}
                    <strong>{selectedForm.open_at ? new Date(selectedForm.open_at).toLocaleString('en-IN') : 'TBD'}</strong>
                    {selectedForm.close_at && (
                      <> and close on <strong>{new Date(selectedForm.close_at).toLocaleString('en-IN')}</strong></>
                    )}.
                  </p>
                </div>
              ) : (
                /* Draft or Closed State: Explicit Notice */
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{selectedForm.status === 'DRAFT' ? 'Draft Mode — Not Published' : 'Form Closed'}</span>
                    </div>

                    <button
                      onClick={() => handleAction('publish')}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
                    >
                      Publish Live Now
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedForm.status === 'DRAFT'
                      ? 'This form is saved as a draft. Public students cannot access or submit until you hit Publish Live.'
                      : 'This form has closed. Public students cannot submit, but you can still record offline responses via Manual Entry.'}
                  </p>
                </div>
              )}

              {/* Submission Policy & Edit Window Control Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Student Submission &amp; Edit Controls
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure submission frequency limits and response editing permissions per student.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Submission Limit Control */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Submission Limit</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        selectedForm.allow_multiple_responses
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {selectedForm.allow_multiple_responses ? 'Multiple Allowed' : '1 per Student'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {selectedForm.allow_multiple_responses
                        ? 'Students can fill and submit this form multiple times.'
                        : 'Students can only submit once. If filled, they enter response edit mode.'}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedForm) return;
                        const target = !selectedForm.allow_multiple_responses;
                        setLocalFormOverrides((prev) => ({
                          ...prev,
                          [selectedForm.slug]: { ...prev[selectedForm.slug], allow_multiple_responses: target },
                        }));
                        try {
                          await fetchApi(`/forms/${selectedForm.slug}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ allow_multiple_responses: target }),
                          });
                          toast.success(
                            'Policy Updated',
                            target
                              ? 'Multiple responses per student allowed.'
                              : 'Form restricted to 1 response per student.'
                          );
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          setLocalFormOverrides((prev) => ({
                            ...prev,
                            [selectedForm.slug]: { ...prev[selectedForm.slug], allow_multiple_responses: !target },
                          }));
                          toast.error('Update Failed', err?.message || 'Unable to update policy.');
                        }
                      }}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition text-center"
                    >
                      {selectedForm.allow_multiple_responses ? 'Switch to Single (1 Limit)' : 'Allow Multiple Responses'}
                    </button>
                  </div>

                  {/* Response Editing Control */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Response Editing</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        selectedForm.allow_response_editing !== false
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {selectedForm.allow_response_editing !== false ? 'Edits Allowed' : 'Edits Locked'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {selectedForm.allow_response_editing !== false
                        ? 'Students who submitted can return anytime to view and edit answers.'
                        : 'Responses cannot be edited by students once submitted.'}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedForm) return;
                        const target = selectedForm.allow_response_editing === false;
                        setLocalFormOverrides((prev) => ({
                          ...prev,
                          [selectedForm.slug]: { ...prev[selectedForm.slug], allow_response_editing: target },
                        }));
                        try {
                          await fetchApi(`/forms/${selectedForm.slug}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ allow_response_editing: target }),
                          });
                          toast.success(
                            'Policy Updated',
                            target
                              ? 'Students can now edit their submitted response.'
                              : 'Student response editing disabled.'
                          );
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          setLocalFormOverrides((prev) => ({
                            ...prev,
                            [selectedForm.slug]: { ...prev[selectedForm.slug], allow_response_editing: !target },
                          }));
                          toast.error('Update Failed', err?.message || 'Unable to update policy.');
                        }
                      }}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition text-center"
                    >
                      {selectedForm.allow_response_editing !== false ? 'Lock Submissions (No Edits)' : 'Enable Response Editing'}
                    </button>
                  </div>

                  {/* Auto-fill Profile Details Control */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Auto-fill Student Profile</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        selectedForm.enable_prefill !== false && !selectedForm.allow_multiple_responses
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/60 text-slate-400 border border-slate-600/40'
                      }`}>
                        {selectedForm.enable_prefill !== false && !selectedForm.allow_multiple_responses
                          ? 'Active (Limit: 1)'
                          : selectedForm.allow_multiple_responses
                          ? 'Inactive (Multiple Allowed)'
                          : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Automatically matches and pre-fills verified student name, email, phone number, roll number, branch, and year when the submission limit is 1.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedForm) return;
                        const target = selectedForm.enable_prefill === false;
                        setLocalFormOverrides((prev) => ({
                          ...prev,
                          [selectedForm.slug]: { ...prev[selectedForm.slug], enable_prefill: target },
                        }));
                        try {
                          await fetchApi(`/forms/${selectedForm.slug}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enable_prefill: target }),
                          });
                          toast.success(
                            'Policy Updated',
                            target
                              ? 'Student profile auto-fill enabled for single-submission forms.'
                              : 'Student profile auto-fill disabled.'
                          );
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          setLocalFormOverrides((prev) => ({
                            ...prev,
                            [selectedForm.slug]: { ...prev[selectedForm.slug], enable_prefill: !target },
                          }));
                          toast.error('Update Failed', err?.message || 'Unable to update policy.');
                        }
                      }}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition text-center"
                    >
                      {selectedForm.enable_prefill !== false ? 'Disable Profile Auto-fill' : 'Enable Profile Auto-fill'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Fields Summary preview */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Configured Fields ({selectedForm.fields?.filter((f) => !f.is_deleted).length || 0})
                  </p>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedForm.fields?.filter((f) => !f.is_deleted).map((field, idx) => (
                    <div
                      key={field.id || idx}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{field.label}</span>
                        {field.is_required && <span className="text-rose-500 font-bold">*</span>}
                      </div>

                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] flex-shrink-0">
                        {field.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-rose-500/20 rounded-2xl overflow-hidden pt-1">
                <button
                  onClick={() => setDangerOpen(!dangerOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Danger Zone
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${dangerOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {dangerOpen && (
                  <div className="px-4 pb-4 space-y-2 border-t border-rose-500/20">
                    <button
                      onClick={() => handleAction('close')}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 font-semibold transition"
                    >
                      <XCircle className="w-3 h-3 inline mr-1.5" />
                      Close Form to Responses
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 font-semibold transition"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1.5" />
                      Delete Form Permanently
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="py-24 text-center bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <FileText className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Select a form from the directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Click any form on the left to inspect its live status, manage publication states, record manual data, or jump to responses.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
