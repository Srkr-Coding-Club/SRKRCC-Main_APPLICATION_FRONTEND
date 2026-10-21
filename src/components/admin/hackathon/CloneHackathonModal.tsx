'use client';

import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/context/ToastContext';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, firstFieldErrors, fromLocalInput } from './shared';

/** Start the next edition from this hackathon: same setup, new dates, no people. */
export function CloneHackathonModal({ hackathon, onClose }: { hackathon: Hackathon; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(`${hackathon.title} (next edition)`);
  const [start, setStart] = useState('');
  const [copyProblems, setCopyProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const created = await hackathonApi.admin.clone(hackathon.slug, {
        title: title.trim(), start_date: fromLocalInput(start) ?? '', copy_problem_statements: copyProblems,
      });
      toast.success('Hackathon cloned', 'It starts as a draft. Check the dates, then publish it.');
      router.push(`/admin/hackathons/${created.slug}?tab=settings`);
    } catch (err) {
      setErrors(firstFieldErrors((err as { body?: unknown })?.body));
      toast.error('Could not clone', apiErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={busy}
      title="Clone as the next edition"
      icon={Copy}
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>Cancel</button>
          <button type="submit" form="clone-hackathon-form" disabled={busy || !title.trim() || !start} className={BTN_PRIMARY}>{busy ? 'Cloning…' : 'Create draft'}</button>
        </div>
      }
    >
      <form id="clone-hackathon-form" onSubmit={submit} className="space-y-4">
        <p className="text-xs text-slate-500">Copies the settings, FAQ, stages, rounds (without teams), judging rubric and people. Every date moves by the same amount. Teams, submissions and scores are never copied.</p>
        <div>
          <label htmlFor="clone-title" className={LABEL}>Title</label>
          <input id="clone-title" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} maxLength={200} />
          {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
          {errors.slug && <p className="mt-1 text-[11px] text-rose-500">{errors.slug}</p>}
        </div>
        <div>
          <label htmlFor="clone-start" className={LABEL}>New start date and time</label>
          <input id="clone-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
          {errors.start_date && <p className="mt-1 text-[11px] text-rose-500">{errors.start_date}</p>}
        </div>
        <Switch label="Also copy problem statements" description="Handy if you reuse them; otherwise start with an empty list." checked={copyProblems} onChange={setCopyProblems} />
      </form>
    </Modal>
  );
}
