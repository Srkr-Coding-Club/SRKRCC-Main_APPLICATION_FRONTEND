'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Download, ExternalLink, IndianRupee, Lightbulb, MessageSquareWarning, Save, X } from 'lucide-react';
import type { AdminIdeasPayload, Hackathon, IdeaStatus } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { downloadCSV } from '@/lib/dataManagement';
import { useToast } from '@/context/ToastContext';
import { Switch } from '@/components/ui/Switch';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { FeatureOffNotice } from './FeatureOffNotice';
import { LoadError } from './LoadError';
import { SubmissionPhases } from './SubmissionPhases';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, fromLocalInput, toLocalInput } from './shared';
import { useHackathonPatch } from './useHackathonPatch';
import FileUploadField from '@/components/forms/FileUploadField';
import { PaymentQr } from '@/components/hackathons/PaymentQr';
import { IdeaFileActions } from '@/components/hackathons/IdeaFileActions';
import { IDEA_FILE_RULES, uploadIdeaQr } from '@/lib/ideaUpload';

const STATUS_PILL: Record<IdeaStatus, { tone: PillTone; label: string }> = {
  SUBMITTED: { tone: 'amber', label: 'Waiting for review' },
  APPROVED: { tone: 'green', label: 'Approved' },
  CHANGES_REQUESTED: { tone: 'orange', label: 'Changes requested' },
  REJECTED: { tone: 'red', label: 'Rejected' },
};
const FILTERS: { value: IdeaStatus | ''; label: string }[] = [
  { value: '', label: 'All' }, { value: 'SUBMITTED', label: 'To review' }, { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' },
];

interface IdeasAdminTabProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
  onEnable: () => void;
}

export function IdeasAdminTab({ hackathon, onSaved, onEnable }: IdeasAdminTabProps) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const { busy: saving, errors, save } = useHackathonPatch(hackathon, onSaved);
  const enabled = Boolean(hackathon.features?.ideas);
  const [opensAt, setOpensAt] = useState(toLocalInput(hackathon.idea_opens_at));
  const [deadline, setDeadline] = useState(toLocalInput(hackathon.idea_deadline));
  const [reviewRequired, setReviewRequired] = useState(hackathon.idea_review_required ?? true);
  const [gate, setGate] = useState(Boolean(hackathon.project_requires_approved_idea));
  const [fee, setFee] = useState(String(hackathon.idea_fee_amount ?? 0));
  const [paymentNote, setPaymentNote] = useState(hackathon.idea_payment_note ?? '');
  const [deckRequired, setDeckRequired] = useState(Boolean(hackathon.idea_deck_required));
  const [linkedinRequired, setLinkedinRequired] = useState(Boolean(hackathon.idea_linkedin_required));
  const [editsEnabled, setEditsEnabled] = useState(hackathon.idea_edits_enabled ?? true);
  const [editsUntil, setEditsUntil] = useState(toLocalInput(hackathon.idea_edits_until));
  // The payment QR code is saved the moment it is uploaded (not with the Save button), so it has its own state.
  const [qr, setQr] = useState<{ id: string; name: string } | null>(null);
  const [data, setData] = useState<AdminIdeasPayload | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<IdeaStatus | ''>('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reminding, setReminding] = useState(false);

  const load = useCallback(() => {
    setError('');
    hackathonApi.admin.ideas(slug).then((payload) => { setData(payload); setQr(payload.config.payment_qr); }).catch((err) => setError(apiErrorMessage(err, 'Could not load ideas.')));
  }, [slug]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const uploadQr = useMemo(() => async (file: File, progress: (f: number) => void, signal: AbortSignal) => {
    const saved = await uploadIdeaQr(slug, file, progress, signal);
    setQr({ id: saved.upload_id, name: saved.name });
    return saved;
  }, [slug]);
  const removeQr = useCallback(async () => {
    await hackathonApi.ideaQrRemove(slug);
    setQr(null);
  }, [slug]);

  const rows = useMemo(() => (data?.rows ?? []).filter((row) => !filter || row.status === filter), [data, filter]);

  if (!enabled) return <FeatureOffNotice title="Idea submission" description="Turn this module on to collect each team's plan before the project phase." onEnable={onEnable} />;

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    await save({
      idea_opens_at: fromLocalInput(opensAt), idea_deadline: fromLocalInput(deadline),
      idea_review_required: reviewRequired, project_requires_approved_idea: gate,
      idea_fee_amount: Math.max(0, Math.floor(Number(fee) || 0)), idea_payment_note: paymentNote,
      idea_deck_required: deckRequired, idea_linkedin_required: linkedinRequired,
      idea_edits_enabled: editsEnabled, idea_edits_until: editsEnabled ? fromLocalInput(editsUntil) : null,
    }, 'Idea phase saved');
  };

  const review = async (id: number, status: Exclude<IdeaStatus, 'SUBMITTED'>) => {
    setReviewing(true);
    try {
      await hackathonApi.admin.reviewIdea(slug, id, { status, feedback });
      toast.success(status === 'APPROVED' ? 'Idea approved' : status === 'REJECTED' ? 'Idea rejected' : 'Changes requested', 'The team was notified.');
      setFeedback('');
      setOpenId(null);
      load();
    } catch (err) {
      toast.error('Could not save the review', apiErrorMessage(err));
    } finally {
      setReviewing(false);
    }
  };

  const remind = async () => {
    setReminding(true);
    try {
      const { reminded } = await hackathonApi.admin.remindMissingIdeas(slug);
      toast.success(reminded ? `Reminded ${reminded} team${reminded === 1 ? '' : 's'}` : 'Every team has submitted an idea');
    } catch (err) {
      toast.error('Could not send reminders', apiErrorMessage(err));
    } finally {
      setReminding(false);
    }
  };

  const exportCsv = () => {
    if (data) downloadCSV(data.rows.map((row) => ({
      team: row.team_name, status: row.status, title: row.title, problem: row.problem, solution: row.solution, plan: row.plan,
      tech_stack: row.tech_stack.join(', '), deck_url: row.deck_url ?? '', linkedin_url: row.linkedin_url ?? '', has_slides_file: row.deck_file ? 'yes' : 'no',
      payment_screenshot: row.payment_proof ? 'yes' : 'no', transaction_id: row.transaction_id ?? '', feedback: row.feedback, submitted: row.updated_at,
    })), `${slug}-ideas-${Date.now()}.csv`);
  };

  return (
    <div className="space-y-6">
      <SubmissionPhases hackathon={hackathon} />

      <form onSubmit={saveSettings} className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Lightbulb className="h-4 w-4 text-journey-accent" /> Phase 1: idea (plan)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="idea-opens" className={LABEL}>Opens</label>
            <input id="idea-opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={INPUT} />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Blank = open now.</p>
          </div>
          <div>
            <label htmlFor="idea-deadline" className={LABEL}>Deadline</label>
            <input id="idea-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={INPUT} />
            {errors.idea_deadline ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_deadline}</p> : <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Must be before the project deadline.</p>}
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"><IndianRupee className="h-3.5 w-3.5" /> What teams must provide</h4>
          <Switch label="Presentation file required" description="The team uploads a .ppt, .pptx or .pdf with its idea." checked={deckRequired} onChange={setDeckRequired} />
          {errors.idea_deck_required && <p className="text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_deck_required}</p>}
          <Switch label="LinkedIn post link required" description="The link of the team's LinkedIn post about the hackathon." checked={linkedinRequired} onChange={setLinkedinRequired} />
          <div className="space-y-2">
            <p className={LABEL}>Payment QR code</p>
            <div className="flex flex-wrap items-start gap-4">
              {qr && <PaymentQr slug={slug} version={qr.id} size={160} />}
              <div className="min-w-[14rem] flex-1 space-y-2">
                <FileUploadField
                  inputId="idea-qr-file"
                  uploadWith={uploadQr}
                  discardWith={removeQr}
                  multiple={false}
                  rules={IDEA_FILE_RULES.PAYMENT}
                  defaultMb={IDEA_FILE_RULES.PAYMENT.maxFileSizeMB}
                  value={null}
                  onChange={() => undefined}
                  onBusyChange={() => undefined}
                  onProblem={(message) => message && toast.error('QR code', message)}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Teams see this image on the idea form and scan it to pay. It is saved as soon as it uploads. Only registered teams and organizers can see it.</p>
                {qr && (
                  <button type="button" onClick={() => removeQr().then(() => toast.success('QR code removed')).catch((err) => toast.error('Could not remove it', apiErrorMessage(err)))} className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">
                    Remove the QR code
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="idea-fee" className={LABEL}>Payment (₹)</label>
              <input id="idea-fee" type="number" inputMode="numeric" min={0} step={1} value={fee} onChange={(e) => setFee(e.target.value)} className={INPUT} />
              {errors.idea_fee_amount ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_fee_amount}</p> : <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">0 = no payment. Above 0, teams must upload a payment screenshot, which only organizers can see.</p>}
            </div>
            <div>
              <label htmlFor="idea-payment-note" className={LABEL}>How to pay</label>
              <textarea id="idea-payment-note" rows={3} maxLength={1000} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className={INPUT} placeholder="UPI ID, QR instructions, account name…" />
              {errors.idea_payment_note && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_payment_note}</p>}
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <Switch
            label="Teams can edit a submitted idea"
            description="On: the leader can keep editing. Off: an idea is locked after the first submission (changes you ask for in a review are still allowed)."
            checked={editsEnabled}
            onChange={setEditsEnabled}
          />
          {editsEnabled && (
            <div className="max-w-sm">
              <label htmlFor="idea-edits-until" className={LABEL}>Editing closes at</label>
              <input id="idea-edits-until" type="datetime-local" value={editsUntil} onChange={(e) => setEditsUntil(e.target.value)} className={INPUT} />
              {errors.idea_edits_until ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_edits_until}</p> : <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Blank = the deadline above. Set a later time to reopen editing after the deadline; teams that have not submitted still cannot.</p>}
            </div>
          )}
        </div>
        <Switch label="Review every idea" description="Teams wait for your approval. Off = ideas are accepted the moment they are submitted." checked={reviewRequired} onChange={setReviewRequired} />
        <Switch
          label="Project phase needs an accepted idea"
          description="Only teams whose idea is approved (or, with review off, submitted) can submit a project. Off = every registered team may."
          checked={gate}
          onChange={setGate}
        />
        <button type="submit" disabled={saving} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save idea phase'}</button>
      </form>

      {error && <LoadError message={error} onRetry={load} />}

      {data && (
        <section className={`${PANEL} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">
              {data.rows.length} idea{data.rows.length === 1 ? '' : 's'} · {data.counts.SUBMITTED} to review · {data.missing.length} registered teams without one
            </h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={remind} disabled={reminding || data.missing.length === 0 || data.state === 'CLOSED'} className={BTN_GHOST}><BellRing className="h-3.5 w-3.5" /> {reminding ? 'Sending…' : 'Remind teams without one'}</button>
              <button type="button" onClick={exportCsv} disabled={data.rows.length === 0} className={BTN_GHOST}><Download className="h-3.5 w-3.5" /> Export CSV</button>
            </div>
          </div>

          <div role="tablist" aria-label="Filter ideas" className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === item.value ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-orange-800 dark:text-[#FF9A4A]' : 'border-slate-200 text-slate-500 dark:text-slate-400 dark:border-slate-700'}`}>
                {item.label}{item.value ? ` (${data.counts[item.value]})` : ` (${data.rows.length})`}
              </button>
            ))}
          </div>

          {rows.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:text-slate-400 dark:border-slate-700">Nothing here.</p> : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const open = openId === row.id;
                const pill = STATUS_PILL[row.status];
                return (
                  <li key={row.id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[#1A1A2E] dark:text-white">{row.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {row.team_name} · updated {formatDateTime(row.updated_at)}
                          {row.review_count > 0 && <> · judges&apos; score <strong>{row.score.toFixed(1)}</strong> ({row.review_count} judge{row.review_count === 1 ? '' : 's'})</>}
                        </p>
                      </div>
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    </div>
                    <button type="button" onClick={() => { setOpenId(open ? null : row.id); setFeedback(row.feedback); }} aria-expanded={open} className="text-xs font-bold text-journey-accent hover:underline">
                      {open ? 'Hide details' : 'Read and review'}
                    </button>
                    {open && (
                      <div className="space-y-3 text-sm">
                        {[['The problem', row.problem], ['The approach', row.solution], ['The plan', row.plan]].map(([label, text]) => text && (
                          <div key={label}><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="whitespace-pre-line text-slate-700 dark:text-slate-200">{text}</p></div>
                        ))}
                        {row.tech_stack.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">Tech: {row.tech_stack.join(', ')}</p>}
                        {row.linkedin_url && <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-journey-accent hover:underline">LinkedIn post <ExternalLink className="h-3 w-3" /></a>}
                        <div className="flex flex-wrap gap-2">
                          {row.deck_file && <IdeaFileActions slug={slug} ideaId={row.id} kind="deck" label="Presentation" file={row.deck_file} />}
                          {row.payment_proof && <IdeaFileActions slug={slug} ideaId={row.id} kind="payment" label="Payment screenshot" file={row.payment_proof} />}
                        </div>
                        {(row.transaction_id || (hackathon.idea_fee_amount ?? 0) > 0) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Payment: ₹{hackathon.idea_fee_amount ?? 0}{row.transaction_id ? <> · transaction <strong className="font-mono">{row.transaction_id}</strong></> : ' · no transaction ID given'}
                            {(hackathon.idea_fee_amount ?? 0) > 0 && !row.payment_proof && <span className="font-bold text-rose-600 dark:text-rose-400"> · screenshot missing</span>}
                          </p>
                        )}
                        {row.deck_url && <a href={row.deck_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-journey-accent hover:underline">Slides <ExternalLink className="h-3 w-3" /></a>}
                        <div>
                          <label htmlFor={`feedback-${row.id}`} className={LABEL}>Note to the team (required unless you approve)</label>
                          <textarea id={`feedback-${row.id}`} rows={3} maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} className={INPUT} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={reviewing} onClick={() => review(row.id, 'APPROVED')} className={BTN_PRIMARY}><Check className="h-3.5 w-3.5" /> Approve</button>
                          <button type="button" disabled={reviewing || !feedback.trim()} onClick={() => review(row.id, 'CHANGES_REQUESTED')} className={BTN_GHOST}><MessageSquareWarning className="h-3.5 w-3.5" /> Request changes</button>
                          <button type="button" disabled={reviewing || !feedback.trim()} onClick={() => review(row.id, 'REJECTED')} className={BTN_GHOST}><X className="h-3.5 w-3.5" /> Reject</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {data.missing.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">Teams without an idea ({data.missing.length})</summary>
              <ul className="mt-2 flex flex-wrap gap-2">{data.missing.map((team) => <li key={team.id} className="rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-slate-700">{team.name}</li>)}</ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
