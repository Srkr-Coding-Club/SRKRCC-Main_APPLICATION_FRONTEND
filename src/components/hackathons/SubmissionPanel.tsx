'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, FileUp, Lock } from 'lucide-react';
import type { Hackathon, MySubmissionPayload, SubmissionDraft } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { FieldLabel, SpotlightInput, SpotlightTextarea } from '@/components/ui/InputField';
import { linkProblem, type LinkKind } from '@/lib/validation/submissionLinks';
import { StatusPill } from '@/components/ui/StatusPill';
import { TagInput } from '@/components/ui/TagInput';
import { BTN_ACCENT, H2, PANEL } from './dashboardStyles';
import { formatDateTime } from './HackathonAnnouncementsFeed';

const EMPTY_DRAFT: SubmissionDraft = {
  project_title: '', tagline: '', description: '', repo_url: '', demo_url: '', video_url: '', slides_url: '', tech_stack: [], is_public: true,
};
const DESCRIPTION_LIMIT = 5000;
const MAX_TECH = 10;

const toDraft = (payload: MySubmissionPayload): SubmissionDraft => {
  const s = payload.submission;
  return s
    ? { project_title: s.project_title, tagline: s.tagline, description: s.description, repo_url: s.repo_url, demo_url: s.demo_url ?? '', video_url: s.video_url ?? '', slides_url: s.slides_url ?? '', tech_stack: s.tech_stack, is_public: s.is_public }
    : EMPTY_DRAFT;
};

/** "2 days 3 hours left" / "45 minutes left" / "closed". */
function timeLeft(deadline: string | null, now: number): string | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return 'closed';
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} left`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ${minutes % 60} min left`;
  return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
}

interface SubmissionPanelProps {
  hackathon: Hackathon;
}

export function SubmissionPanel({ hackathon }: SubmissionPanelProps) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const [payload, setPayload] = useState<MySubmissionPayload | null>(null);
  const [draft, setDraft] = useState<SubmissionDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const sectionRef = useRef<HTMLElement>(null);

  const load = useCallback(() => {
    hackathonApi.mySubmission(slug).then((data) => { setPayload(data); setDraft(toDraft(data)); }).catch((err) => setLoadError(apiErrorMessage(err)));
  }, [slug]);

  useEffect(load, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  /** Re-read the server state but keep what the person has typed (a failed save must not wipe the form). */
  const refreshKeepingDraft = useCallback(() => {
    hackathonApi.mySubmission(slug).then(setPayload).catch(() => undefined);
  }, [slug]);

  const FIELD_IDS: Record<string, string> = {
    project_title: 'sub-title', tagline: 'sub-tagline', description: 'sub-description', repo_url: 'sub-repo', demo_url: 'sub-demo',
    video_url: 'sub-video', slides_url: 'sub-slides', tech_stack: 'sub-tech',
  };
  /** Shows the message at the field and beside the button, and moves focus to the field. */
  const showErrors = (byField: Record<string, string>, summary: string) => {
    // The field says what is wrong; the line beside the button only points back at it, so the same sentence is not read twice.
    const hasField = Object.keys(byField).length > 0;
    setErrors({ ...byField, form: hasField ? 'Not saved yet. Check the highlighted field above.' : summary });
    const first = Object.keys(byField)[0];
    const target = first ? document.getElementById(FIELD_IDS[first] ?? '') : null;
    if (target) { target.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); target.focus({ preventScroll: true }); }
  };

  const set = <K extends keyof SubmissionDraft>(key: K, value: SubmissionDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  /** Link problems found before asking the server (it stays the authority). */
  const linkProblems = () => {
    const found: Record<string, string> = {};
    for (const [key, label, kind] of [['repo_url', 'Repository link', 'repo'], ['demo_url', 'Demo link', 'any'], ['video_url', 'Video link', 'video'], ['slides_url', 'Slides link', 'any']] as [string, string, LinkKind][]) {
      const problem = linkProblem(String((draft as any)[key] ?? ''), label, kind);
      if (problem) found[key] = problem;
    }
    return found;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice('');
    const bad = linkProblems();
    if (Object.keys(bad).length) { showErrors(bad, ''); return; }
    setBusy(true);
    setErrors({});
    try {
      const saved = await hackathonApi.saveSubmission(slug, draft);
      setPayload(saved);
      setDraft(toDraft(saved));
      setNotice(`Project saved at ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST. You can keep editing until the deadline.`);
      toast.success('Project saved', 'You can keep editing until the deadline.');
    } catch (err: any) {
      const field = err?.body?.field as string | undefined;
      const message = apiErrorMessage(err);
      showErrors(field ? { [field]: message } : {}, message);
      refreshKeepingDraft();
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <section className={PANEL}><p className="text-sm text-rose-600 dark:text-rose-400">{loadError}</p></section>;
  if (!payload) return <section className={`${PANEL} h-40 animate-pulse`} aria-busy="true" />;

  const left = timeLeft(payload.deadline, now);
  const submitted = payload.submission;
  const editable = payload.can_edit;
  const field = (key: keyof SubmissionDraft) => errors[key] && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{errors[key]}</p>;

  return (
    <section ref={sectionRef} className={`${PANEL} scroll-mt-24 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H2}><FileUp className="h-4 w-4" /> {hackathon.features?.ideas ? 'Phase 2: your project' : 'Project submission'}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {submitted && <StatusPill tone="green" icon={CheckCircle2}>Submitted</StatusPill>}
          {payload.state === 'OPEN' && left && <StatusPill tone="amber" icon={Clock}>{left}</StatusPill>}
          {payload.state === 'CLOSED' && <StatusPill tone="slate" icon={Lock}>Closed</StatusPill>}
          {payload.state === 'NOT_OPEN' && <StatusPill tone="slate" icon={Clock}>Opens {formatDateTime(payload.opens_at)}</StatusPill>}
        </div>
      </div>

      {payload.gate && !payload.gate.satisfied && <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">{payload.gate.reason}</p>}
      {payload.deadline && payload.state === 'OPEN' && <p className="text-xs text-journey-muted">Deadline: {formatDateTime(payload.deadline)}. Edit as often as you like until then.</p>}
      {!editable && !submitted && payload.state === 'OPEN' && payload.gate?.satisfied !== false && <p className="text-sm text-journey-muted">Only your team leader can submit. Ask them to add the project here.</p>}
      {!editable && !submitted && payload.state === 'CLOSED' && <p className="text-sm text-journey-muted">The submission deadline has passed and no project was submitted.</p>}
      {!editable && !submitted && payload.state === 'NOT_OPEN' && <p className="text-sm text-journey-muted">Submissions open {formatDateTime(payload.opens_at)}.</p>}

      {editable ? (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sub-title" required>Project title</FieldLabel>
            <SpotlightInput id="sub-title" value={draft.project_title} maxLength={200} onChange={(e) => set('project_title', e.target.value)} hasError={!!errors.project_title} />
            {field('project_title')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sub-tagline">One-line pitch</FieldLabel>
            <SpotlightInput id="sub-tagline" value={draft.tagline} maxLength={200} onChange={(e) => set('tagline', e.target.value)} hasError={!!errors.tagline} placeholder="What it does in one sentence" />
            {field('tagline')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sub-description" required>What did you build?</FieldLabel>
            <SpotlightTextarea id="sub-description" rows={6} value={draft.description} maxLength={DESCRIPTION_LIMIT} onChange={(e) => set('description', e.target.value)} hasError={!!errors.description} placeholder="The problem, your solution, how it works and what is next." />
            <div className="flex justify-between text-xs"><span className="text-rose-600 dark:text-rose-400">{errors.description}</span><span className="text-journey-muted">{draft.description.length}/{DESCRIPTION_LIMIT}</span></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="sub-repo" required>Code repository</FieldLabel>
              <SpotlightInput id="sub-repo" type="url" value={draft.repo_url} onChange={(e) => set('repo_url', e.target.value)} placeholder="https://github.com/…" hasError={!!errors.repo_url} />
              {field('repo_url')}
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="sub-demo">Live demo</FieldLabel>
              <SpotlightInput id="sub-demo" type="url" value={draft.demo_url} onChange={(e) => set('demo_url', e.target.value)} placeholder="https://…" hasError={!!errors.demo_url} />
              {field('demo_url')}
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="sub-video">Demo video</FieldLabel>
              <SpotlightInput id="sub-video" type="url" value={draft.video_url} onChange={(e) => set('video_url', e.target.value)} placeholder="https://youtu.be/…" hasError={!!errors.video_url} />
              {field('video_url')}
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="sub-slides">Slides</FieldLabel>
              <SpotlightInput id="sub-slides" type="url" value={draft.slides_url} onChange={(e) => set('slides_url', e.target.value)} placeholder="https://docs.google.com/…" hasError={!!errors.slides_url} />
              {field('slides_url')}
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sub-tech">Tech stack</FieldLabel>
            <TagInput id="sub-tech" value={draft.tech_stack} onChange={(tags) => set('tech_stack', tags)} placeholder="e.g. React, Django — press Enter" maxTags={MAX_TECH} maxLength={40} />
            {field('tech_stack')}
          </div>
          {hackathon.features?.showcase && (
            <label className="flex items-start gap-2 text-sm text-journey-text">
              <input type="checkbox" checked={draft.is_public} onChange={(e) => set('is_public', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF7A00]" />
              <span>Feature my project in the public showcase after results are out.</span>
            </label>
          )}
          {notice && <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{notice}</p>}
          {errors.form && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}
          <button type="submit" disabled={busy} className={BTN_ACCENT}>{busy ? 'Saving…' : submitted ? 'Save changes' : 'Submit project'}</button>
        </form>
      ) : submitted ? (
        <div className="space-y-2 text-sm">
          <h3 className="text-base font-bold text-journey-text">{submitted.project_title}</h3>
          {submitted.tagline && <p className="text-journey-muted">{submitted.tagline}</p>}
          <p className="whitespace-pre-line text-journey-text/80">{submitted.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-journey-accent">
            {[['Repository', submitted.repo_url], ['Demo', submitted.demo_url], ['Video', submitted.video_url], ['Slides', submitted.slides_url]].map(([label, url]) => url && (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">{label}<ExternalLink className="h-3 w-3" /></a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
