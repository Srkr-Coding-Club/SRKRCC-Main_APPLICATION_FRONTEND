'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, HelpCircle, LayoutTemplate, Lock, Save, Trash2, Unlock, Sparkles, Calendar, Trophy, Users, Shield, FileText, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { Form, Hackathon, ProfileFieldKey } from '@/lib/types';
import { PROFILE_FIELD_OPTIONS } from '@/lib/profileFields';
import { fetchApi } from '@/lib/api-client';
import { DEFAULT_BANNER_CROP, isDefaultBannerCrop, normalizeBannerCrop, type BannerCrop } from '@/lib/bannerCrop';
import { BannerCropEditor } from './BannerCropEditor';
import { FormSelect } from '@/components/ui/FormSelect';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { getStoredUser } from '@/lib/auth';
import { useHackathonLifecycle } from './useHackathonLifecycle';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';


export function HackathonSettingsTab({ hackathon, onSaved }: { hackathon: Hackathon; onSaved: (h: Hackathon) => void }) {
  const { toast } = useToast();

  // Core Details
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [prizePool, setPrizePool] = useState('₹50,000');
  const [bannerImage, setBannerImage] = useState('');
  const [description, setDescription] = useState('');
  const [bannerCrop, setBannerCrop] = useState<BannerCrop>(DEFAULT_BANNER_CROP);
  const [registrationForm, setRegistrationForm] = useState('');
  const [forms, setForms] = useState<Form[]>([]);
  const [formsError, setFormsError] = useState(false);

  // Schedule
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibleFrom, setVisibleFrom] = useState('');
  const [visibleUntil, setVisibleUntil] = useState('');

  // Registration Settings
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [minSize, setMinSize] = useState('1');
  const [maxSize, setMaxSize] = useState('4');
  const [locked, setLocked] = useState(false);
  const [openInnovation, setOpenInnovation] = useState(true);
  const [required, setRequired] = useState<ProfileFieldKey[]>([]);
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>([]);
  const [mode, setMode] = useState<NonNullable<Hackathon['mode']>>('ONLINE');
  const [venue, setVenue] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [logoImage, setLogoImage] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [prizes, setPrizes] = useState<{ title: string; amount: string; description: string }[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const currentSnapshot = JSON.stringify([
    title, theme, prizePool, bannerImage, bannerCrop, registrationForm, description, startDate, endDate, visibleFrom, visibleUntil,
    opensAt, closesAt, minSize, maxSize, locked, openInnovation, required, faq,
    mode, venue, organizer, logoImage, tagsText, prizes,
  ]);
  const dirty = savedSnapshot !== '' && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    fetchApi<Form[] | { results: Form[] }>('/forms/')
      .then((res) => setForms(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setFormsError(true));
  }, []);

  useEffect(() => {
    setTitle(hackathon.title || '');
    setTheme(hackathon.theme || '');
    setPrizePool(hackathon.prize_pool || '₹50,000');
    setBannerImage(hackathon.banner_image || '');
    setDescription(hackathon.description || '');
    setBannerCrop(normalizeBannerCrop(hackathon.banner_crop));
    setRegistrationForm(hackathon.registration_form ? String(hackathon.registration_form) : '');

    setStartDate(toLocalInput(hackathon.start_date));
    setEndDate(toLocalInput(hackathon.end_date));
    setVisibleFrom(toLocalInput(hackathon.visible_from));
    setVisibleUntil(toLocalInput(hackathon.visible_until));

    setOpensAt(toLocalInput(hackathon.registration_opens_at));
    setClosesAt(toLocalInput(hackathon.registration_closes_at));
    setMinSize(String(hackathon.min_team_size ?? 1));
    setMaxSize(String(hackathon.max_team_size ?? 4));
    setLocked(!!hackathon.team_edits_locked);
    setOpenInnovation(hackathon.allow_open_innovation ?? true);
    setRequired(hackathon.required_profile_fields ?? []);
    setFaq(hackathon.faq ?? []);
    setMode(hackathon.mode ?? 'ONLINE');
    setVenue(hackathon.venue ?? '');
    setOrganizer(hackathon.organizer_name ?? '');
    setLogoImage(hackathon.logo_image ?? '');
    setTagsText((hackathon.tags ?? []).join(', '));
    setPrizes(hackathon.prizes ?? []);
    setSavedSnapshot(JSON.stringify([
      hackathon.title || '', hackathon.theme || '', hackathon.prize_pool || '₹50,000', hackathon.banner_image || '',
      normalizeBannerCrop(hackathon.banner_crop),
      hackathon.registration_form ? String(hackathon.registration_form) : '',
      hackathon.description || '',
      toLocalInput(hackathon.start_date), toLocalInput(hackathon.end_date),
      toLocalInput(hackathon.visible_from), toLocalInput(hackathon.visible_until),
      toLocalInput(hackathon.registration_opens_at), toLocalInput(hackathon.registration_closes_at),
      String(hackathon.min_team_size ?? 1), String(hackathon.max_team_size ?? 4),
      !!hackathon.team_edits_locked, hackathon.allow_open_innovation ?? true, hackathon.required_profile_fields ?? [],
      hackathon.faq ?? [],
      hackathon.mode ?? 'ONLINE', hackathon.venue ?? '', hackathon.organizer_name ?? '', hackathon.logo_image ?? '',
      (hackathon.tags ?? []).join(', '), hackathon.prizes ?? [],
    ]));
  }, [hackathon]);

  // Leaving the page with edits that were never saved is almost always a mistake.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload: Partial<Hackathon> = {
        title: title.trim(),
        theme: theme.trim(),
        prize_pool: prizePool.trim(),
        registration_form: registrationForm ? Number(registrationForm) : null,
        banner_image: bannerImage.trim() || null,
        banner_crop: bannerImage.trim() && !isDefaultBannerCrop(bannerCrop) ? bannerCrop : {},
        description: description,

        start_date: fromLocalInput(startDate) || hackathon.start_date,
        end_date: fromLocalInput(endDate) || hackathon.end_date,
        visible_from: fromLocalInput(visibleFrom),
        visible_until: fromLocalInput(visibleUntil),

        registration_opens_at: fromLocalInput(opensAt),
        registration_closes_at: fromLocalInput(closesAt),
        min_team_size: Number(minSize),
        max_team_size: Number(maxSize),
        team_edits_locked: locked,
        allow_open_innovation: openInnovation,
        required_profile_fields: required,
        faq: faq.map((item) => ({ question: item.question.trim(), answer: item.answer.trim() })),
        mode,
        venue: venue.trim(),
        organizer_name: organizer.trim(),
        logo_image: logoImage.trim() || null,
        tags: tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
        prizes: prizes.map((prize) => ({ title: prize.title.trim(), amount: prize.amount.trim(), description: prize.description.trim() })),
      };

      const saved = await hackathonApi.admin.update(hackathon.slug, payload);
      onSaved(saved);
      toast.success('Hackathon settings & details saved successfully');
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save settings', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      onSaved(await hackathonApi.admin.publish(hackathon.slug));
      toast.success('Hackathon published', 'It is now public and teams can register.');
    } catch (err: any) {
      const items: string[] = err?.body?.items ?? [];
      toast.error('Not ready to publish', items.length ? items.join(' ') : apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleOpen = async () => {
    if (hackathon.status !== 'CLOSED') {
      const ok = await confirm({
        title: 'Close this hackathon?',
        message: 'Teams can no longer be created, joined or changed by participants until you reopen it. Existing teams and rounds are untouched.',
        confirmLabel: 'Close hackathon',
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const saved = await hackathonApi.admin.setOpen(hackathon.slug, hackathon.status === 'CLOSED');
      onSaved(saved);
      toast.success(saved.status === 'CLOSED' ? 'Hackathon closed' : 'Hackathon reopened');
    } catch (err) {
      toast.error('Could not change status', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const router = useRouter();
  const canDelete = getStoredUser()?.role === 'ADMIN';
  const lifecycle = useHackathonLifecycle({
    onChanged: onSaved,
    onDeleted: () => router.replace('/admin/hackathons'),
  });
  const lifecycleBusy = lifecycle.busySlug === hackathon.slug;
  const closed = hackathon.status === 'CLOSED';
  const formOptions = forms.map((form) => ({ value: String(form.id), label: `${form.title?.trim() || form.slug} (${form.status})` }));
  const draft = hackathon.status === 'DRAFT';

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {confirmDialog}
      {lifecycle.dialogs}
      <div className="space-y-6">
        {/* Section 1: General Event Info */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FF7A00]" />
            General Information
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL}>Hackathon Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. HackOverflow 2K25"
                required
                className={INPUT}
              />
              {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>Theme / Tagline</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Innovate for Tomorrow: AI, Web3 & Sustainable Tech"
                required
                className={INPUT}
              />
              {errors.theme && <p className="mt-1 text-[11px] text-rose-500">{errors.theme}</p>}
            </div>

            <div>
              <label className={LABEL}>Prize Pool</label>
              <input
                type="text"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="e.g. ₹50,000"
                className={INPUT}
              />
              {errors.prize_pool && <p className="mt-1 text-[11px] text-rose-500">{errors.prize_pool}</p>}
            </div>

            <div>
              <label className={LABEL}>Banner Image URL</label>
              <input
                type="url"
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                placeholder="https://..."
                className={INPUT}
              />
              {errors.banner_image && <p className="mt-1 text-[11px] text-rose-500">{errors.banner_image}</p>}
            </div>

            {bannerImage.trim() && (
              <div className="sm:col-span-2">
                <BannerCropEditor imageUrl={bannerImage.trim()} value={bannerCrop} onChange={setBannerCrop} />
                {errors.banner_crop && <p className="mt-1 text-[11px] text-rose-500">{errors.banner_crop}</p>}
              </div>
            )}

            <div>
              <label className={LABEL}>Linked form <span className="normal-case font-medium text-slate-400">(optional)</span></label>
              <FormSelect
                value={registrationForm}
                onChange={setRegistrationForm}
                options={formOptions}
                placeholder={formsError ? 'Could not load forms' : 'No form linked'}
              />
              {errors.registration_form && <p className="mt-1 text-[11px] text-rose-500">{errors.registration_form}</p>}
              <p className="mt-1 text-[11px] text-slate-400">
                Ties a form from the Form Builder to this hackathon so its responses are counted here. Teams still register from the participant dashboard.
                {hackathon.form_slug && (
                  <>
                    {' '}
                    <Link href={`/admin/responses?form=${hackathon.form_slug}`} className="font-bold text-[#FF7A00] hover:underline">View responses</Link>
                    {' · '}
                    <Link href="/admin/forms" className="font-bold text-[#FF7A00] hover:underline">Open Form Builder</Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Event Dates & Schedule */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#FF7A00]" />
            Event Schedule & Visibility Window
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Start Date & Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={INPUT}
              />
              {errors.start_date && <p className="mt-1 text-[11px] text-rose-500">{errors.start_date}</p>}
            </div>

            <div>
              <label className={LABEL}>End Date & Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={INPUT}
              />
              {errors.end_date && <p className="mt-1 text-[11px] text-rose-500">{errors.end_date}</p>}
            </div>

            <div>
              <label className={LABEL}>Visible from (Optional)</label>
              <input
                type="datetime-local"
                value={visibleFrom}
                onChange={(e) => setVisibleFrom(e.target.value)}
                className={INPUT}
              />
              <p className="mt-1 text-[11px] text-slate-400">Blank = visible immediately to non-admins.</p>
            </div>

            <div>
              <label className={LABEL}>Visible until (Optional)</label>
              <input
                type="datetime-local"
                value={visibleUntil}
                onChange={(e) => setVisibleUntil(e.target.value)}
                className={INPUT}
              />
              {errors.visible_until && <p className="mt-1 text-[11px] text-rose-500">{errors.visible_until}</p>}
              <p className="mt-1 text-[11px] text-slate-400">After this date, the hackathon is hidden from the public.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Event Description, Rules & Guidelines (Markdown) */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#FF7A00]" />
            Description, Rules & Overview (Markdown)
          </h3>
          <p className="text-xs text-slate-500">
            This markdown content is directly rendered on the public hackathon details page under the Overview tab. Include
            rules, tracks, schedule details, accommodation guidelines, and judging rubrics.
          </p>
          <div>
            <MarkdownEditor
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Write event overview, guidelines, perks, and rules in Markdown..."
            />
            {errors.description && <p className="mt-1 text-[11px] text-rose-500">{errors.description}</p>}
          </div>
        </section>

        {/* How the public hackathon page looks */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
            <LayoutTemplate className="h-4 w-4 text-[#FF7A00]" />
            Public Page Presentation
          </h3>
          <p className="text-xs text-slate-500">
            What visitors see on the hackathon page. The stages timeline has its own tab (Public Timeline).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Event format</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as NonNullable<Hackathon['mode']>)} className={INPUT}>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              {errors.mode && <p className="mt-1 text-[11px] text-rose-500">{errors.mode}</p>}
            </div>
            <div>
              <label className={LABEL}>Venue {mode === 'ONLINE' && <span className="font-medium normal-case text-slate-400">(shown for offline / hybrid)</span>}</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={200} placeholder="e.g. SRKR Engineering College, Bhimavaram" className={INPUT} />
              {errors.venue && <p className="mt-1 text-[11px] text-rose-500">{errors.venue}</p>}
            </div>
            <div>
              <label className={LABEL}>Organizer</label>
              <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} maxLength={150} placeholder="Blank = SRKR Coding Club, SRKR Engineering College" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Logo image URL</label>
              <input type="url" value={logoImage} onChange={(e) => setLogoImage(e.target.value)} placeholder="https://..." className={INPUT} />
              {errors.logo_image && <p className="mt-1 text-[11px] text-rose-500">{errors.logo_image}</p>}
            </div>
          </div>
          <div>
            <label className={LABEL}>Tags</label>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Technology & Coding, Data Science, Management" className={INPUT} />
            <p className="mt-1 text-[11px] text-slate-400">Comma separated, up to 10. Shown as the category line under the title.</p>
            {errors.tags && <p className="mt-1 text-[11px] text-rose-500">{errors.tags}</p>}
          </div>

          <div className="space-y-3">
            <label className={LABEL}>Prizes</label>
            <p className="text-[11px] text-slate-400">Leave empty to show just the prize pool above as one card.</p>
            <ul className="space-y-3">
              {prizes.map((prize, index) => (
                <li key={index} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={prize.title}
                      maxLength={100}
                      onChange={(e) => setPrizes((prev) => prev.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))}
                      placeholder="Title, e.g. Winner"
                      aria-label={`Prize ${index + 1} title`}
                      className={INPUT}
                    />
                    <input
                      value={prize.amount}
                      maxLength={60}
                      onChange={(e) => setPrizes((prev) => prev.map((x, i) => (i === index ? { ...x, amount: e.target.value } : x)))}
                      placeholder="Amount, e.g. ₹25,000"
                      aria-label={`Prize ${index + 1} amount`}
                      className={INPUT}
                    />
                  </div>
                  <input
                    value={prize.description}
                    maxLength={500}
                    onChange={(e) => setPrizes((prev) => prev.map((x, i) => (i === index ? { ...x, description: e.target.value } : x)))}
                    placeholder="Extra details (optional), e.g. Cash prize, trophy and certificates"
                    aria-label={`Prize ${index + 1} description`}
                    className={INPUT}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setPrizes((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {errors.prizes && <p className="text-[11px] text-rose-500">{errors.prizes}</p>}
            <button type="button" disabled={prizes.length >= 12} onClick={() => setPrizes((prev) => [...prev, { title: '', amount: '', description: '' }])} className={BTN_GHOST}>
              Add a prize
            </button>
          </div>
        </section>

        {/* FAQ shown on the public page */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
            <HelpCircle className="h-4 w-4 text-[#FF7A00]" />
            FAQ
          </h3>
          <p className="text-xs text-slate-500">
            Questions shown on the public FAQ tab. Leave this empty to show the standard FAQ (eligibility, team size, problem statements).
          </p>
          <ul className="space-y-3">
            {faq.map((item, index) => (
              <li key={index} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <input
                  value={item.question}
                  maxLength={200}
                  onChange={(e) => setFaq((prev) => prev.map((x, i) => (i === index ? { ...x, question: e.target.value } : x)))}
                  placeholder="Question"
                  aria-label={`FAQ question ${index + 1}`}
                  className={INPUT}
                />
                <textarea
                  value={item.answer}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => setFaq((prev) => prev.map((x, i) => (i === index ? { ...x, answer: e.target.value } : x)))}
                  placeholder="Answer"
                  aria-label={`FAQ answer ${index + 1}`}
                  className={INPUT}
                />
                <div className="flex justify-end gap-1.5">
                  <button type="button" disabled={index === 0} onClick={() => setFaq((prev) => { const next = [...prev]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className={BTN_GHOST}>Up</button>
                  <button type="button" disabled={index === faq.length - 1} onClick={() => setFaq((prev) => { const next = [...prev]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className={BTN_GHOST}>Down</button>
                  <button type="button" onClick={() => setFaq((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          {errors.faq && <p className="text-[11px] text-rose-500">{errors.faq}</p>}
          <button type="button" disabled={faq.length >= 20} onClick={() => setFaq((prev) => [...prev, { question: '', answer: '' }])} className={BTN_GHOST}>
            Add a question
          </button>
        </section>

        {/* Section 4: Team Registration Rules */}
        <section className={`${PANEL} space-y-5`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FF7A00]" />
            Team Registration & Squad Rules
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Registration opens</label>
              <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={INPUT} />
              <p className="mt-1 text-[11px] text-slate-400">Blank = open immediately.</p>
            </div>
            <div>
              <label className={LABEL}>Registration closes</label>
              <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={INPUT} />
              {errors.registration_closes_at && <p className="mt-1 text-[11px] text-rose-500">{errors.registration_closes_at}</p>}
              <p className="mt-1 text-[11px] text-slate-400">After this, teams can no longer be created or changed.</p>
            </div>
            <div>
              <label className={LABEL}>Min team size</label>
              <input type="number" min={1} value={minSize} onChange={(e) => setMinSize(e.target.value)} className={INPUT} />
              {errors.min_team_size && <p className="mt-1 text-[11px] text-rose-500">{errors.min_team_size}</p>}
            </div>
            <div>
              <label className={LABEL}>Max team size</label>
              <input type="number" min={1} value={maxSize} onChange={(e) => setMaxSize(e.target.value)} className={INPUT} />
              {errors.max_team_size && <p className="mt-1 text-[11px] text-rose-500">{errors.max_team_size}</p>}
            </div>
          </div>

          <div>
            <label className={LABEL}>Required profile details</label>
            <p className="mb-2 text-[11px] text-slate-400">
              Every member must have these on their SRKRCC profile to create or join a team. No re-typing during registration.
            </p>
            <div className="flex flex-wrap gap-2">
              {PROFILE_FIELD_OPTIONS.map((f) => {
                const on = required.includes(f.key);
                return (
                  <button
                    type="button"
                    key={f.key}
                    onClick={() => setRequired((prev) => (on ? prev.filter((k) => k !== f.key) : [...prev, f.key]))}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                      on
                        ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-[#C25A00] dark:text-[#FF9A4A]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {on ? '✓ ' : ''}{f.label}
                  </button>
                );
              })}
            </div>
            {errors.required_profile_fields && <p className="mt-1 text-[11px] text-rose-500">{errors.required_profile_fields}</p>}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={openInnovation}
              onChange={(e) => setOpenInnovation(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#FF7A00]"
            />
            <span className="text-sm">
              <span className="font-bold text-[#1A1A2E] dark:text-white">Allow open innovation</span>
              <span className="block text-xs text-slate-500">
                Teams may bring their own problem instead of picking a statement. They must submit a title, description, and domain.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#FF7A00]"
            />
            <span className="text-sm">
              <span className="font-bold text-[#1A1A2E] dark:text-white">Lock team changes</span>
              <span className="block text-xs text-slate-500">
                Participants can no longer rename, change their problem, invite, remove, or leave. Admins can still edit.
              </span>
            </span>
          </label>

          
        </section>
      </div>

      {dirty && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#0D0E15]/95"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">You have unsaved changes.</p>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save all settings'}
            </button>
          </div>
        </div>
      )}

      {/* Right Sidebar: Status & Actions */}
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <div className={`${PANEL} space-y-3`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Registration Status</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {draft
              ? 'Draft: only admins can see this hackathon. Finish the settings, add problem statements, then publish.'
              : closed
                ? 'Closed: registration is shut regardless of the window dates.'
                : hackathon.is_registration_open
                  ? 'Live and accepting team registrations.'
                  : 'Live, but currently outside the registration window.'}
          </p>
          {draft && (
            <button type="button" onClick={publish} disabled={busy} className={BTN_PRIMARY}>
              <Unlock className="h-3.5 w-3.5" /> Publish hackathon
            </button>
          )}
          <button type="button" onClick={toggleOpen} disabled={busy || draft} className={`${BTN_GHOST} ${draft ? 'hidden' : ''}`}>
            {closed ? (
              <>
                <Unlock className="h-3.5 w-3.5" /> Reopen hackathon
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" /> Close hackathon
              </>
            )}
          </button>
        </div>

        {!draft && (
          <div className={`${PANEL} space-y-3`}>
            <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Public visibility</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {hackathon.is_manually_hidden
                ? 'Hidden: removed from the public site. Only admins and club leads can open it.'
                : hackathon.is_hidden
                  ? 'Outside its "visible from / until" window, so it is not public. Change the dates above to show it.'
                  : 'Public: listed on the site and open to visitors.'}
            </p>
            <button
              type="button"
              onClick={() => lifecycle.toggleVisibility(hackathon)}
              disabled={lifecycleBusy || (hackathon.is_hidden && !hackathon.is_manually_hidden)}
              className={BTN_GHOST}
            >
              {hackathon.is_manually_hidden ? (
                <>
                  <Eye className="h-3.5 w-3.5" /> Show on public site
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> Hide from public site
                </>
              )}
            </button>
          </div>
        )}

        {canDelete && (
          <div className={`${PANEL} space-y-3 border-rose-500/30`}>
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Danger zone</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Permanently deletes this hackathon with its teams, rounds, announcements and submissions. Consider hiding it instead.
            </p>
            <button type="button" onClick={() => lifecycle.requestDelete(hackathon)} disabled={lifecycleBusy} className={`${BTN_DANGER} border border-rose-500/40`}>
              <Trash2 className="h-3.5 w-3.5" /> Delete hackathon
            </button>
          </div>
        )}
      </aside>
    </form>
  );
}
