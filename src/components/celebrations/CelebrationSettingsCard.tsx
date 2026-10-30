'use client';

import React, { useEffect, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { celebrationsApi } from '@/lib/api/celebrations';
import { requestCelebrationCheck } from '@/lib/hooks/useCelebrations';
import { Switch } from '@/components/ui/Switch';

/** The person's own choice about celebrations, kept on their account so it follows them to every device. */
export function CelebrationSettingsCard() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    celebrationsApi.settings().then((reply) => setEnabled(reply.enabled)).catch(() => setEnabled(null));
  }, []);

  if (enabled === null) return null;

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      const reply = await celebrationsApi.setEnabled(next);
      setEnabled(reply.enabled);
      toast.success(reply.enabled ? 'Celebrations are on' : 'Celebrations are off');
      if (reply.enabled) requestCelebrationCheck();
    } catch (err) {
      toast.error('Could not change that', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Celebrations" className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-journey-accent"><PartyPopper className="h-4 w-4" aria-hidden="true" /> Celebrations</h2>
      <Switch
        label="Celebrate my milestones"
        description="A card and a little confetti when something good happens: your team is registered, a teammate joins, you are shortlisted. Turning it off also stops new ones from being saved."
        checked={enabled}
        onChange={(next) => void change(next)}
        disabled={busy}
      />
    </section>
  );
}
