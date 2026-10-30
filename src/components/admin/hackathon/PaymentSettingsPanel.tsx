'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { IndianRupee, Save } from 'lucide-react';
import type { Hackathon, PaymentStage } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { FormSelect } from '@/components/ui/FormSelect';
import FileUploadField from '@/components/forms/FileUploadField';
import { PaymentQr } from '@/components/hackathons/PaymentQr';
import { IDEA_FILE_RULES, uploadIdeaQr } from '@/lib/ideaUpload';
import { BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

export const STAGE_OPTIONS: { value: PaymentStage; label: string }[] = [
  { value: 'NONE', label: 'No fee' },
  { value: 'REGISTRATION', label: 'Paid when the team is created' },
  { value: 'IDEA', label: 'Paid with the idea' },
];

const STAGE_HELP: Record<PaymentStage, string> = {
  NONE: 'Teams register and submit for free.',
  REGISTRATION: 'The team leader pays when creating the team. The team holds no place until an organizer verifies the payment in the list below.',
  IDEA: 'Teams register for free and attach their payment screenshot when they submit their idea.',
};

interface PaymentSettingsPanelProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
}

/** When teams pay, how much, how (the note and the QR code the organizers uploaded). One place for both the registration and the idea fee. */
export function PaymentSettingsPanel({ hackathon, onSaved }: PaymentSettingsPanelProps) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const { busy, errors, save } = useHackathonPatch(hackathon, onSaved);
  const [stage, setStage] = useState<PaymentStage>(hackathon.payment_stage ?? 'NONE');
  const [fee, setFee] = useState(String(hackathon.idea_fee_amount ?? 0));
  const [note, setNote] = useState(hackathon.idea_payment_note ?? '');
  // The QR code is saved the moment it is uploaded (not with the Save button), so it has its own state.
  const [qrId, setQrId] = useState<string | null>(hackathon.payment_qr_id ?? null);

  const uploadQr = useMemo(() => async (file: File, progress: (fraction: number) => void, signal: AbortSignal) => {
    const saved = await uploadIdeaQr(slug, file, progress, signal);
    setQrId(saved.upload_id);
    return saved;
  }, [slug]);
  const removeQr = useCallback(async () => {
    await hackathonApi.ideaQrRemove(slug);
    setQrId(null);
  }, [slug]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await save({
      payment_stage: stage,
      idea_fee_amount: stage === 'NONE' ? 0 : Math.max(0, Math.floor(Number(fee) || 0)),
      idea_payment_note: note,
    }, 'Payment settings saved');
  };

  const paying = stage !== 'NONE';
  return (
    <form onSubmit={submit} className={`${PANEL} space-y-4`} aria-label="Payment settings">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><IndianRupee className="h-4 w-4 text-journey-accent" /> Fee</h3>
      <div className="space-y-1.5">
        <span className={LABEL} id="payment-stage-label">When teams pay</span>
        <FormSelect value={stage} allowClear={false} options={STAGE_OPTIONS} placeholder="Choose" aria-labelledby="payment-stage-label" onChange={(value) => value && setStage(value as PaymentStage)} />
        {errors.payment_stage ? <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">{errors.payment_stage}</p> : <p className="text-[11px] text-slate-500 dark:text-slate-400">{STAGE_HELP[stage]}</p>}
      </div>

      {paying && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="payment-fee" className={LABEL}>Amount (₹)</label>
              <input id="payment-fee" type="number" inputMode="numeric" min={0} step={1} value={fee} onChange={(e) => setFee(e.target.value)} aria-invalid={Boolean(errors.idea_fee_amount)} className={INPUT} />
              {errors.idea_fee_amount ? <p role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_fee_amount}</p> : <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">0 = nothing to pay. Teams upload a payment screenshot, which only organizers can see.</p>}
            </div>
            <div>
              <label htmlFor="payment-note" className={LABEL}>How to pay</label>
              <textarea id="payment-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} placeholder="UPI ID, QR instructions, account name…" />
              {errors.idea_payment_note && <p role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.idea_payment_note}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <p className={LABEL}>Payment QR code</p>
            <div className="flex flex-wrap items-start gap-4">
              {qrId && <PaymentQr slug={slug} version={qrId} size={160} />}
              <div className="min-w-[14rem] flex-1 space-y-2">
                <FileUploadField
                  inputId="payment-qr-file"
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Teams scan this image to pay. It is saved as soon as it uploads. Only people who have to pay and organizers can see it.</p>
                {qrId && (
                  <button type="button" onClick={() => removeQr().then(() => toast.success('QR code removed')).catch((err) => toast.error('Could not remove it', apiErrorMessage(err)))} className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400">
                    Remove the QR code
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <button type="submit" disabled={busy} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save fee settings'}</button>
    </form>
  );
}
