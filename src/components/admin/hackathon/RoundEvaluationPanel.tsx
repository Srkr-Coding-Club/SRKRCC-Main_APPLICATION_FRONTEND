'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock, Gavel, ListChecks, Lock, Play, RotateCcw, Settings2, Users, XCircle } from 'lucide-react';
import type { HackathonFeatures, HackathonRound, HackathonStaffMember, RoundEvaluation, RoundProgress, RoundResultRow, RoundPanelJudge } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { describeDue } from '@/lib/dueText';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { Switch } from '@/components/ui/Switch';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { JudgeInvitesPanel } from './JudgeInvitesPanel';
import { LoadError } from './LoadError';
import { RoundEvaluationSetup } from './RoundEvaluationSetup';
import { RoundProgressGrid } from './RoundProgressGrid';
import { RoundResultsTable } from './RoundResultsTable';
import { RoundStageTracker } from './RoundStageTracker';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, TAP } from './shared';

const STATUS: Record<RoundEvaluation['status'], { tone: PillTone; label: string }> = {
  NOT_STARTED: { tone: 'slate', label: 'Not started' },
  IN_PROGRESS: { tone: 'amber', label: 'Judges are scoring' },
  CLOSED: { tone: 'green', label: 'Closed' },
};

const codeOf = (err: unknown) => (err as { body?: { code?: string } })?.body?.code;
const DUE_TONE = { calm: 'text-slate-600 dark:text-slate-300', soon: 'text-amber-700 dark:text-amber-300', late: 'text-rose-600 dark:text-rose-400' } as const;

interface RoundEvaluationPanelProps {
  slug: string;
  round: HackathonRound;
  features: HackathonFeatures;
  /** Called when the round itself changed (it started, closed...) so the round list and shortlist reload. */
  onChanged: () => void;
}

/** Judging one round: set it up, start it, watch the judges score, close it into a ranking. */
export function RoundEvaluationPanel({ slug, round, features, onChanged }: RoundEvaluationPanelProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [evaluation, setEvaluation] = useState<RoundEvaluation | null>(null);
  const [progress, setProgress] = useState<RoundProgress | null>(null);
  const [results, setResults] = useState<{ rows: RoundResultRow[]; panel: RoundPanelJudge[] } | null>(null);
  const [candidates, setCandidates] = useState<HackathonStaffMember[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [underReviewed, setUnderReviewed] = useState('');
  const [reason, setReason] = useState('');
  // Once judging has started the setup is mostly history: it folds away, one tap brings it back.
  const [setupOpen, setSetupOpen] = useState(false);

  const enabled = Boolean(features.round_judging);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const current = await hackathonApi.admin.roundEvaluation(slug, round.id);
      setEvaluation(current);
      setError('');
      if (current.settings.evaluation_mode !== 'JUDGED') return;
      const [people, grid, outcome] = await Promise.all([
        hackathonApi.admin.staff(slug).then((all) => all.filter((p) => p.role === 'JUDGE')).catch(() => []),
        hackathonApi.admin.roundProgress(slug, round.id).catch(() => null),
        current.status === 'CLOSED' ? hackathonApi.admin.roundResults(slug, round.id).catch(() => null) : Promise.resolve(null),
      ]);
      setCandidates(people);
      setProgress(grid);
      setResults(outcome ? { rows: outcome.rows, panel: outcome.panel } : null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load how this round is judged.'));
    }
  }, [slug, round.id, enabled]);

  useEffect(() => { void load(); }, [load]);

  if (!enabled) return null;
  if (error) return <LoadError message={error} onRetry={() => void load()} />;
  if (!evaluation) return <section className={`${PANEL} h-24 animate-pulse`} aria-busy="true" aria-label="Loading judging" />;

  const judged = evaluation.settings.evaluation_mode === 'JUDGED';
  const status = STATUS[evaluation.status];
  const notStarted = evaluation.status === 'NOT_STARTED';
  const readyCount = evaluation.readiness.filter((check) => check.ok).length;
  const due = describeDue(evaluation.settings.scoring_deadline);

  const act = async (action: 'start' | 'close' | 'reopen', body: { force?: boolean; reason?: string } = {}) => {
    setBusy(true);
    try {
      const outcome = await hackathonApi.admin.roundEvaluationAction(slug, round.id, action, body);
      setEvaluation(outcome.evaluation);
      setUnderReviewed('');
      setReason('');
      toast.success(
        action === 'start' ? 'Judging started' : action === 'close' ? 'Judging closed' : 'Judging reopened',
        action === 'start' ? 'The judges were told.' : action === 'close' ? `${outcome.ranked ?? 0} team(s) ranked.` : undefined,
      );
      await load();
      onChanged();
    } catch (err) {
      if (action === 'close' && codeOf(err) === 'UNDER_REVIEWED') setUnderReviewed(apiErrorMessage(err));
      else toast.error('Could not do that', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const ok = await confirm({
      title: 'Start judging this round?',
      message: `The criteria are frozen and the ${evaluation.panel.length} judge(s) are told they can score. You can still move the deadline and add judges.`,
      confirmLabel: 'Start judging',
    });
    if (ok) await act('start');
  };

  const close = async () => {
    const ok = await confirm({
      title: 'Close judging?',
      message: 'Scores are averaged and the teams are ranked. Judges can no longer change their scores unless you reopen the round.',
      confirmLabel: 'Close judging',
    });
    if (ok) await act('close');
  };

  const switchOn = async (on: boolean) => {
    setBusy(true);
    try {
      setEvaluation(await hackathonApi.admin.configureRoundEvaluation(slug, round.id, { evaluation_mode: on ? 'JUDGED' : 'NONE' }));
      await load();
      onChanged();
    } catch (err) {
      toast.error('Could not change that', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setup = (
    <RoundEvaluationSetup
      slug={slug} roundId={round.id} evaluation={evaluation} progress={progress} candidates={candidates}
      onChange={(next) => { setEvaluation(next); void load(); }} onProgress={setProgress}
    />
  );

  return (
    <section className="space-y-4 rounded-2xl border border-journey-accent/25 bg-gradient-to-br from-journey-accent/[0.06] via-transparent to-transparent p-4 sm:p-5" aria-label="Judging this round">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h4 className="flex items-center gap-2 text-base font-bold text-[#1A1A2E] dark:text-white"><Gavel className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Judging this round</h4>
          {judged && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
        </div>
        {judged && (notStarted || evaluation.status === 'IN_PROGRESS') && (
          <div className="flex flex-wrap items-center gap-2">
            {evaluation.status === 'IN_PROGRESS' && <button type="button" onClick={() => void load()} className={`${BTN_GHOST} ${TAP}`}>Refresh</button>}
            {notStarted ? (
              <button type="button" onClick={() => void start()} disabled={busy || !evaluation.can_start} className={`${BTN_PRIMARY} ${TAP}`}><Play className="h-3.5 w-3.5" aria-hidden="true" /> Start judging</button>
            ) : (
              <button type="button" onClick={() => void close()} disabled={busy} className={`${BTN_PRIMARY} ${TAP}`}><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Close judging</button>
            )}
          </div>
        )}
      </div>

      {notStarted && (
        <Switch
          label="Judge this round with a panel" checked={judged} onChange={(on) => void switchOn(on)} disabled={busy}
          description="Pick judges, share the teams out, let them score and close the round into a ranking. Off: you choose who goes through yourself."
        />
      )}

      {judged && (
        <>
          <RoundStageTracker status={evaluation.status} />

          <ul className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200" aria-label="At a glance">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1"><Users className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" /> {evaluation.coverage.teams} team{evaluation.coverage.teams === 1 ? '' : 's'}</li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1"><Gavel className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" /> {evaluation.panel.length} judge{evaluation.panel.length === 1 ? '' : 's'}</li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1"><ListChecks className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" /> {evaluation.criteria.length} criteria</li>
            <li className={`inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 ${due ? DUE_TONE[due.tone] : ''}`}><Clock className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" /> {due ? due.text : 'No deadline'}</li>
          </ul>

          {notStarted && (
            <>
              {setup}
              <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <summary className="cursor-pointer text-sm font-semibold text-[#1A1A2E] dark:text-white">Invite a judge who is not on the list, or revoke one</summary>
                <div className="pt-3"><JudgeInvitesPanel slug={slug} onChanged={() => void load()} /></div>
              </details>
              <div className="space-y-3 rounded-xl border border-journey-accent/40 bg-journey-accent/5 p-4" aria-label="Ready to start">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Ready to start?</h4>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{readyCount} of {evaluation.readiness.length} ready</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-300/60 dark:bg-slate-700" aria-hidden="true">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(readyCount / evaluation.readiness.length) * 100}%` }} />
                </div>
                <ul className="space-y-1" aria-label="Checklist">
                  {evaluation.readiness.map((check) => (
                    <li key={check.key} className="flex items-start gap-2 text-sm">
                      {check.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Done" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-label="Not done" />}
                      <span className="text-[#1A1A2E] dark:text-white">{check.label}{check.detail ? <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">{check.detail}</span> : null}</span>
                    </li>
                  ))}
                </ul>
                {!evaluation.can_start && <p className="text-xs text-slate-600 dark:text-slate-300">Finish the unticked items above, then press Start judging at the top of this panel.</p>}
              </div>
            </>
          )}

          {!notStarted && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button" onClick={() => setSetupOpen((value) => !value)} aria-expanded={setupOpen} aria-controls={`round-setup-${round.id}`}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold text-[#1A1A2E] dark:text-white"
              >
                <span className="inline-flex items-center gap-2"><Settings2 className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Round settings, criteria and judges</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${setupOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <div id={`round-setup-${round.id}`} hidden={!setupOpen} className="space-y-4 border-t border-slate-200 p-3 dark:border-slate-800">
                {setup}
                <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <summary className="cursor-pointer text-sm font-semibold text-[#1A1A2E] dark:text-white">Invite a judge who is not on the list, or revoke one</summary>
                  <div className="pt-3"><JudgeInvitesPanel slug={slug} onChanged={() => void load()} /></div>
                </details>
              </div>
            </div>
          )}

          {evaluation.status === 'IN_PROGRESS' && (
            <div className="space-y-3" aria-label="Judging progress">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Started {formatDateTime(evaluation.started_at)}{evaluation.settings.scoring_deadline ? ` · deadline ${formatDateTime(evaluation.settings.scoring_deadline)}` : ''}
              </p>
              {progress && <RoundProgressGrid progress={progress} />}
              {underReviewed && (
                <div role="alert" className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                  <p>{underReviewed}</p>
                  <label htmlFor="rj-force-reason" className={LABEL}>Close anyway: why?</label>
                  <input id="rj-force-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={INPUT} placeholder="e.g. A judge was unavailable" />
                  <button type="button" onClick={() => void act('close', { force: true, reason })} disabled={busy || !reason.trim()} className={`${BTN_GHOST} ${TAP}`}>Close anyway</button>
                </div>
              )}
            </div>
          )}

          {evaluation.status === 'CLOSED' && (
            <div className="space-y-3" aria-label="Round results">
              <p className="text-xs text-slate-500 dark:text-slate-400">Closed {formatDateTime(evaluation.closed_at)}. Pick who goes through with the shortlist tools below: &quot;Best scores in this round&quot; now works.</p>
              {results && <RoundResultsTable rows={results.rows} panel={results.panel} />}
              {evaluation.results_published ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">The results of this round are published, so judging cannot be reopened. Unpublish them first.</p>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <label htmlFor="rj-reopen-reason" className={LABEL}>Reopen judging: why?</label>
                    <input id="rj-reopen-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={INPUT} placeholder="e.g. A judge found a mistake" />
                  </div>
                  <button type="button" onClick={() => void act('reopen', { reason })} disabled={busy || !reason.trim()} className={`${BTN_GHOST} ${TAP}`}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reopen</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {dialog}
    </section>
  );
}
