'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, GitBranch, Pencil, Plus, Trash2 } from 'lucide-react';
import type { HackathonStage, PublicStage } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { StageEntry, StageMarker } from '@/components/hackathons/page/StagesTimeline';
import {
  STAGE_ICONS,
  STAGE_ICON_KEYS,
  STAGE_TONE_KEYS,
  TONE_STYLES,
  stageStatus,
  type StageIconKey,
  type StageTone,
} from '@/components/hackathons/page/stageVisuals';
import { LoadError } from './LoadError';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';

interface Draft {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  badge: string;
  location: string;
  tone: StageTone;
  marker: 'DATE' | 'ICON';
  icon: StageIconKey;
  link_label: string;
  link_url: string;
  is_visible: boolean;
}

const BLANK: Draft = {
  title: '', description: '', starts_at: '', ends_at: '', badge: '', location: '',
  tone: 'ORANGE', marker: 'DATE', icon: 'FLAG', link_label: '', link_url: '', is_visible: true,
};

function toDraft(stage: HackathonStage): Draft {
  return {
    title: stage.title, description: stage.description, starts_at: toLocalInput(stage.starts_at), ends_at: toLocalInput(stage.ends_at),
    badge: stage.badge, location: stage.location, tone: stage.tone as StageTone, marker: stage.marker, icon: stage.icon as StageIconKey,
    link_label: stage.link_label, link_url: stage.link_url, is_visible: stage.is_visible,
  };
}

function previewOf(draft: Draft): PublicStage {
  const parse = (value: string) => {
    const iso = value ? new Date(value) : null;
    return iso && !Number.isNaN(iso.getTime()) ? iso.toISOString() : null;
  };
  return {
    id: 0, order: 0, title: draft.title.trim() || 'Stage title', description: draft.description, starts_at: parse(draft.starts_at),
    ends_at: parse(draft.ends_at), badge: draft.badge, location: draft.location, tone: draft.tone, marker: draft.marker,
    icon: draft.icon, link_label: draft.link_label, link_url: draft.link_url,
  };
}

export function TimelineAdminTab({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [stages, setStages] = useState<HackathonStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<HackathonStage | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoadError('');
    hackathonApi.admin.timeline
      .list(slug)
      .then(setStages)
      .catch((err) => setLoadError(apiErrorMessage(err, 'Could not load the timeline.')))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(load, [load]);

  const open = (target: HackathonStage | 'new') => {
    setEditing(target);
    setErrors({});
    setDraft(target === 'new' ? BLANK : toDraft(target));
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = {
      title: draft.title.trim(),
      description: draft.description,
      starts_at: fromLocalInput(draft.starts_at),
      ends_at: fromLocalInput(draft.ends_at),
      badge: draft.badge.trim(),
      location: draft.location.trim(),
      tone: draft.tone,
      marker: draft.marker,
      icon: draft.icon,
      link_label: draft.link_label.trim(),
      link_url: draft.link_url.trim(),
      is_visible: draft.is_visible,
    };
    setBusy(true);
    setErrors({});
    try {
      if (editing === 'new') await hackathonApi.admin.timeline.create(slug, body);
      else if (editing) await hackathonApi.admin.timeline.update(slug, editing.id, body);
      toast.success(editing === 'new' ? 'Stage added' : 'Stage updated');
      setEditing(null);
      load();
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save the stage', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleVisible = async (stage: HackathonStage) => {
    try {
      await hackathonApi.admin.timeline.update(slug, stage.id, { is_visible: !stage.is_visible });
      load();
    } catch (err) {
      toast.error('Could not update', apiErrorMessage(err));
    }
  };

  const remove = async (stage: HackathonStage) => {
    const ok = await confirm({
      title: `Delete "${stage.title}"?`,
      message: 'It disappears from the public timeline. Rounds and teams are not affected.',
      confirmLabel: 'Delete stage',
      danger: true,
    });
    if (!ok) return;
    try {
      await hackathonApi.admin.timeline.remove(slug, stage.id);
      toast.success('Stage deleted');
      load();
    } catch (err) {
      toast.error('Could not delete', apiErrorMessage(err));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const ids = stages.map((stage) => stage.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    try {
      setStages(await hackathonApi.admin.timeline.reorder(slug, ids));
    } catch (err) {
      toast.error('Could not reorder', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const importRounds = async () => {
    const ok = await confirm({
      title: 'Import rounds as stages?',
      message: 'Every round that is not in the timeline yet is copied in (name, description and dates). You can then edit each stage freely; rounds themselves are not changed.',
      confirmLabel: 'Import rounds',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await hackathonApi.admin.timeline.importRounds(slug);
      setStages(result.stages);
      toast.success(result.created ? `Imported ${result.created} stage${result.created === 1 ? '' : 's'}` : 'Nothing new to import');
    } catch (err) {
      toast.error('Could not import', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const preview = useMemo(() => previewOf(draft), [draft]);
  const now = Date.now();

  return (
    <section className={`${PANEL} space-y-4`}>
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
            <GitBranch className="h-4 w-4 text-journey-accent" /> Public Timeline ({stages.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The &ldquo;Stages and Timelines&rdquo; section of the public hackathon page. Add anything: registration, idea submission, rounds, results, ceremonies.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={importRounds} disabled={busy} className={BTN_GHOST}>
            <Download className="h-3.5 w-3.5" /> Import from rounds
          </button>
          <button onClick={() => open('new')} className={BTN_PRIMARY}>
            <Plus className="h-3.5 w-3.5" /> Add stage
          </button>
        </div>
      </div>

      {loadError && <LoadError message={loadError} onRetry={load} />}

      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-white/5" />
      ) : stages.length === 0 && !loadError ? (
        <div className="space-y-3 py-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No stages yet, so the public page has no timeline. Start from your rounds or add stages one by one.
          </p>
          <button onClick={importRounds} disabled={busy} className={BTN_GHOST}>
            <Download className="h-3.5 w-3.5" /> Import from rounds
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800 ${stage.is_visible ? '' : 'opacity-60'}`}
            >
              <StageMarker stage={stage} status={stageStatus(stage, now)} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                  {stage.title}
                  {!stage.is_visible && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Hidden</span>}
                  {stage.badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE_STYLES[stage.tone as StageTone]?.soft ?? ''}`}>{stage.badge}</span>}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stage.starts_at ? formatDateTime(stage.starts_at) : 'No date'}
                  {stage.ends_at ? ` → ${formatDateTime(stage.ends_at)}` : ''}
                  {stage.location ? ` · ${stage.location}` : ''}
                  {stage.source_round_name ? ` · from round "${stage.source_round_name}"` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => move(index, -1)} disabled={busy || index === 0} className={BTN_GHOST} aria-label={`Move ${stage.title} up`}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(index, 1)} disabled={busy || index === stages.length - 1} className={BTN_GHOST} aria-label={`Move ${stage.title} down`}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleVisible(stage)}
                  className={BTN_GHOST}
                  title={stage.is_visible ? 'Hide from the public page' : 'Show on the public page'}
                  aria-label={stage.is_visible ? `Hide ${stage.title}` : `Show ${stage.title}`}
                >
                  {stage.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => open(stage)} className={BTN_GHOST} aria-label={`Edit ${stage.title}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(stage)} className={BTN_DANGER} aria-label={`Delete ${stage.title}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        busy={busy}
        title={editing === 'new' ? 'Add stage' : 'Edit stage'}
        icon={GitBranch}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" form="stage-form" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : editing === 'new' ? 'Add stage' : 'Save stage'}</button>
          </div>
        }
      >
        <form id="stage-form" onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <p className={LABEL}>Live preview</p>
            <ol className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
              <StageEntry stage={preview} status={stageStatus(preview, now)} isLast now={now} />
            </ol>
          </div>

          <div>
            <label className={LABEL} htmlFor="stage-title">Title *</label>
            <input id="stage-title" value={draft.title} maxLength={150} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Prelims Round (Online)" className={INPUT} />
            {errors.title && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.title}</p>}
          </div>

          <MarkdownEditor label="Description" value={draft.description} onChange={(v) => update('description', v)} placeholder="What happens in this stage, what participants must do..." />
          {errors.description && <p className="-mt-3 text-[11px] text-rose-600 dark:text-rose-400">{errors.description}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Starts</label>
              <input aria-label="Starts" type="datetime-local" value={draft.starts_at} onChange={(e) => update('starts_at', e.target.value)} className={INPUT} />
              {errors.starts_at && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.starts_at}</p>}
            </div>
            <div>
              <label className={LABEL}>Ends</label>
              <input aria-label="Ends" type="datetime-local" value={draft.ends_at} onChange={(e) => update('ends_at', e.target.value)} className={INPUT} />
              {errors.ends_at && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.ends_at}</p>}
            </div>
            <div>
              <label className={LABEL}>Label chip</label>
              <input aria-label="Label chip" value={draft.badge} maxLength={40} onChange={(e) => update('badge', e.target.value)} placeholder="e.g. Online, Mandatory" className={INPUT} />
              {errors.badge && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.badge}</p>}
            </div>
            <div>
              <label className={LABEL}>Location</label>
              <input aria-label="Location" value={draft.location} maxLength={150} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Auditorium, Google Meet" className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Colour</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stage colour">
                {STAGE_TONE_KEYS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    role="radio"
                    aria-checked={draft.tone === tone}
                    aria-label={TONE_STYLES[tone].label}
                    title={TONE_STYLES[tone].label}
                    onClick={() => update('tone', tone)}
                    className={`h-8 w-8 rounded-full ${TONE_STYLES[tone].swatch} ring-offset-2 transition dark:ring-offset-[#151622] ${draft.tone === tone ? 'ring-2 ring-slate-900 dark:ring-white' : 'opacity-70 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className={LABEL}>Marker</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Stage marker">
                {(['DATE', 'ICON'] as const).map((marker) => (
                  <button
                    key={marker}
                    type="button"
                    role="radio"
                    aria-checked={draft.marker === marker}
                    onClick={() => update('marker', marker)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${draft.marker === marker ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-orange-800 dark:text-[#FF9A4A]' : 'border-slate-200 text-slate-500 dark:text-slate-400 dark:border-slate-700'}`}
                  >
                    {marker === 'DATE' ? 'Date badge' : 'Icon'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">A date badge needs a start date; otherwise the icon is used.</p>
            </div>
          </div>

          {draft.marker === 'ICON' && (
            <div>
              <p className={LABEL}>Icon</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stage icon">
                {STAGE_ICON_KEYS.map((key) => {
                  const Icon = STAGE_ICONS[key].icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={draft.icon === key}
                      aria-label={STAGE_ICONS[key].label}
                      title={STAGE_ICONS[key].label}
                      onClick={() => update('icon', key)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${draft.icon === key ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-orange-800 dark:text-journey-accent' : 'border-slate-200 text-slate-500 dark:text-slate-400 hover:border-[#FF7A00]/50 dark:border-slate-700'}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Button label</label>
              <input aria-label="Button label" value={draft.link_label} maxLength={40} onChange={(e) => update('link_label', e.target.value)} placeholder="e.g. Join the meeting" className={INPUT} />
              {errors.link_label && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.link_label}</p>}
            </div>
            <div>
              <label className={LABEL}>Button link</label>
              <input aria-label="Button link" type="url" value={draft.link_url} onChange={(e) => update('link_url', e.target.value)} placeholder="https://..." className={INPUT} />
              {errors.link_url && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{errors.link_url}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_visible} onChange={(e) => update('is_visible', e.target.checked)} className="accent-[#FF7A00]" />
            Show on the public page
          </label>
        </form>
      </Modal>
    </section>
  );
}
