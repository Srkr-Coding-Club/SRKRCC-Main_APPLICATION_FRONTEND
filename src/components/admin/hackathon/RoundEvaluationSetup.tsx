'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Gavel, Save, Settings2, Users } from 'lucide-react';
import type {
  HackathonStaffMember, RoundAssignmentMode, RoundEvaluation, RoundProgress, RoundScoringTarget, RoundTieBreak,
} from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { FormSelect } from '@/components/ui/FormSelect';
import { Switch } from '@/components/ui/Switch';
import { ObjectListEditor } from './ObjectListEditor';
import { CRITERION_FIELDS, MAX_CRITERIA, blankCriterion, toCriterionBody, type CriterionDraft } from './criterionFields';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, TAP, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';

const TARGETS: { value: RoundScoringTarget; label: string }[] = [
  { value: 'IDEA', label: 'Ideas (phase 1)' }, { value: 'PROJECT', label: 'Projects (phase 2)' }, { value: 'PITCH', label: 'Live pitch or demo' },
];
const ASSIGNMENTS: { value: RoundAssignmentMode; label: string; hint: string }[] = [
  { value: 'BALANCED', label: 'Share teams out evenly', hint: 'Each team gets a few judges' },
  { value: 'ALL', label: 'Every judge scores every team', hint: 'Best for small rounds' },
  { value: 'MANUAL', label: 'I choose who scores whom', hint: 'Tick judges for each team' },
];
const TIE_BREAKS: { value: RoundTieBreak; label: string }[] = [
  { value: 'CRITERIA', label: 'Break ties by the most heavily weighted criterion' }, { value: 'SHARED', label: 'Equal scores share a rank' },
];

interface RoundEvaluationSetupProps {
  slug: string;
  roundId: number;
  evaluation: RoundEvaluation;
  /** The team-by-judge grid, needed to tick judges for each team in manual mode. */
  progress: RoundProgress | null;
  /** People who are judges of this hackathon and can be put on the panel. */
  candidates: HackathonStaffMember[];
  onChange: (evaluation: RoundEvaluation) => void;
  onProgress: (progress: RoundProgress) => void;
}

/** Everything an organizer sets before judging starts: how it works, the rubric, the panel and (optionally) who scores whom. */
export function RoundEvaluationSetup({ slug, roundId, evaluation, progress, candidates, onChange, onProgress }: RoundEvaluationSetupProps) {
  const { toast } = useToast();
  const { settings } = evaluation;
  const started = evaluation.status !== 'NOT_STARTED';
  const [target, setTarget] = useState(settings.scoring_target);
  const [assignment, setAssignment] = useState(settings.assignment_mode);
  const [perTeam, setPerTeam] = useState(String(settings.judges_per_team));
  const [minReviews, setMinReviews] = useState(String(settings.min_reviews_per_team));
  const [deadline, setDeadline] = useState(toLocalInput(settings.scoring_deadline));
  const [blind, setBlind] = useState(settings.blind);
  const [tie, setTie] = useState(settings.tie_break);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [panelIds, setPanelIds] = useState<Set<number>>(new Set());
  const [manual, setManual] = useState<Record<number, Set<number>>>({});

  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    setTarget(settings.scoring_target); setAssignment(settings.assignment_mode); setPerTeam(String(settings.judges_per_team));
    setMinReviews(String(settings.min_reviews_per_team)); setDeadline(toLocalInput(settings.scoring_deadline)); setBlind(settings.blind); setTie(settings.tie_break);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);
  const criteriaKey = JSON.stringify([evaluation.criteria_source, evaluation.criteria]);
  useEffect(() => {
    setCriteria(evaluation.criteria_source === 'round' ? evaluation.criteria.map((c) => ({ id: c.id, name: c.name, description: c.description, max_score: c.max_score, weight: c.weight })) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaKey]);
  const panelKey = JSON.stringify(evaluation.panel.map((p) => p.judge_id));
  useEffect(() => {
    setPanelIds(new Set(evaluation.panel.map((p) => p.judge_id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelKey]);
  const gridKey = JSON.stringify(progress?.teams.map((t) => [t.entry_id, t.cells.filter((c) => c.state !== 'recused').map((c) => c.judge_id)]));
  useEffect(() => {
    setManual(Object.fromEntries((progress?.teams ?? []).map((team) => [team.entry_id, new Set(team.cells.filter((c) => c.state !== 'recused').map((c) => c.judge_id))])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridKey]);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setErrors({});
    try {
      await action();
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save', apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const saveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    return run('settings', async () => {
      onChange(await hackathonApi.admin.configureRoundEvaluation(slug, roundId, started ? { scoring_deadline: fromLocalInput(deadline) } : {
        scoring_target: target, assignment_mode: assignment, judges_per_team: Number(perTeam), min_reviews_per_team: Number(minReviews),
        scoring_deadline: fromLocalInput(deadline), blind, tie_break: tie,
      }));
      toast.success('Saved');
    });
  };

  const saveRubric = (items: CriterionDraft[]) => run('rubric', async () => {
    onChange(await hackathonApi.admin.setRoundCriteria(slug, roundId, items.map(toCriterionBody)));
    toast.success(items.length ? 'Rubric saved' : 'This round now uses the hackathon rubric');
  });

  const savePanel = () => run('panel', async () => {
    onChange(await hackathonApi.admin.setRoundPanel(slug, roundId, [...panelIds]));
    toast.success('Judges saved');
  });

  const saveManual = () => run('assign', async () => {
    const result = await hackathonApi.admin.assignRoundJudges(slug, roundId, Object.entries(manual).map(([entry, judges]) => ({ entry_id: Number(entry), judge_ids: [...judges] })));
    onProgress(result.progress);
    onChange(await hackathonApi.admin.roundEvaluation(slug, roundId));
    toast.success('Assignments saved', result.result.short.length ? `${result.result.short.length} team(s) still need a judge.` : undefined);
  });

  const error = (key: string) => errors[key] && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors[key]}</p>;
  const hackathonRubricCount = evaluation.criteria_source === 'hackathon' ? evaluation.criteria.length : 0;
  const judgeOptions = useMemo(() => candidates, [candidates]);
  const section = 'space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800';
  const heading = 'flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white';

  return (
    <div className="space-y-4">
      <form onSubmit={saveSettings} className={section} aria-label="How this round is judged">
        <h4 className={heading}><Settings2 className="h-4 w-4 text-journey-accent" /> How it works</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className={LABEL} id="rj-target">What judges score</span>
            <FormSelect value={target} options={TARGETS} placeholder="Choose" allowClear={false} disabled={started} onChange={(v) => v && setTarget(v as RoundScoringTarget)} aria-labelledby="rj-target" />
            {error('scoring_target')}
          </div>
          <div>
            <span className={LABEL} id="rj-assign">Sharing teams out</span>
            <FormSelect value={assignment} options={ASSIGNMENTS} placeholder="Choose" allowClear={false} disabled={started} onChange={(v) => v && setAssignment(v as RoundAssignmentMode)} aria-labelledby="rj-assign" />
            {error('assignment_mode')}
          </div>
          {assignment === 'BALANCED' && (
            <div>
              <label htmlFor="rj-per-team" className={LABEL}>Judges per team</label>
              <input id="rj-per-team" type="number" min={1} max={20} value={perTeam} disabled={started} onChange={(e) => setPerTeam(e.target.value)} className={INPUT} />
              {error('judges_per_team')}
            </div>
          )}
          <div>
            <label htmlFor="rj-min" className={LABEL}>Least reviews a team needs</label>
            <input id="rj-min" type="number" min={1} max={20} value={minReviews} disabled={started} onChange={(e) => setMinReviews(e.target.value)} className={INPUT} />
            {error('min_reviews_per_team')}
          </div>
          <div>
            <label htmlFor="rj-deadline" className={LABEL}>Scoring deadline (optional)</label>
            <input id="rj-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={INPUT} />
            {error('scoring_deadline')}
          </div>
          <div>
            <span className={LABEL} id="rj-tie">Ties</span>
            <FormSelect value={tie} options={TIE_BREAKS} placeholder="Choose" allowClear={false} disabled={started} onChange={(v) => v && setTie(v as RoundTieBreak)} aria-labelledby="rj-tie" />
          </div>
        </div>
        <Switch label="Blind judging" description="Judges see a team code instead of the team and its people." checked={blind} onChange={setBlind} disabled={started} />
        {started && <p className="text-xs text-slate-500 dark:text-slate-400">Judges are already scoring, so only the deadline can change.</p>}
        <button type="submit" disabled={busy === 'settings'} className={`${BTN_PRIMARY} ${TAP}`}><Save className="h-3.5 w-3.5" /> {busy === 'settings' ? 'Saving…' : started ? 'Save deadline' : 'Save settings'}</button>
      </form>

      <section className={section} aria-label="Judging criteria">
        <h4 className={heading}><Gavel className="h-4 w-4 text-journey-accent" /> Judging criteria</h4>
        {evaluation.criteria_source === 'hackathon' ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This round uses the hackathon rubric{hackathonRubricCount ? `: ${evaluation.criteria.map((c) => c.name).join(', ')}.` : ', which has no criteria yet.'} Write the round&apos;s own to score something different, such as a pitch.
            </p>
            {!started && (
              <button type="button" onClick={() => setCriteria(evaluation.criteria.length ? evaluation.criteria.map((c) => ({ name: c.name, description: c.description, max_score: c.max_score, weight: c.weight })) : [blankCriterion()])} className={`${BTN_GHOST} ${TAP}`}>
                Write this round&apos;s own criteria
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">This round has its own criteria.{started ? ' They are frozen while judges score.' : ''}</p>
        )}
        {(criteria.length > 0 || evaluation.criteria_source === 'round') && !started && (
          <>
            <ObjectListEditor<CriterionDraft>
              items={criteria} onChange={setCriteria} fields={CRITERION_FIELDS} blank={blankCriterion} addLabel="Add criterion"
              itemLabel={(criterion, index) => criterion.name || `Criterion ${index + 1}`} max={MAX_CRITERIA} reorderable emptyText="No criteria yet."
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveRubric(criteria)} disabled={busy === 'rubric' || criteria.length === 0} className={`${BTN_PRIMARY} ${TAP}`}><Save className="h-3.5 w-3.5" /> Save criteria</button>
              <button type="button" onClick={() => void saveRubric([])} disabled={busy === 'rubric'} className={`${BTN_GHOST} ${TAP}`}>Use the hackathon rubric instead</button>
            </div>
          </>
        )}
        {started && evaluation.criteria.length > 0 && (
          <ul className="text-xs text-slate-600 dark:text-slate-300">{evaluation.criteria.map((c) => <li key={c.id}>{c.name}: out of {c.max_score}, weight {c.weight}</li>)}</ul>
        )}
      </section>

      <section className={section} aria-label="Judges for this round">
        <h4 className={heading}><Users className="h-4 w-4 text-journey-accent" /> Judges for this round</h4>
        {judgeOptions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No judges in this hackathon yet. Invite some below, then come back and tick them.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Judges">
            {judgeOptions.map((person) => (
              <li key={person.user_id}>
                <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-[#1A1A2E] hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 sm:min-h-9">
                  <input
                    type="checkbox" className="h-4 w-4 accent-[#FF7A00]" checked={panelIds.has(person.user_id)}
                    onChange={() => setPanelIds((current) => { const next = new Set(current); if (!next.delete(person.user_id)) next.add(person.user_id); return next; })}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{person.name}</span>
                    <span className="block break-all text-xs text-slate-500 dark:text-slate-400">{person.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error('judge_ids')}
        <button type="button" onClick={() => void savePanel()} disabled={busy === 'panel' || judgeOptions.length === 0} className={`${BTN_PRIMARY} ${TAP}`}>
          <Save className="h-3.5 w-3.5" /> Save judges ({panelIds.size})
        </button>
      </section>

      {assignment === 'MANUAL' && evaluation.panel.length > 0 && progress && (
        <section className={section} aria-label="Who scores which team">
          <h4 className={heading}><Users className="h-4 w-4 text-journey-accent" /> Who scores which team</h4>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <caption className="sr-only">Tick the judges for each team</caption>
              <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr><th scope="col" className="py-2 pr-3">Team</th>{evaluation.panel.map((j) => <th key={j.judge_id} scope="col" className="px-2 text-center" title={j.name}>{j.name.split(' ')[0]}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {progress.teams.map((team) => (
                  <tr key={team.entry_id}>
                    <th scope="row" className="py-1.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{team.team_name}</th>
                    {evaluation.panel.map((judge) => {
                      const cell = team.cells.find((c) => c.judge_id === judge.judge_id);
                      const locked = cell?.state === 'scored' || cell?.state === 'recused';
                      return (
                        <td key={judge.judge_id} className="px-2 text-center">
                          <input
                            type="checkbox" className="h-5 w-5 accent-[#FF7A00]" disabled={locked} aria-label={`${judge.name} scores ${team.team_name}`}
                            checked={manual[team.entry_id]?.has(judge.judge_id) ?? false}
                            onChange={() => setManual((current) => {
                              const next = new Set(current[team.entry_id] ?? []);
                              if (!next.delete(judge.judge_id)) next.add(judge.judge_id);
                              return { ...current, [team.entry_id]: next };
                            })}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => void saveManual()} disabled={busy === 'assign'} className={`${BTN_PRIMARY} ${TAP}`}><Save className="h-3.5 w-3.5" /> Save assignments</button>
        </section>
      )}
    </div>
  );
}
