'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ShieldAlert, Undo2, Users, XCircle } from 'lucide-react';
import type { TeamBatchResult, TeamScanMember, TeamScanResult } from '@/lib/types';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { formatDateTime } from './HackathonAnnouncementsFeed';
import { BTN_GHOST, BTN_PRIMARY, INPUT } from '@/components/admin/hackathon/shared';

interface TeamScanSheetProps {
  scan: TeamScanResult;
  onClose: () => void;
  /** Checks the picked people in. A rejection (an old code, say) shows its message and keeps the picks. */
  onSubmit: (body: { userIds: number[]; override: boolean; reason: string }) => Promise<TeamBatchResult>;
  /** Takes the whole batch back. */
  onUndo: (batchId: string) => Promise<void>;
}

const STATUS_LABEL = { created: 'Checked in', already: 'Was already checked in', refused: 'Not checked in' } as const;
const STATUS_TONE = {
  created: 'text-emerald-700 dark:text-emerald-300',
  already: 'text-amber-700 dark:text-amber-300',
  refused: 'text-rose-700 dark:text-rose-300',
} as const;

/**
 * What a team's code opens, beside the camera so the scanner keeps working: the members, who is already in, and tick
 * boxes for the people actually present. Nobody starts ticked; a code on its own never checks anyone in.
 */
export function TeamScanSheet({ scan, onClose, onSubmit, onUndo }: TeamScanSheetProps) {
  const { team, session, members } = scan;
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [override, setOverride] = useState(!team.placed);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TeamBatchResult | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  // A new team code starts from scratch.
  useEffect(() => {
    setPicked(new Set());
    setOverride(!team.placed);
    setReason('');
    setError('');
    setResult(null);
  }, [team.id, session.id, team.placed]);

  useEffect(() => { rootRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [team.id]);

  const canPick = (member: TeamScanMember) => !member.checked_in && (member.blocked === null || (override && scan.can_override));
  const pickable = members.filter(canPick);
  // Someone who got checked in meanwhile (their own code was scanned) drops out of the picks.
  const chosen = useMemo(() => members.filter((member) => picked.has(member.user_id) && canPick(member)), [members, picked, override]); // eslint-disable-line react-hooks/exhaustive-deps
  const blockedCount = members.filter((member) => !member.checked_in && member.blocked !== null).length;
  const showOverride = scan.can_override && (!team.placed || blockedCount > 0);
  const needsReason = override && showOverride;
  const canSubmit = chosen.length > 0 && !busy && (!needsReason || reason.trim().length > 0);

  const toggle = (id: number) => setPicked((current) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      setResult(await onSubmit({ userIds: chosen.map((member) => member.user_id), override: needsReason, reason: reason.trim() }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not check these people in.'));
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!result?.batch_id) return;
    setBusy(true);
    setError('');
    try {
      await onUndo(result.batch_id);
      setResult(null);
      setPicked(new Set());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not take that back.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section ref={rootRef} aria-label={`Team check-in: ${team.name}`} className="space-y-3 rounded-xl border-2 border-journey-accent/60 bg-journey-accent/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-journey-text"><Users className="h-5 w-5 shrink-0 text-journey-accent" aria-hidden="true" /> <span className="min-w-0 break-words">{team.name}</span></h3>
          <p className="text-xs text-journey-muted">
            {session.name}{team.problem_code ? ` · ${team.problem_code}` : ''}{team.problem_title ? ` ${team.problem_title}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-journey-muted hover:text-journey-text sm:min-h-0">Close</button>
      </div>

      {!team.placed && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> This team is not registered yet (still forming or waitlisted). You can let people in because you are an organizer; say why below.
        </p>
      )}

      {result ? (
        <div className="space-y-3">
          <ul aria-label="Check-in results" aria-live="polite" className="divide-y divide-journey-text/10">
            {result.results.map((person) => (
              <li key={person.user_id} className="flex items-start gap-2 py-2 text-sm">
                {person.status === 'refused' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" /> : <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS_TONE[person.status]}`} aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <strong>{person.name ?? 'Unknown person'}</strong>
                  <span className={`block text-xs font-semibold ${STATUS_TONE[person.status]}`}>{STATUS_LABEL[person.status]}{person.detail ? `: ${person.detail}` : ''}</span>
                </span>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            {result.batch_id && <button type="button" onClick={() => void undo()} disabled={busy} className={BTN_GHOST}><Undo2 className="h-3.5 w-3.5" /> Undo this check-in</button>}
            <button type="button" onClick={onClose} className={BTN_PRIMARY}>Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-journey-muted">{scan.all_checked_in ? 'Everyone on this team is already checked in.' : 'Tick the people who are here.'}</p>
            {pickable.length > 0 && (
              <button type="button" onClick={() => setPicked(new Set(pickable.map((member) => member.user_id)))} className="min-h-11 text-xs font-bold text-journey-accent sm:min-h-0">
                Select everyone present
              </button>
            )}
          </div>
          <ul className="divide-y divide-journey-text/10" aria-label="Team members">
            {members.map((member) => {
              const selectable = canPick(member);
              return (
                <li key={member.user_id}>
                  <label className={`flex min-h-12 items-start gap-3 py-2 ${selectable ? 'cursor-pointer' : 'opacity-70'}`}>
                    <input
                      type="checkbox"
                      checked={member.checked_in || (selectable && picked.has(member.user_id))}
                      disabled={!selectable}
                      onChange={() => toggle(member.user_id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#FF7A00]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-semibold text-journey-text">{member.name}{member.role === 'LEADER' && <span className="ml-2 text-[11px] font-bold uppercase text-journey-accent">Leader</span>}</span>
                      {member.checked_in ? (
                        <span className="block text-xs text-emerald-700 dark:text-emerald-300">Checked in {formatDateTime(member.checked_in_at)}{member.checked_in_by ? ` by ${member.checked_in_by}` : ''}</span>
                      ) : member.blocked ? (
                        <span className="block text-xs text-amber-800 dark:text-amber-200">Has not checked in on arrival yet</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {showOverride && (
            <div className="space-y-2 rounded-lg border border-journey-text/15 p-3">
              {team.placed && (
                <label className="flex items-start gap-2 text-xs font-semibold text-journey-text">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF7A00]" />
                  Let in people who have not arrived yet (organizer)
                </label>
              )}
              {needsReason && (
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Why are they being let in?" aria-label="Reason for letting people in" className={INPUT} />
              )}
            </div>
          )}

          {error && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={!canSubmit} className={`${BTN_PRIMARY} min-h-11 sm:min-h-0`}>
              {busy ? 'Checking in…' : `Check in selected (${chosen.length})`}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
