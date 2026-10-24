'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, FileText, IndianRupee, Lightbulb, Lock, MessageSquareWarning, XCircle } from 'lucide-react';
import type { Hackathon, IdeaDraft, IdeaFileKind, IdeaStatus, MyIdeaPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { IDEA_FILE_RULES, asUploaded, uploadIdeaFile } from '@/lib/ideaUpload';
import { formatSize, type UploadedFile } from '@/lib/fileUpload';
import { useToast } from '@/context/ToastContext';
import FileUploadField from '@/components/forms/FileUploadField';
import { FieldLabel, SpotlightInput, SpotlightTextarea } from '@/components/ui/InputField';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { TagInput } from '@/components/ui/TagInput';
import { PaymentQr } from './PaymentQr';
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

/** Opens a saved idea file through a fresh 60-second link: images in a new tab, everything else as a download. */
async function openIdeaFile(slug: string, ideaId: number, kind: 'deck' | 'payment', type: string) {
  const viewable = type.startsWith('image/');
  const link = await hackathonApi.ideaFileLink(slug, ideaId, kind, viewable);
  if (link.inline) window.open(link.url, '_blank', 'noopener,noreferrer');
  else window.location.assign(link.url);
}

function SavedFile({ slug, ideaId, kind, file }: { slug: string; ideaId: number; kind: 'deck' | 'payment'; file: { name: string; size: number; type: string } }) {
  const [error, setError] = useState('');
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => { setError(''); openIdeaFile(slug, ideaId, kind, file.type).catch((err) => setError(apiErrorMessage(err, 'Could not open the file.'))); }}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-journey-text/15 px-3 text-xs font-semibold text-journey-text hover:bg-journey-text/5"
      >
        <FileText className="h-4 w-4 text-journey-accent" aria-hidden="true" />
        <span className="max-w-[16rem] truncate">{file.name}</span>
        <span className="font-normal text-journey-muted">{formatSize(file.size)}</span>
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </button>
      {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

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

  const load = useCallback(() => {
    hackathonApi.myIdea(slug).then((data) => {
      setPayload(data);
      setDraft(toDraft(data));
      setDeck(asUploaded(data.idea?.deck_file));
      setPayment(asUploaded(data.idea?.payment_proof));
    }).catch((err) => setLoadError(apiErrorMessage(err)));
  }, [slug]);

  useEffect(load, [load]);

  const set = <K extends keyof IdeaDraft>(key: K, value: IdeaDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const uploadDeck = useMemo(() => (file: File, progress: (f: number) => void, signal: AbortSignal) => uploadIdeaFile(slug, 'DECK', file, progress, signal), [slug]);
  const uploadPayment = useMemo(() => (file: File, progress: (f: number) => void, signal: AbortSignal) => uploadIdeaFile(slug, 'PAYMENT', file, progress, signal), [slug]);
  const discard = useCallback((id: string) => hackathonApi.ideaFileDiscard(slug, id).then(() => undefined), [slug]);
  const setUploadingKind = useCallback((kind: IdeaFileKind, value: boolean) => setUploading((prev) => (prev[kind] === value ? prev : { ...prev, [kind]: value })), []);
  const onDeckBusy = useCallback((value: boolean) => setUploadingKind('DECK', value), [setUploadingKind]);
  const onPaymentBusy = useCallback((value: boolean) => setUploadingKind('PAYMENT', value), [setUploadingKind]);
  const anyUploading = uploading.DECK || uploading.PAYMENT;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (anyUploading || !payload) return;
    setBusy(true);
    setErrors({});
    try {
      const files = payload.config.files_available ? { deck_file_id: deck?.upload_id ?? null, payment_file_id: payment?.upload_id ?? null } : {};
      const saved = await hackathonApi.saveIdea(slug, { ...draft, ...files });
      setPayload(saved);
      setDraft(toDraft(saved));
      setDeck(asUploaded(saved.idea?.deck_file));
      setPayment(asUploaded(saved.idea?.payment_proof));
      toast.success(saved.review_required ? 'Idea sent for review' : 'Idea saved');
    } catch (err: any) {
      const field = err?.body?.field as string | undefined;
      setErrors({ [field ?? 'form']: apiErrorMessage(err) });
      load();
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <section className={PANEL}><p className="text-sm text-rose-500">{loadError}</p></section>;
  if (!payload) return <section className={`${PANEL} h-40 animate-pulse`} aria-busy="true" />;

  const { config } = payload;
  const idea = payload.idea;
  const status = idea ? STATUS[idea.status] : null;
  const fieldError = (key: string) => (errors[key] || problems[key]) && <p className="text-xs text-rose-500">{errors[key] || problems[key]}</p>;
  const needsFiles = config.fee_amount > 0 || config.deck_required;
  const filesMissing = needsFiles && !config.files_available;

  return (
    <section className={`${PANEL} space-y-4`}>
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

      {payload.can_edit ? (
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
            <SpotlightTextarea id="idea-plan" rows={4} value={draft.plan} maxLength={TEXT_LIMIT} onChange={(e) => set('plan', e.target.value)} placeholder="Milestones, who does what, what you will have working by the end." />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-tech">Tech you plan to use</FieldLabel>
            <TagInput id="idea-tech" value={draft.tech_stack} onChange={(tags) => set('tech_stack', tags)} placeholder="Press Enter to add" maxTags={10} maxLength={40} />
          </div>

          {config.files_available && (
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-deck-file" required={config.deck_required}>Presentation (.ppt or .pptx)</FieldLabel>
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
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-linkedin" required={config.linkedin_required}>LinkedIn post link</FieldLabel>
              <SpotlightInput id="idea-linkedin" type="url" value={draft.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://www.linkedin.com/posts/…" hasError={!!errors.linkedin_url} />
              {fieldError('linkedin_url')}
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-deck">Slides link (optional)</FieldLabel>
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
        </form>
      ) : idea ? (
        <div className="space-y-3 text-sm">
          <h3 className="text-base font-bold text-journey-text">{idea.title}</h3>
          {[['The problem', idea.problem], ['Your approach', idea.solution], ['The plan', idea.plan]].map(([label, text]) => text && (
            <div key={label}><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">{label}</p><p className="whitespace-pre-line text-journey-text/80">{text}</p></div>
          ))}
          {idea.deck_file && <div><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-journey-muted">Presentation</p><SavedFile slug={slug} ideaId={idea.id} kind="deck" file={idea.deck_file} /></div>}
          {idea.linkedin_url && <div><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">LinkedIn post</p><a href={idea.linkedin_url} target="_blank" rel="noopener noreferrer" className="break-all text-journey-accent hover:underline">{idea.linkedin_url}</a></div>}
          {idea.payment_proof && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-journey-muted">Payment screenshot</p>
              <SavedFile slug={slug} ideaId={idea.id} kind="payment" file={idea.payment_proof} />
              {idea.transaction_id && <p className="mt-1 text-xs text-journey-muted">Transaction ID: {idea.transaction_id}</p>}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-journey-muted">
          {payload.state === 'CLOSED' ? 'The idea deadline passed without a submission.' : payload.state === 'NOT_OPEN' ? `Idea submission opens ${formatDateTime(payload.opens_at)}.` : 'Only your team leader can submit the idea.'}
        </p>
      )}
    </section>
  );
}
