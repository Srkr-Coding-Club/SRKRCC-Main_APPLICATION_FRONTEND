'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mail, RotateCcw, Save, Send } from 'lucide-react';
import type { TeamEmailSetting, TeamEmailSettingsPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { LoadError } from './LoadError';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';

type Drafts = Record<string, TeamEmailSetting>;

const toDrafts = (payload: TeamEmailSettingsPayload): Drafts =>
  Object.fromEntries(payload.emails.map((email) => [email.key, email]));

export function TeamEmailsAdminTab({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [payload, setPayload] = useState<TeamEmailSettingsPayload | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const load = useCallback(() => {
    setError('');
    hackathonApi.admin.teamEmails
      .get(slug)
      .then((data) => {
        setPayload(data);
        setDrafts(toDrafts(data));
        setSaved(JSON.stringify(toDrafts(data)));
      })
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the team emails.')));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (error) return <LoadError message={error} onRetry={load} />;
  if (!payload) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;

  const dirty = JSON.stringify(drafts) !== saved;
  const update = (key: string, patch: Partial<TeamEmailSetting>) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const insertPlaceholder = (key: string, placeholder: string) => {
    const field = bodyRefs.current[key];
    const current = drafts[key].body || drafts[key].default_body;
    const start = field?.selectionStart ?? current.length;
    const end = field?.selectionEnd ?? current.length;
    update(key, { body: `${current.slice(0, start)}{{${placeholder}}}${current.slice(end)}` });
    requestAnimationFrame(() => field?.focus());
  };

  const save = async () => {
    setBusy('save');
    try {
      const emails = Object.fromEntries(
        Object.values(drafts).map((d) => [d.key, { enabled: d.enabled, subject: d.subject, body: d.body }]),
      );
      const data = await hackathonApi.admin.teamEmails.save(slug, emails);
      setPayload(data);
      setDrafts(toDrafts(data));
      setSaved(JSON.stringify(toDrafts(data)));
      toast.success('Team emails saved');
    } catch (e) {
      toast.error('Could not save', apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async (key: string) => {
    setBusy(key);
    try {
      const d = drafts[key];
      const result = await hackathonApi.admin.teamEmails.test(slug, key, d.subject, d.body);
      toast.success('Test email sent', `Check ${result.sent_to}`);
    } catch (e) {
      toast.error('Test failed', apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${PANEL} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 text-journey-accent" />
          <div>
            <h2 className="text-base font-extrabold text-[#1A1A2E] dark:text-white">Team emails</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Emails sent to participants as their team forms. Leave a subject or message blank to use the default wording.
            </p>
          </div>
        </div>
        <button onClick={save} disabled={!dirty || busy === 'save'} className={BTN_PRIMARY}>
          <Save className="h-3.5 w-3.5" /> {busy === 'save' ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {payload.emails.map(({ key }) => {
        const d = drafts[key];
        return (
          <section key={key} className={`${PANEL} space-y-4 ${d.enabled ? '' : 'opacity-70'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white">{d.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{d.when}</p>
                <div className="mt-1.5">
                  <StatusPill tone="slate">To: {d.recipients}</StatusPill>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => update(key, { enabled: e.target.checked })}
                  className="h-4 w-4 accent-[#FF7A00]"
                />
                Send this email
              </label>
            </div>

            <div>
              <label className={LABEL} htmlFor={`subject-${key}`}>Subject</label>
              <input
                id={`subject-${key}`}
                value={d.subject}
                onChange={(e) => update(key, { subject: e.target.value })}
                placeholder={d.default_subject}
                className={INPUT}
                maxLength={200}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor={`body-${key}`}>Message</label>
              <textarea
                id={`body-${key}`}
                ref={(el) => { bodyRefs.current[key] = el; }}
                value={d.body}
                onChange={(e) => update(key, { body: e.target.value })}
                placeholder={d.default_body}
                rows={8}
                maxLength={5000}
                className={`${INPUT} font-mono`}
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Blank lines start a new paragraph. Insert details about the team with these placeholders:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {payload.placeholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.description}
                    onClick={() => insertPlaceholder(key, p.key)}
                    className="rounded-md border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-600 transition hover:border-[#FF7A00] hover:text-journey-accent dark:border-slate-700 dark:text-slate-300"
                  >
                    {`{{${p.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => sendTest(key)} disabled={busy === key} className={BTN_GHOST}>
                <Send className="h-3.5 w-3.5" /> {busy === key ? 'Sending…' : 'Send test to me'}
              </button>
              <button
                onClick={() => update(key, { subject: '', body: '' })}
                disabled={!d.subject && !d.body}
                className={BTN_GHOST}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Use default wording
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
