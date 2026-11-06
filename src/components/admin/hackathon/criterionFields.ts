import type { ListField } from './ObjectListEditor';

/** One row of a judging rubric while it is being edited. */
export interface CriterionDraft {
  id?: number;
  name: string;
  description: string;
  max_score: number | '';
  weight: number | '';
}

export const MAX_CRITERIA = 10;

export const CRITERION_FIELDS: ListField<CriterionDraft>[] = [
  { key: 'name', label: 'Criterion', placeholder: 'e.g. Innovation', wide: true },
  { key: 'description', label: 'What judges look for', type: 'textarea', placeholder: 'Shown to judges next to the score.' },
  { key: 'max_score', label: 'Score out of', type: 'number', min: 1, max: 100 },
  { key: 'weight', label: 'Weight (1-10)', type: 'number', min: 1, max: 10 },
];

export const blankCriterion = (): CriterionDraft => ({ name: '', description: '', max_score: 10, weight: 1 });

/** What the server wants for one criterion (numbers, never empty strings). */
export const toCriterionBody = (draft: CriterionDraft) => ({
  ...(draft.id ? { id: draft.id } : {}), name: draft.name.trim(), description: draft.description.trim(),
  max_score: Number(draft.max_score) || 10, weight: Number(draft.weight) || 1,
});
