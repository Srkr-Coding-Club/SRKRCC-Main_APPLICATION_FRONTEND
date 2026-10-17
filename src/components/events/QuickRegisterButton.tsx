'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Ticket, UserCog } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AuthUser, getStoredUser } from '@/lib/auth';
import type { Event } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface QuickRegisterButtonProps {
  event: Event;
  /** Look of the button; each place it appears has its own style. */
  className: string;
  style?: CSSProperties;
  /** Look of the "already registered" label that replaces the button. */
  registeredClassName: string;
  label?: string;
}

interface FieldIssue {
  code?: string;
  label?: string;
  message?: string;
}

const PROFILE_PATH = '/profile';

/** One-click registration: submits the member's profile details to the event's registration form. */
export default function QuickRegisterButton({
  event,
  className,
  style,
  registeredClassName,
  label = 'Register now',
}: QuickRegisterButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [missingDetails, setMissingDetails] = useState<string[]>([]);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    if (!stored || !event.form_slug) return;

    let cancelled = false;
    fetchApi<{ has_submitted: boolean }>(
      `/forms/${event.form_slug}/my-response/?user_id=${stored.id}`,
      { silentAuth: true } as RequestInit,
    )
      .then((res) => {
        if (!cancelled && res?.has_submitted) setRegistered(true);
      })
      .catch(() => {
        // Not signed in any more, or offline: the button simply stays available.
      });
    return () => {
      cancelled = true;
    };
  }, [event.form_slug]);

  const handleClick = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/events/${event.slug}`)}`);
      return;
    }

    setSubmitting(true);
    setMissingDetails([]);
    try {
      const key = `sub_${event.registration_form}_${user.id}_${Date.now()}`;
      await fetchApi('/forms/submissions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ form: event.registration_form, user: user.id, answers: [], idempotency_key: key }),
      });
      setRegistered(true);
      toast.success('Registration Received!', `You are registered for ${event.title}.`);
    } catch (err) {
      const failure = err as Error & { body?: { errors?: FieldIssue[]; error?: string } };
      const issues = failure.body?.errors ?? [];
      const missing = issues.filter((issue) => issue.code === 'PROFILE_FIELD_MISSING' && issue.label);

      if (missing.length > 0) {
        const labels = missing.map((issue) => issue.label as string);
        setMissingDetails(labels);
        toast.warning('Complete your profile first', `Your profile is missing: ${labels.join(', ')}.`);
      } else if (/already submitted/i.test(failure.message)) {
        setRegistered(true);
        toast.info('Already registered', 'You are already registered for this event.');
      } else {
        toast.error('Registration failed', issues[0]?.message || failure.message || 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <span className={registeredClassName}>
        <CheckCircle2 className="h-4 w-4" />
        You&apos;re registered
      </span>
    );
  }

  if (missingDetails.length > 0) {
    return (
      <Link href={PROFILE_PATH} className={className} style={style}>
        <UserCog className="h-4 w-4" />
        Add {missingDetails.join(', ')} to your profile
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-busy={submitting}
      className={`${className} disabled:opacity-70`}
      style={style}
    >
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
      {submitting ? 'Registering…' : label}
    </button>
  );
}
