'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, IndianRupee, Lock, XCircle } from 'lucide-react';
import type { Hackathon, MyPaymentStep } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import type { UploadedFile } from '@/lib/fileUpload';
import { IDEA_FILE_RULES, uploadStepPayment } from '@/lib/ideaUpload';
import FileUploadField from '@/components/forms/FileUploadField';
import { FieldError, FieldLabel, SpotlightInput, fieldErrorId } from '@/components/ui/InputField';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from './HackathonAnnouncementsFeed';
import { PaymentQr } from './PaymentQr';
import { BTN_ACCENT, H2, PANEL } from './dashboardStyles';

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

/** The fees the team's round results asked it to pay (e.g. phase 2): nothing is shown when nothing is owed. */
export function StepPayments({ hackathon }: { hackathon: Hackathon }) {
  const [steps, setSteps] = useState<MyPaymentStep[] | null>(null);
  const load = useCallback(() => {
    hackathonApi.myPaymentSteps(hackathon.slug).then(setSteps).catch(() => setSteps([]));
  }, [hackathon.slug]);
  useEffect(load, [load]);

  if (!steps || steps.length === 0) return null;
  return <>{steps.map((step) => <StepPaymentCard key={step.id} slug={hackathon.slug} step={step} onPaid={setSteps} onReload={load} />)}</>;
}

function StatusLine({ step }: { step: MyPaymentStep }) {
  const payment = step.payment;
  if (!payment) return <StatusPill tone="amber" icon={Clock}>Not paid yet</StatusPill>;
  if (payment.status === 'VERIFIED') return <StatusPill tone="green" icon={CheckCircle2}>Paid · verified</StatusPill>;
  if (payment.status === 'PENDING') return <StatusPill tone="amber" icon={Clock}>Waiting for the organizers</StatusPill>;
  return <StatusPill tone="red" icon={XCircle}>Not accepted</StatusPill>;
}

function StepPaymentCard({ slug, step, onPaid, onReload }: {
  slug: string; step: MyPaymentStep; onPaid: (steps: MyPaymentStep[]) => void; onReload: () => void;
}) {
  const [proof, setProof] = useState<UploadedFile | null>(null);
  const [reference, setReference] = useState('');
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ transaction_id?: string; payment_file_id?: string }>({});
  const [busy, setBusy] = useState(false);
  const upload = useMemo(
    () => (file: File, progress: (fraction: number) => void, signal: AbortSignal) => uploadStepPayment(slug, step.id, file, progress, signal),
    [slug, step.id],
  );
  const payment = step.payment;
  const shown = payment && payment.status !== 'REJECTED' ? payment.breakdown : step.quote.members;
  const total = payment && payment.status !== 'REJECTED' ? payment.amount : step.quote.total;
  const inputId = `step-${step.id}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!proof) next.payment_file_id = 'Add the screenshot of your payment.';
    if (!reference.trim()) next.transaction_id = 'Enter the transaction ID of your payment.';
    setErrors(next);
    setProblem(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      onPaid(await hackathonApi.payStep(slug, step.id, { transaction_id: reference.trim(), payment_file_id: proof!.upload_id }));
      setProof(null);
      setReference('');
    } catch (err: any) {
      const field = err?.body?.field as keyof typeof errors | undefined;
      if (field === 'transaction_id' || field === 'payment_file_id') setErrors({ [field]: apiErrorMessage(err) });
      else setProblem(apiErrorMessage(err, 'Could not submit the payment.'));
      if (err?.body?.code === 'ALREADY_PAID') onReload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${PANEL} space-y-4`} aria-label={step.name}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H2}><IndianRupee className="h-4 w-4" aria-hidden="true" /> {step.name}</h2>
        <StatusLine step={step} />
      </div>
      <p className="text-sm text-journey-text/80">
        Your team was shortlisted in {step.round_name}. {step.required_for_projects ? 'Pay this to unlock the project submission. ' : ''}
        {step.deadline && <>Due by <strong>{formatDateTime(step.deadline)}</strong>.</>}
      </p>

      <table className="w-full text-sm">
        <caption className="sr-only">What each member pays</caption>
        <tbody>
          {shown.map((member) => (
            <tr key={member.user_id} className="border-b border-journey-text/5">
              <td className="py-1.5 text-journey-text">{member.name}{member.affiliate && <span className="ml-1.5 text-xs text-journey-accent">club affiliate</span>}</td>
              <td className="py-1.5 text-right tabular-nums text-journey-text">{rupees(member.fee)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="pt-2 text-left font-bold text-journey-text">Total</th>
            <td className="pt-2 text-right text-base font-bold tabular-nums text-journey-text">{rupees(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-journey-muted">
        {rupees(step.fee_per_person)} per member, {rupees(step.affiliate_fee_per_person)} for club affiliates (a Club ID and an active membership).
      </p>

      {payment?.status === 'REJECTED' && (
        <p role="status" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          <strong>Your last payment was not accepted:</strong> {payment.reason} {step.is_leader ? 'Please pay again below.' : 'Your team leader can pay again.'}
        </p>
      )}
      {payment && payment.status !== 'REJECTED' && (
        <p className="flex items-start gap-2 text-xs text-journey-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Paid with transaction {payment.transaction_id} on {formatDateTime(payment.submitted_at)}. Team members cannot change now; contact the organizers if they must.
        </p>
      )}

      {step.can_pay && (
        <form onSubmit={submit} className="space-y-4 border-t border-journey-text/10 pt-4">
          {step.has_qr && (
            <div className="flex flex-col items-center gap-2">
              <PaymentQr slug={slug} version={String(step.id)} size={200} loadLink={() => hackathonApi.paymentStepQrLink(slug, step.id)} />
              <p className="text-xs text-journey-muted">Scan this code to pay {rupees(step.quote.total)}</p>
            </div>
          )}
          {step.payment_note && <p className="whitespace-pre-line text-sm text-journey-text/80">{step.payment_note}</p>}
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${inputId}-file`} required>Screenshot of your payment</FieldLabel>
            <FileUploadField
              inputId={`${inputId}-file`}
              uploadWith={upload}
              multiple={false}
              rules={IDEA_FILE_RULES.PAYMENT}
              defaultMb={IDEA_FILE_RULES.PAYMENT.maxFileSizeMB}
              value={proof}
              invalid={!!errors.payment_file_id}
              onChange={(next) => setProof((next as UploadedFile | undefined) ?? null)}
              onBusyChange={setUploading}
              onProblem={setProblem}
            />
            <FieldError id={fieldErrorId(`${inputId}-file`)}>{errors.payment_file_id}</FieldError>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`${inputId}-reference`} required>Transaction ID</FieldLabel>
            <SpotlightInput
              id={`${inputId}-reference`}
              value={reference}
              maxLength={60}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI reference or transaction number"
              hasError={!!errors.transaction_id}
              aria-describedby={errors.transaction_id ? fieldErrorId(`${inputId}-reference`) : undefined}
            />
            <FieldError id={fieldErrorId(`${inputId}-reference`)}>{errors.transaction_id}</FieldError>
          </div>
          {problem && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{problem}</p>}
          <p className="text-xs text-journey-muted">Once you submit, your team&apos;s members cannot change until the organizers decide.</p>
          <button type="submit" disabled={busy || uploading} className={BTN_ACCENT}>
            {busy ? 'Submitting…' : `Submit payment of ${rupees(step.quote.total)}`}
          </button>
        </form>
      )}
      {!step.is_leader && !payment && <p className="text-xs text-journey-muted">Only your team leader can pay this.</p>}
    </section>
  );
}
