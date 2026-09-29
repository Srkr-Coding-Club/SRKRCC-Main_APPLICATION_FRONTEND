'use client';

import ScannerGuard from '@/components/ScannerGuard';
import { AttendanceScannerTab } from '@/components/admin/AttendanceScannerTab';

export const dynamic = 'force-dynamic';

/**
 * Volunteer-reachable attendance scanner — /admin/attendance/scan renders the
 * exact same AttendanceScannerTab but sits behind AdminGuard, which only
 * admits ADMIN/CLUB_LEAD. This route sits behind ScannerGuard instead (mirrors
 * the backend's IsVolunteerOrAbove), so a VOLUNTEER account — which exists
 * specifically to scan check-ins and nothing else — can actually reach it.
 */
export default function VolunteerAttendanceScanPage() {
  return (
    <ScannerGuard>
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <AttendanceScannerTab hideReportTab />
        </div>
      </div>
    </ScannerGuard>
  );
}
