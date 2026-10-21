import type { HackathonFeatures, RoundKind, RoundRuleKey } from '@/lib/types';

export const ROUND_KIND_LABEL: Record<RoundKind, string> = {
  GENERAL: 'General',
  SCREENING: 'Screening',
  IDEA_REVIEW: 'Idea review',
  PROJECT_REVIEW: 'Project review',
  PITCH: 'Pitch / demo',
  FINAL: 'Final',
};

export const ROUND_KIND_OPTIONS = (Object.keys(ROUND_KIND_LABEL) as RoundKind[]).map((value) => ({ value, label: ROUND_KIND_LABEL[value] }));

/** A suggested starting set of rounds; each one is created empty and can be edited afterwards. */
export const ROUND_TEMPLATES: { name: string; kind: RoundKind; description: string }[] = [
  { name: 'Idea review', kind: 'IDEA_REVIEW', description: 'Judges review every idea; the strongest teams go on to build.' },
  { name: 'Project review', kind: 'PROJECT_REVIEW', description: 'Judges review the submitted projects and pick who pitches.' },
  { name: 'Final pitch', kind: 'FINAL', description: 'Finalists present live to the judges.' },
];

/** The rule most organizers want first for each kind of round. */
export const DEFAULT_RULE_FOR_KIND: Record<RoundKind, RoundRuleKey> = {
  GENERAL: 'HAS_PROJECT',
  SCREENING: 'IDEA_APPROVED',
  IDEA_REVIEW: 'IDEA_SCORE_TOP',
  PROJECT_REVIEW: 'PROJECT_SCORE_TOP',
  PITCH: 'PROJECT_SCORE_TOP',
  FINAL: 'PROJECT_SCORE_TOP',
};

interface RuleSpec {
  key: RoundRuleKey;
  label: string;
  /** What the number means, or null when the rule needs none. */
  valueLabel: string | null;
  needs: (features: HackathonFeatures) => boolean;
}

/** The rules the server offers, limited to the modules this hackathon has switched on. */
export const ROUND_RULES: RuleSpec[] = [
  { key: 'PROJECT_SCORE_TOP', label: 'Best project scores', valueLabel: 'How many teams go through', needs: (f) => Boolean(f.submissions && f.judging) },
  { key: 'PROJECT_SCORE_MIN', label: 'Project score at least', valueLabel: 'Minimum score out of 100', needs: (f) => Boolean(f.submissions && f.judging) },
  { key: 'IDEA_SCORE_TOP', label: 'Best idea scores', valueLabel: 'How many teams go through', needs: (f) => Boolean(f.ideas && f.judging) },
  { key: 'IDEA_SCORE_MIN', label: 'Idea score at least', valueLabel: 'Minimum score out of 100', needs: (f) => Boolean(f.ideas && f.judging) },
  { key: 'IDEA_APPROVED', label: 'Idea approved', valueLabel: null, needs: (f) => Boolean(f.ideas) },
  { key: 'HAS_PROJECT', label: 'Submitted a project', valueLabel: null, needs: (f) => Boolean(f.submissions) },
  { key: 'CHECKED_IN', label: 'At least one member checked in', valueLabel: null, needs: (f) => Boolean(f.check_in) },
];
