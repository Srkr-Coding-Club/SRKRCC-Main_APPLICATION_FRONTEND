'use client';

import { useState } from 'react';
import type { Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { firstFieldErrors } from './shared';

/** Save part of a hackathon's settings: toasts the outcome and exposes per-field server errors. */
export function useHackathonPatch(hackathon: Hackathon, onSaved: (saved: Hackathon) => void) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async (patch: Partial<Hackathon>, successTitle = 'Saved'): Promise<boolean> => {
    setBusy(true);
    setErrors({});
    try {
      onSaved(await hackathonApi.admin.update(hackathon.slug, patch));
      toast.success(successTitle);
      return true;
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save', apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, errors, save };
}
