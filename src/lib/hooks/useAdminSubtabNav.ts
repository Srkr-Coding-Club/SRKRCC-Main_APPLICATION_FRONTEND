'use client';

import { useRouter } from 'next/navigation';

const SUBTAB_ROUTES: Record<string, string> = {
  dashboard: '/admin',
  health: '/admin/data-health',
  forms: '/admin/forms',
  builder: '/admin/builder',
  responses: '/admin/responses',
  csv: '/admin/csv-ingestion',
  members: '/admin/members',
  users: '/admin/users',
  events: '/admin/events',
  content: '/admin/content',
  flags: '/admin/flags',
  audit: '/admin/audit-logs',
};

export function useAdminSubtabNav() {
  const router = useRouter();

  return (tab: string, formSlug?: string) => {
    const base = SUBTAB_ROUTES[tab] ?? (tab.startsWith('/') ? tab : `/admin/${tab}`);
    if (tab === 'builder') {
      router.push(formSlug ? `${base}?slug=${encodeURIComponent(formSlug)}` : `${base}?new=true`);
    } else {
      router.push(formSlug ? `${base}?form=${encodeURIComponent(formSlug)}` : base);
    }
  };
}
