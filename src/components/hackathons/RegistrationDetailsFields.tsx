'use client';

import React from 'react';
import type { Hackathon, RegistrationQuestion } from '@/lib/types';
import type { RegistrationInput } from '@/lib/api/hackathons';
import { FormSelect } from '@/components/ui/FormSelect';
import { FieldError, FieldLabel, SpotlightInput, SpotlightTextarea, fieldErrorId } from '@/components/ui/InputField';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

export type RegistrationConfig = Pick<Hackathon, 'rules' | 'require_rules_acceptance' | 'registration_questions'>;

export interface RegistrationValue {
  acceptRules: boolean;
  answers: Record<string, string | boolean>;
}

export const EMPTY_REGISTRATION: RegistrationValue = { acceptRules: false, answers: {} };

export const needsRegistrationDetails = (config: RegistrationConfig): boolean =>
  Boolean((config.rules ?? '').trim() && config.require_rules_acceptance) || (config.registration_questions ?? []).length > 0;

export const toRegistrationInput = (value: RegistrationValue): RegistrationInput => ({ accept_rules: value.acceptRules, answers: value.answers });

/** Client-side check so people see what is missing before the request; the server enforces the same rules. */
export function registrationErrors(config: RegistrationConfig, value: RegistrationValue): Record<string, string> {
  const errors: Record<string, string> = {};
  if ((config.rules ?? '').trim() && config.require_rules_acceptance && !value.acceptRules) errors.accept_rules = 'Please accept the rules to continue.';
  for (const question of config.registration_questions ?? []) {
    const answer = value.answers[question.key];
    if (question.required && (question.type === 'checkbox' ? !answer : !String(answer ?? '').trim())) errors[question.key] = 'This answer is required.';
  }
  return errors;
}

interface RegistrationDetailsFieldsProps {
  config: RegistrationConfig;
  value: RegistrationValue;
  onChange: (value: RegistrationValue) => void;
  errors?: Record<string, string>;
}

function QuestionInput({ question, answer, error, onChange }: { question: RegistrationQuestion; answer: string | boolean | undefined; error?: string; onChange: (answer: string | boolean) => void }) {
  const id = `reg-${question.key}`;
  if (question.type === 'checkbox') {
    return (
      <div className="space-y-1.5">
        <label className="flex items-start gap-2 text-sm text-journey-text">
          <input
            type="checkbox"
            id={id}
            checked={Boolean(answer)}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? fieldErrorId(id) : undefined}
            className="mt-0.5 h-4 w-4 accent-[#FF7A00]"
          />
          <span>{question.label}{question.required && <span className="text-rose-600 dark:text-rose-400" aria-hidden="true"> *</span>}</span>
        </label>
        <FieldError id={fieldErrorId(id)}>{error}</FieldError>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={id} required={question.required}>{question.label}</FieldLabel>
      {question.type === 'select' ? (
        <FormSelect
          aria-label={question.label}
          value={String(answer ?? '')}
          onChange={onChange}
          options={(question.options ?? []).map((option) => ({ value: option, label: option }))}
          placeholder="Choose one"
          allowClear={!question.required}
        />
      ) : question.type === 'textarea' ? (
        <SpotlightTextarea id={id} rows={3} maxLength={1000} value={String(answer ?? '')} onChange={(e) => onChange(e.target.value)} hasError={!!error} aria-describedby={error ? fieldErrorId(id) : undefined} />
      ) : (
        <SpotlightInput
          id={id}
          type={question.type === 'number' ? 'number' : question.type === 'url' ? 'url' : 'text'}
          maxLength={1000}
          value={String(answer ?? '')}
          onChange={(e) => onChange(e.target.value)}
          hasError={!!error}
          aria-describedby={error ? fieldErrorId(id) : undefined}
        />
      )}
      <FieldError id={fieldErrorId(id)}>{error}</FieldError>
    </div>
  );
}

/** The organizers' rules (with the agreement tick) and extra questions, shown wherever someone joins a team. */
export function RegistrationDetailsFields({ config, value, onChange, errors = {} }: RegistrationDetailsFieldsProps) {
  const rules = (config.rules ?? '').trim();
  const questions = config.registration_questions ?? [];
  if (!rules && questions.length === 0) return null;

  return (
    <div className="space-y-4">
      {rules && (
        <div className="space-y-2">
          <FieldLabel>Rules and code of conduct</FieldLabel>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-journey-text/10 bg-journey-text/[0.03] p-3 text-xs">
            <MarkdownRenderer content={rules} />
          </div>
          {config.require_rules_acceptance && (
            <label className="flex items-start gap-2 text-sm text-journey-text">
              <input
                type="checkbox"
                checked={value.acceptRules}
                onChange={(e) => onChange({ ...value, acceptRules: e.target.checked })}
                aria-invalid={errors.accept_rules ? true : undefined}
                aria-describedby={errors.accept_rules ? fieldErrorId('accept-rules') : undefined}
                className="mt-0.5 h-4 w-4 accent-[#FF7A00]"
              />
              <span>I have read and accept the rules<span className="text-rose-600 dark:text-rose-400" aria-hidden="true"> *</span></span>
            </label>
          )}
          <FieldError id={fieldErrorId('accept-rules')}>{errors.accept_rules}</FieldError>
        </div>
      )}
      {questions.map((question) => (
        <QuestionInput
          key={question.key}
          question={question}
          answer={value.answers[question.key]}
          error={errors[question.key]}
          onChange={(answer) => onChange({ ...value, answers: { ...value.answers, [question.key]: answer } })}
        />
      ))}
    </div>
  );
}
