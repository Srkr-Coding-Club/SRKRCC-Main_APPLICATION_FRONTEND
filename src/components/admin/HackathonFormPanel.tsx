'use client';

import React, { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Hackathon, Form } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

interface HackathonFormPanelProps {
  isOpen: boolean;
  /** Present in edit mode — the panel is pre-filled and PATCHes this hackathon instead of creating a new one. */
  hackathon?: Hackathon | null;
  onClose: () => void;
  onSaved: (hackathon: Hackathon) => void;
}

const inputClasses =
  'w-full px-3.5 py-2 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800';
const labelClasses = 'block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1';

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HackathonFormPanel({ isOpen, hackathon, onClose, onSaved }: HackathonFormPanelProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(hackathon);

  const [forms, setForms] = useState<Form[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [theme, setTheme] = useState('');
  const [prizePool, setPrizePool] = useState('₹50,000');
  const [isFlagship, setIsFlagship] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [registrationForm, setRegistrationForm] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchApi<Form[] | { results: Form[] }>('/forms/')
      .then((res) => setForms(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setForms([]));
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setTheme('');
    setPrizePool('₹50,000');
    setIsFlagship(false);
    setStartDate('');
    setEndDate('');
    setBannerImage('');
    setRegistrationForm('');
    setDescription('');
    setErrors({});
  };

  useEffect(() => {
    if (!isOpen) return;
    if (hackathon) {
      setTitle(hackathon.title);
      setSlug(hackathon.slug);
      setSlugTouched(true);
      setTheme(hackathon.theme);
      setPrizePool(hackathon.prize_pool);
      setIsFlagship(hackathon.is_flagship);
      setStartDate(toDatetimeLocal(hackathon.start_date));
      setEndDate(toDatetimeLocal(hackathon.end_date));
      setBannerImage(hackathon.banner_image || '');
      setRegistrationForm(hackathon.registration_form ? String(hackathon.registration_form) : '');
      setDescription(hackathon.description || '');
      setErrors({});
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hackathon]);

  if (!isOpen) return null;

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!slug.trim()) next.slug = 'Slug is required.';
    if (!theme.trim()) next.theme = 'Theme is required.';
    if (!startDate) next.startDate = 'Start date is required.';
    if (!endDate) next.endDate = 'End date is required.';
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      next.endDate = 'End date must be after the start date.';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim(),
        theme: theme.trim(),
        description,
        prize_pool: prizePool.trim(),
        is_flagship: isFlagship,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        banner_image: bannerImage.trim() || null,
        registration_form: registrationForm ? Number(registrationForm) : null,
      };
      const saved = isEditMode
        ? await fetchApi<Hackathon>(`/hackathons/${hackathon!.slug}/`, { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi<Hackathon>('/hackathons/', { method: 'POST', body: JSON.stringify(body) });

      toast.success(isEditMode ? 'Hackathon Updated' : 'Hackathon Created', `"${saved.title}" is saved.`);
      onSaved(saved);
      if (!isEditMode) resetForm();
      onClose();
    } catch (err: any) {
      toast.error(isEditMode ? 'Could Not Update Hackathon' : 'Could Not Create Hackathon', err?.message || 'Please check the form and try again.');
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
          style={{ background: 'linear-gradient(90deg, #FFA50066, #FF7A00, #8B2E3B66)' }}
        />
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {isEditMode ? `Edit Hackathon — ${hackathon!.title}` : 'Launch New Hackathon'}
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
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. IconCoders 2026 Flagship"
              className={inputClasses}
            />
            {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
          </div>

          <div>
            <label className={labelClasses}>Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="iconcoders-2026-flagship"
              className={inputClasses}
            />
            {errors.slug && <p className="mt-1 text-[11px] text-rose-500">{errors.slug}</p>}
          </div>

          <div>
            <label className={labelClasses}>Theme *</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Advanced Data Structures & Algorithmic Problem Solving"
              className={inputClasses}
            />
            {errors.theme && <p className="mt-1 text-[11px] text-rose-500">{errors.theme}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Prize Pool</label>
              <input
                type="text"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-xs font-bold uppercase text-[#1A1A2E] dark:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFlagship}
                  onChange={(e) => setIsFlagship(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#FF7A00] focus:ring-[#FF7A00]"
                />
                IconCoders Flagship
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Start Date *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClasses}
              />
              {errors.startDate && <p className="mt-1 text-[11px] text-rose-500">{errors.startDate}</p>}
            </div>
            <div>
              <label className={labelClasses}>End Date *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClasses}
              />
              {errors.endDate && <p className="mt-1 text-[11px] text-rose-500">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <label className={labelClasses}>Banner Image URL</label>
            <input
              type="url"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Registration Form</label>
            <select
              value={registrationForm}
              onChange={(e) => setRegistrationForm(e.target.value)}
              className={inputClasses}
            >
              <option value="">No form linked</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title?.trim() || f.slug || 'Untitled form'} ({f.status})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              "Register Team" on the public hackathon card will link to this form.
            </p>
          </div>

          <MarkdownEditor
            label="About This Hackathon"
            value={description}
            onChange={setDescription}
            placeholder="Describe the rules, eligibility, judging criteria, and tracks..."
          />

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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Hackathon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
