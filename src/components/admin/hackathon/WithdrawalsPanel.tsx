'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Hourglass, ShieldAlert } from 'lucide-react';
import type { TeamRepeater, WithdrawalOverview, WithdrawalRow } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { FieldLabel, SpotlightTextarea } from '@/components/ui/InputField';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { LoadError } from './LoadError';
import { BTN_GHOST, BTN_PRIMARY } from './shared';

interface WithdrawalsPanelProps {
  slug: string;
  /** Called after a decision so the team list underneath refreshes. */
  onChanged: () => void;
}

/** Withdrawal requests waiting for a decision, and people who keep creating or withdrawing teams. */
export function WithdrawalsPanel({ slug, onChanged }: WithdrawalsPanelProps) {
  const { toast } = useToast();
  const [data, setData] = useState<WithdrawalOverview | null>(null);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState<{ row: WithdrawalRow; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showDecided, setShowDecided] = useState(false);

  const load = useCallback(() => {
    hackathonApi.admin.withdrawals(slug).then((result) => { setData(result); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load withdrawal requests.')));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const openDecision = (row: WithdrawalRow, approve: boolean) => { setDeciding({ row, approve }); setNote(''); };

  const confirmDecision = async () => {
    if (!deciding) return;
    setBusyId(deciding.row.id);
    try {
      await hackathonApi.admin.decideWithdrawal(slug, deciding.row.id, { approve: deciding.approve, note });
      toast.success(deciding.approve ? 'Team withdrawn' : 'Request denied', 'The leader was notified.');
      setDeciding(null);
      load();
      onChanged();
    } catch (err) {
      toast.error('Could not save the decision', apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const allowMore = async (person: TeamRepeater) => {
    setBusyId(person.user_id);
    try {
      await hackathonApi.admin.allowMoreTeams(slug, { user_id: person.user_id, extra: person.extra_allowed + 1, reason: 'Allowed by an organizer' });
      toast.success(`${person.name} can create one more team`);
      load();
    } catch (err) {
      toast.error('Could not allow another team', apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LoadError message={error} onRetry={load} />;
  if (!data) return null;
  const nothingToShow = data.pending.length === 0 && data.repeaters.length === 0 && data.decided.length === 0;
  if (nothingToShow) return null;

  return (
    <section className="space-y-4 border-b border-slate-200 pb-5 dark:border-slate-800" aria-label="Withdrawals">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
          <Hourglass className="h-4 w-4 text-journey-accent" /> Withdrawal requests
          {data.pending.length > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-200">{data.pending.length} waiting</span>}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A team that is forming or waitlisted is withdrawn by its leader at once. A registered team, or one in a round, asks you first.
          Each person can create {data.limits.max_teams} teams and must wait {data.limits.cooldown_minutes} minutes after withdrawing one.
        </p>
      </div>

      {data.pending.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No requests are waiting.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.pending.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{row.team_name} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">· {row.team_status.toLowerCase()}</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.requested_by} · {row.requested_by_email} · {formatDateTime(row.created_at)}</p>
                <p className="break-words text-sm text-slate-700 dark:text-slate-200">&ldquo;{row.reason}&rdquo;</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={busyId === row.id} onClick={() => openDecision(row, false)} className={BTN_GHOST}>Keep team</button>
                <button type="button" disabled={busyId === row.id} onClick={() => openDecision(row, true)} className={BTN_PRIMARY}>Approve withdrawal</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data.repeaters.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-[#1A1A2E] dark:text-white"><ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Created or withdrew several teams</h4>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.repeaters.map((person) => (
              <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white">{person.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {person.email} · created {person.teams_created}, withdrew {person.teams_withdrawn}
                    {person.extra_allowed > 0 && ` · ${person.extra_allowed} extra allowed`}
                    {person.at_limit && ' · at the limit'}
                  </p>
                </div>
                <button type="button" disabled={busyId === person.user_id} onClick={() => void allowMore(person)} className={BTN_GHOST}>Allow one more team</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.decided.length > 0 && (
        <div>
          <button type="button" aria-expanded={showDecided} onClick={() => setShowDecided((open) => !open)} className="min-h-11 text-xs font-bold text-journey-accent sm:min-h-0">
            {showDecided ? 'Hide' : 'Show'} recent decisions ({data.decided.length})
          </button>
          {showDecided && (
            <ul className="mt-1 divide-y divide-slate-100 text-xs text-slate-600 dark:divide-slate-800 dark:text-slate-300">
              {data.decided.map((row) => (
                <li key={row.id} className="py-2">
                  <strong>{row.team_name}</strong> · {row.status.toLowerCase()}{row.decided_by ? ` by ${row.decided_by}` : ''}{row.decided_at ? ` · ${formatDateTime(row.decided_at)}` : ''}
                  {row.decision_note && <span className="block opacity-80">{row.decision_note}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        isOpen={deciding !== null}
        onClose={() => setDeciding(null)}
        busy={busyId !== null}
        title={deciding?.approve ? `Withdraw ${deciding.row.team_name}?` : `Keep ${deciding?.row.team_name ?? 'the team'}?`}
        maxWidth="max-w-lg"
        footer={(
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeciding(null)} className={BTN_GHOST}>Cancel</button>
            <button type="button" onClick={() => void confirmDecision()} disabled={busyId !== null} className={BTN_PRIMARY}>{busyId !== null ? 'Saving…' : deciding?.approve ? 'Withdraw the team' : 'Deny the request'}</button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {deciding?.approve
              ? 'The team is withdrawn, its place is freed (the waitlist moves up) and the leader is told.'
              : 'The team stays as it is and the leader is told.'}
          </p>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="withdrawal-note">Note for the leader (optional)</FieldLabel>
            <SpotlightTextarea id="withdrawal-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Modal>
    </section>
  );
}
