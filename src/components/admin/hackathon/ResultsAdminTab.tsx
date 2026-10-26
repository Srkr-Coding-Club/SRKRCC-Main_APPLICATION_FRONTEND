'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Award, Eye, EyeOff, Megaphone, Save, Sparkles, Trophy } from 'lucide-react';
import type { CertificateEligibility, Hackathon, HackathonAward, HackathonCertificate, HackathonTeam, LeaderboardRow } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { CertificateSheet } from '@/components/hackathons/CertificateSheet';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { Switch } from '@/components/ui/Switch';
import { StatusPill } from '@/components/ui/StatusPill';
import { ObjectListEditor, type ListField } from './ObjectListEditor';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

interface AwardDraft {
  team_id: string;
  title: string;
  rank: number | '';
  prize: string;
  note: string;
}

const CERTIFICATE_RULES: { value: CertificateEligibility; label: string }[] = [
  { value: 'REGISTERED', label: 'Every member of a registered team' },
  { value: 'SUBMITTED', label: 'Teams that submitted a project' },
  { value: 'CHECKED_IN', label: 'Participants who checked in' },
];
const PLACE_TITLES = ['Winner', 'Runner-up', 'Second runner-up'];
const MAX_AWARDS = 30;
const PLACEHOLDER_HELP = 'Use {name}, {team} and {hackathon} to insert each person\'s details.';

interface ResultsAdminTabProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
  onEnable: () => void;
}

export function ResultsAdminTab({ hackathon, onSaved, onEnable }: ResultsAdminTabProps) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const { busy: patching, save } = useHackathonPatch(hackathon, onSaved);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [awards, setAwards] = useState<AwardDraft[]>([]);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(Boolean(hackathon.show_leaderboard));
  const certificatesOn = Boolean(hackathon.features?.certificates);

  const config = hackathon.certificate_config ?? {};
  const [title, setTitle] = useState(config.title ?? 'Certificate of Participation');
  const [body, setBody] = useState(config.body ?? '{name} of team {team} took part in {hackathon}.');
  const [signatoryName, setSignatoryName] = useState(config.signatory_name ?? '');
  const [signatoryTitle, setSignatoryTitle] = useState(config.signatory_title ?? '');
  const [eligibility, setEligibility] = useState<CertificateEligibility>(config.eligibility ?? 'REGISTERED');
  const [released, setReleased] = useState(Boolean(config.released));
  const [eligible, setEligible] = useState<number | null>(null);
  const [preview, setPreview] = useState<HackathonCertificate | null>(null);

  const published = Boolean(hackathon.results_published_at);

  const load = useCallback(() => {
    hackathonApi.admin.teams(slug).then(setTeams).catch(() => setTeams([]));
    hackathonApi.admin.winners(slug).then((rows) => setAwards(rows.map((row) => ({
      team_id: String(row.team_id), title: row.title, rank: row.rank, prize: row.prize, note: row.note,
    })))).catch(() => setAwards([]));
    if (hackathon.features?.judging) hackathonApi.admin.leaderboard(slug).then((data) => setBoard(data.rows)).catch(() => setBoard([]));
  }, [slug, hackathon.features?.judging]);

  const loadCertificates = useCallback(() => {
    if (certificatesOn) hackathonApi.admin.certificates(slug).then((data) => { setEligible(data.eligible); setPreview(data.preview); }).catch(() => undefined);
  }, [slug, certificatesOn]);

  useEffect(load, [load]);
  useEffect(loadCertificates, [loadCertificates]);

  const teamOptions = teams
    .filter((team) => team.status === 'REGISTERED' && !team.is_waitlisted)
    .map((team) => ({ value: String(team.id), label: team.name }));
  const awardFields: ListField<AwardDraft>[] = [
    { key: 'team_id', label: 'Team', type: 'select', options: teamOptions, placeholder: 'Pick a team' },
    { key: 'title', label: 'Award', placeholder: 'e.g. Winner, Best UI' },
    { key: 'rank', label: 'Rank', type: 'number', min: 1 },
    { key: 'prize', label: 'Prize', placeholder: 'e.g. ₹25,000' },
    { key: 'note', label: 'Note (shown publicly)', wide: true },
  ];

  const fillFromLeaderboard = () => {
    const prizes = hackathon.prizes ?? [];
    setAwards(board.filter((row) => row.review_count > 0).slice(0, PLACE_TITLES.length).map((row, index) => ({
      team_id: String(row.team_id), title: PLACE_TITLES[index], rank: row.rank, prize: prizes[index]?.amount ?? '', note: '',
    })));
  };

  const saveAwards = async () => {
    setBusy(true);
    try {
      const payload: HackathonAward[] = awards.map((award) => ({
        team_id: Number(award.team_id), title: award.title, rank: Number(award.rank) || 1, prize: award.prize, note: award.note,
      }));
      await hackathonApi.admin.saveWinners(slug, payload);
      toast.success('Awards saved');
      load();
    } catch (err) {
      toast.error('Could not save the awards', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async () => {
    setBusy(true);
    try {
      if (published) await hackathonApi.admin.unpublishResults(slug);
      else {
        if (showLeaderboard !== Boolean(hackathon.show_leaderboard)) await hackathonApi.admin.update(slug, { show_leaderboard: showLeaderboard });
        await hackathonApi.admin.publishResults(slug, notify);
      }
      onSaved(await hackathonApi.get(slug));
      toast.success(published ? 'Results hidden again' : 'Results published', published ? undefined : 'They are now on the public page.');
    } catch (err) {
      toast.error(published ? 'Could not unpublish' : 'Could not publish', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveLeaderboardSetting = async (value: boolean) => {
    setShowLeaderboard(value);
    if (published) await save({ show_leaderboard: value }, value ? 'Scores are now public' : 'Scores are now private');
  };

  const saveCertificates = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await save({
      certificate_config: { title, body, signatory_name: signatoryName, signatory_title: signatoryTitle, eligibility, released },
    }, released ? 'Certificates saved and released' : 'Certificate settings saved');
    if (saved) loadCertificates();
  };

  return (
    <div className="space-y-6">
      <section className={`${PANEL} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Trophy className="h-4 w-4 text-journey-accent" /> Winners and awards</h3>
          <StatusPill tone={published ? 'green' : 'amber'}>{published ? `Published ${formatDateTime(hackathon.results_published_at)}` : 'Not published'}</StatusPill>
        </div>
        <ObjectListEditor<AwardDraft>
          items={awards}
          onChange={setAwards}
          fields={awardFields}
          blank={() => ({ team_id: '', title: '', rank: awards.length + 1, prize: '', note: '' })}
          addLabel="Add award"
          itemLabel={(award, index) => award.title || `Award ${index + 1}`}
          max={MAX_AWARDS}
          emptyText="No awards yet."
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveAwards} disabled={busy} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> Save awards</button>
          {hackathon.features?.judging && (
            <button type="button" onClick={fillFromLeaderboard} disabled={board.every((row) => row.review_count === 0)} className={BTN_GHOST}>
              <Sparkles className="h-3.5 w-3.5" /> Fill top 3 from the leaderboard
            </button>
          )}
        </div>
      </section>

      <section className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Megaphone className="h-4 w-4 text-journey-accent" /> Publish results</h3>
        <Switch label="Show every team's score" description="Off = only the winners appear. On = the full ranked leaderboard is public too." checked={showLeaderboard} onChange={saveLeaderboardSetting} disabled={patching} />
        {!published && <Switch label="Notify participants" description="Sends an in-app notification to every registered participant." checked={notify} onChange={setNotify} />}
        {!hackathon.features?.showcase && <p className="text-xs text-slate-500 dark:text-slate-400">Tip: switch on the Project showcase module to list submitted projects publicly after you publish.
          <button type="button" onClick={onEnable} className="ml-1 font-bold text-journey-accent hover:underline">Open Registration controls</button></p>}
        <button type="button" onClick={togglePublished} disabled={busy} className={published ? BTN_GHOST : BTN_PRIMARY}>
          {published ? <><EyeOff className="h-3.5 w-3.5" /> Hide results again</> : <><Eye className="h-3.5 w-3.5" /> Publish results</>}
        </button>
      </section>

      <section className={`${PANEL} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Award className="h-4 w-4 text-journey-accent" /> Certificates</h3>
        {!certificatesOn ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Certificates are switched off. <button type="button" onClick={onEnable} className="font-bold text-journey-accent hover:underline">Switch them on in Registration controls</button>.</p>
        ) : (
          <form onSubmit={saveCertificates} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="cert-title" className={LABEL}>Title</label>
                <input id="cert-title" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} maxLength={120} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cert-body" className={LABEL}>Wording</label>
                <textarea id="cert-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={INPUT} maxLength={600} />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{PLACEHOLDER_HELP}</p>
              </div>
              <div>
                <label htmlFor="cert-signatory" className={LABEL}>Signatory name</label>
                <input id="cert-signatory" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} className={INPUT} maxLength={100} />
              </div>
              <div>
                <label htmlFor="cert-signatory-title" className={LABEL}>Signatory title</label>
                <input id="cert-signatory-title" value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} className={INPUT} maxLength={100} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cert-eligibility" className={LABEL}>Who gets one</label>
                <select id="cert-eligibility" value={eligibility} onChange={(e) => setEligibility(e.target.value as CertificateEligibility)} className={INPUT}>
                  {CERTIFICATE_RULES.map((rule) => <option key={rule.value} value={rule.value}>{rule.label}</option>)}
                </select>
                {eligible !== null && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{eligible} participants qualify right now. Winners automatically get an award certificate.</p>}
              </div>
            </div>
            <Switch label="Release certificates" description="Participants can download theirs, and are notified, as soon as you save with this on." checked={released} onChange={setReleased} />
            <button type="submit" disabled={patching} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {patching ? 'Saving…' : 'Save certificate settings'}</button>
            {preview && (
              <div className="space-y-2">
                <p className={LABEL}>Preview (saved wording, your name)</p>
                <CertificateSheet certificate={preview} />
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
