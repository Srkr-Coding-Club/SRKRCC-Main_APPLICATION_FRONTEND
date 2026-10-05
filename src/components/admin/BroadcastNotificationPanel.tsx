'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
  History,
  Eye,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import type {
  AnnouncementType,
  NotificationCategory,
  BroadcastPayload,
  Hackathon,
} from '@/lib/types';
import { BTN_PRIMARY, BTN_GHOST, INPUT, LABEL, PANEL } from './hackathon/shared';

const NOTIF_TYPES: { value: AnnouncementType; label: string }[] = [
  { value: 'INFO', label: 'Info (Blue)' },
  { value: 'SUCCESS', label: 'Success (Green)' },
  { value: 'WARNING', label: 'Warning (Amber)' },
  { value: 'URGENT', label: 'Urgent (Red)' },
];

const NOTIF_CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: 'GENERAL', label: 'General Announcement' },
  { value: 'HACKATHON', label: 'Hackathon' },
  { value: 'EVENT', label: 'Event' },
  { value: 'FORM', label: 'Form' },
  { value: 'TEAM', label: 'Team' },
  { value: 'SYSTEM', label: 'System Alert' },
];

const AUDIENCES = [
  { value: 'ALL', label: 'All Registered Members' },
  { value: 'ROLE', label: 'Filter by Role' },
  { value: 'HACKATHON', label: 'Hackathon Participants' },
];

const ROLES = [
  { value: 'AFFILIATE', label: 'Affiliates (Club Members)' },
  { value: 'NON_AFFILIATE', label: 'Non-Affiliates' },
  { value: 'VOLUNTEER', label: 'Volunteers' },
  { value: 'JUDGE', label: 'Judges' },
  { value: 'CLUB_LEAD', label: 'Club Leads' },
  { value: 'ADMIN', label: 'Admins' },
];

export function BroadcastNotificationPanel() {
  const { toast } = useToast();
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Array<{ id: number; campaign_name: string; total_recipients: number; status: string; created_at: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('INFO');
  const [category, setCategory] = useState<NotificationCategory>('GENERAL');
  const [linkUrl, setLinkUrl] = useState('');
  const [sendInApp, setSendInApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [audience, setAudience] = useState<'ALL' | 'ROLE' | 'HACKATHON'>('ALL');
  const [targetRole, setTargetRole] = useState('AFFILIATE');
  const [targetHackathonSlug, setTargetHackathonSlug] = useState('');
  const [hackathons, setHackathons] = useState<{ value: string; label: string }[]>([]);

  // Preview tab
  const [previewTab, setPreviewTab] = useState<'in_app' | 'email'>('in_app');

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await notificationsApi.broadcastHistory();
      setHistory(res);
    } catch {
      // Ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // Load hackathons for dropdown
    fetchApi<Hackathon[]>('/hackathons/')
      .then((items) => {
        setHackathons(items.map((h) => ({ value: h.slug, label: h.title })));
        if (items.length > 0) setTargetHackathonSlug(items[0].slug);
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setType('INFO');
    setCategory('GENERAL');
    setLinkUrl('');
    setSendInApp(true);
    setSendEmail(false);
    setAudience('ALL');
    setTargetRole('AFFILIATE');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Validation Error', 'Title and message are required.');
      return;
    }
    const channels: ('IN_APP' | 'EMAIL')[] = [];
    if (sendInApp) channels.push('IN_APP');
    if (sendEmail) channels.push('EMAIL');

    if (channels.length === 0) {
      toast.error('Channel Required', 'Please select at least one delivery channel (In-App or Email).');
      return;
    }

    const payload: BroadcastPayload = {
      title: title.trim(),
      message: message.trim(),
      type,
      category,
      link_url: linkUrl.trim(),
      channels,
      audience,
      target_role: audience === 'ROLE' ? targetRole : undefined,
      target_hackathon_slug: audience === 'HACKATHON' ? targetHackathonSlug : undefined,
    };

    setBusy(true);
    try {
      const res = await notificationsApi.broadcast(payload);
      toast.success(
        'Broadcast Dispatched',
        `Delivered to ${res.total_recipients} recipient(s) (${res.in_app_count} in-app, ${res.email_count} emails queued).`
      );
      setComposerOpen(false);
      resetForm();
      loadHistory();
    } catch (err: any) {
      toast.error('Broadcast Failed', err?.message || 'Could not send broadcast.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card with action */}
      <div className={`${PANEL} p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#FF7A00]" />
            <h3 className="text-base font-extrabold text-[#1A1A2E] dark:text-white">
              Broadcast Notifications & Emails
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dispatch announcements directly into members&apos; notification inboxes and/or send emails via the background mail engine.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setComposerOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06B00] text-white text-xs font-bold shadow-md shadow-[#FF7A00]/20 transition active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Broadcast History */}
      <div className={`${PANEL} p-6 space-y-4`}>
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <History className="h-4 w-4 text-[#FF7A00]" />
          <h4 className="text-sm font-bold text-[#1A1A2E] dark:text-white">
            Recent Broadcast Dispatches
          </h4>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center p-8 text-xs text-slate-400 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#FF7A00]" />
            <span>Loading history…</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-8 text-xs text-slate-400">
            No broadcast campaigns sent yet. Click &quot;New Broadcast&quot; above to compose your first notification.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5">Campaign</th>
                  <th className="pb-2.5">Recipients</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {history.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                    <td className="py-2.5 font-semibold text-[#1A1A2E] dark:text-white">
                      {j.campaign_name}
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono">
                      {j.total_recipients} user(s)
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {new Date(j.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Composer Modal */}
      <Modal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        busy={busy}
        title="Compose Broadcast Notification"
        icon={Send}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className={LABEL}>Subject / Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Round 2 Shortlisted Teams Announced"
                className={INPUT}
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className={LABEL}>Notification Type</label>
              <FormSelect
                value={type}
                onChange={(v) => setType(v as AnnouncementType)}
                options={NOTIF_TYPES}
                placeholder="Select type"
                allowClear={false}
              />
            </div>

            {/* Category */}
            <div>
              <label className={LABEL}>Category</label>
              <FormSelect
                value={category}
                onChange={(v) => setCategory(v as NotificationCategory)}
                options={NOTIF_CATEGORIES}
                placeholder="Select category"
                allowClear={false}
              />
            </div>

            {/* Action Link URL */}
            <div className="sm:col-span-2">
              <label className={LABEL}>Action Link URL (optional)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="e.g. /hackathons/iconcoders-2026/dashboard or /events"
                className={INPUT}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Adds a one-click button in the in-app notification bell and email button.
              </p>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
            <label className={LABEL}>Delivery Channels *</label>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] cursor-pointer hover:border-[#FF7A00]/50 transition">
                <input
                  type="checkbox"
                  checked={sendInApp}
                  onChange={(e) => setSendInApp(e.target.checked)}
                  className="mt-0.5 accent-[#FF7A00]"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A2E] dark:text-white">
                    <Bell className="h-3.5 w-3.5 text-[#FF7A00]" />
                    <span>In-App Notification</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Delivered to member notification inbox & bell badge counter.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] cursor-pointer hover:border-[#FF7A00]/50 transition">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="mt-0.5 accent-[#FF7A00]"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A2E] dark:text-white">
                    <Mail className="h-3.5 w-3.5 text-[#FF7A00]" />
                    <span>Email Notification</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dispatched to member verified email via background mail service.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Target Audience */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#FF7A00]" />
              <label className={LABEL}>Target Audience</label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FormSelect
                  value={audience}
                  onChange={(v) => setAudience(v as 'ALL' | 'ROLE' | 'HACKATHON')}
                  options={AUDIENCES}
                  placeholder="Select audience"
                  allowClear={false}
                />
              </div>

              {audience === 'ROLE' && (
                <div>
                  <FormSelect
                    value={targetRole}
                    onChange={setTargetRole}
                    options={ROLES}
                    placeholder="Select role"
                    allowClear={false}
                  />
                </div>
              )}

              {audience === 'HACKATHON' && (
                <div>
                  <FormSelect
                    value={targetHackathonSlug}
                    onChange={setTargetHackathonSlug}
                    options={hackathons}
                    placeholder="Select hackathon"
                    allowClear={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Message Markdown Editor */}
          <div>
            <MarkdownEditor
              label="Message Body *"
              value={message}
              onChange={setMessage}
              placeholder="Write your announcement details, instructions, or updates here..."
            />
          </div>

          {/* Live Preview Box */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 px-4 py-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Eye className="h-3.5 w-3.5 text-[#FF7A00]" />
                <span>Live Preview</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewTab('in_app')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    previewTab === 'in_app'
                      ? 'bg-white dark:bg-slate-800 text-[#FF7A00] shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  In-App Notification
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('email')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    previewTab === 'email'
                      ? 'bg-white dark:bg-slate-800 text-[#FF7A00] shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Email Layout
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-black/20">
              {previewTab === 'in_app' ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141D] p-3.5 flex items-start gap-3 shadow-sm max-w-md">
                  <div className="mt-0.5">
                    {type === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {type === 'WARNING' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    {type === 'URGENT' && <AlertOctagon className="h-4 w-4 text-rose-500" />}
                    {type === 'INFO' && <Info className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold uppercase text-slate-400">
                        {category}
                      </span>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>
                    <h5 className="text-xs font-bold text-[#1A1A2E] dark:text-white truncate">
                      {title || 'Notification Title'}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {message || 'Your announcement message preview will appear here.'}
                    </p>
                    {linkUrl && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7A00] pt-1">
                        Open action <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-4 shadow-sm text-slate-800 max-w-lg space-y-3 font-sans">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Subject: </span>
                    <span className="text-xs font-bold text-slate-900">
                      [SRKR Coding Club] {title || 'Notification Subject'}
                    </span>
                  </div>
                  <div className="text-xs space-y-2">
                    <p className="text-slate-600">Hi Member,</p>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {message || 'Announcement body content will appear here in the email.'}
                    </p>
                    {linkUrl && (
                      <div className="pt-2">
                        <span className="inline-block px-4 py-2 rounded bg-[#FF7A00] text-white font-bold text-xs">
                          Open In Club Portal
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              disabled={busy}
              className={BTN_GHOST}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !title.trim() || !message.trim()}
              className={`${BTN_PRIMARY} gap-1.5`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{busy ? 'Dispatching…' : 'Send Broadcast'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
