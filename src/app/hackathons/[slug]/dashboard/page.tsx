'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, Crown, Lightbulb, LogOut, Mail, Megaphone, Pencil, RefreshCw, Target, Trophy,
  UserMinus, UserPlus, Users, UsersRound, X, Check, Lock, Flag,
} from 'lucide-react';
import type { HackathonAnnouncement, HackathonTeamInvite, MyTeamPayload, ProblemStatement } from '@/lib/types';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { StatusPill, TEAM_STATUS_PILL } from '@/components/ui/StatusPill';
import { TeamFormModal } from '@/components/hackathons/TeamFormModal';
import { InviteMemberModal } from '@/components/hackathons/InviteMemberModal';
import { RoundsTimeline } from '@/components/hackathons/RoundsTimeline';
import { HackathonAnnouncementsFeed, formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';

const PANEL = 'glass-panel rounded-2xl border border-slate-200 dark:border-white/10 p-5 sm:p-6';
const H2 = 'flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#FF7A00]';
const BTN = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

export default function HackathonDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<MyTeamPayload | null>(null);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [announcements, setAnnouncements] = useState<HackathonAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [teamModal, setTeamModal] = useState<'create' | 'edit' | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const me = getStoredUser();

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [mine, ps, ann] = await Promise.all([
        hackathonApi.myTeam(slug),
        hackathonApi.problemStatements(slug).catch(() => []),
        hackathonApi.announcements(slug).catch(() => []),
      ]);
      setData(mine);
      setProblems(ps);
      setAnnouncements(ann);
    } catch (err: any) {
      setLoadError(err?.status === 404 ? 'This hackathon does not exist or is no longer visible.' : apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/login?next=${encodeURIComponent(`/hackathons/${slug}/dashboard`)}`);
      return;
    }
    load();
  }, [load, router, slug]);

  const run = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusyKey(key);
    try {
      await fn();
      if (success) toast.success(success);
      await load();
    } catch (err) {
      toast.error('Could not complete that', apiErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const hackathon = data?.hackathon;
  const team = data?.team ?? null;
  const isLeader = !!data?.is_leader;
  const regOpen = !!hackathon?.is_registration_open;
  const editable = regOpen && !hackathon?.team_edits_locked && team && (team.status === 'FORMING' || team.status === 'REGISTERED');
  const minSize = hackathon?.min_team_size ?? 1;
  const maxSize = hackathon?.max_team_size ?? 1;
  const slotsLeft = team ? Math.max(maxSize - team.member_count - team.pending_invites.length, 0) : 0;
  const myProblem = useMemo(
    () => problems.find((p) => p.id === team?.problem_statement?.id) ?? null,
    [problems, team?.problem_statement?.id],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
          <div className="h-8 w-64 rounded bg-slate-200 dark:bg-white/5" />
          <div className="h-48 rounded-2xl bg-slate-200 dark:bg-white/5" />
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (loadError || !data || !hackathon) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-16">
        <div className={`${PANEL} max-w-lg mx-auto text-center space-y-4`}>
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{loadError || 'Could not load your dashboard.'}</p>
          <div className="flex justify-center gap-2">
            <Link href="/hackathons" className={`${BTN} bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300`}>All hackathons</Link>
            <button onClick={() => { setLoading(true); load(); }} className={`${BTN} bg-[#FF7A00] text-white`}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusPill = team ? TEAM_STATUS_PILL[team.status] : null;

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link href={`/hackathons/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7A00] transition">
          <ArrowLeft className="h-4 w-4" /> {hackathon.title}
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-[#1A1A2E] via-[#2a1d2e] to-[#8B2E3B] p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFB066]">Participant dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold">{team ? team.name : hackathon.title}</h1>
              <p className="text-sm text-white/70">
                {team ? hackathon.title : hackathon.theme}
                {' · '}Team size {minSize === maxSize ? maxSize : `${minSize}–${maxSize}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusPill && <StatusPill tone={statusPill.tone}>{statusPill.label}</StatusPill>}
              {isLeader && <StatusPill tone="orange" icon={Crown}>Team leader</StatusPill>}
              <StatusPill tone={regOpen ? 'green' : 'slate'} icon={regOpen ? undefined : Lock}>
                {regOpen ? 'Registration open' : 'Registration closed'}
              </StatusPill>
            </div>
          </div>
          {hackathon.registration_closes_at && regOpen && (
            <p className="mt-4 text-xs text-white/70">Team changes close {formatDateTime(hackathon.registration_closes_at)}.</p>
          )}
        </div>

        {/* Profile completeness */}
        {data.profile_missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="flex-1 text-amber-800 dark:text-amber-200">
              This hackathon needs your <strong>{data.profile_missing.join(', ')}</strong> before you can create or join a team.
            </p>
            <Link href="/profile" className={`${BTN} bg-amber-500 text-white`}>Complete profile</Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* ---------------- No team yet ---------------- */}
            {!team && (
              <>
                {data.invites.length > 0 && (
                  <section className={`${PANEL} space-y-4`}>
                    <h2 className={H2}><Mail className="h-4 w-4" /> Team invites</h2>
                    <ul className="space-y-3">
                      {data.invites.map((inv: HackathonTeamInvite) => (
                        <li key={inv.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#1A1A2E] dark:text-white">{inv.team_name}</p>
                            <p className="text-xs text-slate-500">
                              Invited by {inv.invited_by_name ?? 'the team leader'} · {inv.member_count} member{inv.member_count === 1 ? '' : 's'}
                              {inv.problem_statement && ` · ${inv.problem_statement.code}: ${inv.problem_statement.title}`}
                              {inv.is_open_innovation && ' · Open innovation'}
                            </p>
                          </div>
                          <button
                            disabled={!!busyKey || data.profile_missing.length > 0 || !regOpen}
                            onClick={() => run(`accept-${inv.id}`, () => hackathonApi.acceptInvite(inv.id), `You joined ${inv.team_name}!`)}
                            className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}
                          >
                            <Check className="h-3.5 w-3.5" /> {busyKey === `accept-${inv.id}` ? 'Joining…' : 'Accept'}
                          </button>
                          <button
                            disabled={!!busyKey}
                            onClick={() => run(`decline-${inv.id}`, () => hackathonApi.declineInvite(inv.id), 'Invite declined')}
                            className={`${BTN} bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300`}
                          >
                            <X className="h-3.5 w-3.5" /> Decline
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className={`${PANEL} text-center space-y-4 py-10`}>
                  <UsersRound className="mx-auto h-12 w-12 text-[#FF7A00]" />
                  <h2 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">You&apos;re not on a team yet</h2>
                  {regOpen ? (
                    <>
                      <p className="mx-auto max-w-md text-sm text-slate-500">
                        Create a team and invite your teammates by email, or accept an invite from a team leader.
                      </p>
                      <button
                        onClick={() => setTeamModal('create')}
                        disabled={data.profile_missing.length > 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="h-4 w-4" /> Create a team
                      </button>
                    </>
                  ) : (
                    <p className="mx-auto max-w-md text-sm text-slate-500">Team registration is closed for this hackathon.</p>
                  )}
                </section>
              </>
            )}

            {/* ---------------- Team ---------------- */}
            {team && (
              <section className={`${PANEL} space-y-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className={H2}><Users className="h-4 w-4" /> Team members ({team.member_count}/{maxSize})</h2>
                  <div className="flex flex-wrap gap-2">
                    {isLeader && editable && (
                      <>
                        <button onClick={() => setTeamModal('edit')} disabled={!!busyKey} className={`${BTN} bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-200`}>
                          <Pencil className="h-3.5 w-3.5" /> Edit team
                        </button>
                        <button onClick={() => setInviteOpen(true)} disabled={!!busyKey || slotsLeft === 0} className={`${BTN} bg-[#FF7A00] text-white hover:bg-[#E06B00]`}>
                          <UserPlus className="h-3.5 w-3.5" /> Invite member
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {team.status === 'FORMING' && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Your team needs at least {minSize} members to be registered: {Math.max(minSize - team.member_count, 0)} more to go.
                  </p>
                )}
                {(team.status === 'DISQUALIFIED' || team.status === 'WITHDRAWN') && (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
                    This team is {team.status.toLowerCase()} and can no longer take part.
                  </p>
                )}
                {!editable && (team.status === 'FORMING' || team.status === 'REGISTERED') && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" /> Team changes are locked. Contact the organizers for any correction.</p>
                )}

                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {team.members.map((m) => {
                    const isMe = m.user_id === me?.id;
                    return (
                      <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 font-bold text-[#FF7A00]">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold text-[#1A1A2E] dark:text-white">
                            {m.name}
                            {isMe && <span className="text-[10px] font-bold text-slate-400">(you)</span>}
                            {m.role === 'LEADER' && <StatusPill tone="orange" icon={Crown}>Leader</StatusPill>}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{m.email}{m.club_id ? ` · ${m.club_id}` : ''}</p>
                        </div>
                        {isLeader && editable && m.role !== 'LEADER' && (
                          <div className="flex gap-1.5">
                            <button
                              disabled={!!busyKey}
                              onClick={() => {
                                if (window.confirm(`Make ${m.name} the team leader? You will become a regular member.`)) {
                                  run(`lead-${m.user_id}`, () => hackathonApi.transferLeadership(team.id, m.user_id), 'Leadership transferred');
                                }
                              }}
                              className={`${BTN} bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300`}
                              title="Make leader"
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={!!busyKey}
                              onClick={() => {
                                if (window.confirm(`Remove ${m.name} from the team?`)) {
                                  run(`remove-${m.user_id}`, () => hackathonApi.removeMember(team.id, m.user_id), 'Member removed');
                                }
                              }}
                              className={`${BTN} bg-rose-500/10 text-rose-600 dark:text-rose-400`}
                              title="Remove"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {team.pending_invites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending invites</p>
                    <ul className="space-y-2">
                      {team.pending_invites.map((inv) => (
                        <li key={inv.id} className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <div className="min-w-0 flex-1 text-xs">
                            <p className="font-semibold text-[#1A1A2E] dark:text-white">{inv.invited_user.name}</p>
                            <p className="text-slate-500 truncate">{inv.invited_user.email} · waiting for response</p>
                          </div>
                          {isLeader && editable && (
                            <button
                              disabled={!!busyKey}
                              onClick={() => run(`cancel-${inv.id}`, () => hackathonApi.cancelInvite(team.id, inv.id), 'Invite cancelled')}
                              className={`${BTN} text-slate-500 hover:text-rose-500`}
                            >
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {editable && (
                  <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
                    <button
                      disabled={!!busyKey || (isLeader && team.member_count > 1)}
                      title={isLeader && team.member_count > 1 ? 'Transfer leadership before leaving' : undefined}
                      onClick={() => {
                        const msg = isLeader
                          ? 'You are the only member. Leaving will withdraw this team. Continue?'
                          : 'Leave this team?';
                        if (window.confirm(msg)) run('leave', () => hackathonApi.leaveTeam(team.id), 'You left the team');
                      }}
                      className={`${BTN} text-rose-600 dark:text-rose-400 hover:bg-rose-500/10`}
                    >
                      <LogOut className="h-3.5 w-3.5" /> Leave team
                    </button>
                  </div>
                )}
              </section>
            )}

            {team && (
              <section className={`${PANEL} space-y-4`}>
                <h2 className={H2}><Flag className="h-4 w-4" /> Rounds</h2>
                <RoundsTimeline rounds={data.rounds} isLeader={isLeader} />
              </section>
            )}
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="space-y-6">
            {team && (
              <section className={`${PANEL} space-y-3`}>
                <h2 className={H2}><Target className="h-4 w-4" /> {team.open_innovation ? 'Your problem' : 'Problem statement'}</h2>
                {team.open_innovation ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#8B2E3B]/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#8B2E3B] dark:text-rose-300">{team.open_innovation.code}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">{team.open_innovation.domain}</span>
                      <StatusPill tone="purple" icon={Lightbulb}>Open innovation</StatusPill>
                    </div>
                    <h3 className="font-bold text-[#1A1A2E] dark:text-white">{team.open_innovation.title}</h3>
                    <p className="max-h-72 overflow-y-auto whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{team.open_innovation.description}</p>
                  </>
                ) : team.problem_statement ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#8B2E3B]/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#8B2E3B] dark:text-rose-300">{team.problem_statement.code}</span>
                      {team.problem_statement.domain && <span className="text-[10px] font-bold uppercase text-slate-400">{team.problem_statement.domain}</span>}
                    </div>
                    <h3 className="font-bold text-[#1A1A2E] dark:text-white">{team.problem_statement.title}</h3>
                    {myProblem?.description?.trim() && (
                      <div className="max-h-72 overflow-y-auto text-sm"><MarkdownRenderer content={myProblem.description} /></div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No problem selected yet{isLeader && editable ? '. Use Edit team to pick a statement or bring your own.' : '.'}</p>
                )}
              </section>
            )}

            <section className={`${PANEL} space-y-4`}>
              <h2 className={H2}><Megaphone className="h-4 w-4" /> Announcements</h2>
              <HackathonAnnouncementsFeed announcements={announcements} emptyText="Nothing announced yet. Check back soon." />
            </section>

            <section className={`${PANEL} space-y-2 text-sm`}>
              <h2 className={H2}><Trophy className="h-4 w-4" /> Event</h2>
              <p className="text-slate-600 dark:text-slate-300"><span className="font-semibold">Starts:</span> {formatDateTime(hackathon.start_date)}</p>
              <p className="text-slate-600 dark:text-slate-300"><span className="font-semibold">Ends:</span> {formatDateTime(hackathon.end_date)}</p>
              <p className="text-slate-600 dark:text-slate-300"><span className="font-semibold">Prize pool:</span> {hackathon.prize_pool}</p>
            </section>
          </aside>
        </div>
      </div>

      <TeamFormModal
        isOpen={teamModal !== null}
        onClose={() => setTeamModal(null)}
        slug={slug}
        problemStatements={problems}
        allowOpenInnovation={!!hackathon.allow_open_innovation}
        team={teamModal === 'edit' ? team : null}
        onSaved={() => load()}
      />
      {team && (
        <InviteMemberModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          slug={slug}
          team={team}
          slotsLeft={slotsLeft}
          onInvited={() => load()}
        />
      )}
    </div>
  );
}
