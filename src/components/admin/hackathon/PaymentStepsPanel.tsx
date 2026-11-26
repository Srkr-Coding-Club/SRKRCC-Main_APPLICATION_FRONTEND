'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Clock, IndianRupee, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { HackathonRound, PaymentStepDraft, PaymentStepInfo, StepPaymentQueue, StepPaymentQueueRow } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { asUploadError, sendToStorage, type UploadedFile } from '@/lib/fileUpload';
import { IDEA_FILE_RULES } from '@/lib/ideaUpload';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import FileUploadField from '@/components/forms/FileUploadField';
import { IdeaFileActions } from '@/components/hackathons/IdeaFileActions';
import { PaymentQr } from '@/components/hackathons/PaymentQr';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, fromLocalInput, toLocalInput } from './shared';
import { LoadError } from './LoadError';

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const STATUS: Record<string, { tone: PillTone; label: string }> = {
  UNPAID: { tone: 'slate', label: 'Not paid' },
  PENDING: { tone: 'amber', label: 'To check' },
  VERIFIED: { tone: 'green', label: 'Verified' },
  REJECTED: { tone: 'red', label: 'Rejected' },
};
const statusOf = (row: StepPaymentQueueRow) => row.payment?.status ?? 'UNPAID';

const EMPTY: PaymentStepDraft = {
  name: 'Phase 2 fee', round: null, fee_per_person: 0, affiliate_fee_per_person: 0, deadline: null, payment_note: '', required_for_projects: true,
};

interface PaymentStepsPanelProps {
  slug: string;
  canEdit: boolean;
}

/** Fees the teams shortlisted in a round pay (per person, cheaper for club affiliates), and the payments to check. */
export function PaymentStepsPanel({ slug, canEdit }: PaymentStepsPanelProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [steps, setSteps] = useState<PaymentStepInfo[] | null>(null);
  const [rounds, setRounds] = useState<HackathonRound[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<PaymentStepInfo | 'new' | null>(null);

  const load = useCallback(() => {
    hackathonApi.admin.paymentSteps(slug).then((list) => {
      setSteps(list);
      setSelectedId((current) => (current && list.some((s) => s.id === current) ? current : list[0]?.id ?? null));
    }).catch((err) => { setSteps([]); toast.error('Could not load payment steps', apiErrorMessage(err)); });
  }, [slug, toast]);
  useEffect(() => {
    load();
    hackathonApi.admin.rounds(slug).then(setRounds).catch(() => setRounds([]));
  }, [load, slug]);

  if (steps === null) return null;
  const selected = steps.find((s) => s.id === selectedId) ?? null;

  const remove = async (step: PaymentStepInfo) => {
    const ok = await confirm({
      title: `Remove ${step.name}?`,
      message: step.counts.pending + step.counts.verified + step.counts.rejected > 0
        ? 'Teams have already paid, so the step is switched off instead of deleted: the payments stay on record.'
        : 'Nobody has paid it yet, so it is deleted.',
      confirmLabel: 'Remove', danger: true,
    });
    if (!ok) return;
    try {
      const { outcome } = await hackathonApi.admin.deletePaymentStep(slug, step.id);
      toast.success(outcome === 'deleted' ? 'Payment step deleted' : 'Payment step switched off');
      load();
    } catch (err) {
      toast.error('Could not remove it', apiErrorMessage(err));
    }
  };

  return (
    <section className={`${PANEL} space-y-4`} aria-label="Payment steps">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><IndianRupee className="h-4 w-4 text-journey-accent" /> Payment steps</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">A fee the teams shortlisted in a round pay once its results are published, per member and cheaper for club affiliates.</p>
        </div>
        {canEdit && <button type="button" onClick={() => setEditing('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> Add payment step</button>}
      </div>

      {steps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No payment steps yet.</p>
      ) : (
        <div role="tablist" aria-label="Payment steps" className="flex flex-wrap gap-2">
          {steps.map((step) => (
            <button key={step.id} type="button" role="tab" aria-selected={step.id === selectedId} onClick={() => setSelectedId(step.id)}
              className={`rounded-xl border px-3 py-2 text-left text-xs ${step.id === selectedId ? 'border-[#FF7A00] bg-[#FF7A00]/10' : 'border-slate-200 dark:border-slate-700'}`}>
              <span className="block font-bold text-[#1A1A2E] dark:text-white">{step.name}{!step.is_active && ' (off)'}</span>
              <span className="text-slate-500 dark:text-slate-400">{step.counts.pending} to check · {step.counts.verified}/{step.counts.due} paid</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <StepDetail key={selected.id} slug={slug} step={selected} canEdit={canEdit} onEdit={() => setEditing(selected)} onRemove={() => void remove(selected)} onChanged={load} />
      )}

      {editing && (
        <StepForm slug={slug} rounds={rounds} step={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={(saved) => { setEditing(null); setSelectedId(saved.id); load(); }} />
      )}
    </section>
  );
}

function StepDetail({ slug, step, canEdit, onEdit, onRemove, onChanged }: {
  slug: string; step: PaymentStepInfo; canEdit: boolean; onEdit: () => void; onRemove: () => void; onChanged: () => void;
}) {
  const { toast } = useToast();
  const [queue, setQueue] = useState<StepPaymentQueue | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [reminding, setReminding] = useState(false);

  const [loadError, setLoadError] = useState('');
  const load = useCallback(() => {
    setLoadError('');
    hackathonApi.admin.paymentStepQueue(slug, step.id).then(setQueue).catch((err) => setLoadError(apiErrorMessage(err, 'Could not load the payments.')));
  }, [slug, step.id]);
  useEffect(load, [load]);

  const act = async (row: StepPaymentQueueRow, action: 'verify' | 'reject') => {
    if (!row.payment) return;
    setBusyId(row.payment.id);
    try {
      setQueue(action === 'verify'
        ? await hackathonApi.admin.verifyStepPayment(slug, row.payment.id)
        : await hackathonApi.admin.rejectStepPayment(slug, row.payment.id, reason));
      toast.success(action === 'verify' ? `${row.team_name}: payment verified` : `${row.team_name}: payment rejected`);
      setRejecting(null);
      setReason('');
      onChanged();
    } catch (err) {
      toast.error('Could not save', apiErrorMessage(err));
      load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const remind = async () => {
    setReminding(true);
    try {
      const { reminded } = await hackathonApi.admin.remindPaymentStep(slug, step.id);
      toast.success(reminded ? `Reminded ${reminded} team${reminded === 1 ? '' : 's'}` : 'Every team has paid');
    } catch (err) {
      toast.error('Could not send reminders', apiErrorMessage(err));
    } finally {
      setReminding(false);
    }
  };

  const rows = useMemo(() => (queue?.rows ?? []).filter((row) => !filter || statusOf(row) === filter), [queue, filter]);
  const counts = (queue?.step ?? step).counts;
  const filters = [['', `All (${counts.due})`], ['PENDING', `To check (${counts.pending})`], ['UNPAID', `Not paid (${counts.unpaid - counts.rejected})`],
    ['REJECTED', `Rejected (${counts.rejected})`], ['VERIFIED', `Verified (${counts.verified})`]];

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Teams shortlisted in <strong>{step.round_name ?? 'no round'}</strong>
            {step.round && !step.round_published && ' (asked to pay once its results are published)'} ·
            {' '}{rupees(step.fee_per_person)} per member, {rupees(step.affiliate_fee_per_person)} for club affiliates
            {step.deadline && <> · due {formatDateTime(step.deadline)}</>}
          </p>
          <p>{step.required_for_projects ? 'Project submission stays locked until the payment is verified.' : 'Does not lock project submission.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void remind()} disabled={reminding || counts.unpaid === 0} className={BTN_GHOST}><BellRing className="h-3.5 w-3.5" /> {reminding ? 'Sending…' : 'Remind unpaid teams'}</button>
          <ExportMenu subject="payments" disabled={counts.due === 0} onExport={(format) => hackathonApi.exportFile(slug, 'step-payments', format, { step: step.id })} />
          {canEdit && <button type="button" onClick={onEdit} className={BTN_GHOST}><Pencil className="h-3.5 w-3.5" /> Edit</button>}
          {canEdit && <button type="button" onClick={onRemove} className={BTN_GHOST} aria-label={`Remove ${step.name}`}><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      {canEdit && <StepQr slug={slug} step={step} onChanged={onChanged} />}
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div role="tablist" aria-label="Filter payments" className="flex flex-wrap gap-1.5">
        {filters.map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === value ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-orange-800 dark:text-[#FF9A4A]' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {queue && rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {counts.due === 0 ? 'No team has to pay this yet: it applies once the round has shortlisted teams and its results are published.' : 'No team matches.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const status = statusOf(row);
            const payment = row.payment;
            const affiliates = row.quote.members.filter((m) => m.affiliate).length;
            return (
              <li key={row.team_id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#1A1A2E] dark:text-white">{row.team_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {row.leader_name} · {row.quote.members.length} members, {affiliates} affiliate{affiliates === 1 ? '' : 's'} · owes {rupees(row.quote.total)}
                    </p>
                    {row.due === false && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">No longer owes this step (not shortlisted, left, or the round changed). Settle the waiting payment.</p>
                    )}
                  </div>
                  <StatusPill tone={STATUS[status].tone} icon={status === 'PENDING' ? Clock : undefined}>{STATUS[status].label}</StatusPill>
                </div>
                {payment && (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                    <div><dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Paid</dt><dd className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{rupees(payment.amount)}{payment.amount !== row.quote.total && <span className="ml-1 text-[11px] text-amber-600">(team changed since)</span>}</dd></div>
                    <div className="min-w-0"><dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Transaction ID</dt><dd className="break-all text-sm font-semibold text-[#1A1A2E] dark:text-white">{payment.transaction_id}{payment.duplicate_reference && <span className="ml-1 text-[11px] font-bold text-rose-600">also used on another payment</span>}</dd></div>
                    <div><dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Sent</dt><dd className="text-sm text-[#1A1A2E] dark:text-white">{formatDateTime(payment.submitted_at)}</dd></div>
                  </dl>
                )}
                {payment?.screenshot && (
                  <IdeaFileActions slug={slug} link={(inline) => hackathonApi.stepPaymentScreenshotLink(slug, payment.id, inline)} file={payment.screenshot} label="Screenshot" />
                )}
                {payment && payment.status !== 'PENDING' && payment.reviewed_by && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {payment.status === 'VERIFIED' ? 'Verified' : 'Rejected'} by {payment.reviewed_by} on {formatDateTime(payment.reviewed_at)}.
                    {payment.status === 'REJECTED' && <span className="mt-0.5 block">Reason shown to the leader: {payment.reason}</span>}
                  </p>
                )}
                {payment?.status === 'PENDING' && (rejecting === payment.id ? (
                  <div className="space-y-2 rounded-lg bg-rose-500/5 p-3">
                    <label htmlFor={`step-reject-${payment.id}`} className="block text-xs font-bold text-slate-700 dark:text-slate-200">Why is it being rejected? The team leader sees this and can pay again.</label>
                    <textarea id={`step-reject-${payment.id}`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT} placeholder="e.g. the amount does not match" autoFocus />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busyId === payment.id || !reason.trim()} onClick={() => void act(row, 'reject')} className={`${BTN_PRIMARY} bg-rose-600 hover:bg-rose-700`}>Reject payment</button>
                      <button type="button" onClick={() => setRejecting(null)} className={BTN_GHOST}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyId === payment.id} onClick={() => void act(row, 'verify')} className={BTN_PRIMARY}><Check className="h-3.5 w-3.5" /> Verify</button>
                    <button type="button" disabled={busyId === payment.id} onClick={() => { setRejecting(payment.id); setReason(''); }} className={BTN_GHOST}><X className="h-3.5 w-3.5" /> Reject</button>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StepQr({ slug, step, onChanged }: { slug: string; step: PaymentStepInfo; onChanged: () => void }) {
  const { toast } = useToast();
  const upload = useMemo(() => async (file: File, progress: (fraction: number) => void, signal: AbortSignal): Promise<UploadedFile> => {
    let grant;
    try {
      grant = await hackathonApi.admin.paymentStepQrUpload(slug, step.id, { name: file.name, size: file.size });
    } catch (error) {
      throw asUploadError(error, 'Could not start the upload.');
    }
    await sendToStorage({ upload: { id: grant.file.id }, post: grant.post, max_bytes: grant.max_bytes }, file, progress, signal)
      .catch((error) => { throw asUploadError(error, 'The upload failed.'); });
    const saved = await hackathonApi.admin.paymentStepQrComplete(slug, step.id, grant.file.id).catch((error) => { throw asUploadError(error, 'We could not confirm the upload.'); });
    onChanged();
    return { upload_id: saved.qr?.id ?? grant.file.id, name: file.name, size: file.size, type: file.type };
  }, [slug, step.id, onChanged]);

  return (
    <div className="space-y-2">
      <p className={LABEL}>QR code for this step</p>
      <div className="flex flex-wrap items-start gap-4">
        {step.qr && <PaymentQr slug={slug} version={step.qr.id} size={140} loadLink={() => hackathonApi.paymentStepQrLink(slug, step.id)} />}
        <div className="min-w-[14rem] flex-1 space-y-2">
          <FileUploadField inputId={`step-qr-${step.id}`} uploadWith={upload} multiple={false} rules={IDEA_FILE_RULES.PAYMENT} defaultMb={IDEA_FILE_RULES.PAYMENT.maxFileSizeMB}
            value={null} onChange={() => undefined} onBusyChange={() => undefined} onProblem={(message) => message && toast.error('QR code', message)} />
          {step.qr && (
            <button type="button" className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
              onClick={() => hackathonApi.admin.paymentStepQrRemove(slug, step.id).then(() => { toast.success('QR code removed'); onChanged(); }).catch((err) => toast.error('Could not remove it', apiErrorMessage(err)))}>
              Remove the QR code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepForm({ slug, rounds, step, onClose, onSaved }: {
  slug: string; rounds: HackathonRound[]; step: PaymentStepInfo | null; onClose: () => void; onSaved: (step: PaymentStepInfo) => void;
}) {
  const { toast } = useToast();
  const start = step ?? EMPTY;
  const [name, setName] = useState(start.name);
  const [round, setRound] = useState(start.round ? String(start.round) : '');
  const [fee, setFee] = useState(String(start.fee_per_person));
  const [affiliateFee, setAffiliateFee] = useState(String(start.affiliate_fee_per_person));
  const [deadline, setDeadline] = useState(toLocalInput(start.deadline));
  const [note, setNote] = useState(start.payment_note);
  const [required, setRequired] = useState(start.required_for_projects);
  const [active, setActive] = useState(step?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const body: PaymentStepDraft = {
      name: name.trim(), round: round ? Number(round) : null, fee_per_person: Math.max(0, Math.floor(Number(fee) || 0)),
      affiliate_fee_per_person: Math.max(0, Math.floor(Number(affiliateFee) || 0)), deadline: fromLocalInput(deadline),
      payment_note: note, required_for_projects: required, is_active: active,
    };
    try {
      const saved = step ? await hackathonApi.admin.updatePaymentStep(slug, step.id, body) : await hackathonApi.admin.createPaymentStep(slug, body);
      toast.success(step ? 'Payment step saved' : 'Payment step added');
      onSaved(saved);
    } catch (err: any) {
      const field = err?.body?.field;
      if (field) setErrors({ [field]: apiErrorMessage(err) });
      else toast.error('Could not save', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: string) => errors[key] && <p role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors[key]}</p>;
  return (
    <Modal isOpen onClose={onClose} busy={busy} title={step ? `Edit ${step.name}` : 'Add a payment step'} icon={IndianRupee}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="step-name" className={LABEL}>Name</label>
          <input id="step-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className={INPUT} required />
          {fieldError('name')}
        </div>
        <div>
          <p id="step-round-label" className={LABEL}>Teams shortlisted in</p>
          <FormSelect aria-labelledby="step-round-label" placeholder="Choose a round" value={round} onChange={setRound}
            options={rounds.map((r) => ({ value: String(r.id), label: `${r.name}${r.results_published ? '' : ' (not published yet)'}` }))} />
          {errors.round ? fieldError('round') : (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {rounds.length === 0
                ? 'No rounds to choose from: create one in Rounds & Shortlisting (or ask for that permission).'
                : 'They are asked to pay once the round’s results are published.'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="step-fee" className={LABEL}>Fee per member (₹)</label>
            <input id="step-fee" type="number" inputMode="numeric" min={0} step={1} value={fee} onChange={(e) => setFee(e.target.value)} className={INPUT} />
            {fieldError('fee_per_person')}
          </div>
          <div>
            <label htmlFor="step-affiliate-fee" className={LABEL}>Fee per club affiliate (₹)</label>
            <input id="step-affiliate-fee" type="number" inputMode="numeric" min={0} step={1} value={affiliateFee} onChange={(e) => setAffiliateFee(e.target.value)} className={INPUT} />
            {errors.affiliate_fee_per_person ? fieldError('affiliate_fee_per_person') : <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Members with a Club ID and an active membership.</p>}
          </div>
        </div>
        <div>
          <label htmlFor="step-deadline" className={LABEL}>Deadline (optional)</label>
          <input id="step-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={INPUT} />
          {errors.deadline ? fieldError('deadline') : <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Shown to teams. Nothing happens automatically when it passes.</p>}
        </div>
        <div>
          <label htmlFor="step-note" className={LABEL}>How to pay</label>
          <textarea id="step-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} placeholder="UPI ID, account name, instructions…" />
          {fieldError('payment_note')}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-[#FF7A00]" /> Lock project submission until the payment is verified</label>
        {step && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#FF7A00]" /> Active (teams are asked to pay)</label>}
        <p className="text-[11px] text-slate-500 dark:text-slate-400">The QR code is added after saving, from the step&apos;s panel.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>Cancel</button>
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
