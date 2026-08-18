'use client';

import { useRouter } from 'next/navigation';

const SUBTAB_ROUTES: Record<string, string> = {
  health: '/admin/data-health',
  forms: '/admin/forms',
  responses: '/admin/responses',
  csv: '/admin/csv-ingestion',
  members: '/admin/members',
};

export function useAdminSubtabNav() {
  const router = useRouter();

  return (tab: string, formSlug?: string) => {
    const base = SUBTAB_ROUTES[tab] ?? '/admin';
    router.push(formSlug ? `${base}?form=${encodeURIComponent(formSlug)}` : base);
  };
}
