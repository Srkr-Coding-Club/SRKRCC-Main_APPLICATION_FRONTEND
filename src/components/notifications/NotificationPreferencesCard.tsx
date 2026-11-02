'use client';

import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { notificationsApi } from '@/lib/api/notifications';
import { Switch } from '@/components/ui/Switch';

/** What the person wants to be emailed about, kept on their account so it follows them to every device. */
export function NotificationPreferencesCard() {
  const { toast } = useToast();
  const [emailReminders, setEmailReminders] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    notificationsApi.preferences().then((reply) => setEmailReminders(reply.event_reminder_emails)).catch(() => setEmailReminders(null));
  }, []);

  if (emailReminders === null) return null;

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      const reply = await notificationsApi.setEventReminderEmails(next);
      setEmailReminders(reply.event_reminder_emails);
      toast.success(reply.event_reminder_emails ? 'Event reminder emails are on' : 'Event reminder emails are off');
    } catch (err) {
      toast.error('Could not change that', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Notifications" className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-journey-accent"><BellRing className="h-4 w-4" aria-hidden="true" /> Notifications</h2>
      <Switch
        label="Email me before events"
        description="A reminder a day and an hour before an event you registered for. You still get it in the notification bell when this is off."
        checked={emailReminders}
        onChange={(next) => void change(next)}
        disabled={busy}
      />
    </section>
  );
}
