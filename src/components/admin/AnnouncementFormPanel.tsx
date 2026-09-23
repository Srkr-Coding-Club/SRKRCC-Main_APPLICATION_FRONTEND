'use client';

import React, { useEffect, useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Announcement, AnnouncementType } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

interface AnnouncementFormPanelProps {
  isOpen: boolean;
  /** Present in edit mode — the panel is pre-filled and PATCHes this announcement instead of creating a new one. */
  announcement?: Announcement | null;
  onClose: () => void;
  onSaved: (announcement: Announcement) => void;
}

const inputClasses =
  'w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800';
const labelClasses = 'block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1';

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: 'INFO', label: 'Info' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'URGENT', label: 'Urgent' },
];

export function AnnouncementFormPanel({ isOpen, announcement, onClose, onSaved }: AnnouncementFormPanelProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(announcement);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('INFO');
  const [isActive, setIsActive] = useState(true);

  // Re-seed the form whenever the panel opens — either from the announcement
  // being edited, or blank for a fresh create.
  useEffect(() => {
    if (!isOpen) return;
    if (announcement) {
      setTitle(announcement.title);
      setMessage(announcement.message);
      setType(announcement.type);
      setIsActive(announcement.is_active);
    } else {
      setTitle('');
      setMessage('');
      setType('INFO');
      setIsActive(true);
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, announcement]);

  if (!isOpen) return null;

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!message.trim()) next.message = 'Message is required.';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const body = { title: title.trim(), message: message.trim(), type, is_active: isActive };
      const saved = isEditMode
        ? await fetchApi<Announcement>(`/announcements/${announcement!.id}/`, { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi<Announcement>('/announcements/', { method: 'POST', body: JSON.stringify(body) });

      toast.success(isEditMode ? 'Announcement Updated' : 'Announcement Created', `"${saved.title}" is saved.`);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      toast.error(isEditMode ? 'Could Not Update Announcement' : 'Could Not Create Announcement', err?.message || 'Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[28px] opacity-70 blur-2xl"
        style={{ background: 'radial-gradient(circle at 50% 20%, #FF7A0044, transparent 70%)' }}
      />
      <div className="relative glass-panel rounded-xl p-6 sm:p-8 border border-white/40 dark:border-white/10 shadow-xl space-y-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, #FF7A0066, #FF7A00, #FF7A0066)' }}
        />
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {isEditMode ? `Edit Announcement — ${announcement!.title}` : 'New Announcement'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-transform duration-100 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClasses}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Registrations open for IconCoders 2026"
              className={inputClasses}
            />
            {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
          </div>

          <div>
            <label className={labelClasses}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as AnnouncementType)} className={inputClasses}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">Controls the banner's color on the landing page.</p>
          </div>

          <MarkdownEditor
            label="Message *"
            value={message}
            onChange={setMessage}
            placeholder="What do you want members to see on the landing page?"
          />
          {errors.message && <p className="-mt-2 text-[11px] text-rose-500">{errors.message}</p>}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
            />
            <span className="text-sm font-medium text-[#1A1A2E] dark:text-white">
              Active — visible on the landing page
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
