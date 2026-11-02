'use client';

import React, { useEffect, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { CertificateSheet } from '@/components/hackathons/CertificateSheet';
import { eventCertificateApi } from '@/lib/api/events';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import type { EventCertificate, EventCertificateSettings } from '@/lib/types';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#8B2E3B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2E3B]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const LABEL = 'mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300';

interface Draft {
  certificates_released: boolean;
  certificate_body: string;
  certificate_signatory_name: string;
  certificate_signatory_title: string;
}

const toDraft = (settings: EventCertificateSettings): Draft => ({
  certificates_released: settings.certificates_released,
  certificate_body: settings.certificate_body,
  certificate_signatory_name: settings.certificate_signatory_name,
  certificate_signatory_title: settings.certificate_signatory_title,
});

interface EventCertificatesPanelProps {
  event: { slug: string; title: string } | null;
  onClose: () => void;
}

/** Release attendance certificates for an event, set their wording and signatory, and see who will get one. */
export function EventCertificatesPanel({ event, onClose }: EventCertificatesPanelProps) {
  const { toast } = useToast();
  const slug = event?.slug;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [eligible, setEligible] = useState(0);
  const [preview, setPreview] = useState<EventCertificate | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(null);
    setError('');
    if (!slug) return;
    let cancelled = false;
    eventCertificateApi.settings(slug)
      .then((settings) => { if (!cancelled) { setDraft(toDraft(settings)); setEligible(settings.eligible_count); setPreview(settings.preview); } })
      .catch((err) => { if (!cancelled) setError(apiErrorMessage(err, 'Could not load the certificate settings.')); });
    return () => { cancelled = true; };
  }, [slug]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!slug || !draft) return;
    setSaving(true);
    setError('');
    try {
      const saved = await eventCertificateApi.saveSettings(slug, draft);
      setDraft(toDraft(saved));
      setEligible(saved.eligible_count);
      setPreview(saved.preview);
      toast.success('Certificate settings saved', saved.certificates_released ? 'Attendees can now open their certificates.' : 'Certificates are not released yet.');
    } catch (err: any) {
      const field = err?.body?.certificate_body?.[0];
      setError(field || apiErrorMessage(err, 'Could not save the certificate settings.'));
    } finally {
      setSaving(false);
    }
  };

  const footer = draft && (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:min-h-9">Close</button>
      <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#8B2E3B] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 sm:min-h-9">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </div>
  );

  return (
    <Modal isOpen={event !== null} onClose={onClose} title={event ? `Certificates: ${event.title}` : 'Certificates'} icon={Award} maxWidth="max-w-3xl" busy={saving} footer={footer}>
      {!draft && !error && <p aria-busy="true" className="py-6 text-center text-sm text-slate-500">Loading…</p>}
      {error && <p role="alert" className="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      {draft && (
        <div className="space-y-5">
          <Switch
            label="Release certificates"
            description={`${eligible} ${eligible === 1 ? 'person was' : 'people were'} checked in and will be able to open one. Nobody can until you turn this on.`}
            checked={draft.certificates_released}
            onChange={(next) => set('certificates_released', next)}
          />

          <div>
            <label htmlFor="cert-body" className={LABEL}>Wording</label>
            <textarea id="cert-body" rows={3} maxLength={600} value={draft.certificate_body} onChange={(e) => set('certificate_body', e.target.value)} placeholder="{name} attended {event}." className={INPUT} />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Use {'{name}'} for the person and {'{event}'} for the event. Leave blank for the default.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cert-signer" className={LABEL}>Signed by</label>
              <input id="cert-signer" maxLength={100} value={draft.certificate_signatory_name} onChange={(e) => set('certificate_signatory_name', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="cert-role" className={LABEL}>Their role</label>
              <input id="cert-role" maxLength={100} value={draft.certificate_signatory_title} onChange={(e) => set('certificate_signatory_title', e.target.value)} className={INPUT} />
            </div>
          </div>

          {preview && (
            <section aria-label="Preview of the saved certificate" className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Preview of the saved version, using your name</h3>
              <CertificateSheet certificate={preview} />
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
