'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  MoreVertical,
  ExternalLink,
  Eye,
  Trash2,
  XCircle,
  Copy,
  CheckSquare,
  Square,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Form } from '@/lib/types';
import { relativeTime } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { DetailDrawer } from './DetailDrawer';

interface FormsRegistryTabProps {
  forms: Form[];
  onSwitchSubtab: (tab: string, formSlug?: string) => void;
  onOpenManualModal: (form: Form) => void;
}

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'CLOSED';

const STATUS_BORDER: Record<string, string> = {
  PUBLISHED: 'border-l-emerald-500',
  CLOSED: 'border-l-slate-500',
  DRAFT: 'border-l-amber-500',
  SCHEDULED: 'border-l-blue-500',
};

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-slate-700 text-slate-400',
  DRAFT: 'bg-amber-500/15 text-amber-400',
  SCHEDULED: 'bg-blue-500/15 text-blue-400',
};

function FormDetailContent({
  form,
  onSwitchSubtab,
}: {
  form: Form;
  onSwitchSubtab: (tab: string, slug?: string) => void;
}) {
  const [dangerOpen, setDangerOpen] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);

  const copySlug = () => {
    navigator.clipboard.writeText(form.slug).then(() => {
      setSlugCopied(true);
      setTimeout(() => setSlugCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Title + meta */}
      <div>
        <h3 className="text-base font-black text-white">{form.title}</h3>
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={copySlug}
            className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-orange-400 transition-colors"
            title="Copy slug"
          >
            <span>{form.slug}</span>
            <Copy className="w-3 h-3" />
          </button>
          {slugCopied && (
            <span className="text-xs text-emerald-400">Copied!</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_BADGE[form.status] || 'bg-slate-700 text-slate-400'}`}>
            {form.status}
          </span>
          <span className="px-2 py-1 rounded text-xs font-bold bg-orange-500/10 text-orange-400">
            {form.category || 'General'}
          </span>
          <span className="px-2 py-1 rounded text-xs font-mono bg-slate-800 text-slate-400">
            v{form.version || 1}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Responses', value: (form as any).response_count ?? '—' },
          { label: 'Fields', value: form.fields?.filter(f => f.type !== 'SECTION').length ?? '—' },
          { label: 'Opens', value: form.open_at ? new Date(form.open_at).toLocaleDateString('en-IN') : 'Always' },
          { label: 'Closes', value: form.close_at ? new Date(form.close_at).toLocaleDateString('en-IN') : 'Never' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
            <div className="text-lg font-black text-white mt-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Quick Actions</p>
        <Link
          href={`/forms/${form.slug}`}
          target="_blank"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm text-slate-300 hover:text-white transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
          View Live Form
        </Link>
        <button
          onClick={() => onSwitchSubtab('responses', form.slug)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm text-slate-300 hover:text-white transition text-left"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          View Responses
        </button>
      </div>

      {/* Danger zone */}
      <div className="border border-rose-500/20 rounded-xl overflow-hidden">
        <button
          onClick={() => setDangerOpen(!dangerOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/5 transition"
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
              onClick={() => {
                if (confirm(`Close form "${form.title}"? Submissions will stop.`)) {
                  fetchApi(`/forms/${form.slug}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'CLOSED' }),
                  }).catch(() => {});
                }
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 font-semibold transition"
            >
              <XCircle className="w-3 h-3 inline mr-1.5" />
              Close Form
            </button>
            <button
              onClick={() => {
                if (confirm(`Permanently delete "${form.title}"? This cannot be undone.`)) {
                  fetchApi(`/forms/${form.slug}/`, { method: 'DELETE' }).catch(() => {});
                }
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 font-semibold transition"
            >
              <Trash2 className="w-3 h-3 inline mr-1.5" />
              Delete Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FormsRegistryTab({ forms, onSwitchSubtab, onOpenManualModal }: FormsRegistryTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [drawerForm, setDrawerForm] = useState<Form | null>(null);
  const [openKebab, setOpenKebab] = useState<number | string | null>(null);

  const filtered = useMemo(() => {
    return forms.filter((f) => {
      const matchSearch = f.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [forms, search, statusFilter]);

  const toggleSelect = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((f) => f.id)));
    }
  };

  if (forms.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <FileText className="w-12 h-12 text-slate-700" />
        <h3 className="text-base font-bold text-white">No forms created yet</h3>
        <p className="text-sm text-slate-400 max-w-xs">
          Use the MS Drag &amp; Drop Builder to create your first form.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search forms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#151722] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === s
                    ? 'bg-orange-500 text-white'
                    : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-xs font-bold text-orange-400">
              {selectedIds.size} selected
            </span>
            <button className="text-xs font-semibold text-slate-300 hover:text-white transition">
              Export Selected
            </button>
            <button className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition">
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#151722] rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0f0f1a] border-b border-slate-800 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleAll} className="text-slate-500 hover:text-orange-400">
                      {selectedIds.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="w-4 h-4" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-bold">Title</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Version</th>
                  <th className="px-4 py-3 font-bold">Responses</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Created</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((form) => (
                  <tr
                    key={form.id}
                    className={`border-l-2 ${STATUS_BORDER[form.status] || 'border-l-transparent'} hover:bg-slate-800/20 transition cursor-pointer`}
                    onClick={() => setDrawerForm(form)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(form.id)}
                        className="text-slate-500 hover:text-orange-400"
                      >
                        {selectedIds.has(form.id)
                          ? <CheckSquare className="w-4 h-4 text-orange-500" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white max-w-[220px]">
                      <div className="truncate">{form.title}</div>
                    </td>
                    <td className="px-4 py-3 text-orange-400 font-semibold">
                      {form.category || 'General'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">v{form.version || 1}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {(form as any).response_count ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_BADGE[form.status] || 'bg-slate-700 text-slate-400'}`}>
                        {form.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {form.created_at ? relativeTime(form.created_at) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenKebab(openKebab === form.id ? null : form.id)}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openKebab === form.id && (
                          <div className="absolute right-0 top-8 z-20 w-44 bg-[#0f0f1a] border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                            {[
                              { label: 'View Responses', action: () => onSwitchSubtab('responses', form.slug) },
                              { label: 'Import CSV', action: () => onSwitchSubtab('csv') },
                              { label: form.status === 'CLOSED' ? 'Manual Entry' : 'View Live', action: () => form.status === 'CLOSED' ? onOpenManualModal(form) : window.open(`/forms/${form.slug}`, '_blank') },
                            ].map(({ label, action }) => (
                              <button
                                key={label}
                                onClick={() => { action(); setOpenKebab(null); }}
                                className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No results for &quot;{search}&quot;.{' '}
              <button onClick={() => { setSearch(''); setStatusFilter('ALL'); }} className="text-orange-400 underline">
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer — AnimatePresence at parent level */}
      <AnimatePresence>
        {drawerForm && (
          <DetailDrawer
            isOpen={!!drawerForm}
            onClose={() => setDrawerForm(null)}
            title={drawerForm.title}
          >
            <FormDetailContent form={drawerForm} onSwitchSubtab={onSwitchSubtab} />
          </DetailDrawer>
        )}
      </AnimatePresence>
    </>
  );
}
