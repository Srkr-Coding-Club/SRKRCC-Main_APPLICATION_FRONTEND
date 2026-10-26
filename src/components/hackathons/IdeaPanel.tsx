'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Eye, IndianRupee, Lightbulb, Lock, MessageSquareWarning, XCircle } from 'lucide-react';
import type { Hackathon, IdeaDraft, IdeaFileKind, IdeaStatus, MyIdeaPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { IDEA_FILE_RULES, asUploaded, uploadIdeaFile } from '@/lib/ideaUpload';
import type { UploadedFile } from '@/lib/fileUpload';
import { useToast } from '@/context/ToastContext';
import FileUploadField from '@/components/forms/FileUploadField';
import { FieldLabel, SpotlightInput, SpotlightTextarea } from '@/components/ui/InputField';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { TagInput } from '@/components/ui/TagInput';
import { PaymentQr } from './PaymentQr';
import { IdeaFileActions } from './IdeaFileActions';
import { FilePreviewDialog } from './FilePreviewDialog';
import { previewKindOf } from '@/lib/filePreview';
import { linkProblem, type LinkKind } from '@/lib/validation/submissionLinks';
import { BTN_ACCENT, H2, PANEL } from './dashboardStyles';
import { formatDateTime } from './HackathonAnnouncementsFeed';

const EMPTY: IdeaDraft = { title: '', problem: '', solution: '', plan: '', tech_stack: [], deck_url: '', linkedin_url: '', transaction_id: '' };
const TEXT_LIMIT = 3000;

const STATUS: Record<IdeaStatus, { tone: PillTone; label: string; Icon: React.ElementType }> = {
  SUBMITTED: { tone: 'amber', label: 'Waiting for review', Icon: Clock },
  APPROVED: { tone: 'green', label: 'Approved', Icon: CheckCircle2 },
  CHANGES_REQUESTED: { tone: 'orange', label: 'Changes requested', Icon: MessageSquareWarning },
  REJECTED: { tone: 'red', label: 'Not accepted', Icon: XCircle },
};

const toDraft = (payload: MyIdeaPayload): IdeaDraft => {
  const idea = payload.idea;
  return idea
    ? { title: idea.title, problem: idea.problem, solution: idea.solution, plan: idea.plan, tech_stack: idea.tech_stack, deck_url: idea.deck_url ?? '', linkedin_url: idea.linkedin_url ?? '', transaction_id: idea.transaction_id ?? '' }
    : EMPTY;
};

/** Phase 1 of the hackathon: describe the plan before building it. */
export function IdeaPanel({ hackathon }: { hackathon: Hackathon }) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const [payload, setPayload] = useState<MyIdeaPayload | null>(null);
  const [draft, setDraft] = useState<IdeaDraft>(EMPTY);
  const [deck, setDeck] = useState<UploadedFile | null>(null);
  const [payment, setPayment] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState<Record<IdeaFileKind, boolean>>({ DECK: false, PAYMENT: false });
  const [problems, setProblems] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  // Once an idea is submitted the team sees it as a card; the form only opens on request, and only when editing is allowed.
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  // The files picked in this visit, kept so the person can look at the deck before sending it (nothing leaves the browser for that).
  const [pickedFiles, setPickedFiles] = useState<Record<string, File>>({});
  const [previewingDeck, setPreviewingDeck] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const load = useCallback(() => {
    hackathonApi.myIdea(slug).then((data) => {
      setPayload(data);
      setDraft(toDraft(data));
      setDeck(asUploaded(data.idea?.deck_file));
      setPayment(asUploaded(data.idea?.payment_proof));
    }).catch((err) => setLoadError(apiErrorMessage(err)));
  }, [slug]);

  useEffect(load, [load]);

  /** Re-read the server state but keep what the person has typed (a failed save must not wipe the form). */
  const refreshKeepingDraft = useCallback(() => {
    hackathonApi.myIdea(slug).then(setPayload).catch(() => undefined);
  }, [slug]);

  const set = <K extends keyof IdeaDraft>(key: K, value: IdeaDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const uploadDeck = useMemo(() => async (file: File, progress: (f: number) => void, signal: AbortSignal) => {
    const uploaded = await uploadIdeaFile(slug, 'DECK', file, progress, signal);
    setPickedFiles((prev) => ({ ...prev, [uploaded.upload_id]: file }));
    return uploaded;
  }, [slug]);
  const uploadPayment = useMemo(() => (file: File, progress: (f: number) => void, signal: AbortSignal) => uploadIdeaFile(slug, 'PAYMENT', file, progress, signal), [slug]);
  const discard = useCallback((id: string) => hackathonApi.ideaFileDiscard(slug, id).then(() => undefined), [slug]);
  const setUploadingKind = useCallback((kind: IdeaFileKind, value: boolean) => setUploading((prev) => (prev[kind] === value ? prev : { ...prev, [kind]: value })), []);
  const onDeckBusy = useCallback((value: boolean) => setUploadingKind('DECK', value), [setUploadingKind]);
  const onPaymentBusy = useCallback((value: boolean) => setUploadingKind('PAYMENT', value), [setUploadingKind]);
  const anyUploading = uploading.DECK || uploading.PAYMENT;

  const FIELD_IDS: Record<string, string> = {
    title: 'idea-title', problem: 'idea-problem', solution: 'idea-solution', plan: 'idea-plan', tech_stack: 'idea-tech', linkedin_url: 'idea-linkedin',
    deck_url: 'idea-deck', deck_file_id: 'idea-deck-file', payment_file_id: 'idea-payment-file', transaction_id: 'idea-txn',
  };
  /** Shows the message at the field AND beside the button (the button is where the eyes are), and moves focus to the field. */
  const showErrors = (byField: Record<string, string>, summary: string) => {
    // The field says what is wrong; the line beside the button only points back at it, so the same sentence is not read twice.
    const hasField = Object.keys(byField).length > 0;
    setErrors({ ...byField, form: hasField ? 'Not saved yet. Check the highlighted field above.' : summary });
    const first = Object.keys(byField)[0];
    const target = first ? document.getElementById(FIELD_IDS[first] ?? '') : null;
    if (target) { target.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); target.focus({ preventScroll: true }); }
  };

  /** Link problems found before asking the server (it stays the authority). */
  const linkProblems = () => {
    const found: Record<string, string> = {};
    for (const [key, label, kind] of [['deck_url', 'Slides link', 'any'], ['linkedin_url', 'LinkedIn link', 'linkedin']] as [string, string, LinkKind][]) {
      const problem = linkProblem(String((draft as any)[key] ?? ''), label, kind);
      if (problem) found[key] = problem;
    }
    return found;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (anyUploading || !payload) return;
    const bad = linkProblems();
    if (Object.keys(bad).length) { showErrors(bad, ''); return; }
    setNotice('');
    setBusy(true);
    setErrors({});
    try {
      const files = payload.config.files_available ? { deck_file_id: deck?.upload_id ?? null, payment_file_id: payment?.upload_id ?? null } : {};
      const saved = await hackathonApi.saveIdea(slug, { ...draft, ...files });
      setPayload(saved);
      setDraft(toDraft(saved));
      setDeck(asUploaded(saved.idea?.deck_file));
      setPayment(asUploaded(saved.idea?.payment_proof));
      setEditing(false);
      const message = saved.review_required ? 'Submitted. The organizers will review it and answer on this page.' : 'Submitted and accepted. You can still edit it until the deadline.';
      setNotice(message);
      toast.success(saved.review_required ? 'Idea sent for review' : 'Idea saved');
      requestAnimationFrame(() => sectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
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

  const { config } = payload;
  const idea = payload.idea;
  const status = idea ? STATUS[idea.status] : null;
  const fieldError = (key: string) => (errors[key] || problems[key]) && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{errors[key] || problems[key]}</p>;
  const needsFiles = config.fee_amount > 0 || config.deck_required;
  const filesMissing = needsFiles && !config.files_available;

  return (
    <section ref={sectionRef} className={`${PANEL} scroll-mt-24 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H2}><Lightbulb className="h-4 w-4" /> Phase 1: your idea</h2>
        <div className="flex flex-wrap items-center gap-2">
          {status && <StatusPill tone={status.tone} icon={status.Icon}>{status.label}</StatusPill>}
          {payload.state === 'OPEN' && payload.deadline && <StatusPill tone="amber" icon={Clock}>Due {formatDateTime(payload.deadline)}</StatusPill>}
          {payload.state === 'CLOSED' && <StatusPill tone="slate" icon={Lock}>Closed</StatusPill>}
          {payload.state === 'NOT_OPEN' && <StatusPill tone="slate" icon={Clock}>Opens {formatDateTime(payload.opens_at)}</StatusPill>}
        </div>
      </div>

      <p className="text-xs text-journey-muted">
        Describe the problem, your approach and a plan first.
        {payload.review_required ? ' The organizers review it' : ' It is accepted as soon as you submit it'}
        {payload.project_requires_idea ? ', and your project can only be submitted once your idea is accepted.' : '.'}
      </p>

      {notice && <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{notice}</p>}

      {idea && payload.can_edit && config.edits_until && (
        <p className="text-xs text-journey-muted">You can edit your idea until {formatDateTime(config.edits_until)}.</p>
      )}
      {idea && !payload.can_edit && payload.edit_blocked_reason && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-slate-500/10 px-3 py-2 text-sm text-journey-text/80"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{payload.edit_blocked_reason}</p>
      )}
      {filesMissing && payload.can_edit && (
        <p role="alert" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          File uploads are not available right now, so this idea cannot be submitted yet. Please tell the organizers.
        </p>
      )}

      {idea?.status === 'CHANGES_REQUESTED' && idea.feedback && (
        <p role="status" className="rounded-lg bg-orange-500/10 px-3 py-2 text-sm text-orange-800 dark:text-orange-200"><strong>The organizers asked for changes:</strong> {idea.feedback}</p>
      )}
      {idea?.status === 'REJECTED' && idea.feedback && (
        <p role="status" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"><strong>Why it was not accepted:</strong> {idea.feedback}</p>
      )}
      {idea?.status === 'APPROVED' && idea.feedback && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"><strong>Note from the organizers:</strong> {idea.feedback}</p>
      )}

      {payload.can_edit && (!idea || editing) ? (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-title" required>Idea title</FieldLabel>
            <SpotlightInput id="idea-title" value={draft.title} maxLength={200} onChange={(e) => set('title', e.target.value)} hasError={!!errors.title} />
            {fieldError('title')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-problem" required>The problem</FieldLabel>
            <SpotlightTextarea id="idea-problem" rows={4} value={draft.problem} maxLength={TEXT_LIMIT} onChange={(e) => set('problem', e.target.value)} hasError={!!errors.problem} placeholder="Who has this problem, and why does it matter?" />
            {fieldError('problem')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-solution" required>Your approach</FieldLabel>
            <SpotlightTextarea id="idea-solution" rows={4} value={draft.solution} maxLength={TEXT_LIMIT} onChange={(e) => set('solution', e.target.value)} hasError={!!errors.solution} placeholder="What will you build and how will it work?" />
            {fieldError('solution')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-plan">The plan</FieldLabel>
            <SpotlightTextarea id="idea-plan" rows={4} value={draft.plan} maxLength={TEXT_LIMIT} onChange={(e) => set('plan', e.target.value)} hasError={!!errors.plan} placeholder="Milestones, who does what, what you will have working by the end." />
            {fieldError('plan')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-tech">Tech you plan to use</FieldLabel>
            <TagInput id="idea-tech" value={draft.tech_stack} onChange={(tags) => set('tech_stack', tags)} placeholder="Press Enter to add" maxTags={10} maxLength={40} />
            {fieldError('tech_stack')}
          </div>

          {config.files_available && (
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-deck-file" required={config.deck_required}>Presentation (.ppt, .pptx or .pdf)</FieldLabel>
              <FileUploadField
                inputId="idea-deck-file"
                uploadWith={uploadDeck}
                discardWith={discard}
                multiple={false}
                rules={IDEA_FILE_RULES.DECK}
                defaultMb={IDEA_FILE_RULES.DECK.maxFileSizeMB}
                value={deck}
                invalid={!!errors.deck_file_id}
                onChange={(next) => setDeck((next as UploadedFile | undefined) ?? null)}
                onBusyChange={onDeckBusy}
                onProblem={(message) => setProblems((prev) => ({ ...prev, deck_file_id: message }))}
              />
              {fieldError('deck_file_id')}
              {deck && (
                <div className="flex flex-wrap items-center gap-2">
                  {previewKindOf(deck.type, deck.name) ? (
                    <button
                      type="button"
                      onClick={() => setPreviewingDeck(true)}
                      aria-label={`Preview ${deck.name}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-journey-text/15 px-3 text-xs font-semibold text-journey-text hover:bg-journey-text/5"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
                    </button>
                  ) : (
                    <p className="text-[11px] text-journey-muted">PowerPoint files cannot be previewed in the browser. The organizers download them to open.</p>
                  )}
                </div>
              )}
              {previewingDeck && deck && (
                <FilePreviewDialog
                  name={deck.name}
                  type={deck.type}
                  source={pickedFiles[deck.upload_id]
                    ? { kind: 'local', file: pickedFiles[deck.upload_id] }
                    : { kind: 'saved', loadUrl: async () => (await hackathonApi.ideaFileLink(slug, idea!.id, 'deck', true)).url }}
                  onClose={() => setPreviewingDeck(false)}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-linkedin" required={config.linkedin_required}>LinkedIn post link</FieldLabel>
              <SpotlightInput id="idea-linkedin" type="url" value={draft.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://www.linkedin.com/posts/…" hasError={!!errors.linkedin_url} />
              {fieldError('linkedin_url')}
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-deck">Slides link </FieldLabel>
              <SpotlightInput id="idea-deck" type="url" value={draft.deck_url} onChange={(e) => set('deck_url', e.target.value)} placeholder="https://…" hasError={!!errors.deck_url} />
              {fieldError('deck_url')}
            </div>
          </div>

          {config.fee_amount > 0 && (
            <fieldset className="space-y-3 rounded-xl border border-journey-text/10 p-4">
              <legend className="flex items-center gap-1.5 px-1 text-sm font-bold text-journey-text"><IndianRupee className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Payment: ₹{config.fee_amount}</legend>
              {config.payment_qr && (
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:gap-4">
                  <PaymentQr slug={slug} version={config.payment_qr.id} />
                  <p className="text-sm text-journey-text/80">Scan this QR code with any UPI app and pay ₹{config.fee_amount}. Then upload the screenshot below.</p>
                </div>
              )}
              {config.payment_note && <p className="whitespace-pre-line text-sm text-journey-text/80">{config.payment_note}</p>}
              {config.files_available && (
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="idea-payment-file" required>Screenshot of your payment</FieldLabel>
                  <FileUploadField
                    inputId="idea-payment-file"
                    uploadWith={uploadPayment}
                    discardWith={discard}
                    multiple={false}
                    rules={IDEA_FILE_RULES.PAYMENT}
                    defaultMb={IDEA_FILE_RULES.PAYMENT.maxFileSizeMB}
                    value={payment}
                    invalid={!!errors.payment_file_id}
                    onChange={(next) => setPayment((next as UploadedFile | undefined) ?? null)}
                    onBusyChange={onPaymentBusy}
                    onProblem={(message) => setProblems((prev) => ({ ...prev, payment_file_id: message }))}
                  />
                  {fieldError('payment_file_id')}
                  <p className="text-[11px] text-journey-muted">Only the organizers can see this screenshot.</p>
                </div>
              )}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="idea-txn">Transaction ID (optional)</FieldLabel>
                <SpotlightInput id="idea-txn" value={draft.transaction_id} maxLength={60} onChange={(e) => set('transaction_id', e.target.value)} hasError={!!errors.transaction_id} />
                {fieldError('transaction_id')}
              </div>
            </fieldset>
          )}

          {errors.form && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}
          <button type="submit" disabled={busy || anyUploading || filesMissing} className={BTN_ACCENT}>
            {busy ? 'Saving…' : anyUploading ? 'Uploading…' : idea ? (idea.status === 'CHANGES_REQUESTED' ? 'Resubmit idea' : 'Save changes') : 'Submit idea'}
          </button>
          {idea && (
            <button type="button" disabled={busy} onClick={() => { setEditing(false); setErrors({}); load(); }} className="ml-2 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-journey-muted hover:text-journey-text">
              Cancel
            </button>
          )}
        </form>
      ) : idea ? (
        <article aria-label="Your submission" className="space-y-3 rounded-xl border border-journey-text/10 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">Your submission</p>
              <h3 className="text-base font-bold text-journey-text">{idea.title}</h3>
              <p className="text-xs text-journey-muted">
                {idea.created_at === idea.updated_at ? 'Submitted' : 'Last updated'} {formatDateTime(idea.updated_at)} · {idea.team_name}
              </p>
            </div>
            {payload.can_edit && (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-10 items-center rounded-lg border border-journey-text/15 px-4 text-xs font-bold text-journey-text hover:bg-journey-text/5">
                Edit submission
              </button>
            )}
          </div>
          {[['The problem', idea.problem], ['Your approach', idea.solution], ['The plan', idea.plan]].map(([label, text]) => text && (
            <div key={label}><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">{label}</p><p className="whitespace-pre-line text-journey-text/80">{text}</p></div>
          ))}
          {idea.tech_stack.length > 0 && <p className="text-xs text-journey-muted">Tech: {idea.tech_stack.join(', ')}</p>}
          {idea.deck_file && <div><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-journey-muted">Presentation</p><IdeaFileActions slug={slug} ideaId={idea.id} kind="deck" file={idea.deck_file} /></div>}
          {idea.deck_url && <div><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">Slides link</p><a href={idea.deck_url} target="_blank" rel="noopener noreferrer" className="break-all text-journey-accent hover:underline">{idea.deck_url}</a></div>}
          {idea.linkedin_url && <div><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">LinkedIn post</p><a href={idea.linkedin_url} target="_blank" rel="noopener noreferrer" className="break-all text-journey-accent hover:underline">{idea.linkedin_url}</a></div>}
          {idea.payment_proof && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-journey-muted">Payment screenshot</p>
              <IdeaFileActions slug={slug} ideaId={idea.id} kind="payment" file={idea.payment_proof} />
              {idea.transaction_id && <p className="mt-1 text-xs text-journey-muted">Transaction ID: {idea.transaction_id}</p>}
            </div>
          )}
          {!payload.can_edit && !payload.edit_blocked_reason && <p className="text-xs text-journey-muted">Only your team leader can change the submission.</p>}
        </article>
      ) : (
        <p className="text-sm text-journey-muted">
          {payload.state === 'CLOSED' ? 'The idea deadline passed without a submission.' : payload.state === 'NOT_OPEN' ? `Idea submission opens ${formatDateTime(payload.opens_at)}.` : 'Only your team leader can submit the idea.'}
        </p>
      )}
    </section>
  );
}
