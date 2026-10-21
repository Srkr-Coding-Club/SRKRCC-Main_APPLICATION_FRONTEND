'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Download, ExternalLink, FileUp, Save } from 'lucide-react';
import type { AdminSubmissionsPayload, Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { downloadCSV } from '@/lib/dataManagement';
import { useToast } from '@/context/ToastContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { FeatureOffNotice } from './FeatureOffNotice';
import { LoadError } from './LoadError';
import { SubmissionPhases } from './SubmissionPhases';
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL, fromLocalInput, toLocalInput } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

const STATE_PILL = {
  OFF: { tone: 'slate', label: 'Off' },
  NOT_OPEN: { tone: 'amber', label: 'Not open yet' },
  OPEN: { tone: 'green', label: 'Open' },
  CLOSED: { tone: 'slate', label: 'Closed' },
} as const;

interface SubmissionsAdminTabProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
  onEnable: () => void;
}

export function SubmissionsAdminTab({ hackathon, onSaved, onEnable }: SubmissionsAdminTabProps) {
  const { toast } = useToast();
  const { busy, errors, save } = useHackathonPatch(hackathon, onSaved);
  const [opensAt, setOpensAt] = useState(toLocalInput(hackathon.submission_opens_at));
  const [deadline, setDeadline] = useState(toLocalInput(hackathon.submission_deadline));
  const [data, setData] = useState<AdminSubmissionsPayload | null>(null);
  const [error, setError] = useState('');
  const [reminding, setReminding] = useState(false);
  const enabled = Boolean(hackathon.features?.submissions);

  const load = useCallback(() => {
    setError('');
    hackathonApi.admin.submissions(hackathon.slug).then(setData).catch((err) => setError(apiErrorMessage(err, 'Could not load submissions.')));
  }, [hackathon.slug]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    setOpensAt(toLocalInput(hackathon.submission_opens_at));
    setDeadline(toLocalInput(hackathon.submission_deadline));
  }, [hackathon.submission_opens_at, hackathon.submission_deadline]);

  if (!enabled) {
    return <FeatureOffNotice title="Project submissions" description="Turn this module on to let registered teams hand in a project before a deadline." onEnable={onEnable} />;
  }

  const saveWindow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await save({ submission_opens_at: fromLocalInput(opensAt), submission_deadline: fromLocalInput(deadline) }, 'Submission window saved')) load();
  };

  const remind = async () => {
    setReminding(true);
    try {
      const { reminded } = await hackathonApi.admin.remindMissingSubmissions(hackathon.slug);
      toast.success(reminded ? `Reminded ${reminded} team${reminded === 1 ? '' : 's'}` : 'Every team has submitted');
    } catch (err) {
      toast.error('Could not send reminders', apiErrorMessage(err));
    } finally {
      setReminding(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    downloadCSV(data.rows.map(({ id, team_id, ...row }) => row), `${hackathon.slug}-submissions-${Date.now()}.csv`);
  };

  const pill = STATE_PILL[data?.state ?? 'OPEN'];

  return (
    <div className="space-y-6">
      <SubmissionPhases hackathon={hackathon} />
      <form onSubmit={saveWindow} className={`${PANEL} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><FileUp className="h-4 w-4 text-[#FF7A00]" /> Phase 2: project (implement) window</h3>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sub-opens" className={LABEL}>Opens</label>
            <input id="sub-opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={INPUT} />
            <p className="mt-1 text-[11px] text-slate-400">Blank = open now.</p>
          </div>
          <div>
            <label htmlFor="sub-deadline" className={LABEL}>Deadline</label>
            <input id="sub-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={INPUT} />
            {errors.submission_deadline ? <p className="mt-1 text-[11px] text-rose-500">{errors.submission_deadline}</p> : <p className="mt-1 text-[11px] text-slate-400">Teams cannot submit or edit after this. Blank = no deadline.</p>}
          </div>
        </div>
        <button type="submit" disabled={busy} className={BTN_PRIMARY}><Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save window'}</button>
      </form>

      {error && <LoadError message={error} onRetry={load} />}

      {data && (
        <section className={`${PANEL} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">{data.rows.length} submitted · {data.missing.length} registered teams still to submit</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={remind} disabled={reminding || data.missing.length === 0 || data.state === 'CLOSED'} className={BTN_GHOST}>
                <BellRing className="h-3.5 w-3.5" /> {reminding ? 'Sending…' : 'Remind teams without one'}
              </button>
              <button type="button" onClick={exportCsv} disabled={data.rows.length === 0} className={BTN_GHOST}><Download className="h-3.5 w-3.5" /> Export CSV</button>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2 pr-3">Team</th><th className="py-2 pr-3">Project</th><th className="py-2 pr-3">Links</th><th className="py-2 pr-3">Score</th><th className="py-2">Updated</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="py-2.5 pr-3 font-semibold text-[#1A1A2E] dark:text-white">{row.team}</td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{row.project_title}</p>
                        {row.tagline && <p className="text-xs text-slate-500">{row.tagline}</p>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-[#FF7A00]">
                          {[['Repo', row.repo_url], ['Demo', row.demo_url], ['Video', row.video_url], ['Slides', row.slides_url]].map(([label, url]) => url && (
                            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:underline">{label}<ExternalLink className="h-3 w-3" /></a>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.review_count ? `${row.score.toFixed(1)} (${row.review_count})` : '–'}</td>
                      <td className="whitespace-nowrap py-2.5 text-xs text-slate-500">{formatDateTime(row.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.missing.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">Teams that have not submitted ({data.missing.length})</summary>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.missing.map((team) => <li key={team.id} className="rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-slate-700">{team.name}</li>)}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
