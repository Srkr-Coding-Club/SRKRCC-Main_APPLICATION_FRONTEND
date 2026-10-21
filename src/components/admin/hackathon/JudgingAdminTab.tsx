'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Gavel, Lightbulb, Save, Sparkles, Trophy, Users } from 'lucide-react';
import type { CriterionTarget, Hackathon, JudgingCriterion, SubmissionReviewRow } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { FeatureOffNotice } from './FeatureOffNotice';
import { LoadError } from './LoadError';
import { ObjectListEditor, type ListField } from './ObjectListEditor';
import { StaffPanel } from './StaffPanel';
import { BTN_GHOST, BTN_PRIMARY, PANEL } from './shared';

interface CriterionDraft {
  id?: number;
  name: string;
  description: string;
  max_score: number | '';
  weight: number | '';
}

/** One row of either leaderboard, in a shape both share. */
interface BoardRow {
  id: number;
  rank: number;
  team_name: string;
  title: string;
  score: number;
  review_count: number;
}

const CRITERION_FIELDS: ListField<CriterionDraft>[] = [
  { key: 'name', label: 'Criterion', placeholder: 'e.g. Innovation', wide: true },
  { key: 'description', label: 'What judges look for', type: 'textarea', placeholder: 'Shown to judges next to the score.' },
  { key: 'max_score', label: 'Score out of', type: 'number', min: 1, max: 100 },
  { key: 'weight', label: 'Weight (1-10)', type: 'number', min: 1, max: 10 },
];

const MAX_CRITERIA = 10;
const COPY: Record<CriterionTarget, { heading: string; explain: string; rowLabel: string }> = {
  PROJECT: { heading: 'Project scoring rubric', explain: 'Each judge scores every submitted project on every criterion; a team\'s score is the weighted average, out of 100, across judges.', rowLabel: 'Project' },
  IDEA: { heading: 'Idea scoring rubric', explain: 'The same, applied to ideas in phase 1. Idea scores can drive round shortlisting (for example "best idea scores").', rowLabel: 'Idea' },
};

interface JudgingAdminTabProps {
  hackathon: Hackathon;
  onEnable: () => void;
}

export function JudgingAdminTab({ hackathon, onEnable }: JudgingAdminTabProps) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const enabled = Boolean(hackathon.features?.judging);
  const ideasOn = Boolean(hackathon.features?.ideas);
  const [target, setTarget] = useState<CriterionTarget>('PROJECT');
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [judges, setJudges] = useState(0);
  const [criteriaNames, setCriteriaNames] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openReviews, setOpenReviews] = useState<{ id: number; rows: SubmissionReviewRow[] } | null>(null);

  const load = useCallback(() => {
    setError('');
    setOpenReviews(null);
    const board = target === 'IDEA'
      ? hackathonApi.admin.ideaLeaderboard(slug).then((data) => ({
          judges: data.judges, criteria: data.criteria,
          rows: data.rows.map((row): BoardRow => ({ id: row.idea_id, rank: row.rank, team_name: row.team_name, title: row.title, score: row.score, review_count: row.review_count })),
        }))
      : hackathonApi.admin.leaderboard(slug).then((data) => ({
          judges: data.judges, criteria: data.criteria,
          rows: data.rows.map((row): BoardRow => ({ id: row.submission_id, rank: row.rank, team_name: row.team_name, title: row.project_title, score: row.score, review_count: row.review_count })),
        }));
    Promise.all([hackathonApi.admin.criteria(slug, target), board])
      .then(([rubric, leaderboard]) => {
        setCriteria(rubric);
        setRows(leaderboard.rows);
        setJudges(leaderboard.judges);
        setCriteriaNames(Object.fromEntries(leaderboard.criteria.map((criterion) => [String(criterion.id), criterion.name])));
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load judging.')));
  }, [slug, target]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (!enabled) {
    return <FeatureOffNotice title="Judging" description="Turn this module on to score submissions with a rubric and assign judges." onEnable={onEnable} />;
  }

  const copy = COPY[target];
  const toCriteria = (): JudgingCriterion[] =>
    criteria.map((criterion) => ({
      id: criterion.id, name: criterion.name, description: criterion.description,
      max_score: Number(criterion.max_score) || 0, weight: Number(criterion.weight) || 0,
    }));

  const saveRubric = async () => {
    setBusy(true);
    try {
      setCriteria(await hackathonApi.admin.saveCriteria(slug, toCriteria(), target));
      toast.success('Rubric saved', 'Existing scores were recalculated.');
      load();
    } catch (err) {
      toast.error('Could not save the rubric', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const useSuggested = async () => {
    setBusy(true);
    try {
      setCriteria(await hackathonApi.admin.seedCriteria(slug, target));
    } catch (err) {
      toast.error('Could not add the suggested rubric', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const showReviews = async (id: number) => {
    if (openReviews?.id === id) return setOpenReviews(null);
    try {
      const reviews = target === 'IDEA' ? await hackathonApi.admin.ideaReviews(slug, id) : await hackathonApi.admin.submissionReviews(slug, id);
      setOpenReviews({ id, rows: reviews });
    } catch (err) {
      toast.error('Could not load reviews', apiErrorMessage(err));
    }
  };

  const criterionName = (id: string) => criteriaNames[id] ?? `#${id}`;

  return (
    <div className="space-y-6">
      {ideasOn && (
        <div role="tablist" aria-label="What judges score" className="inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-800">
          {(['PROJECT', 'IDEA'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={target === item}
              onClick={() => setTarget(item)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition ${target === item ? 'bg-[#FF7A00] text-white' : 'text-slate-500 hover:text-[#1A1A2E] dark:hover:text-white'}`}
            >
              {item === 'PROJECT' ? <Gavel className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />} {item === 'PROJECT' ? 'Projects (phase 2)' : 'Ideas (phase 1)'}
            </button>
          ))}
        </div>
      )}

      {error && <LoadError message={error} onRetry={load} />}

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Gavel className="h-4 w-4 text-[#FF7A00]" /> {copy.heading}</h3>
        <p className="text-xs text-slate-500">{copy.explain}</p>
        {criteria.length === 0 && (
          <button type="button" onClick={useSuggested} disabled={busy} className={BTN_GHOST}><Sparkles className="h-3.5 w-3.5" /> Use a suggested rubric</button>
        )}
        <ObjectListEditor<CriterionDraft>
          items={criteria}
          onChange={setCriteria}
          fields={CRITERION_FIELDS}
          blank={() => ({ name: '', description: '', max_score: 10, weight: 1 })}
          addLabel="Add criterion"
          itemLabel={(criterion, index) => criterion.name || `Criterion ${index + 1}`}
          max={MAX_CRITERIA}
          reorderable
          emptyText="No criteria yet. Judges cannot score until you add some."
        />
        <button type="button" onClick={saveRubric} disabled={busy || criteria.length === 0} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save rubric'}</button>
      </section>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Users className="h-4 w-4 text-[#FF7A00]" /> Judges</h3>
        <StaffPanel
          slug={slug}
          role="JUDGE"
          noun="Judge"
          description="Judges open the Judging page of this hackathon and score. They cannot score their own team, and people who are on a team here cannot be added."
        />
      </section>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Trophy className="h-4 w-4 text-[#FF7A00]" /> {copy.rowLabel} leaderboard</h3>
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-slate-500">{target === 'IDEA' ? 'No ideas to rank yet.' : 'No submissions to rank yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Team</th><th className="py-2 pr-3">{copy.rowLabel}</th><th className="py-2 pr-3">Score</th><th className="py-2">Reviews</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td className="py-2.5 pr-3 font-bold tabular-nums">{row.rank}</td>
                      <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{row.team_name}</td>
                      <td className="py-2.5 pr-3">{row.title}</td>
                      <td className="py-2.5 pr-3 font-bold tabular-nums">{row.review_count ? row.score.toFixed(1) : '–'}</td>
                      <td className="py-2.5">
                        <button type="button" onClick={() => showReviews(row.id)} className="text-xs font-bold text-[#FF7A00] hover:underline" aria-expanded={openReviews?.id === row.id}>
                          {row.review_count} of {judges || '?'} judges
                        </button>
                      </td>
                    </tr>
                    {openReviews?.id === row.id && (
                      <tr>
                        <td colSpan={5} className="bg-slate-50 px-3 py-3 dark:bg-white/5">
                          {openReviews.rows.length === 0 ? <p className="text-xs text-slate-500">No judge has scored this yet.</p> : (
                            <ul className="space-y-2">
                              {openReviews.rows.map((review) => (
                                <li key={review.id} className="text-xs">
                                  <p><strong>{review.judge}</strong> · {review.total.toFixed(1)}/100 · {Object.entries(review.scores).map(([id, value]) => `${criterionName(id)} ${value}`).join(', ')}</p>
                                  {review.comment && <p className="mt-0.5 text-slate-500">&ldquo;{review.comment}&rdquo;</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
