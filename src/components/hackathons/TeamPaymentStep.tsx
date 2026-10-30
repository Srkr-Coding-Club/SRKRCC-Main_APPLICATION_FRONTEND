'use client';

import React, { useCallback, useMemo } from 'react';
import { IndianRupee } from 'lucide-react';
import { hackathonApi } from '@/lib/api/hackathons';
import type { UploadedFile } from '@/lib/fileUpload';
import { IDEA_FILE_RULES, uploadRegistrationPayment } from '@/lib/ideaUpload';
import FileUploadField from '@/components/forms/FileUploadField';
import { FieldError, FieldLabel, SpotlightInput, fieldErrorId } from '@/components/ui/InputField';
import { PaymentQr } from './PaymentQr';

export interface PaymentEntry {
  reference: string;
  proof: UploadedFile | null;
}

export const EMPTY_PAYMENT: PaymentEntry = { reference: '', proof: null };

export interface PaymentTerms {
  /** Rupees to pay. */
  fee: number;
  note: string;
  /** The id of the QR code image the organizers uploaded, if any. */
  qrId: string | null;
}

interface TeamPaymentStepProps {
  slug: string;
  terms: PaymentTerms;
  value: PaymentEntry;
  onChange: (next: PaymentEntry) => void;
  errors: { transaction_id?: string; payment_file_id?: string };
  onBusyChange: (busy: boolean) => void;
  onProblem: (message: string | null) => void;
}

/** The last step of creating a team when the fee is paid at registration: what to pay, the screenshot and the transaction id. */
export function TeamPaymentStep({ slug, terms, value, onChange, errors, onBusyChange, onProblem }: TeamPaymentStepProps) {
  const upload = useMemo(() => (file: File, progress: (fraction: number) => void, signal: AbortSignal) => uploadRegistrationPayment(slug, file, progress, signal), [slug]);
  const discard = useCallback((id: string) => hackathonApi.paymentFileDiscard(slug, id).then(() => undefined), [slug]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-journey-accent/30 bg-journey-accent/5 p-3">
        <IndianRupee className="mt-0.5 h-5 w-5 shrink-0 text-journey-accent" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-journey-text">Pay ₹{terms.fee} to register your team</p>
          <p className="text-xs text-journey-text/80">
            Pay once for the whole team, then add the screenshot and the transaction ID below. The organizers check your payment and your team is registered once it is verified.
          </p>
        </div>
      </div>

      {terms.qrId && (
        <div className="flex flex-col items-center gap-2">
          <PaymentQr slug={slug} version={terms.qrId} size={200} />
          <p className="text-xs text-journey-muted">Scan this code to pay</p>
        </div>
      )}
      {terms.note && <p className="whitespace-pre-line text-sm text-journey-text/80">{terms.note}</p>}

      <div className="space-y-1.5">
        <FieldLabel htmlFor="team-payment-file" required>Screenshot of your payment</FieldLabel>
        <FileUploadField
          inputId="team-payment-file"
          uploadWith={upload}
          discardWith={discard}
          multiple={false}
          rules={IDEA_FILE_RULES.PAYMENT}
          defaultMb={IDEA_FILE_RULES.PAYMENT.maxFileSizeMB}
          value={value.proof}
          invalid={!!errors.payment_file_id}
          onChange={(next) => onChange({ ...value, proof: (next as UploadedFile | undefined) ?? null })}
          onBusyChange={onBusyChange}
          onProblem={onProblem}
        />
        <FieldError id={fieldErrorId('team-payment-file')}>{errors.payment_file_id}</FieldError>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="team-payment-reference" required>Transaction ID</FieldLabel>
        <SpotlightInput
          id="team-payment-reference"
          value={value.reference}
          maxLength={60}
          onChange={(e) => onChange({ ...value, reference: e.target.value })}
          placeholder="UPI reference or transaction number"
          hasError={!!errors.transaction_id}
          aria-describedby={errors.transaction_id ? fieldErrorId('team-payment-reference') : undefined}
        />
        <FieldError id={fieldErrorId('team-payment-reference')}>{errors.transaction_id}</FieldError>
      </div>
    </div>
  );
}
