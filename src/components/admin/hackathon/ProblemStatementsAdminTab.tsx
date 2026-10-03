'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, EyeOff, FileUp, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import type { ProblemStatement } from '@/lib/types';
import { apiErrorMessage, hackathonApi, type ProblemStatementUploadResult } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { StatusPill } from '@/components/ui/StatusPill';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors } from './shared';

interface Draft {
  title: string;
  domain: string;
  tags: string;
  max_teams: string;
  description: string;
}

const EMPTY: Draft = { title: '', domain: '', tags: '', max_teams: '', description: '' };
const MAX_UPLOAD_BYTES = 1024 * 1024;
const CSV_TEMPLATE = 'title,description,domain\nSmart waste bins,IoT bins that report their fill level to the cleaning crew,IoT\n';

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'problem-statements-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function ProblemStatementsAdminTab({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProblemStatement | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState<ProblemStatementUploadResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    hackathonApi.problemStatements(slug).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [slug]);
  useEffect(load, [load]);

  const domains = useMemo(() => [...new Set(items.map((p) => p.domain).filter(Boolean))], [items]);

  const open = (ps: ProblemStatement | 'new') => {
    setEditing(ps);
    setErrors({});
    setDraft(ps === 'new' ? EMPTY : {
      title: ps.title, domain: ps.domain, tags: ps.tags.join(', '),
      max_teams: ps.max_teams ? String(ps.max_teams) : '', description: ps.description,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.title.trim()) next.title = 'Title is required.';
    if (!draft.domain.trim()) next.domain = 'Domain is required.';
    if (!draft.description.trim()) next.description = 'Description is required.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const body = {
      title: draft.title.trim(),
      domain: draft.domain.trim(),
      description: draft.description.trim(),
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      max_teams: draft.max_teams ? Number(draft.max_teams) : null,
    };
    try {
      if (editing === 'new') {
        const created = await hackathonApi.admin.createProblemStatement(slug, body);
        toast.success('Problem statement added', `Generated ID: ${created.code}`);
      } else if (editing) {
        await hackathonApi.admin.updateProblemStatement(slug, editing.id, body);
        toast.success('Problem statement updated');
      }
      setEditing(null);
      load();
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (ps: ProblemStatement) => {
    try {
      await hackathonApi.admin.updateProblemStatement(slug, ps.id, { is_active: !ps.is_active });
      load();
    } catch (err) {
      toast.error('Could not update', apiErrorMessage(err));
    }
  };

  const remove = async (ps: ProblemStatement) => {
    if (!window.confirm(`Delete ${ps.code}: ${ps.title}?`)) return;
    try {
      await hackathonApi.admin.deleteProblemStatement(slug, ps.id);
      toast.success('Problem statement deleted');
      load();
    } catch (err) {
      toast.error('Could not delete', apiErrorMessage(err));
    }
  };

  const openUpload = () => {
    setFile(null);
    setUploadError('');
    setUploadResult(null);
    setUploadOpen(true);
  };

  const chooseFile = (chosen: File | null) => {
    setUploadResult(null);
    setUploadError('');
    if (chosen && !chosen.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setUploadError('Choose a .csv file.');
      return;
    }
    if (chosen && chosen.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setUploadError('The file is too large (max 1 MB).');
      return;
    }
    setFile(chosen);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setUploadError('');
    try {
      const result = await hackathonApi.admin.uploadProblemStatements(slug, file);
      setUploadResult(result);
      if (result.created > 0) {
        toast.success(`${result.created} problem statement${result.created === 1 ? '' : 's'} added`);
        load();
      }
    } catch (err) {
      setUploadError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white"><Target className="h-4 w-4 text-[#FF7A00]" /> Problem statements ({items.length})</h3>
          <p className="text-xs text-slate-500">
            Public on the hackathon page. Enter a title, description and domain; the app generates each ID (PS-001, PS-002…). Teams pick one at registration, or bring their own through open innovation.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openUpload} className={BTN_GHOST}><FileUp className="h-3.5 w-3.5" /> Upload CSV</button>
          <button onClick={() => open('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> Add statement</button>
        </div>
      </div>

      {loading ? (
        <div className="h-24 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No problem statements yet. Add them one by one or upload a CSV; until then teams can only go open innovation (if enabled) or register without a problem.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="py-2 pr-3">ID</th><th className="py-2 pr-3">Title</th><th className="py-2 pr-3">Domain</th><th className="py-2 pr-3">Teams</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((ps) => (
                <tr key={ps.id}>
                  <td className="py-2.5 pr-3 font-mono text-xs font-bold text-[#8B2E3B] dark:text-rose-300">{ps.code}</td>
                  <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{ps.title}</td>
                  <td className="py-2.5 pr-3 text-xs text-slate-500">{ps.domain || '-'}</td>
                  <td className="py-2.5 pr-3 text-xs">{ps.team_count}{ps.max_teams ? ` / ${ps.max_teams}` : ''}</td>
                  <td className="py-2.5 pr-3">{ps.is_active ? <StatusPill tone="green">Active</StatusPill> : <StatusPill tone="slate">Inactive</StatusPill>}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => open(ps)} className={BTN_GHOST} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => toggleActive(ps)} className={BTN_GHOST} title={ps.is_active ? 'Deactivate' : 'Activate'}>
                        {ps.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => remove(ps)} className={BTN_DANGER} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        busy={busy}
        title={editing === 'new' ? 'Add problem statement' : 'Edit problem statement'}
        icon={Target}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={save} className="space-y-4">
          <p className="rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-2 text-xs text-slate-500">
            {editing === 'new'
              ? 'An ID (PS-001, PS-002…) is generated automatically when you save.'
              : <>ID <span className="font-mono font-bold text-[#8B2E3B] dark:text-rose-300">{(editing as ProblemStatement | null)?.code}</span> is generated by the app and cannot be changed.</>}
          </p>
          <div>
            <label className={LABEL}>Title *</label>
            <input value={draft.title} onChange={set('title')} placeholder="Smart campus attendance" className={INPUT} />
            {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Domain *</label>
              <input value={draft.domain} onChange={set('domain')} list="problem-domains" placeholder="EdTech" className={INPUT} />
              <datalist id="problem-domains">{domains.map((d) => <option key={d} value={d} />)}</datalist>
              {errors.domain && <p className="mt-1 text-[11px] text-rose-500">{errors.domain}</p>}
            </div>
            <div>
              <label className={LABEL}>Max teams</label>
              <input type="number" min={1} value={draft.max_teams} onChange={set('max_teams')} placeholder="Unlimited" className={INPUT} />
              {errors.max_teams && <p className="mt-1 text-[11px] text-rose-500">{errors.max_teams}</p>}
            </div>
          </div>
          <div>
            <label className={LABEL}>Tags (comma separated)</label>
            <input value={draft.tags} onChange={set('tags')} placeholder="iot, ml" className={INPUT} />
          </div>
          <MarkdownEditor
            label="Description *"
            value={draft.description}
            onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
            placeholder="Problem background, expected outcome, constraints…"
          />
          {errors.description && <p className="-mt-2 text-[11px] text-rose-500">{errors.description}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} busy={busy} title="Upload problem statements" icon={FileUp} maxWidth="max-w-xl">
        <form onSubmit={upload} className="space-y-4">
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>
              Upload a <strong>.csv</strong> with the columns <code className="font-mono">title</code>, <code className="font-mono">description</code> and <code className="font-mono">domain</code>.
              Every row needs all three. The app generates the IDs and skips rows that repeat an existing title and domain.
            </p>
            <button type="button" onClick={downloadTemplate} className={BTN_GHOST}><Download className="h-3.5 w-3.5" /> Download template</button>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF7A00]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#C25A00]"
          />
          {uploadError && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{uploadError}</p>}

          {uploadResult && (
            <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs">
              <p className="font-bold text-[#1A1A2E] dark:text-white">
                {uploadResult.created} added{uploadResult.codes.length > 0 && ` (${uploadResult.codes[0]}${uploadResult.codes.length > 1 ? ` – ${uploadResult.codes[uploadResult.codes.length - 1]}` : ''})`}
                {uploadResult.skipped > 0 && ` · ${uploadResult.skipped} duplicate${uploadResult.skipped === 1 ? '' : 's'} skipped`}
                {uploadResult.errors.length > 0 && ` · ${uploadResult.errors.length} row${uploadResult.errors.length === 1 ? '' : 's'} failed`}
              </p>
              {uploadResult.errors.length > 0 && (
                <ul className="max-h-36 space-y-0.5 overflow-y-auto text-rose-600 dark:text-rose-400">
                  {uploadResult.errors.map((row) => <li key={row.row}>Row {row.row}: {row.message}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setUploadOpen(false)} disabled={busy} className={BTN_GHOST}>{uploadResult ? 'Done' : 'Cancel'}</button>
            <button type="submit" disabled={busy || !file} className={BTN_PRIMARY}>{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
