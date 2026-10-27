'use client';

import React, { useState } from 'react';
import { ScanLine } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { CheckInConsole } from '@/components/hackathons/CheckInConsole';
import { CheckInNoShows } from './CheckInNoShows';
import { CheckInStats } from './CheckInStats';
import { FeatureOffNotice } from './FeatureOffNotice';
import { StaffPanel } from './StaffPanel';
import { BTN_PRIMARY, INPUT, LABEL, PANEL, fromLocalInput, toLocalInput } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

interface CheckInAdminTabProps {
  hackathon: Hackathon;
  onEnable: () => void;
  onSaved: (saved: Hackathon) => void;
}

export function CheckInAdminTab({ hackathon, onEnable, onSaved }: CheckInAdminTabProps) {
  const { busy, errors, save } = useHackathonPatch(hackathon, onSaved);
  const [opensAt, setOpensAt] = useState(toLocalInput(hackathon.check_in_opens_at));
  const [closesAt, setClosesAt] = useState(toLocalInput(hackathon.check_in_closes_at));
  if (!hackathon.features?.check_in) {
    return <FeatureOffNotice title="Check-in" description="Turn this module on to give each participant a QR code and scan them in on the day." onEnable={onEnable} />;
  }
  return (
    <div className="space-y-6">
      <section className={`${PANEL} space-y-3`}>
        <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Check-in window</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">QR codes appear for participants once check-in opens, and scans are refused after it closes. Leave a time empty for no limit. Volunteers can still tick a late arrival off the list by hand.</p>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save({ check_in_opens_at: fromLocalInput(opensAt), check_in_closes_at: fromLocalInput(closesAt) }, 'Check-in window saved');
          }}
        >
          <div>
            <label htmlFor="check-in-opens" className={LABEL}>Opens</label>
            <input id="check-in-opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="check-in-closes" className={LABEL}>Closes</label>
            <input id="check-in-closes" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} aria-invalid={Boolean(errors.check_in_closes_at)} className={INPUT} />
            {errors.check_in_closes_at && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.check_in_closes_at}</p>}
          </div>
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save window'}</button></div>
        </form>
      </section>
      <CheckInConsole slug={hackathon.slug} />
      <CheckInStats slug={hackathon.slug} />
      <CheckInNoShows slug={hackathon.slug} />
      <section className={`${PANEL} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><ScanLine className="h-4 w-4 text-journey-accent" /> Check-in volunteers</h3>
        <StaffPanel
          slug={hackathon.slug}
          role="VOLUNTEER"
          noun="Volunteer"
          description={`Volunteers open /hackathons/${hackathon.slug}/check-in on their phone to scan codes. They can do nothing else in this hackathon.`}
        />
      </section>
    </div>
  );
}
