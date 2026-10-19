'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { Hackathon, HackathonTeamInvite } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { BTN_ACCENT, BTN_QUIET } from './dashboardStyles';
import {
  EMPTY_REGISTRATION, RegistrationDetailsFields, registrationErrors, toRegistrationInput, type RegistrationValue,
} from './RegistrationDetailsFields';

interface AcceptInviteModalProps {
  invite: HackathonTeamInvite;
  hackathon: Hackathon;
  onClose: () => void;
  onAccepted: () => void;
}

/** Joining a team can require accepting the rules and answering the organizers' questions first. */
export function AcceptInviteModal({ invite, hackathon, onClose, onAccepted }: AcceptInviteModalProps) {
  const { toast } = useToast();
  const [value, setValue] = useState<RegistrationValue>(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = registrationErrors(hackathon, value);
    setErrors(missing);
    if (Object.keys(missing).length) return;
    setBusy(true);
    try {
      await hackathonApi.acceptInvite(invite.id, toRegistrationInput(value));
      toast.success(`You joined ${invite.team_name}!`);
      onAccepted();
    } catch (err: any) {
      const field = err?.body?.field as string | undefined;
      setErrors({ [field ?? 'form']: apiErrorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={busy}
      title={`Join ${invite.team_name}`}
      icon={Check}
      maxWidth="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_QUIET}>Cancel</button>
          <button type="submit" form="accept-invite-form" disabled={busy} className={BTN_ACCENT}>{busy ? 'Joining…' : 'Join team'}</button>
        </div>
      }
    >
      <form id="accept-invite-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-journey-muted">Before you join, the organizers of {hackathon.title} need the following.</p>
        <RegistrationDetailsFields config={hackathon} value={value} onChange={setValue} errors={errors} />
        {errors.form && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}
      </form>
    </Modal>
  );
}
