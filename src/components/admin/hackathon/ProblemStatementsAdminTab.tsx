'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Download, Eye, EyeOff, FileUp, Pencil, Plus, Target, Trash2, Users } from 'lucide-react';
import type { HackathonTeam, ProblemStatement } from '@/lib/types';
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
  order: string;
}

const EMPTY: Draft = { title: '', domain: '', tags: '', max_teams: '', description: '', order: '0' };
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
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProblemStatement | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<ProblemStatement | null>(null);
  // View teams modal state
  const [viewTeamsTarget, setViewTeamsTarget] = useState<ProblemStatement | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState<ProblemStatementUploadResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    Promise.all([
      hackathonApi.problemStatements(slug).then(setItems).catch(() => setItems([])),
      hackathonApi.admin.teams(slug).then(setTeams).catch(() => setTeams([])),
    ]).finally(() => setLoading(false));
  }, [slug]);

  useEffect(load, [load]);

  const domains = useMemo(() => [...new Set(items.map((p) => p.domain).filter(Boolean))], [items]);

  const open = (ps: ProblemStatement | 'new') => {
    setEditing(ps);
    setErrors({});
    setDraft(ps === 'new' ? { ...EMPTY, order: String(items.length + 1) } : {
      title: ps.title, domain: ps.domain, tags: ps.tags.join(', '),
      max_teams: ps.max_teams ? String(ps.max_teams) : '', description: ps.description,
      order: String(ps.order ?? 0),
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
      order: Number(draft.order || 0),
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
      toast.success(ps.is_active ? 'Problem statement deactivated' : 'Problem statement activated');
      load();
    } catch (err) {
      toast.error('Could not update', apiErrorMessage(err));
    }
  };

  const confirmDelete = async (force = false) => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await hackathonApi.admin.deleteProblemStatement(slug, deleteTarget.id, force);
      if (res.teams_unassigned && res.teams_unassigned > 0) {
        toast.success('Problem statement deleted', `Unassigned from ${res.teams_unassigned} team(s).`);
      } else {
        toast.success('Problem statement deleted');
      }
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Could not delete', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (ps: ProblemStatement, direction: 'up' | 'down') => {
    const idx = items.findIndex((x) => x.id === ps.id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= items.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const other = items[targetIdx];

    setBusy(true);
    try {
      const tempOrder = 999999;
      await hackathonApi.admin.updateProblemStatement(slug, ps.id, { order: tempOrder });
      await hackathonApi.admin.updateProblemStatement(slug, other.id, { order: ps.order });
      await hackathonApi.admin.updateProblemStatement(slug, ps.id, { order: other.order });
      load();
    } catch (err) {
      toast.error('Could not reorder', apiErrorMessage(err));
    } finally {
      setBusy(false);
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
      if (result.created) {
        toast.success(`Imported ${result.created} problem statement(s)`);
        load();
      }
    } catch (err: any) {
      setUploadError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const assignedTeamsFor = (psId: number) => teams.filter((t) => t.problem_statement?.id === psId);

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Problem Statements</h3>
          <p className="text-xs text-slate-500">
            Define problem statements for participants or import via CSV. Team assignments and slot capacity update automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openUpload} className={BTN_GHOST}><FileUp className="h-3.5 w-3.5" /> Import CSV</button>
          <button onClick={() => open('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> Add statement</button>
        </div>
      </div>

      {loading ? (
        <div className="h-24 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No problem statements yet. Add them one by one or upload a CSV; until then teams can only go open innovation (if enabled) or register without a problem.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 pr-3 w-16">Order</th>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Domain</th>
                <th className="py-2 pr-3">Assigned Teams</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((ps, idx) => {
                const assigned = assignedTeamsFor(ps.id);
                return (
                  <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0 || busy}
                          onClick={() => reorder(ps, 'up')}
                          className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          disabled={idx === items.length - 1 || busy}
                          onClick={() => reorder(ps, 'down')}
                          className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs font-bold text-[#8B2E3B] dark:text-rose-300">{ps.code}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{ps.title}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">{ps.domain || '-'}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      {assigned.length > 0 ? (
                        <button
                          onClick={() => setViewTeamsTarget(ps)}
                          className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20"
                        >
                          <Users className="h-3 w-3" /> {assigned.length} team(s){ps.max_teams ? ` / ${ps.max_teams}` : ''}
                        </button>
                      ) : (
                        <span className="text-slate-400">0{ps.max_teams ? ` / ${ps.max_teams}` : ''}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">{ps.is_active ? <StatusPill tone="green">Active</StatusPill> : <StatusPill tone="slate">Inactive</StatusPill>}</td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => open(ps)} className={BTN_GHOST} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => toggleActive(ps)} className={BTN_GHOST} title={ps.is_active ? 'Deactivate' : 'Activate'}>
                          {ps.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setDeleteTarget(ps)} className={BTN_DANGER} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / New Modal */}
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
          <div className="grid gap-4 sm:grid-cols-3">
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
            <div>
              <label className={LABEL}>Display order</label>
              <input type="number" value={draft.order} onChange={set('order')} placeholder="1" className={INPUT} />
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        busy={busy}
        title={`Delete ${deleteTarget?.code}: ${deleteTarget?.title}`}
        icon={AlertTriangle}
      >
        <div className="space-y-4">
          {deleteTarget && assignedTeamsFor(deleteTarget.id).length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> {assignedTeamsFor(deleteTarget.id).length} team(s) currently assigned
                </p>
                <p>
                  Teams currently using this problem: {assignedTeamsFor(deleteTarget.id).map((t) => t.name).join(', ')}.
                </p>
                <p>
                  Force-deleting will unassign this statement from those teams (their problem statement field will be cleared).
                  Alternatively, you can <strong>deactivate</strong> it so no new teams can select it, preserving existing team assignments.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    toggleActive(deleteTarget);
                    setDeleteTarget(null);
                  }}
                  className={BTN_GHOST}
                >
                  Deactivate Instead
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirmDelete(true)}
                  className={BTN_DANGER}
                >
                  {busy ? 'Deleting…' : 'Force Unassign & Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete this problem statement? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
                <button type="button" onClick={() => confirmDelete(false)} disabled={busy} className={BTN_DANGER}>
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* View Assigned Teams Modal */}
      <Modal
        isOpen={viewTeamsTarget !== null}
        onClose={() => setViewTeamsTarget(null)}
        title={viewTeamsTarget ? `Teams assigned to ${viewTeamsTarget.code}` : ''}
        icon={Users}
      >
        <div className="space-y-3">
          {viewTeamsTarget && assignedTeamsFor(viewTeamsTarget.id).length === 0 ? (
            <p className="text-xs text-slate-400">No teams are currently assigned to this statement.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {viewTeamsTarget && assignedTeamsFor(viewTeamsTarget.id).map((t) => (
                <li key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[#1A1A2E] dark:text-white">{t.name}</p>
                    <p className="text-slate-400">Leader: {t.leader_email ?? '-'} · {t.member_count} member(s)</p>
                  </div>
                  <StatusPill tone={t.status === 'REGISTERED' ? 'green' : 'amber'}>{t.status}</StatusPill>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={() => setViewTeamsTarget(null)} className={BTN_GHOST}>Close</button>
          </div>
        </div>
      </Modal>

      {/* Upload CSV Modal */}
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} busy={busy} title="Import problem statements from CSV" icon={FileUp}>
        <form onSubmit={upload} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">Columns: <code>title</code>, <code>description</code>, <code>domain</code></span>
            <button type="button" onClick={downloadTemplate} className="flex items-center gap-1 font-semibold text-[#8B2E3B] dark:text-rose-400 hover:underline">
              <Download className="h-3 w-3" /> Template
            </button>
          </div>
          <div
            onClick={() => fileInput.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center hover:border-[#8B2E3B]"
          >
            <input ref={fileInput} type="file" accept=".csv" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} className="hidden" />
            <FileUp className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-[#1A1A2E] dark:text-white">{file ? file.name : 'Click to choose CSV'}</p>
            <p className="text-xs text-slate-400">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'UTF-8 encoded, up to 1 MB'}</p>
          </div>
          {uploadError && <p className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-500">{uploadError}</p>}
          {uploadResult && (
            <div className="rounded-lg bg-slate-100 dark:bg-white/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-600">Created: {uploadResult.created}</p>
              {uploadResult.skipped > 0 && <p className="text-slate-500">Skipped duplicates: {uploadResult.skipped}</p>}
              {uploadResult.errors.length > 0 && (
                <div className="pt-2 text-rose-500">
                  <p className="font-semibold">{uploadResult.errors.length} row(s) failed:</p>
                  <ul className="list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
                    {uploadResult.errors.map((err, i) => <li key={i}>Row {err.row}: {err.message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setUploadOpen(false)} disabled={busy} className={BTN_GHOST}>Close</button>
            <button type="submit" disabled={busy || !file} className={BTN_PRIMARY}>{busy ? 'Importing…' : 'Import'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
