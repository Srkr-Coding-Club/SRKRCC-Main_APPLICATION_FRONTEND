'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Crown, Download, Edit2, IdCard, Loader2, Pencil, Plus, Search, Trash2, UserMinus, UserPlus, Users, X, XCircle } from 'lucide-react';
import type { Hackathon, HackathonTeam, ProblemStatement, UserLookupResult } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { downloadCSV } from '@/lib/dataManagement';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { ENTRY_STATUS_PILL, StatusPill, TEAM_STATUS_PILL } from '@/components/ui/StatusPill';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';

const STATUS_OPTIONS = [
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'FORMING', label: 'Forming' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const OPEN_INNOVATION = 'open_innovation';

/** The ID a team's problem is known by: PS-001, or OI-<id> for open innovation. */
const problemCode = (t: HackathonTeam) => t.problem_statement?.code ?? t.open_innovation?.code ?? '-';

export function TeamsAdminTab({ hackathon }: { hackathon: Hackathon }) {
  const slug = hackathon.slug;
  const { toast } = useToast();
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [ps, setPs] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addQuery, setAddQuery] = useState('');
  const [addSelectedUser, setAddSelectedUser] = useState<UserLookupResult | null>(null);
  const [addSuggestions, setAddSuggestions] = useState<UserLookupResult[]>([]);
  const [addShowDropdown, setAddShowDropdown] = useState(false);
  const [addSearching, setAddSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced user lookup for admin adding member
  useEffect(() => {
    const clean = addQuery.trim();
    if (!clean || clean.length < 2) {
      setAddSuggestions([]);
      setAddShowDropdown(false);
      setAddSearching(false);
      return;
    }
    if (addSelectedUser && addSelectedUser.email?.toLowerCase() === clean.toLowerCase()) {
      setAddShowDropdown(false);
      return;
    }
    let isSubscribed = true;
    setAddSearching(true);
    const timer = setTimeout(() => {
      hackathonApi
        .lookupUser(slug, clean, selectedId ?? undefined)
        .then((res) => {
          if (!isSubscribed) return;
          const list = res.results && res.results.length > 0 ? res.results : res.found ? [res] : [];
          setAddSuggestions(list);
          setAddShowDropdown(true);
          if (clean.includes('@') && clean.includes('.')) {
            const exact = list.find((u) => u.email?.toLowerCase() === clean.toLowerCase());
            if (exact) {
              setAddSelectedUser(exact);
              setAddShowDropdown(false);
            }
          }
        })
        .catch(() => {
          if (isSubscribed) setAddSuggestions([]);
        })
        .finally(() => {
          if (isSubscribed) setAddSearching(false);
        });
    }, 300);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [addQuery, slug, selectedId, addSelectedUser]);

  // New Team Modal State
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newLeaderEmail, setNewLeaderEmail] = useState('');
  const [newTeamProblem, setNewTeamProblem] = useState('');
  const [newOiTitle, setNewOiTitle] = useState('');
  const [newOiDesc, setNewOiDesc] = useState('');
  const [newOiDomain, setNewOiDomain] = useState('');

  // Editing Team Name inside Drawer
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  // Changing Problem Statement inside Drawer
  const [editingProblem, setEditingProblem] = useState(false);
  const [draftProblem, setDraftProblem] = useState('');
  const [draftOiTitle, setDraftOiTitle] = useState('');
  const [draftOiDesc, setDraftOiDesc] = useState('');
  const [draftOiDomain, setDraftOiDomain] = useState('');

  // Deletion Modal
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<HackathonTeam | null>(null);

  const load = useCallback(() => {
    hackathonApi.admin.teams(slug).then(setTeams).catch(() => setTeams([])).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    load();
    hackathonApi.problemStatements(slug).then(setProblems).catch(() => setProblems([]));
  }, [load, slug]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) =>
      (!status || t.status === status)
      && (!ps || (ps === OPEN_INNOVATION ? !!t.open_innovation : String(t.problem_statement?.id) === ps))
      && (!q || t.name.toLowerCase().includes(q) || t.members.some((m) => `${m.name} ${m.email} ${m.roll_number ?? ''}`.toLowerCase().includes(q))),
    );
  }, [teams, search, status, ps]);

  const selected = teams.find((t) => t.id === selectedId) ?? null;

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      load();
    } catch (err) {
      toast.error('Action failed', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      toast.error('Validation error', 'Team name is required.');
      return;
    }
    if (!newLeaderEmail.trim()) {
      toast.error('Validation error', 'Leader email is required.');
      return;
    }

    let problem_statement: number | null = null;
    let open_innovation: { title: string; description: string; domain: string } | null = null;

    if (newTeamProblem === OPEN_INNOVATION) {
      if (!newOiTitle.trim() || !newOiDesc.trim() || !newOiDomain.trim()) {
        toast.error('Validation error', 'Open innovation title, domain, and description are required.');
        return;
      }
      open_innovation = {
        title: newOiTitle.trim(),
        description: newOiDesc.trim(),
        domain: newOiDomain.trim(),
      };
    } else if (newTeamProblem) {
      problem_statement = Number(newTeamProblem);
    }

    setBusy(true);
    try {
      await hackathonApi.admin.createTeam(slug, {
        name: newTeamName.trim(),
        leader_email: newLeaderEmail.trim(),
        problem_statement,
        open_innovation,
      });
      toast.success('Team created', `Successfully created ${newTeamName}`);
      setNewTeamOpen(false);
      setNewTeamName('');
      setNewLeaderEmail('');
      setNewTeamProblem('');
      setNewOiTitle('');
      setNewOiDesc('');
      setNewOiDomain('');
      load();
    } catch (err) {
      toast.error('Could not create team', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveName = async () => {
    if (!selected || !draftName.trim()) return;
    await act(async () => {
      await hackathonApi.updateTeam(selected.id, { name: draftName.trim() });
      setEditingName(false);
    }, 'Team renamed successfully');
  };

  const handleSaveProblem = async () => {
    if (!selected) return;
    let problem_statement: number | null = null;
    let open_innovation: { title: string; description: string; domain: string } | null = null;

    if (draftProblem === OPEN_INNOVATION) {
      if (!draftOiTitle.trim() || !draftOiDesc.trim() || !draftOiDomain.trim()) {
        toast.error('Validation error', 'Title, domain, and description are required for open innovation.');
        return;
      }
      open_innovation = {
        title: draftOiTitle.trim(),
        description: draftOiDesc.trim(),
        domain: draftOiDomain.trim(),
      };
    } else if (draftProblem) {
      problem_statement = Number(draftProblem);
    }

    await act(async () => {
      await hackathonApi.updateTeam(selected.id, { problem_statement, open_innovation });
      setEditingProblem(false);
    }, 'Problem statement updated');
  };

  const handleDeleteTeam = async () => {
    if (!deleteConfirmTeam) return;
    setBusy(true);
    try {
      await hackathonApi.admin.deleteTeam(deleteConfirmTeam.id);
      toast.success('Team deleted', `Team ${deleteConfirmTeam.name} and its data were deleted.`);
      if (selectedId === deleteConfirmTeam.id) {
        setSelectedId(null);
      }
      setDeleteConfirmTeam(null);
      load();
    } catch (err) {
      toast.error('Could not delete team', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const rows = filtered.flatMap((t) => t.members.map((m) => ({
      team: t.name,
      team_status: t.status,
      problem_id: t.problem_statement?.code ?? t.open_innovation?.code ?? '',
      problem_title: t.problem_statement?.title ?? t.open_innovation?.title ?? '',
      problem_domain: t.problem_statement?.domain ?? t.open_innovation?.domain ?? '',
      open_innovation: t.open_innovation ? 'yes' : 'no',
      role: m.role,
      name: m.name,
      email: m.email,
      phone: m.phone_number ?? '',
      branch: m.branch ?? '',
      year: m.year ?? '',
      roll_number: m.roll_number ?? '',
      club_id: m.club_id ?? '',
    })));
    downloadCSV(rows, `${slug}-teams-${Date.now()}.csv`);
  };

  const problemOptions = useMemo(() => [
    ...problems.map((p) => ({ value: String(p.id), label: `${p.code}: ${p.title}` })),
    ...(hackathon.allow_open_innovation ? [{ value: OPEN_INNOVATION, label: 'Open innovation (own problem)' }] : []),
  ], [problems, hackathon.allow_open_innovation]);

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Teams Center</h3>
          <p className="text-xs text-slate-500">
            Manage registrations, members, leadership, problem statement choices, and statuses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} disabled={filtered.length === 0} className={BTN_GHOST}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={() => setNewTeamOpen(true)} className={BTN_PRIMARY}>
            <Plus className="h-3.5 w-3.5" /> Register Team
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team, member name, email, roll…"
            className={`${INPUT} pl-9`}
          />
        </div>
        <FormSelect className="w-44" value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
        <FormSelect
          className="w-56"
          value={ps}
          onChange={setPs}
          options={problemOptions}
          placeholder="All problems"
        />
      </div>

      <p className="text-xs text-slate-500">{filtered.length} of {teams.length} teams</p>

      {loading ? (
        <div className="h-40 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No teams match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Leader</th>
                <th className="py-2 pr-3">Members</th>
                <th className="py-2 pr-3">Problem</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Latest round</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((t) => {
                const pill = TEAM_STATUS_PILL[t.status];
                const latest = t.round_entries?.[t.round_entries.length - 1];
                return (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setSelectedId(t.id);
                      setEditingName(false);
                      setEditingProblem(false);
                    }}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{t.name}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">{t.leader_email ?? '-'}</td>
                    <td className="py-2.5 pr-3 text-xs">{t.member_count}{t.pending_invites.length ? ` (+${t.pending_invites.length} invited)` : ''}</td>
                    <td className="py-2.5 pr-3 text-xs font-mono" title={t.open_innovation ? `Open innovation: ${t.open_innovation.title}` : t.problem_statement?.title}>
                      {problemCode(t)}
                    </td>
                    <td className="py-2.5 pr-3">{pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      {latest ? (
                        <span className="flex items-center gap-1.5">
                          R{latest.round_order} <StatusPill tone={ENTRY_STATUS_PILL[latest.status].tone}>{ENTRY_STATUS_PILL[latest.status].label}</StatusPill>
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Team Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <DetailDrawer isOpen onClose={() => setSelectedId(null)} title={selected.name}>
            <div className="space-y-5">
              {/* Team Name header & edit */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Name</span>
                  {!editingName && (
                    <button
                      onClick={() => {
                        setDraftName(selected.name);
                        setEditingName(true);
                      }}
                      className="flex items-center gap-1 text-xs text-[#FF7A00] hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> Rename
                    </button>
                  )}
                </div>
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className={INPUT}
                      placeholder="Team name"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setEditingName(false)} className={BTN_GHOST}>Cancel</button>
                      <button onClick={handleSaveName} disabled={busy || !draftName.trim()} className={BTN_PRIMARY}>Save Name</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-base font-bold text-[#1A1A2E] dark:text-white">{selected.name}</p>
                )}
              </div>

              {/* Status pill & Problem Statement */}
              <div className="flex flex-wrap items-center gap-2">
                {TEAM_STATUS_PILL[selected.status] && (
                  <StatusPill tone={TEAM_STATUS_PILL[selected.status].tone}>{TEAM_STATUS_PILL[selected.status].label}</StatusPill>
                )}
                {selected.problem_statement && (
                  <span className="text-xs font-semibold text-slate-500">
                    {selected.problem_statement.code}: {selected.problem_statement.title}
                  </span>
                )}
                {selected.open_innovation && <StatusPill tone="purple">Open innovation</StatusPill>}
              </div>

              {/* Reassign / Edit Problem Statement */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Problem Statement</span>
                  {!editingProblem && (
                    <button
                      onClick={() => {
                        setDraftProblem(selected.open_innovation ? OPEN_INNOVATION : String(selected.problem_statement?.id ?? ''));
                        setDraftOiTitle(selected.open_innovation?.title ?? '');
                        setDraftOiDesc(selected.open_innovation?.description ?? '');
                        setDraftOiDomain(selected.open_innovation?.domain ?? '');
                        setEditingProblem(true);
                      }}
                      className="flex items-center gap-1 text-xs text-[#FF7A00] hover:underline"
                    >
                      <Edit2 className="h-3 w-3" /> Change
                    </button>
                  )}
                </div>

                {editingProblem ? (
                  <div className="space-y-3">
                    <FormSelect
                      value={draftProblem}
                      onChange={setDraftProblem}
                      options={problemOptions}
                      placeholder="Select problem statement"
                    />
                    {draftProblem === OPEN_INNOVATION && (
                      <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs">
                        <div>
                          <label className={LABEL}>Custom Problem Title *</label>
                          <input value={draftOiTitle} onChange={(e) => setDraftOiTitle(e.target.value)} className={INPUT} placeholder="e.g. AI Crop Disease Detector" />
                        </div>
                        <div>
                          <label className={LABEL}>Domain / Track *</label>
                          <input value={draftOiDomain} onChange={(e) => setDraftOiDomain(e.target.value)} className={INPUT} placeholder="e.g. AgriTech" />
                        </div>
                        <div>
                          <label className={LABEL}>Description *</label>
                          <textarea rows={3} value={draftOiDesc} onChange={(e) => setDraftOiDesc(e.target.value)} className={INPUT} placeholder="Problem description…" />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setEditingProblem(false)} className={BTN_GHOST}>Cancel</button>
                      <button onClick={handleSaveProblem} disabled={busy} className={BTN_PRIMARY}>Save Problem</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {selected.open_innovation ? (
                      <div className="space-y-1 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-xs">
                        <p className="font-mono font-bold text-[#8B2E3B] dark:text-rose-300">
                          {selected.open_innovation.code} · {selected.open_innovation.domain}
                        </p>
                        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{selected.open_innovation.title}</p>
                        <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">{selected.open_innovation.description}</p>
                      </div>
                    ) : selected.problem_statement ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-[#8B2E3B] dark:text-rose-300">{selected.problem_statement.code} · {selected.problem_statement.domain}</p>
                        <p className="font-semibold text-[#1A1A2E] dark:text-white">{selected.problem_statement.title}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No problem statement selected yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Members */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Members ({selected.members.length})</p>
                <ul className="space-y-2">
                  {selected.members.map((m) => (
                    <li key={m.user_id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A2E] dark:text-white">
                          {m.name} {m.role === 'LEADER' && <Crown className="h-3.5 w-3.5 text-[#FF7A00]" />}
                        </p>
                        {m.role !== 'LEADER' && (
                          <div className="flex gap-1">
                            <button
                              disabled={busy}
                              onClick={() => act(() => hackathonApi.transferLeadership(selected.id, m.user_id), 'Leader changed')}
                              className={BTN_GHOST}
                              title="Make leader"
                            ><Crown className="h-3 w-3" /></button>
                            <button
                              disabled={busy}
                              onClick={() => window.confirm(`Remove ${m.name}?`) && act(() => hackathonApi.removeMember(selected.id, m.user_id), 'Member removed')}
                              className={BTN_DANGER}
                              title="Remove"
                            ><UserMinus className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-500">{m.email}</p>
                      <p className="text-slate-500">
                        {[m.phone_number, m.branch, m.year ? `Year ${m.year}` : null, m.roll_number, m.club_id].filter(Boolean).join(' · ') || 'No profile details'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.pending_invites.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending invites</p>
                  <ul className="space-y-1 text-xs text-slate-500">
                    {selected.pending_invites.map((i) => (
                      <li key={i.id}>{i.invited_user.name} ({i.invited_user.email})</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Add member admin override with instant autocomplete */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Add member (admin override)</p>
                <div className="relative" ref={addDropdownRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={addQuery}
                        onChange={(e) => {
                          setAddQuery(e.target.value);
                          if (addSelectedUser) setAddSelectedUser(null);
                        }}
                        onFocus={() => {
                          if (addSuggestions.length > 0) setAddShowDropdown(true);
                        }}
                        placeholder="Search name, email, or club ID..."
                        className={`${INPUT} pr-8`}
                      />
                      {addSearching ? (
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF7A00]" />
                        </div>
                      ) : addQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAddQuery('');
                            setAddSelectedUser(null);
                            setAddSuggestions([]);
                            setAddShowDropdown(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <button
                      disabled={busy || (!addSelectedUser?.email && !addQuery.trim())}
                      onClick={() => {
                        const targetEmail = addSelectedUser?.email || addQuery.trim();
                        act(() => hackathonApi.admin.addMember(selected.id, targetEmail), 'Member added').then(() => {
                          setAddQuery('');
                          setAddSelectedUser(null);
                          setAddSuggestions([]);
                          setAddShowDropdown(false);
                        });
                      }}
                      className={BTN_PRIMARY}
                      title="Add to team"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {addShowDropdown && addSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl divide-y divide-slate-100 dark:divide-slate-800/60 animate-in fade-in zoom-in-95 duration-150">
                      {addSuggestions.map((u) => (
                        <button
                          key={u.id || u.email}
                          type="button"
                          onClick={() => {
                            setAddSelectedUser(u);
                            setAddQuery(u.email || '');
                            setAddShowDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#FF7A00]/5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 text-[10px] font-bold text-[#FF7A00]">
                              {(u.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1A1A2E] dark:text-white truncate">{u.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email}{u.club_id ? ` · ${u.club_id}` : ''}</p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {u.can_invite ? (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Eligible
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 max-w-[120px] truncate" title={u.reason}>
                                <AlertCircle className="h-3 w-3 shrink-0" /> {u.reason}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* User preview card if looked up or selected */}
                {addSelectedUser && (
                  <div className={`rounded-lg border p-2.5 text-xs flex items-center justify-between gap-3 ${addSelectedUser.can_invite ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 text-xs font-bold text-[#FF7A00]">
                        {(addSelectedUser.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#1A1A2E] dark:text-white truncate">{addSelectedUser.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{addSelectedUser.email}{addSelectedUser.club_id ? ` · ${addSelectedUser.club_id}` : ''}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {addSelectedUser.can_invite ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Eligible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400" title={addSelectedUser.reason}>
                          <AlertCircle className="h-3.5 w-3.5" /> Note: {addSelectedUser.reason}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-400">Skips size limits and window; enforced: one team per user.</p>
              </div>

              {/* Team Status setting */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team status</p>
                <FormSelect
                  value={selected.status}
                  allowClear={false}
                  onChange={(v) => v !== selected.status && act(() => hackathonApi.admin.setTeamStatus(selected.id, v), 'Status updated')}
                  options={STATUS_OPTIONS}
                  placeholder="Status"
                  disabled={busy}
                />
              </div>

              {/* Round History */}
              {(selected.round_entries?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Round history</p>
                  <ul className="space-y-2">
                    {selected.round_entries!.map((e) => (
                      <li key={e.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">R{e.round_order} · {e.round_name}</span>
                          <StatusPill tone={ENTRY_STATUS_PILL[e.status].tone}>{ENTRY_STATUS_PILL[e.status].label}</StatusPill>
                        </div>
                        {e.feedback && <p className="text-slate-500">Feedback: {e.feedback}</p>}
                        {e.admin_notes && <p className="text-slate-400">Notes: {e.admin_notes}</p>}
                        {e.has_details && <p className="text-emerald-600">Details submitted</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Delete Team Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Danger Zone</p>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTeam(selected)}
                  disabled={busy}
                  className={`${BTN_DANGER} w-full justify-center`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Team Permanently
                </button>
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Users className="h-3 w-3" /> Created {new Date(selected.created_at).toLocaleString('en-IN')}
              </p>
            </div>
          </DetailDrawer>
        )}
      </AnimatePresence>

      {/* New Team Modal */}
      <Modal
        isOpen={newTeamOpen}
        onClose={() => setNewTeamOpen(false)}
        busy={busy}
        title="Register Team (Admin Creation)"
        icon={Plus}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className={LABEL}>Team Name *</label>
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Code Innovators"
              className={INPUT}
              required
            />
          </div>
          <div>
            <label className={LABEL}>Leader Email *</label>
            <input
              type="email"
              value={newLeaderEmail}
              onChange={(e) => setNewLeaderEmail(e.target.value)}
              placeholder="leader@srkr.ac.in"
              className={INPUT}
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">The user must have an existing account on the platform.</p>
          </div>
          <div>
            <label className={LABEL}>Problem Statement (Optional)</label>
            <FormSelect
              value={newTeamProblem}
              onChange={setNewTeamProblem}
              options={problemOptions}
              placeholder="Select a statement or leave blank"
            />
          </div>

          {newTeamProblem === OPEN_INNOVATION && (
            <div className="space-y-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs">
              <div>
                <label className={LABEL}>Custom Problem Title *</label>
                <input value={newOiTitle} onChange={(e) => setNewOiTitle(e.target.value)} className={INPUT} placeholder="e.g. AI Crop Disease Detector" />
              </div>
              <div>
                <label className={LABEL}>Domain / Track *</label>
                <input value={newOiDomain} onChange={(e) => setNewOiDomain(e.target.value)} className={INPUT} placeholder="e.g. AgriTech" />
              </div>
              <div>
                <label className={LABEL}>Description *</label>
                <textarea rows={3} value={newOiDesc} onChange={(e) => setNewOiDesc(e.target.value)} className={INPUT} placeholder="Problem description…" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setNewTeamOpen(false)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Creating…' : 'Create Team'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Team Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmTeam !== null}
        onClose={() => setDeleteConfirmTeam(null)}
        busy={busy}
        title={`Delete Team: ${deleteConfirmTeam?.name}`}
        icon={AlertTriangle}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Irreversible Deletion
            </p>
            <p>
              Are you sure you want to permanently delete team <strong>{deleteConfirmTeam?.name}</strong>?
            </p>
            <p>
              All member affiliations, pending invites, and round evaluation entries associated with this team will be permanently deleted via database cascade.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteConfirmTeam(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="button" onClick={handleDeleteTeam} disabled={busy} className={BTN_DANGER}>
              {busy ? 'Deleting…' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
