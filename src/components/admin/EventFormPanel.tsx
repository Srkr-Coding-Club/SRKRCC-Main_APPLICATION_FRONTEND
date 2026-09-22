'use client';

import React, { useEffect, useState } from 'react';
import { X, CalendarPlus, CalendarClock } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { Event, Form } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

interface EventFormPanelProps {
  isOpen: boolean;
  /** Present in edit mode — the panel is pre-filled and PATCHes this event instead of creating a new one. */
  event?: Event | null;
  onClose: () => void;
  onSaved: (event: Event) => void;
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

function formatDisplay(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function EventFormPanel({ isOpen, event, onClose, onSaved }: EventFormPanelProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(event);

  const [forms, setForms] = useState<Form[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Workshop');
  const [venue, setVenue] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [posterImage, setPosterImage] = useState('');
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
    setCategory('Workshop');
    setVenue('');
    setCapacity('100');
    setStartTime('');
    setEndTime('');
    setPosterImage('');
    setRegistrationForm('');
    setDescription('');
    setErrors({});
  };

  // Re-seed the form whenever the panel opens — either from the event being
  // edited, or blank for a fresh create.
  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setTitle(event.title);
      setSlug(event.slug);
      setSlugTouched(true);
      setCategory(event.category);
      setVenue(event.venue);
      setCapacity(String(event.capacity));
      setStartTime(toDatetimeLocal(event.start_time));
      setEndTime(toDatetimeLocal(event.end_time));
      setPosterImage(event.poster_image || '');
      setRegistrationForm(event.registration_form ? String(event.registration_form) : '');
      setDescription(event.description || '');
      setErrors({});
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event]);

  if (!isOpen) return null;

  // Distinct from the event's own start/end below: this is when the LINKED
  // FORM opens/closes to submissions, read-only here since it lives on the
  // Form record, not the Event — editing it happens in the Forms Registry.
  const selectedForm = forms.find((f) => String(f.id) === registrationForm);
  const regOpensLabel = formatDisplay(selectedForm?.open_at);
  const regClosesLabel = formatDisplay(selectedForm?.close_at);

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!slug.trim()) next.slug = 'Slug is required.';
    if (!capacity || Number(capacity) <= 0) next.capacity = 'Capacity must be a positive number.';
    // Venue and schedule are optional — an event can be announced before its
    // venue/date is finalized. Only enforce ordering when BOTH are actually set.
    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      next.endTime = 'End time must be after the start time.';
    }
    if ((startTime && !endTime) || (!startTime && endTime)) {
      next.endTime = 'Set both a start and end time, or leave both blank for "date to be announced".';
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
        description,
        category,
        venue: venue.trim() || undefined,
        capacity: Number(capacity),
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        poster_image: posterImage.trim() || null,
        registration_form: registrationForm ? Number(registrationForm) : null,
      };
      const saved = isEditMode
        ? await fetchApi<Event>(`/events/${event!.slug}/`, { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi<Event>('/events/', { method: 'POST', body: JSON.stringify(body) });

      toast.success(isEditMode ? 'Event Updated' : 'Event Created', `"${saved.title}" is saved.`);
      onSaved(saved);
      if (!isEditMode) resetForm();
      onClose();
    } catch (err: any) {
      toast.error(isEditMode ? 'Could Not Update Event' : 'Could Not Create Event', err?.message || 'Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[28px] opacity-70 blur-2xl"
        style={{ background: 'radial-gradient(circle at 50% 20%, #8B2E3B44, transparent 70%)' }}
      />
      <div className="relative glass-panel rounded-xl p-6 sm:p-8 border border-white/40 dark:border-white/10 shadow-xl space-y-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, #8B2E3B66, #FF7A00, #8B2E3B66)' }}
        />
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <CalendarPlus className="w-5 h-5 text-[#8B2E3B]" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {isEditMode ? `Edit Event — ${event!.title}` : 'Schedule New Event'}
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
              placeholder="e.g. Hands-on Web Dev & Next.js Workshop"
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
              placeholder="hands-on-web-dev-nextjs-workshop"
              className={inputClasses}
            />
            {errors.slug && <p className="mt-1 text-[11px] text-rose-500">{errors.slug}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Workshop"
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Capacity *</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputClasses}
              />
              {errors.capacity && <p className="mt-1 text-[11px] text-rose-500">{errors.capacity}</p>}
            </div>
          </div>

          <div>
            <label className={labelClasses}>Venue <span className="normal-case font-medium text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="CSE Seminar Hall — leave blank if not decided yet"
              className={inputClasses}
            />
            {errors.venue && <p className="mt-1 text-[11px] text-rose-500">{errors.venue}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Event Start Date & Time <span className="normal-case font-medium text-slate-400">(optional)</span></label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClasses}
              />
              {errors.startTime && <p className="mt-1 text-[11px] text-rose-500">{errors.startTime}</p>}
            </div>
            <div>
              <label className={labelClasses}>Event End Date & Time <span className="normal-case font-medium text-slate-400">(optional)</span></label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClasses}
              />
              {errors.endTime && <p className="mt-1 text-[11px] text-rose-500">{errors.endTime}</p>}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 -mt-2">
            This is when the event itself happens — leave it blank to show "Date to be announced" on the public card.
          </p>

          <div>
            <label className={labelClasses}>Poster Image URL</label>
            <input
              type="url"
              value={posterImage}
              onChange={(e) => setPosterImage(e.target.value)}
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
                  {f.title} ({f.status})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              "Register Now" on the public event card will link to this form.
            </p>

            {registrationForm && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-3.5 py-2.5">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#8B2E3B]" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <p className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Registration Window (from this form)</p>
                  <p className="mt-0.5">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Opens:</span>{' '}
                    {regOpensLabel || <span className="italic">Not set</span>}
                    {' · '}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Closes:</span>{' '}
                    {regClosesLabel || <span className="italic">Not set</span>}
                  </p>
                  <p className="mt-1">
                    Distinct from the event's own date above. To change it, edit this form's open/close time in Forms Registry.
                  </p>
                </div>
              </div>
            )}
          </div>

          <MarkdownEditor
            label="About This Event"
            value={description}
            onChange={setDescription}
            placeholder="Describe what attendees can expect, prerequisites, and the agenda..."
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
              className="px-4 py-2 rounded-lg bg-[#8B2E3B] hover:bg-rose-900 text-white font-bold text-sm shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
