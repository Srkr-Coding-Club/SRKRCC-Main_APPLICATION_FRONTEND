'use client';

import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { MAX_REDIRECT_DELAY, clampDelay, redirectProblem } from '@/lib/afterSubmit';
import { FORM_LANGUAGES, normalizeLanguage } from '@/lib/i18n/formStrings';

export interface AfterSubmitMeta {
  confirmation_message?: string;
  redirect_url?: string;
  redirect_delay_seconds?: number;
  captcha_enabled?: boolean;
  language?: string;
}

const input =
  'w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] outline-none';
const label = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1';

/** The thank-you page, an optional redirect, and the bot check - the settings that apply once someone has submitted. */
export function AfterSubmitSettings<T extends AfterSubmitMeta>({ formMeta, setFormMeta }: {
  formMeta: T; setFormMeta: (next: T) => void;
}) {
  const problem = redirectProblem(formMeta.redirect_url);
  return (
    <div className="space-y-3 pt-5 pb-5 border-t border-slate-100 dark:border-slate-800" data-testid="after-submit-settings">
      <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
        <CheckCircle2 className="w-4 h-4 text-[#FF7A00]" />
        After submitting
      </div>

      <div>
        <label htmlFor="form-language" className={label}>Language of the form&apos;s buttons and prompts</label>
        <select
          id="form-language"
          value={normalizeLanguage(formMeta.language)}
          onChange={(e) => setFormMeta({ ...formMeta, language: e.target.value })}
          className={input}
        >
          {FORM_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <p className="text-[10px] text-slate-400 mt-1">Your questions, options and messages are shown exactly as you write them; write them in this language too.</p>
      </div>

      <div>
        <label htmlFor="thank-you-message" className={label}>Thank-you message (optional)</label>
        <textarea
          id="thank-you-message"
          rows={3}
          maxLength={2000}
          value={formMeta.confirmation_message || ''}
          onChange={(e) => setFormMeta({ ...formMeta, confirmation_message: e.target.value })}
          placeholder="Thank you for submitting your response."
          className={`${input} resize-none`}
        />
        <p className="text-[10px] text-slate-400 mt-1">Write {'{{12}}'} to show the answer to question 12, e.g. &quot;See you there, {'{{1}}'}!&quot;</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="redirect-url" className={label}>Then send them to (optional)</label>
          <input
            id="redirect-url"
            type="text"
            value={formMeta.redirect_url || ''}
            onChange={(e) => setFormMeta({ ...formMeta, redirect_url: e.target.value })}
            placeholder="/events or https://..."
            aria-invalid={problem ? true : undefined}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="redirect-delay" className={label}>After (seconds)</label>
          <input
            id="redirect-delay"
            type="number"
            min={0}
            max={MAX_REDIRECT_DELAY}
            value={formMeta.redirect_delay_seconds ?? 5}
            onChange={(e) => setFormMeta({ ...formMeta, redirect_delay_seconds: clampDelay(e.target.value) })}
            className={input}
          />
        </div>
      </div>
      {problem && <p role="alert" className="text-[11px] text-red-600">{problem}</p>}

      <label className="flex items-center justify-between cursor-pointer pt-2">
        <span className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
          <ShieldCheck className="w-4 h-4 text-[#FF7A00]" />
          Bot check (CAPTCHA)
        </span>
        <input
          type="checkbox"
          aria-label="Bot check (CAPTCHA)"
          checked={!!formMeta.captcha_enabled}
          onChange={(e) => setFormMeta({ ...formMeta, captcha_enabled: e.target.checked })}
          className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
        />
      </label>
      {formMeta.captcha_enabled && (
        <p className="text-[10px] text-slate-400">
          Needs TURNSTILE_SECRET_KEY on the server and NEXT_PUBLIC_TURNSTILE_SITE_KEY on the website; the form cannot be published without them.
        </p>
      )}
    </div>
  );
}
