'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Megaphone, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import type { AnnouncementType, HackathonAnnouncement, HackathonAnnouncementAudience, HackathonRound, HackathonTeam } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { FormSelect } from '@/components/ui/FormSelect';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, firstFieldErrors, fromLocalInput, toLocalInput } from './shared';

const AUDIENCES: { value: HackathonAnnouncementAudience; label: string; hint: string }[] = [
  { value: 'PUBLIC', label: 'Everyone (public)', hint: 'Shown on the public hackathon page too.' },
  { value: 'PARTICIPANTS', label: 'All registered participants', hint: 'Every member of an active team.' },
  { value: 'ROUND_ALL', label: 'All teams in a round', hint: 'Every team that took part in the chosen round.' },
  { value: 'ROUND_SHORTLISTED', label: 'Shortlisted teams in a round', hint: 'Only visible once that round’s results are published.' },
  { value: 'TEAMS', label: 'Specific teams', hint: 'Pick teams below.' },
];
const TYPES: { value: AnnouncementType; label: string }[] = [
  { value: 'INFO', label: 'Info' }, { value: 'SUCCESS', label: 'Success' }, { value: 'WARNING', label: 'Warning' }, { value: 'URGENT', label: 'Urgent' },
];

interface Draft {
  title: string;
  message: string;
  type: AnnouncementType;
  audience: HackathonAnnouncementAudience;
  round: string;
  target_teams: number[];
  publish_at: string;
  expires_at: string;
  send_email: boolean;
  is_active: boolean;
}

const blank = (): Draft => ({
  title: '', message: '', type: 'INFO', audience: 'PUBLIC', round: '', target_teams: [],
  publish_at: '', expires_at: '', send_email: false, is_active: true,
});

export function HackathonAnnouncementsAdminTab({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<HackathonAnnouncement[]>([]);
  const [rounds, setRounds] = useState<HackathonRound[]>([]);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [editing, setEditing] = useState<HackathonAnnouncement | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teamSearch, setTeamSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    hackathonApi.admin.announcements(slug).then(setItems).catch(() => setItems([]));
  }, [slug]);

  useEffect(() => {
    load();
    hackathonApi.admin.rounds(slug).then(setRounds).catch(() => setRounds([]));
    hackathonApi.admin.teams(slug).then(setTeams).catch(() => setTeams([]));
  }, [load, slug]);

  const open = (a: HackathonAnnouncement | 'new') => {
    setEditing(a);
    setErrors({});
    setTeamSearch('');
    setDraft(a === 'new' ? blank() : {
      title: a.title, message: a.message, type: a.type, audience: a.audience,
      round: a.round ? String(a.round) : '', target_teams: a.target_teams ?? [],
      publish_at: toLocalInput(a.publish_at), expires_at: toLocalInput(a.expires_at),
      send_email: false, is_active: a.is_active ?? true,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const needsRound = draft.audience === 'ROUND_ALL' || draft.audience === 'ROUND_SHORTLISTED';
    const body: Record<string, unknown> = {
      title: draft.title, message: draft.message, type: draft.type, audience: draft.audience,
      round: needsRound && draft.round ? Number(draft.round) : null,
      target_teams: draft.audience === 'TEAMS' ? draft.target_teams : [],
      expires_at: fromLocalInput(draft.expires_at),
      is_active: draft.is_active,
    };
    if (draft.publish_at) body.publish_at = fromLocalInput(draft.publish_at);
    if (editing === 'new') body.send_email = draft.send_email;

    setBusy(true);
    setErrors({});
    try {
      if (editing === 'new') await hackathonApi.admin.createAnnouncement(slug, body);
      else if (editing) await hackathonApi.admin.updateAnnouncement(slug, editing.id, body);
      toast.success(editing === 'new' ? 'Announcement posted' : 'Announcement updated', draft.send_email && editing === 'new' ? 'Emails are being sent in the background.' : undefined);
      setEditing(null);
      load();
    } catch (err: any) {
      setErrors(firstFieldErrors(err?.body));
      toast.error('Could not save', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const action = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      load();
    } catch (err) {
      toast.error('Action failed', apiErrorMessage(err));
    }
  };

  const audienceHint = AUDIENCES.find((a) => a.value === draft.audience)?.hint;
  const shownTeams = teams.filter((t) => !teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase()));

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white"><Megaphone className="h-4 w-4 text-[#FF7A00]" /> Announcements ({items.length})</h3>
          <p className="text-xs text-slate-500">Public notices appear on the hackathon page; targeted ones only on the matching teams’ dashboards.</p>
        </div>
        <button onClick={() => open('new')} className={BTN_PRIMARY}><Plus className="h-3.5 w-3.5" /> New announcement</button>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Nothing announced yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const future = new Date(a.publish_at) > new Date();
            const expired = a.expires_at && new Date(a.expires_at) <= new Date();
            return (
              <li key={a.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#1A1A2E] dark:text-white">{a.title}</p>
                    <StatusPill tone={a.audience === 'PUBLIC' ? 'sky' : 'purple'}>
                      {a.audience_label}{a.round_name ? ` — ${a.round_name}` : ''}{a.audience === 'TEAMS' && a.target_team_names?.length ? ` (${a.target_team_names.length})` : ''}
                    </StatusPill>
                    {!a.is_active && <StatusPill tone="slate">Inactive</StatusPill>}
                    {future && <StatusPill tone="amber">Scheduled</StatusPill>}
                    {expired && <StatusPill tone="slate">Expired</StatusPill>}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {formatDateTime(a.publish_at)}{a.expires_at ? ` → ${formatDateTime(a.expires_at)}` : ''}{a.created_by_name ? ` · by ${a.created_by_name}` : ''}
                  </p>
                  {a.audience === 'TEAMS' && a.target_team_names && (
                    <p className="text-[11px] text-slate-400 truncate">{a.target_team_names.join(', ')}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => open(a)} className={BTN_GHOST} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => action(() => hackathonApi.admin.updateAnnouncement(slug, a.id, { is_active: !a.is_active }), a.is_active ? 'Deactivated' : 'Activated')} className={BTN_GHOST} title={a.is_active ? 'Deactivate' : 'Activate'}>
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => window.confirm('Email this announcement to its audience now?') && action(async () => {
                      const r = await hackathonApi.admin.notifyAnnouncement(slug, a.id);
                      toast.info(`Emailing ${r.recipients} recipient(s)`);
                    }, 'Email queued')}
                    className={BTN_GHOST}
                    title="Email audience"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => window.confirm('Delete this announcement?') && action(() => hackathonApi.admin.deleteAnnouncement(slug, a.id), 'Deleted')} className={BTN_DANGER} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} busy={busy} title={editing === 'new' ? 'New announcement' : 'Edit announcement'} icon={Megaphone} maxWidth="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={LABEL}>Title *</label>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={INPUT} />
            {errors.title && <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>}
          </div>
          <MarkdownEditor label="Message *" value={draft.message} onChange={(v) => setDraft((d) => ({ ...d, message: v }))} placeholder="Schedule changes, venue, next steps…" />
          {errors.message && <p className="-mt-2 text-[11px] text-rose-500">{errors.message}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Audience</label>
              <FormSelect value={draft.audience} onChange={(v) => setDraft((d) => ({ ...d, audience: v as HackathonAnnouncementAudience }))} options={AUDIENCES} placeholder="Audience" allowClear={false} />
              {audienceHint && <p className="mt-1 text-[11px] text-slate-400">{audienceHint}</p>}
            </div>
            <div>
              <label className={LABEL}>Type</label>
              <FormSelect value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v as AnnouncementType }))} options={TYPES} placeholder="Type" allowClear={false} />
            </div>
          </div>

          {(draft.audience === 'ROUND_ALL' || draft.audience === 'ROUND_SHORTLISTED') && (
            <div>
              <label className={LABEL}>Round *</label>
              <FormSelect value={draft.round} onChange={(v) => setDraft((d) => ({ ...d, round: v }))} options={rounds.map((r) => ({ value: String(r.id), label: `R${r.order} · ${r.name}` }))} placeholder="Select round" allowClear={false} />
              {errors.round && <p className="mt-1 text-[11px] text-rose-500">{errors.round}</p>}
            </div>
          )}

          {draft.audience === 'TEAMS' && (
            <div className="space-y-2">
              <label className={LABEL}>Teams * ({draft.target_teams.length} selected)</label>
              <input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Filter teams…" className={INPUT} />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-2 space-y-1">
                {shownTeams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[#FF7A00]"
                      checked={draft.target_teams.includes(t.id)}
                      onChange={() => setDraft((d) => ({
                        ...d,
                        target_teams: d.target_teams.includes(t.id) ? d.target_teams.filter((x) => x !== t.id) : [...d.target_teams, t.id],
                      }))}
                    />
                    {t.name} <span className="text-[11px] text-slate-400">{t.status.toLowerCase()}</span>
                  </label>
                ))}
                {shownTeams.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">No teams.</p>}
              </div>
              {errors.target_teams && <p className="text-[11px] text-rose-500">{errors.target_teams}</p>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Publish at</label>
              <input type="datetime-local" value={draft.publish_at} onChange={(e) => setDraft((d) => ({ ...d, publish_at: e.target.value }))} className={INPUT} />
              <p className="mt-1 text-[11px] text-slate-400">Blank = now.</p>
            </div>
            <div>
              <label className={LABEL}>Expires at</label>
              <input type="datetime-local" value={draft.expires_at} onChange={(e) => setDraft((d) => ({ ...d, expires_at: e.target.value }))} className={INPUT} />
              {errors.expires_at && <p className="mt-1 text-[11px] text-rose-500">{errors.expires_at}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))} className="accent-[#FF7A00]" /> Active
            </label>
            {editing === 'new' && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.send_email} onChange={(e) => setDraft((d) => ({ ...d, send_email: e.target.checked }))} className="accent-[#FF7A00]" /> Also email the audience
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={busy} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : editing === 'new' ? 'Post' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
