'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Save, Unlock, Sparkles, Calendar, Trophy, Users, Shield, FileText, Image as ImageIcon } from 'lucide-react';
import type { Hackathon, ProfileFieldKey } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';

const PROFILE_FIELDS: { key: ProfileFieldKey; label: string }[] = [
  { key: 'full_name', label: 'Full name' },
  { key: 'phone_number', label: 'Phone number' },
  { key: 'branch', label: 'Branch' },
  { key: 'year', label: 'Year' },
  { key: 'roll_number', label: 'Roll number' },
  { key: 'club_id', label: 'Club ID' },
];

export function HackathonSettingsTab({ hackathon, onSaved }: { hackathon: Hackathon; onSaved: (h: Hackathon) => void }) {
  const { toast } = useToast();

  // Core Details
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [prizePool, setPrizePool] = useState('₹50,000');
  const [bannerImage, setBannerImage] = useState('');
  const [isFlagship, setIsFlagship] = useState(false);
  const [description, setDescription] = useState('');

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(hackathon.title || '');
    setTheme(hackathon.theme || '');
    setPrizePool(hackathon.prize_pool || '₹50,000');
    setBannerImage(hackathon.banner_image || '');
    setIsFlagship(!!hackathon.is_flagship);
    setDescription(hackathon.description || '');

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
  }, [hackathon]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload: Partial<Hackathon> = {
        title: title.trim(),
        theme: theme.trim(),
        prize_pool: prizePool.trim(),
        banner_image: bannerImage.trim() || undefined,
        is_flagship: isFlagship,
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

  const toggleOpen = async () => {
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

  const closed = hackathon.status === 'CLOSED';

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Section 1: General Event Info */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FF7A00]" />
            General Information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFlagship}
              onChange={(e) => setIsFlagship(e.target.checked)}
              className="h-4 w-4 accent-[#FF7A00]"
            />
            <span className="text-sm">
              <span className="font-bold text-[#1A1A2E] dark:text-white">Flagship Edition</span>
              <span className="block text-xs text-slate-500">
                Mark this hackathon as the official IconCoders flagship edition with special crimson badge.
              </span>
            </span>
          </label>
        </section>

        {/* Section 2: Event Dates & Schedule */}
        <section className={`${PANEL} space-y-4`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#FF7A00]" />
            Event Schedule & Visibility Window
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <textarea
              rows={12}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write event overview, guidelines, perks, and rules in Markdown..."
              className={`${INPUT} font-mono text-xs`}
            />
            {errors.description && <p className="mt-1 text-[11px] text-rose-500">{errors.description}</p>}
          </div>
        </section>

        {/* Section 4: Team Registration Rules */}
        <section className={`${PANEL} space-y-5`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FF7A00]" />
            Team Registration & Squad Rules
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
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
              {PROFILE_FIELDS.map((f) => {
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

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save all settings'}
            </button>
          </div>
        </section>
      </div>

      {/* Right Sidebar: Status & Actions */}
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <div className={`${PANEL} space-y-3`}>
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Registration Status</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {closed
              ? 'Closed: registration is shut regardless of the window dates.'
              : hackathon.is_registration_open
                ? 'Live and accepting team registrations.'
                : 'Live, but currently outside the registration window.'}
          </p>
          <button type="button" onClick={toggleOpen} disabled={busy} className={BTN_GHOST}>
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
      </aside>
    </form>
  );
}
