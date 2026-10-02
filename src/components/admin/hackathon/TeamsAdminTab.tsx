'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Crown, Download, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import type { Hackathon, HackathonTeam, ProblemStatement } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { downloadCSV } from '@/lib/dataManagement';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { FormSelect } from '@/components/ui/FormSelect';
import { ENTRY_STATUS_PILL, StatusPill, TEAM_STATUS_PILL } from '@/components/ui/StatusPill';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, PANEL } from './shared';

const STATUS_OPTIONS = [
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'FORMING', label: 'Forming' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const OPEN_INNOVATION = 'open_innovation';

/** The ID a team's problem is known by: PS-001, or OI-<id> for open innovation. */
const problemCode = (t: HackathonTeam) => t.problem_statement?.code ?? t.open_innovation?.code ?? '—';

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
  const [addEmail, setAddEmail] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team, member name, email, roll…" className={`${INPUT} pl-9`} />
        </div>
        <FormSelect className="w-44" value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
        <FormSelect
          className="w-56"
          value={ps}
          onChange={setPs}
          options={[
            ...problems.map((p) => ({ value: String(p.id), label: `${p.code} — ${p.title}` })),
            { value: OPEN_INNOVATION, label: 'Open innovation (own problem)' },
          ]}
          placeholder="All problems"
        />
        <button onClick={exportCsv} disabled={filtered.length === 0} className={BTN_GHOST}><Download className="h-3.5 w-3.5" /> Export CSV</button>
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
                <th className="py-2 pr-3">Team</th><th className="py-2 pr-3">Leader</th><th className="py-2 pr-3">Members</th>
                <th className="py-2 pr-3">Problem</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Latest round</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((t) => {
                const pill = TEAM_STATUS_PILL[t.status];
                const latest = t.round_entries?.[t.round_entries.length - 1];
                return (
                  <tr key={t.id} onClick={() => setSelectedId(t.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{t.name}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">{t.leader_email ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-xs">{t.member_count}{t.pending_invites.length ? ` (+${t.pending_invites.length} invited)` : ''}</td>
                    <td className="py-2.5 pr-3 text-xs font-mono" title={t.open_innovation ? `Open innovation: ${t.open_innovation.title}` : t.problem_statement?.title}>{problemCode(t)}</td>
                    <td className="py-2.5 pr-3">{pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      {latest ? <span className="flex items-center gap-1.5">R{latest.round_order} <StatusPill tone={ENTRY_STATUS_PILL[latest.status].tone}>{ENTRY_STATUS_PILL[latest.status].label}</StatusPill></span> : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <DetailDrawer isOpen onClose={() => setSelectedId(null)} title={selected.name}>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {TEAM_STATUS_PILL[selected.status] && <StatusPill tone={TEAM_STATUS_PILL[selected.status].tone}>{TEAM_STATUS_PILL[selected.status].label}</StatusPill>}
                {selected.problem_statement && <span className="text-xs font-semibold text-slate-500">{selected.problem_statement.code} — {selected.problem_statement.title}</span>}
                {selected.open_innovation && <StatusPill tone="purple">Open innovation</StatusPill>}
              </div>

              {selected.open_innovation && (
                <div className="space-y-1 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-xs">
                  <p className="font-mono font-bold text-[#8B2E3B] dark:text-rose-300">{selected.open_innovation.code} · {selected.open_innovation.domain}</p>
                  <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{selected.open_innovation.title}</p>
                  <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">{selected.open_innovation.description}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Members</p>
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
                    {selected.pending_invites.map((i) => <li key={i.id}>{i.invited_user.name} — {i.invited_user.email}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Add member (admin override)</p>
                <div className="flex gap-2">
                  <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="member@srkr.ac.in" className={INPUT} />
                  <button
                    disabled={busy || !addEmail.trim()}
                    onClick={() => act(() => hackathonApi.admin.addMember(selected.id, addEmail.trim()), 'Member added').then(() => setAddEmail(''))}
                    className={BTN_PRIMARY}
                  ><UserPlus className="h-3.5 w-3.5" /></button>
                </div>
                <p className="text-[11px] text-slate-400">Skips invites, size limits and the registration window; still one team per person.</p>
              </div>

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

              <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Users className="h-3 w-3" /> Created {new Date(selected.created_at).toLocaleString('en-IN')}</p>
            </div>
          </DetailDrawer>
        )}
      </AnimatePresence>
    </section>
  );
}
