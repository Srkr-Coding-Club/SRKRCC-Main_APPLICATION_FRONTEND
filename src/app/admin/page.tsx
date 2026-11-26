'use client';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardTab } from '@/components/admin/DashboardTab';
import { useAdminData } from '@/lib/hooks/useAdminData';
import { useLiveSection } from '@/lib/hooks/useLiveSection';
import { directoryApi } from '@/lib/userDirectory';

export default function AdminDashboardPage() {
  const { publishedForms, formSubmissions, isLoadingForms, isLoadingSubmissions, refetchAll } = useAdminData({ include: ['forms', 'submissions'] });
  // The server counts users; downloading every user record just to count them was the dashboard's largest read.
  const userSummary = useLiveSection(() => directoryApi.summary('users'));

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AdminHeader />
        <DashboardTab
          userCount={userSummary.data?.total ?? 0}
          joinedByMonth={userSummary.data?.joined_by_month ?? {}}
          usersByBranch={userSummary.data?.by_branch ?? {}}
          publishedForms={publishedForms}
          formSubmissions={formSubmissions}
          isLoading={isLoadingForms || isLoadingSubmissions || userSummary.loading}
          onRefresh={() => {
            refetchAll(false);
            userSummary.reload();
          }}
        />
      </div>
    </div>
  );
}
