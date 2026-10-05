'use client';

import { useState } from 'react';
import { Megaphone, Bell } from 'lucide-react';
import { AnnouncementsTab } from '@/components/admin/AnnouncementsTab';
import { BroadcastNotificationPanel } from '@/components/admin/BroadcastNotificationPanel';

export const dynamic = 'force-dynamic';

export default function AdminAnnouncementsPage() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'banners'>('broadcast');

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Navigation tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition ${
              activeTab === 'broadcast'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Broadcast Notifications & Emails</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition ${
              activeTab === 'banners'
                ? 'border-[#FF7A00] text-[#FF7A00]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            <span>Landing Page Banners</span>
          </button>
        </div>

        {activeTab === 'broadcast' ? (
          <BroadcastNotificationPanel />
        ) : (
          <AnnouncementsTab />
        )}
      </div>
    </div>
  );
}
