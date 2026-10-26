'use client';

import React from 'react';
import { ScanLine } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { CheckInConsole } from '@/components/hackathons/CheckInConsole';
import { FeatureOffNotice } from './FeatureOffNotice';
import { StaffPanel } from './StaffPanel';
import { PANEL } from './shared';

interface CheckInAdminTabProps {
  hackathon: Hackathon;
  onEnable: () => void;
}

export function CheckInAdminTab({ hackathon, onEnable }: CheckInAdminTabProps) {
  if (!hackathon.features?.check_in) {
    return <FeatureOffNotice title="Check-in" description="Turn this module on to give each participant a QR code and scan them in on the day." onEnable={onEnable} />;
  }
  return (
    <div className="space-y-6">
      <CheckInConsole slug={hackathon.slug} />
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
