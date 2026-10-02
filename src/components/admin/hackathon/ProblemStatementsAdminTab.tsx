'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import type { ProblemStatement } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { StatusPill } from '@/components/ui/StatusPill';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors } from './shared';

interface Draft {
  code: string;
  title: string;
  category: string;
  tags: string;
  max_teams: string;
  order: string;
  description: string;
}

const EMPTY: Draft = { code: '', title: '', category: '', tags: '', max_teams: '', order: '0', description: '' };

export function ProblemStatementsAdminTab({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProblemStatement | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    hackathonApi.problemStatements(slug).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [slug]);
  useEffect(load, [load]);

  const open = (ps: ProblemStatement | 'new') => {
    setEditing(ps);
    setErrors({});
    setDraft(ps === 'new' ? { ...EMPTY, order: String(items.length + 1) } : {
      code: ps.code, title: ps.title, category: ps.category, tags: ps.tags.join(', '),
      max_teams: ps.max_teams ? String(ps.max_teams) : '', order: String(ps.order), description: ps.description,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = {
      code: draft.code.trim(),
      title: draft.title.trim(),
      category: draft.category.trim(),
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      max_teams: draft.max_teams ? Number(draft.max_teams) : null,
      order: Number(draft.order) || 0,
      description: draft.description,
    };
    try {
      if (editing === 'new') await hackathonApi.admin.createProblemStatement(slug, body);
      else if (editing) await hackathonApi.admin.updateProblemStatement(slug, editing.id, body);
      toast.success(editing === 'new' ? 'Problem statement added' : 'Problem statement updated');
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
    if (!window.confirm(`Delete ${ps.code} — ${ps.title}?`)) return;
    try {
      await hackathonApi.admin.deleteProblemStatement(slug, ps.id);
      toast.success('Problem statement deleted');
      load();
    } catch (err) {
      toast.error('Could not delete', apiErrorMessage(err));
    }
  };

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white"><Target className="h-4 w-4 text-[#FF7A00]" /> Problem statements ({items.length})</h3>
          <p className="text-xs text-slate-500">Team leaders pick one of the active statements while registering. Inactive ones are hidden from participants.</p>
        </div>
        <button onClick={() => open('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> Add statement</button>
      </div>

      {loading ? (
        <div className="h-24 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No problem statements yet — teams can register without picking one until you add some.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="py-2 pr-3">Code</th><th className="py-2 pr-3">Title</th><th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Teams</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((ps) => (
                <tr key={ps.id}>
                  <td className="py-2.5 pr-3 font-mono text-xs font-bold text-[#8B2E3B] dark:text-rose-300">{ps.code}</td>
                  <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{ps.title}</td>
                  <td className="py-2.5 pr-3 text-xs text-slate-500">{ps.category || '—'}</td>
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
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div>
              <label className={LABEL}>Code *</label>
              <input value={draft.code} onChange={set('code')} placeholder="PS-01" className={INPUT} />
              {errors.code && <p className="mt-1 text-[11px] text-rose-500">{errors.code}</p>}
            </div>
            <div>
              <label className={LABEL}>Title *</label>
              <input value={draft.title} onChange={set('title')} placeholder="Smart campus attendance" className={INPUT} />
              {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Category</label>
              <input value={draft.category} onChange={set('category')} placeholder="EdTech" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Max teams</label>
              <input type="number" min={1} value={draft.max_teams} onChange={set('max_teams')} placeholder="Unlimited" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Display order</label>
              <input type="number" value={draft.order} onChange={set('order')} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Tags (comma separated)</label>
            <input value={draft.tags} onChange={set('tags')} placeholder="iot, ml" className={INPUT} />
          </div>
          <MarkdownEditor
            label="Description"
            value={draft.description}
            onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
            placeholder="Problem background, expected outcome, constraints…"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
