'use client';

import { LoadError } from './LoadError';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Download, Eye, EyeOff, FileUp, Lightbulb, Pencil, Plus, Target, Trash2, Users } from 'lucide-react';
import type { HackathonTeam, ProblemStatement } from '@/lib/types';
import { apiErrorMessage, hackathonApi, type ProblemStatementUploadResult } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { FormSelect } from '@/components/ui/FormSelect';
import { TagInput } from '@/components/ui/TagInput';
import { ProblemDomainsPanel } from './ProblemDomainsPanel';
import { StatusPill, TEAM_STATUS_PILL } from '@/components/ui/StatusPill';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors } from './shared';

interface Draft {
  title: string;
  domain: string;
  tags: string[];
  max_teams: string;
  description: string;
  is_active: boolean;
}

const EMPTY: Draft = { title: '', domain: '', tags: [], max_teams: '', description: '', is_active: true };
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
  const [domainList, setDomainList] = useState<string[]>([]);
  const [quickDomain, setQuickDomain] = useState<string | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<ProblemStatement | null>(null);
  // View teams modal state
  const [viewTeamsTarget, setViewTeamsTarget] = useState<ProblemStatement | null>(null);
  // Open innovation: the team whose own problem is being read in full.
  const [viewOpenInnovationTarget, setViewOpenInnovationTarget] = useState<HackathonTeam | null>(null);
  const [allowOpenInnovation, setAllowOpenInnovation] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState<ProblemStatementUploadResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [loadError, setLoadError] = useState('');
  const load = useCallback(() => {
    setLoadError('');
    Promise.all([
      hackathonApi.problemStatements(slug).then(setItems).catch((err) => setLoadError(apiErrorMessage(err, 'Could not load problem statements.'))),
      hackathonApi.admin.teams(slug).then(setTeams).catch(() => setTeams([])),
      hackathonApi.get(slug)
        .then((hackathon) => {
          setDomainList(hackathon.problem_domains ?? []);
          setAllowOpenInnovation(Boolean(hackathon.allow_open_innovation));
        })
        .catch(() => setDomainList([])),
    ]).finally(() => setLoading(false));
  }, [slug]);

  useEffect(load, [load]);

  const domainUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((statement) => {
      const key = (statement.domain || '').toLowerCase();
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [items]);
  const allTags = useMemo(() => [...new Set(items.flatMap((statement) => statement.tags))].sort(), [items]);

  const addQuickDomain = async () => {
    const name = (quickDomain ?? '').replace(/\s+/g, ' ').trim();
    if (!name) return;
    const existing = domainList.find((domain) => domain.toLowerCase() === name.toLowerCase());
    if (existing) {
      setDraft((d) => ({ ...d, domain: existing }));
      setQuickDomain(null);
      return;
    }
    try {
      const saved = await hackathonApi.admin.update(slug, { problem_domains: [...domainList, name] });
      setDomainList(saved.problem_domains ?? [...domainList, name]);
      setDraft((d) => ({ ...d, domain: name }));
      setQuickDomain(null);
    } catch (err) {
      toast.error('Could not add the domain', apiErrorMessage(err));
    }
  };

  const domainOptions = useMemo(() => {
    const names = draft.domain && !domainList.some((d) => d.toLowerCase() === draft.domain.toLowerCase()) ? [draft.domain, ...domainList] : domainList;
    return names.map((name) => ({ value: name, label: name }));
  }, [domainList, draft.domain]);

  const open = (ps: ProblemStatement | 'new') => {
    setEditing(ps);
    setErrors({});
    setQuickDomain(null);
    setDraft(ps === 'new' ? EMPTY : {
      title: ps.title, domain: ps.domain, tags: ps.tags,
      max_teams: ps.max_teams ? String(ps.max_teams) : '', description: ps.description, is_active: ps.is_active,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.title.trim()) next.title = 'Title is required.';
    if (!draft.domain.trim()) next.domain = 'Select a domain (add one first if the list is empty).';
    if (!draft.description.trim()) next.description = 'Description is required.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const body = {
      title: draft.title.trim(),
      domain: draft.domain.trim(),
      description: draft.description.trim(),
      tags: draft.tags,
      max_teams: draft.max_teams ? Number(draft.max_teams) : null,
      is_active: draft.is_active,
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
    const ids = items.map((x) => x.id);
    [ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]];

    setBusy(true);
    try {
      setItems(await hackathonApi.admin.reorderProblemStatements(slug, ids));
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
  // Problems teams brought themselves, so the organizers see every problem in play, not only the official list.
  const openInnovationTeams = useMemo(
    () => teams.filter((team) => team.open_innovation).sort((a, b) => a.id - b.id),
    [teams],
  );
  const openInnovationCode = (team: HackathonTeam) => team.open_innovation?.code ?? `OI-${String(team.id).padStart(3, '0')}`;

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Problem Statements</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add problem statements one by one or import a CSV (new domains in the file are added to your list). IDs and order are assigned automatically; use the arrows to reorder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openUpload} className={BTN_GHOST}><FileUp className="h-3.5 w-3.5" /> Import CSV</button>
          <button onClick={() => open('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> Add statement</button>
        </div>
      </div>

      {loadError && <LoadError message={loadError} onRetry={load} />}
      {!loading && <ProblemDomainsPanel slug={slug} domains={domainList} usage={domainUsage} onChange={setDomainList} />}
      {loading ? (
        <div className="h-24 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No problem statements yet. Add them one by one or upload a CSV; until then teams can only go open innovation (if enabled) or register without a problem.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          disabled={idx === items.length - 1 || busy}
                          onClick={() => reorder(ps, 'down')}
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs font-bold text-[#8B2E3B] dark:text-rose-300">{ps.code}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{ps.title}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400">{ps.domain || '-'}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      {assigned.length > 0 ? (
                        <button
                          onClick={() => setViewTeamsTarget(ps)}
                          className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-500/20"
                        >
                          <Users className="h-3 w-3" /> {assigned.length} team(s){ps.max_teams ? ` / ${ps.max_teams}` : ''}
                        </button>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">0{ps.max_teams ? ` / ${ps.max_teams}` : ''}</span>
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

      {!loading && (allowOpenInnovation || openInnovationTeams.length > 0) && (
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A2E] dark:text-white">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Open innovation ({openInnovationTeams.length})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Problems teams proposed themselves instead of picking a statement above. Together with the list above, this is every problem in play.
              </p>
            </div>
            {!allowOpenInnovation && <StatusPill tone="slate">Turned off for new teams</StatusPill>}
          </div>

          {openInnovationTeams.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">No team has proposed its own problem yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Domain</th>
                    <th className="py-2 pr-3">Team</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {openInnovationTeams.map((team) => {
                    const problem = team.open_innovation!;
                    const pill = TEAM_STATUS_PILL[team.status] ?? { tone: 'slate' as const, label: team.status };
                    return (
                      <tr key={team.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3 font-mono text-xs font-bold text-[#8B2E3B] dark:text-rose-300">{openInnovationCode(team)}</td>
                        <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{problem.title}</td>
                        <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400">{problem.domain || '-'}</td>
                        <td className="py-2.5 pr-3 text-xs">
                          <p className="font-semibold text-[#1A1A2E] dark:text-white">{team.name}</p>
                          <p className="text-slate-500 dark:text-slate-400">{team.leader_email ?? '-'} · {team.member_count} member(s)</p>
                        </td>
                        <td className="py-2.5 pr-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => setViewOpenInnovationTarget(team)} className={BTN_GHOST} title="Read the full problem">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" form="problem-statement-form" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        }
      >
        <form id="problem-statement-form" onSubmit={save} className="space-y-4">
          <p className="rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
            {editing === 'new'
              ? 'An ID (PS-001, PS-002…) is generated automatically when you save.'
              : <>ID <span className="font-mono font-bold text-[#8B2E3B] dark:text-rose-300">{(editing as ProblemStatement | null)?.code}</span> is generated by the app and cannot be changed.</>}
          </p>
          <div>
            <label className={LABEL}>Title *</label>
            <input aria-label="Title" value={draft.title} onChange={set('title')} placeholder="Smart campus attendance" className={INPUT} />
            {errors.title && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Domain *</label>
              {domainOptions.length > 0 && (
                <FormSelect
                  value={draft.domain}
                  onChange={(value) => setDraft((d) => ({ ...d, domain: value }))}
                  options={domainOptions}
                  placeholder="Select a domain"
                  allowClear={false}
                />
              )}
              {quickDomain === null ? (
                <button type="button" onClick={() => setQuickDomain('')} className="mt-1.5 text-[11px] font-bold text-journey-accent hover:underline">
                  {domainOptions.length === 0 ? '+ Add the first domain' : '+ New domain'}
                </button>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    value={quickDomain}
                    maxLength={100}
                    onChange={(e) => setQuickDomain(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addQuickDomain();
                      }
                    }}
                    placeholder="e.g. HealthTech"
                    aria-label="New domain name"
                    className={INPUT}
                  />
                  <button type="button" onClick={addQuickDomain} className={BTN_PRIMARY}>Add</button>
                </div>
              )}
              {errors.domain && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.domain}</p>}
            </div>
            <div>
              <label className={LABEL}>Max teams</label>
              <input aria-label="Max teams" type="number" min={1} value={draft.max_teams} onChange={set('max_teams')} placeholder="Unlimited" className={INPUT} />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Leave blank for unlimited. Counts only active teams.</p>
              {errors.max_teams && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.max_teams}</p>}
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="ps-tags">Tags</label>
            <TagInput id="ps-tags" value={draft.tags} onChange={(tags) => setDraft((d) => ({ ...d, tags }))} suggestions={allTags} />
            {errors.tags && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.tags}</p>}
          </div>
          <MarkdownEditor
            label="Description *"
            value={draft.description}
            onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
            placeholder="Problem background, expected outcome, constraints…"
          />
          {errors.description && <p className="-mt-2 text-[11px] text-rose-600 dark:text-rose-400">{errors.description}</p>}
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#FF7A00]" />
            <span>
              <span className="font-bold text-[#1A1A2E] dark:text-white">Open for teams to pick</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Untick to hide it from participants. Teams already on it keep it.</span>
            </span>
          </label>
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
            <p className="text-xs text-slate-500 dark:text-slate-400">No teams are currently assigned to this statement.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {viewTeamsTarget && assignedTeamsFor(viewTeamsTarget.id).map((t) => (
                <li key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[#1A1A2E] dark:text-white">{t.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">Leader: {t.leader_email ?? '-'} · {t.member_count} member(s)</p>
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

      {/* Open innovation problem, in full */}
      <Modal
        isOpen={viewOpenInnovationTarget !== null}
        onClose={() => setViewOpenInnovationTarget(null)}
        title={viewOpenInnovationTarget?.open_innovation ? viewOpenInnovationTarget.open_innovation.title : ''}
        icon={Lightbulb}
      >
        {viewOpenInnovationTarget?.open_innovation && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-[#8B2E3B]/10 px-2 py-0.5 font-mono font-bold text-[#8B2E3B] dark:text-rose-300">
                {openInnovationCode(viewOpenInnovationTarget)}
              </span>
              {viewOpenInnovationTarget.open_innovation.domain && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold uppercase text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  {viewOpenInnovationTarget.open_innovation.domain}
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">Team {viewOpenInnovationTarget.name}</span>
            </div>
            <div className="max-h-[50dvh] overflow-y-auto rounded-lg border border-slate-200 p-4 text-sm text-slate-700 dark:border-white/10 dark:text-slate-200">
              <MarkdownRenderer content={viewOpenInnovationTarget.open_innovation.description || 'No description provided.'} />
            </div>
            <div className="flex justify-end">
              <button onClick={() => setViewOpenInnovationTarget(null)} className={BTN_GHOST}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload CSV Modal */}
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} busy={busy} title="Import problem statements from CSV" icon={FileUp}>
        <form onSubmit={upload} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Columns: <code>title</code>, <code>description</code>, <code>domain</code></span>
            <button type="button" onClick={downloadTemplate} className="flex items-center gap-1 font-semibold text-[#8B2E3B] dark:text-rose-400 hover:underline">
              <Download className="h-3 w-3" /> Template
            </button>
          </div>
          <div
            onClick={() => fileInput.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center hover:border-[#8B2E3B]"
          >
            <input ref={fileInput} type="file" accept=".csv" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} className="hidden" />
            <FileUp className="h-8 w-8 text-slate-500 dark:text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-[#1A1A2E] dark:text-white">{file ? file.name : 'Click to choose CSV'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'UTF-8 encoded, up to 1 MB'}</p>
          </div>
          {uploadError && <p className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>}
          {uploadResult && (
            <div className="rounded-lg bg-slate-100 dark:bg-white/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-600">Created: {uploadResult.created}</p>
              {uploadResult.skipped > 0 && <p className="text-slate-500 dark:text-slate-400">Skipped duplicates: {uploadResult.skipped}</p>}
              {uploadResult.errors.length > 0 && (
                <div className="pt-2 text-rose-600 dark:text-rose-400">
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
