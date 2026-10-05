'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import type { AdminRoundEntry, Form, HackathonRound, HackathonTeam, RoundEntryStatus } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { ENTRY_STATUS_PILL, ROUND_STATUS_PILL, StatusPill } from '@/components/ui/StatusPill';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, BTN, INPUT, LABEL, PANEL, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';

interface RoundDraft {
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  status: string;
  details_form: string;
}

const STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function RoundsAdminTab({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<HackathonRound[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [allTeams, setAllTeams] = useState<HackathonTeam[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [entries, setEntries] = useState<AdminRoundEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const [roundModal, setRoundModal] = useState<HackathonRound | 'new' | null>(null);
  const [draft, setDraft] = useState<RoundDraft>({ name: '', description: '', starts_at: '', ends_at: '', status: 'UPCOMING', details_form: '' });
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});

  const [decision, setDecision] = useState<RoundEntryStatus | null>(null);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [announce, setAnnounce] = useState(true);
  const [announceMsg, setAnnounceMsg] = useState('');
  const [emailShortlisted, setEmailShortlisted] = useState(false);

  // Wildcard / manual team addition modal
  const [wildcardOpen, setWildcardOpen] = useState(false);
  const [wildcardSearch, setWildcardSearch] = useState('');

  const loadRounds = useCallback(async () => {
    const r = await hackathonApi.admin.rounds(slug).catch(() => [] as HackathonRound[]);
    setRounds(r);
    setSelectedId((cur) => (cur && r.some((x) => x.id === cur) ? cur : r[r.length - 1]?.id ?? null));
  }, [slug]);

  const loadEntries = useCallback(async (id: number) => {
    setEntriesLoading(true);
    try {
      setEntries(await hackathonApi.admin.roundEntries(slug, id));
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadRounds();
    fetchApi<Form[] | { results: Form[] }>('/forms/')
      .then((res) => setForms(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setForms([]));
    hackathonApi.admin.teams(slug).then(setAllTeams).catch(() => setAllTeams([]));
  }, [loadRounds, slug]);

  useEffect(() => {
    setChecked(new Set());
    if (selectedId) loadEntries(selectedId);
    else setEntries([]);
  }, [selectedId, loadEntries]);

  const round = rounds.find((r) => r.id === selectedId) ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) =>
      (!filter || e.status === filter)
      && (!q || e.team_name.toLowerCase().includes(q) || (e.leader_email ?? '').toLowerCase().includes(q))
    );
  }, [entries, filter, search]);

  const eligibleForWildcard = useMemo(() => {
    const existingTeamIds = new Set(entries.map((e) => e.team_id));
    const q = wildcardSearch.trim().toLowerCase();
    return allTeams.filter((t) =>
      !existingTeamIds.has(t.id)
      && (!q || t.name.toLowerCase().includes(q) || (t.leader_email ?? '').toLowerCase().includes(q))
    );
  }, [allTeams, entries, wildcardSearch]);

  const refresh = async () => {
    await loadRounds();
    if (selectedId) await loadEntries(selectedId);
  };

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await refresh();
      return true;
    } catch (err) {
      toast.error('Action failed', apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ---- round create / edit ----
  const openRound = (r: HackathonRound | 'new') => {
    setRoundModal(r);
    setDraftErrors({});
    setDraft(r === 'new'
      ? { name: `Round ${rounds.length + 1}`, description: '', starts_at: '', ends_at: '', status: 'UPCOMING', details_form: '' }
      : {
          name: r.name, description: r.description, starts_at: toLocalInput(r.starts_at), ends_at: toLocalInput(r.ends_at),
          status: r.status, details_form: r.details_form ? String(r.details_form) : '',
        });
  };

  const saveRound = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: draft.name.trim(),
      description: draft.description,
      starts_at: fromLocalInput(draft.starts_at),
      ends_at: fromLocalInput(draft.ends_at),
      status: draft.status as HackathonRound['status'],
      details_form: draft.details_form ? Number(draft.details_form) : null,
    };
    setBusy(true);
    setDraftErrors({});
    try {
      if (roundModal === 'new') {
        const created = await hackathonApi.admin.createRound(slug, body);
        toast.success('Round created', `${created.entry_counts.total} team(s) added to this round.`);
        setSelectedId(created.id);
      } else if (roundModal) {
        await hackathonApi.admin.updateRound(slug, roundModal.id, body);
        toast.success('Round updated');
      }
      setRoundModal(null);
      await refresh();
    } catch (err: any) {
      setDraftErrors(firstFieldErrors(err?.body));
      toast.error('Could not save round', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteRound = () => {
    if (!round || !window.confirm(`Delete ${round.name}? All shortlisting decisions in it are lost.`)) return;
    run(async () => {
      await hackathonApi.admin.deleteRound(slug, round.id);
      setSelectedId(null);
    }, 'Round deleted');
  };

  // ---- decisions ----
  const applyDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!round || !decision) return;
    const ok = await run(
      () => hackathonApi.admin.decide(slug, round.id, {
        team_ids: [...checked].map((id) => entries.find((x) => x.id === id)!.team_id),
        status: decision,
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
        ...(notes.trim() ? { admin_notes: notes.trim() } : {}),
      }),
      `${checked.size} team(s) marked ${ENTRY_STATUS_PILL[decision].label.toLowerCase()}`,
    );
    if (ok) {
      setDecision(null);
      setFeedback('');
      setNotes('');
      setChecked(new Set());
    }
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!round) return;
    const ok = await run(
      () => hackathonApi.admin.publishRound(slug, round.id, {
        announce,
        message: announceMsg.trim(),
        email: announce && emailShortlisted,
      }),
      'Results published'
    );
    if (ok) setPublishOpen(false);
  };

  // ---- promotions across rounds ----
  const handleAdvanceShortlisted = async () => {
    if (!round) return;
    setBusy(true);
    try {
      const res = await hackathonApi.admin.advanceRound(slug, round.id);
      toast.success(
        'Shortlisted Teams Advanced',
        `${res.promoted} team(s) advanced to ${res.target_round.name}. (${res.already_in_round} were already present).`
      );
      await refresh();
    } catch (err) {
      toast.error('Could not advance teams', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAddWildcardTeam = async (teamId: number) => {
    if (!round) return;
    setBusy(true);
    try {
      await hackathonApi.admin.addTeamToRound(slug, round.id, teamId);
      toast.success('Team added to round');
      setWildcardOpen(false);
      await refresh();
    } catch (err) {
      toast.error('Could not add team', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveEntry = async (teamId: number, teamName: string) => {
    if (!round || !window.confirm(`Remove ${teamName} from ${round.name}?`)) return;
    setBusy(true);
    try {
      await hackathonApi.admin.removeTeamFromRound(slug, round.id, teamId);
      toast.success('Team removed from round');
      await refresh();
    } catch (err) {
      toast.error('Could not remove team', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const allChecked = visible.length > 0 && visible.every((e) => checked.has(e.id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(visible.map((e) => e.id)));
  const formOptions = forms.map((f) => ({ value: String(f.id), label: `${f.title || f.slug} (${f.status})` }));

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Round list sidebar */}
      <aside className={`${PANEL} space-y-3 self-start`}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
            <Flag className="h-4 w-4 text-[#FF7A00]" /> Rounds
          </h3>
          <button onClick={() => openRound('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> New</button>
        </div>
        {rounds.length === 0 ? (
          <p className="text-xs text-slate-500">
            No rounds yet. The first round includes every registered team; each later round includes the teams shortlisted in the previous round.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rounds.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    r.id === selectedId
                      ? 'border-[#FF7A00] bg-[#FF7A00]/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-[#FF7A00]/50'
                  }`}
                >
                  <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">R{r.order} · {r.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {r.entry_counts.total} teams · {r.entry_counts.SHORTLISTED} shortlisted
                    {r.results_published ? ' · published' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Selected round workspace */}
      {round ? (
        <section className={`${PANEL} space-y-5`}>
          {/* Header & Controls */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Round {round.order}: {round.name}</h3>
                <StatusPill tone={ROUND_STATUS_PILL[round.status].tone}>{ROUND_STATUS_PILL[round.status].label}</StatusPill>
                {round.results_published ? (
                  <StatusPill tone="green" icon={Eye}>Results visible</StatusPill>
                ) : (
                  <StatusPill tone="slate" icon={EyeOff}>Results hidden</StatusPill>
                )}
              </div>
              {round.details_form_slug ? (
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <FileText className="h-3.5 w-3.5 text-[#FF7A00]" /> Details form: <strong>{round.details_form_title}</strong>
                  · {round.entry_counts.details_submitted} submitted ·
                  <Link href={`/admin/responses?form=${round.details_form_slug}`} className="font-bold text-[#FF7A00] hover:underline">View responses</Link>
                </p>
              ) : (
                <p className="text-xs text-slate-400">No details form attached. Edit round to re-collect details from shortlisted teams.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => openRound(round)} className={BTN_GHOST}><Pencil className="h-3.5 w-3.5" /> Edit</button>
              <button
                onClick={() => setWildcardOpen(true)}
                disabled={busy}
                className={BTN_GHOST}
                title="Manually promote a team to this round"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#FF7A00]" /> Add Team
              </button>
              <button
                onClick={() => run(() => hackathonApi.admin.populateRound(slug, round.id), 'Eligible teams synced')}
                disabled={busy}
                className={BTN_GHOST}
                title="Add teams that became eligible after the round was created"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Sync teams
              </button>
              {round.results_published ? (
                <button onClick={() => run(() => hackathonApi.admin.unpublishRound(slug, round.id), 'Results hidden')} disabled={busy} className={BTN_GHOST}>
                  <EyeOff className="h-3.5 w-3.5" /> Unpublish
                </button>
              ) : (
                <button
                  onClick={() => { setAnnounce(true); setAnnounceMsg(''); setEmailShortlisted(false); setPublishOpen(true); }}
                  disabled={busy}
                  className={BTN_PRIMARY}
                >
                  <Eye className="h-3.5 w-3.5" /> Publish results
                </button>
              )}
              <button onClick={deleteRound} disabled={busy} className={BTN_DANGER}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Promotion Pipeline Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-[#FF7A00]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Round Promotion Pipeline
                </span>
              </div>
              {/* Advance action button */}
              <div>
                {round.entry_counts.next_round_id ? (
                  <button
                    onClick={handleAdvanceShortlisted}
                    disabled={busy || round.entry_counts.SHORTLISTED === 0}
                    className={`${BTN_PRIMARY} text-xs py-1.5 px-3`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Advance Shortlisted to {round.entry_counts.next_round_name}
                  </button>
                ) : (
                  <button
                    onClick={handleAdvanceShortlisted}
                    disabled={busy || round.entry_counts.SHORTLISTED === 0}
                    className={`${BTN_PRIMARY} text-xs py-1.5 px-3`}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Create Round {round.order + 1} & Advance Shortlisted
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-white dark:bg-white/5 p-3 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Entries</p>
                <p className="text-lg font-bold text-[#1A1A2E] dark:text-white">{round.entry_counts.total}</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20">
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Shortlisted</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{round.entry_counts.SHORTLISTED}</p>
              </div>
              <div className="rounded-lg bg-rose-500/10 p-3 border border-rose-500/20">
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase">Not Shortlisted</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{round.entry_counts.REJECTED}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20">
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Under Review</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{round.entry_counts.PENDING}</p>
              </div>
            </div>

            {/* Next round status info */}
            {round.entry_counts.next_round_id && (
              <p className="text-xs text-slate-500">
                <strong>Promotion Status:</strong> {round.entry_counts.promoted_to_next ?? 0} of {round.entry_counts.SHORTLISTED} shortlisted team(s) promoted to {round.entry_counts.next_round_name}.
              </p>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team or leader email…"
                className={`${INPUT} pl-9`}
              />
            </div>
            {(['', 'PENDING', 'SHORTLISTED', 'REJECTED'] as const).map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setFilter(s)}
                className={`${BTN} ${filter === s ? 'bg-[#FF7A00] text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                {s ? ENTRY_STATUS_PILL[s].label : 'All'} ({s ? round.entry_counts[s] : round.entry_counts.total})
              </button>
            ))}
          </div>

          {/* Bulk Decision Action Toolbar */}
          {checked.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#FF7A00]/30 bg-[#FF7A00]/5 px-3 py-2">
              <span className="text-xs font-bold text-[#1A1A2E] dark:text-white">{checked.size} selected</span>
              <button onClick={() => setDecision('SHORTLISTED')} className={`${BTN} bg-emerald-600 text-white`}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Shortlist
              </button>
              <button onClick={() => setDecision('REJECTED')} className={`${BTN} bg-rose-600 text-white`}>
                <XCircle className="h-3.5 w-3.5" /> Not shortlisted
              </button>
              <button onClick={() => setDecision('PENDING')} className={BTN_GHOST}>Reset to pending</button>
            </div>
          )}

          {/* Entries Table */}
          {entriesLoading ? (
            <div className="h-40 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No teams match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 pr-2 w-8">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-[#FF7A00]" aria-label="Select all" />
                    </th>
                    <th className="py-2 pr-3">Team</th>
                    <th className="py-2 pr-3">Problem</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Promotion</th>
                    <th className="py-2 pr-3">Details</th>
                    <th className="py-2 pr-3">Feedback / notes</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((e) => (
                    <tr key={e.id} className={checked.has(e.id) ? 'bg-[#FF7A00]/5' : ''}>
                      <td className="py-2.5 pr-2">
                        <input
                          type="checkbox"
                          checked={checked.has(e.id)}
                          onChange={() =>
                            setChecked((prev) => {
                              const n = new Set(prev);
                              n.has(e.id) ? n.delete(e.id) : n.add(e.id);
                              return n;
                            })
                          }
                          className="accent-[#FF7A00]"
                          aria-label={`Select ${e.team_name}`}
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-[#1A1A2E] dark:text-white">{e.team_name}</p>
                        <p className="text-[11px] text-slate-500">{e.leader_email} · {e.member_count} members</p>
                      </td>
                      <td className="py-2.5 pr-3 text-xs font-mono">{e.problem_code ?? '-'}</td>
                      <td className="py-2.5 pr-3">
                        <StatusPill tone={ENTRY_STATUS_PILL[e.status].tone}>{ENTRY_STATUS_PILL[e.status].label}</StatusPill>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {e.status === 'SHORTLISTED' ? (
                          e.is_promoted_to_next ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" /> Promoted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                              <Clock className="h-3 w-3" /> Pending Advance
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {e.details_response_id ? (
                          <span className="text-emerald-600 font-semibold">Submitted</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-[11px] text-slate-500 max-w-[220px]">
                        {e.feedback && <p className="truncate" title={e.feedback}><span className="font-semibold">Feedback:</span> {e.feedback}</p>}
                        {e.admin_notes && <p className="truncate text-slate-400" title={e.admin_notes}><span className="font-semibold">Note:</span> {e.admin_notes}</p>}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleRemoveEntry(e.team_id, e.team_name)}
                          disabled={busy}
                          className="rounded p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remove team from this round"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className={`${PANEL} py-16 text-center text-sm text-slate-500`}>
          Create a round to start evaluating teams and promoting shortlists.
        </section>
      )}

      {/* Round create/edit Modal */}
      <Modal isOpen={roundModal !== null} onClose={() => setRoundModal(null)} busy={busy} title={roundModal === 'new' ? 'New round' : 'Edit round'} icon={Flag} maxWidth="max-w-2xl">
        <form onSubmit={saveRound} className="space-y-4">
          <div>
            <label className={LABEL}>Name *</label>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={INPUT} />
            {draftErrors.name && <p className="mt-1 text-[11px] text-rose-500">{draftErrors.name}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Starts</label>
              <input type="datetime-local" value={draft.starts_at} onChange={(e) => setDraft((d) => ({ ...d, starts_at: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Ends</label>
              <input type="datetime-local" value={draft.ends_at} onChange={(e) => setDraft((d) => ({ ...d, ends_at: e.target.value }))} className={INPUT} />
              {draftErrors.ends_at && <p className="mt-1 text-[11px] text-rose-500">{draftErrors.ends_at}</p>}
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <FormSelect value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} options={STATUS_OPTIONS} placeholder="Status" allowClear={false} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Details form (re-collect from shortlisted teams)</label>
            <FormSelect value={draft.details_form} onChange={(v) => setDraft((d) => ({ ...d, details_form: v }))} options={formOptions} placeholder="No form" />
            <p className="mt-1 text-[11px] text-slate-400">
              Build it in the Form Builder (Profile Auto-fill fields work here). Only leaders of teams shortlisted in this round can submit it, once results are published. One response per team.
            </p>
          </div>
          <MarkdownEditor label="Description (shown to teams)" value={draft.description} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} placeholder="What happens in this round, what to submit…" />
          {roundModal === 'new' && (
            <p className="rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-2 text-[11px] text-slate-500">
              {rounds.length === 0 ? 'All registered teams will be added to this round.' : `Teams shortlisted in ${rounds[rounds.length - 1].name} will be added to this round.`}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRoundModal(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save round'}</button>
          </div>
        </form>
      </Modal>

      {/* Wildcard Promotion / Add Team Modal */}
      <Modal
        isOpen={wildcardOpen}
        onClose={() => setWildcardOpen(false)}
        busy={busy}
        title={`Add Team to ${round?.name ?? 'Round'}`}
        icon={UserPlus}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select any registered team to add them as a wildcard promotion or manual entry in this round.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={wildcardSearch}
              onChange={(e) => setWildcardSearch(e.target.value)}
              placeholder="Search team or leader email…"
              className={`${INPUT} pl-9`}
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {eligibleForWildcard.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No available teams found.</p>
            ) : (
              eligibleForWildcard.map((t) => (
                <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <div>
                    <p className="font-bold text-[#1A1A2E] dark:text-white">{t.name}</p>
                    <p className="text-slate-400">Leader: {t.leader_email ?? '-'} · {t.member_count} member(s)</p>
                  </div>
                  <button
                    onClick={() => handleAddWildcardTeam(t.id)}
                    disabled={busy}
                    className={`${BTN_PRIMARY} text-xs py-1 px-2.5`}
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setWildcardOpen(false)} className={BTN_GHOST}>Close</button>
          </div>
        </div>
      </Modal>

      {/* Bulk decision Modal */}
      <Modal isOpen={decision !== null} onClose={() => setDecision(null)} busy={busy} title={decision ? `Mark ${checked.size} team(s): ${ENTRY_STATUS_PILL[decision].label}` : ''} icon={CheckCircle2}>
        <form onSubmit={applyDecision} className="space-y-4">
          <div>
            <label className={LABEL}>Feedback to teams (optional)</label>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} className={INPUT} placeholder="Shown on their dashboard once results are published." />
          </div>
          <div>
            <label className={LABEL}>Internal note (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT} placeholder="Admins only." />
          </div>
          <p className="text-[11px] text-slate-400">Leaving a box empty keeps each team&apos;s existing text.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDecision(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Apply'}</button>
          </div>
        </form>
      </Modal>

      {/* Publish Modal */}
      <Modal isOpen={publishOpen} onClose={() => setPublishOpen(false)} busy={busy} title={`Publish ${round?.name ?? ''} results`} icon={Eye}>
        <form onSubmit={publish} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Teams will see whether they were shortlisted, plus any feedback. Shortlisted leaders can then submit the details form.
            {round && round.entry_counts.PENDING > 0 && (
              <span className="mt-2 block font-semibold text-amber-600">{round.entry_counts.PENDING} team(s) are still pending, so they&apos;ll see &quot;Under review&quot;.</span>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="accent-[#FF7A00]" />
            Post an announcement to the shortlisted teams
          </label>
          {announce && (
            <>
              <textarea value={announceMsg} onChange={(e) => setAnnounceMsg(e.target.value)} rows={3} className={INPUT} placeholder="Optional custom message (Markdown). Leave blank for a default congratulations note." />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={emailShortlisted} onChange={(e) => setEmailShortlisted(e.target.checked)} className="accent-[#FF7A00]" />
                Also email it to every member of the shortlisted teams
              </label>
            </>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPublishOpen(false)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Publishing…' : 'Publish'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
