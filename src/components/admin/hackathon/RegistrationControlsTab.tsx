'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, Gauge, Layers, ListChecks, Save, ShieldCheck } from 'lucide-react';
import type {
  Hackathon, HackathonEligibility, HackathonFeatureKey, HackathonFeatures, RegistrationQuestion, RegistrationQuestionType,
} from '@/lib/types';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { Switch } from '@/components/ui/Switch';
import { TagInput } from '@/components/ui/TagInput';
import { FEATURE_OPTIONS } from './featureOptions';
import { ObjectListEditor, type ListField } from './ObjectListEditor';
import { BTN_PRIMARY, INPUT, LABEL, PANEL, fromLocalInput, toLocalInput } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

interface QuestionDraft {
  key: string;
  label: string;
  type: RegistrationQuestionType;
  required: boolean;
  optionsText: string;
}

const QUESTION_TYPES: { value: RegistrationQuestionType; label: string }[] = [
  { value: 'text', label: 'Short answer' },
  { value: 'textarea', label: 'Long answer' },
  { value: 'select', label: 'Pick one' },
  { value: 'checkbox', label: 'Yes / no tick box' },
  { value: 'url', label: 'Link' },
  { value: 'number', label: 'Number' },
];

const QUESTION_FIELDS: ListField<QuestionDraft>[] = [
  { key: 'label', label: 'Question', wide: true, placeholder: 'e.g. T-shirt size' },
  { key: 'type', label: 'Answer type', type: 'select', options: QUESTION_TYPES },
  { key: 'required', label: 'Required', type: 'checkbox' },
  { key: 'optionsText', label: 'Options (comma separated, for "Pick one")', wide: true, placeholder: 'S, M, L, XL' },
];

const MAX_QUESTIONS = 15;

const toDraft = (question: RegistrationQuestion): QuestionDraft => ({
  key: question.key, label: question.label, type: question.type, required: question.required, optionsText: (question.options ?? []).join(', '),
});

const fromDraft = (draft: QuestionDraft): RegistrationQuestion => ({
  key: draft.key, label: draft.label.trim(), type: draft.type, required: draft.required,
  ...(draft.type === 'select' ? { options: draft.optionsText.split(',').map((option) => option.trim()).filter(Boolean) } : {}),
});

const parseLimit = (text: string): number | null => (text.trim() === '' ? null : Number(text));

interface RegistrationControlsTabProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
}

/** Everything an organizer decides about who joins and what they provide: modules, capacity, eligibility, rules, questions. */
export function RegistrationControlsTab({ hackathon, onSaved }: RegistrationControlsTabProps) {
  const { busy, errors, save } = useHackathonPatch(hackathon, onSaved);
  const [features, setFeatures] = useState<HackathonFeatures>({});
  const [maxTeams, setMaxTeams] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [waitlist, setWaitlist] = useState(false);
  const [eligibility, setEligibility] = useState<HackathonEligibility>({});
  const [rules, setRules] = useState('');
  const [requireRules, setRequireRules] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [revealAt, setRevealAt] = useState('');

  useEffect(() => {
    setFeatures(hackathon.features ?? {});
    setMaxTeams(hackathon.max_teams ? String(hackathon.max_teams) : '');
    setMaxParticipants(hackathon.max_participants ? String(hackathon.max_participants) : '');
    setWaitlist(Boolean(hackathon.waitlist_enabled));
    setEligibility(hackathon.eligibility ?? {});
    setRules(hackathon.rules ?? '');
    setRequireRules(Boolean(hackathon.require_rules_acceptance));
    setQuestions((hackathon.registration_questions ?? []).map(toDraft));
    setRevealAt(toLocalInput(hackathon.problem_statements_reveal_at));
  }, [hackathon]);

  const setEligibilityList = (key: keyof HackathonEligibility, values: string[]) => setEligibility((current) => ({ ...current, [key]: values }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void save({
      features,
      max_teams: parseLimit(maxTeams),
      max_participants: parseLimit(maxParticipants),
      waitlist_enabled: waitlist,
      eligibility,
      rules,
      require_rules_acceptance: requireRules && rules.trim() !== '',
      registration_questions: questions.map(fromDraft),
      problem_statements_reveal_at: fromLocalInput(revealAt),
    }, 'Registration controls saved');
  };

  const fieldError = (key: string) => errors[key] && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors[key]}</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Layers className="h-4 w-4 text-journey-accent" /> Modules for this hackathon</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Switch on only what this event needs. Each module adds its own tab and participant screens.</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {FEATURE_OPTIONS.map((option) => (
            <Switch
              key={option.key}
              label={option.label}
              description={option.description}
              checked={Boolean(features[option.key as HackathonFeatureKey])}
              onChange={(checked) => setFeatures((current) => ({ ...current, [option.key]: checked }))}
            />
          ))}
        </div>
        {fieldError('features')}
      </section>

      <section className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Gauge className="h-4 w-4 text-journey-accent" /> Capacity</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="max-teams" className={LABEL}>Maximum teams</label>
            <input id="max-teams" type="number" min={1} value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} placeholder="Unlimited" className={INPUT} />
            {fieldError('max_teams')}
          </div>
          <div>
            <label htmlFor="max-participants" className={LABEL}>Maximum participants</label>
            <input id="max-participants" type="number" min={1} value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="Unlimited" className={INPUT} />
            {fieldError('max_participants')}
          </div>
        </div>
        <Switch
          label="Waitlist when full"
          description="New teams join a queue instead of being turned away, and are placed automatically (oldest first) when a spot opens."
          checked={waitlist}
          onChange={setWaitlist}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Right now {hackathon.team_count ?? 0} active teams{hackathon.waitlisted_team_count ? `, ${hackathon.waitlisted_team_count} of them waitlisted` : ''}.
        </p>
      </section>

      <section className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><ShieldCheck className="h-4 w-4 text-journey-accent" /> Who can take part</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Leave a list empty for no restriction. Matching ignores upper and lower case and uses each person&apos;s profile.</p>
        <div>
          <p className={LABEL}>Colleges</p>
          <TagInput aria-label="Allowed colleges" value={eligibility.colleges ?? []} onChange={(values) => setEligibilityList('colleges', values)} placeholder="Type a college and press Enter" maxTags={50} maxLength={100} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className={LABEL}>Branches</p>
            <TagInput aria-label="Allowed branches" value={eligibility.branches ?? []} onChange={(values) => setEligibilityList('branches', values)} placeholder="e.g. CSE" maxTags={50} maxLength={100} />
          </div>
          <div>
            <p className={LABEL}>Years of study</p>
            <TagInput aria-label="Allowed years of study" value={eligibility.years ?? []} onChange={(values) => setEligibilityList('years', values)} placeholder="e.g. 2" maxTags={10} maxLength={10} />
          </div>
        </div>
        {fieldError('eligibility')}
        <div className="max-w-sm">
          <label htmlFor="reveal-at" className={LABEL}>Reveal problem statements at</label>
          <input id="reveal-at" type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)} className={INPUT} />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Blank = visible as soon as you add them. Admins always see them.</p>
        </div>
      </section>

      <section className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><ClipboardList className="h-4 w-4 text-journey-accent" /> Rules and code of conduct</h3>
        <MarkdownEditor label="Rules (shown on the public page)" value={rules} onChange={setRules} placeholder="Team rules, what is allowed, code of conduct…" />
        <Switch
          label="Participants must accept the rules"
          description="Everyone ticks an agreement when they create or join a team; the time is recorded."
          checked={requireRules}
          onChange={setRequireRules}
          disabled={rules.trim() === ''}
        />
      </section>

      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><ListChecks className="h-4 w-4 text-journey-accent" /> Extra registration questions</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Asked of every participant when they create or join a team (t-shirt size, diet, laptop, GitHub…). Answers appear in the participants export.</p>
        <ObjectListEditor<QuestionDraft>
          items={questions}
          onChange={setQuestions}
          fields={QUESTION_FIELDS}
          blank={() => ({ key: '', label: '', type: 'text', required: false, optionsText: '' })}
          addLabel="Add question"
          itemLabel={(question, index) => question.label || `Question ${index + 1}`}
          max={MAX_QUESTIONS}
          reorderable
          emptyText="No extra questions."
        />
        {fieldError('registration_questions')}
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save registration controls'}</button>
      </div>
    </form>
  );
}
