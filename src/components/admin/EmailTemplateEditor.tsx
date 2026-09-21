'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mail, X, Sparkles, Loader2, Send, PlusCircle, ListChecks, Eye, Pencil } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { EmailTemplateSummary } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

// Mirrors GLOBAL_ALLOWED_PARAMETERS in apps/core/services/email_service.py — every
// chip inserted here is guaranteed to render server-side, since the backend rejects
// any {{param}} outside this whitelist rather than executing arbitrary template code.
const PLACEHOLDER_CHIPS = [
  'full_name', 'first_name', 'email', 'club_id', 'branch', 'portal_url', 'login_url',
] as const;

// Realistic stand-in values so admins can see a rendered preview before sending.
const SAMPLE_PLACEHOLDER_VALUES: Record<(typeof PLACEHOLDER_CHIPS)[number], string> = {
  full_name: 'Aditi Sharma',
  first_name: 'Aditi',
  email: 'aditi.sharma@srkr.ac.in',
  club_id: '25SCC142',
  branch: 'CSE',
  portal_url: 'https://srkrcc.com/profile',
  login_url: 'https://srkrcc.com/login',
};

export interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailTemplateEditorProps {
  open: boolean;
  onClose: () => void;
  /** "select": pick/draft a template and hand back its id (Form Builder's confirmation-email setting).
   *  "send": pick/draft a template and immediately dispatch it to `recipients` (DMC bulk email). */
  mode: 'select' | 'send';
  recipients?: EmailRecipient[];
  onSelect?: (templateId: number, label: string) => void;
  onSent?: (jobId: string) => void;
}

export default function EmailTemplateEditor({ open, onClose, mode, recipients = [], onSelect, onSent }: EmailTemplateEditorProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const [displayTitle, setDisplayTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, open);

  useEffect(() => {
    if (!open) return;
    setLoadingTemplates(true);
    fetchApi<EmailTemplateSummary[]>('/auth/email-templates/')
      .then((data) => {
        setTemplates(Array.isArray(data) ? data.filter((t) => t.is_active) : []);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [open]);

  const handleClose = () => {
    const hasUnsavedDraft = tab === 'new' && (subject.trim() || body.trim());
    if (hasUnsavedDraft && !window.confirm('Discard this draft? Your unsaved subject and message will be lost.')) {
      return;
    }
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, tab, subject, body, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const insertChip = (chip: string) => {
    setBody((prev) => `${prev}{{${chip}}}`);
  };

  // Prefer the first real recipient's own data where available; sample data covers the
  // rest (club_id/branch/portal_url/login_url aren't known client-side from EmailRecipient).
  const getPreviewValues = (): Record<string, string> => {
    const values: Record<string, string> = { ...SAMPLE_PLACEHOLDER_VALUES };
    const first = mode === 'send' ? recipients[0] : undefined;
    if (first?.email) values.email = first.email;
    if (first?.name) {
      values.full_name = first.name;
      values.first_name = first.name.trim().split(/\s+/)[0];
    }
    return values;
  };

  const renderPreviewText = (text: string) => {
    const values = getPreviewValues();
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));
  };

  const handleUseExisting = () => {
    if (!selectedTemplateId) {
      toast.warning('Pick a Template', 'Select one of the existing templates first.');
      return;
    }
    if (mode === 'select') {
      const picked = templates.find((t) => t.id === selectedTemplateId);
      onSelect?.(selectedTemplateId, picked?.display_title || picked?.name || 'Template');
      onClose();
    } else {
      dispatchSend({ template_id: selectedTemplateId });
    }
  };

  const handleUseNew = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.warning('Missing Content', 'Both a subject line and message body are required.');
      return;
    }
    if (mode === 'select') {
      // Persist as a real, reusable EmailTemplate so it can be referenced by Form.confirmation_email_template.
      setSubmitting(true);
      try {
        const name = `form_confirmation_${Date.now().toString(36)}`;
        const created = await fetchApi<{ id: number; name: string }>('/auth/email-templates/', {
          method: 'POST',
          body: JSON.stringify({
            name,
            display_title: displayTitle || 'Confirmation Email',
            subject_template: subject,
            html_template: `<p>${body.replace(/\n/g, '</p><p>')}</p>`,
            text_template: body,
            allowed_parameters: PLACEHOLDER_CHIPS,
          }),
        });
        onSelect?.(created.id, displayTitle || 'Confirmation Email');
        onClose();
      } catch (err: any) {
        toast.error('Save Failed', err?.message || 'Could not save the template.');
      } finally {
        setSubmitting(false);
      }
    } else if (saveAsTemplate) {
      // Persist the broadcast as a real, reusable EmailTemplate before dispatching so it
      // isn't lost after this one send — same pattern as the mode === 'select' branch above.
      setSubmitting(true);
      try {
        const name = `dmc_broadcast_${Date.now().toString(36)}`;
        const created = await fetchApi<{ id: number; name: string }>('/auth/email-templates/', {
          method: 'POST',
          body: JSON.stringify({
            name,
            display_title: campaignName || 'DMC Broadcast',
            subject_template: subject,
            html_template: `<p>${body.replace(/\n/g, '</p><p>')}</p>`,
            text_template: body,
            allowed_parameters: PLACEHOLDER_CHIPS,
          }),
        });
        await dispatchSend({ template_id: created.id });
      } catch (err: any) {
        toast.error('Save Failed', err?.message || 'Could not save the template.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Opted out of saving: EmailDispatchView auto-creates a throwaway lightweight
      // template from template_name + subject_template + message when no template_id is given.
      dispatchSend({
        template_name: `dmc_broadcast_${Date.now().toString(36)}`,
        subject_template: subject,
        message: body,
      });
    }
  };

  const dispatchSend = async (templateRef: { template_id?: number; template_name?: string; subject_template?: string; message?: string }) => {
    if (recipients.length === 0) {
      toast.warning('No Recipients', 'Select at least one row before sending.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await fetchApi<{ job_id: string; sent_count: number; failed_count: number; total_recipients: number }>('/auth/emails/send/', {
        method: 'POST',
        body: JSON.stringify({
          ...templateRef,
          recipients: recipients.map((r) => r.email),
          campaign_name: campaignName || `Data Explorer Broadcast — ${new Date().toLocaleDateString()}`,
        }),
      });
      toast.success('Email Dispatched', `Sent to ${result.sent_count}/${result.total_recipients} recipient(s).`);
      onSent?.(result.job_id);
      onClose();
    } catch (err: any) {
      toast.error('Send Failed', err?.message || 'Could not dispatch the email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="glass-panel rounded-xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {mode === 'select' ? 'Confirmation Email Template' : 'Email Selected Members'}
            </h3>
          </div>
          <button onClick={handleClose} className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-transform duration-100 active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'send' && (
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5">
            Sending to <span className="text-[#1A1A2E] dark:text-white font-bold">{recipients.length}</span> selected member{recipients.length !== 1 ? 's' : ''}
            {recipients.length > 0 && (
              <span className="block mt-1 text-slate-400 font-normal truncate">
                {recipients.slice(0, 3).map((r) => r.email).join(', ')}
                {recipients.length > 3 ? ` +${recipients.length - 3} more` : ''}
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setTab('existing')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition active:scale-95 ${
              tab === 'existing' ? 'border-[#FF7A00] text-[#FF7A00]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" /> Use Existing
          </button>
          <button
            onClick={() => setTab('new')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition active:scale-95 ${
              tab === 'new' ? 'border-[#FF7A00] text-[#FF7A00]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Draft New
          </button>
        </div>

        {tab === 'existing' ? (
          <div className="space-y-3">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                No saved templates yet — switch to &quot;Draft New&quot; to create one.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedTemplateId === t.id
                        ? 'border-[#FF7A00] bg-orange-50 dark:bg-orange-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      checked={selectedTemplateId === t.id}
                      onChange={() => setSelectedTemplateId(t.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1A1A2E] dark:text-white truncate">{t.display_title || t.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.subject_template}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <button
              onClick={handleUseExisting}
              disabled={submitting || !selectedTemplateId}
              className="w-full py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'send' ? <Send className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {mode === 'send' ? 'Send to Selected' : 'Use This Template'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mode === 'select' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Internal Title</label>
                <input
                  value={displayTitle}
                  onChange={(e) => setDisplayTitle(e.target.value)}
                  placeholder="e.g. Hackathon Registration Confirmation"
                  className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              </div>
            )}
            {mode === 'send' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Campaign Name</label>
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. September Newsletter"
                  className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              </div>
            )}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500 hover:text-[#FF7A00] transition active:scale-95"
              >
                {showPreview ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Rendered Preview</p>
                <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
                  {subject.trim() ? renderPreviewText(subject) : <span className="font-normal italic text-slate-400">No subject yet</span>}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {body.trim() ? renderPreviewText(body) : <span className="italic text-slate-400">No message yet</span>}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subject Line *</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Welcome to SRKR Coding Club, {{full_name}}!"
                    className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Message Body *</label>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    placeholder="Hi {{full_name}}, thanks for registering! Your Club ID is {{club_id}}."
                    className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 font-mono"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PLACEHOLDER_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => insertChip(chip)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:text-[#FF7A00] transition active:scale-95"
                      >
                        {`{{${chip}}}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Only these placeholders are recognized — anything else is rejected before sending.
                  </p>
                </div>
              </>
            )}
            {mode === 'send' && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded"
                />
                Save as reusable template
              </label>
            )}
            <button
              onClick={handleUseNew}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'send' ? <Send className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {mode === 'send' ? 'Send to Selected' : 'Save & Use This Template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
