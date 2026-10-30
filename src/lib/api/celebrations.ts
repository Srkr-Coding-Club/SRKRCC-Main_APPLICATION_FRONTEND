import { fetchApi } from '@/lib/api-client';
import type { Celebration } from '@/lib/types';

export const celebrationsApi = {
  /** What to celebrate for the signed-in person now, biggest first. `enabled` is their own on/off choice. */
  pending: () => fetchApi<{ enabled: boolean; results: Celebration[] }>('/celebrations/pending/', { silentAuth: true } as RequestInit),

  /** These were shown: they will not come back. */
  seen: (ids: number[]) =>
    fetchApi<{ marked: number }>('/celebrations/seen/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), silentAuth: true,
    } as RequestInit),

  settings: () => fetchApi<{ enabled: boolean }>('/celebrations/settings/'),

  setEnabled: (enabled: boolean) =>
    fetchApi<{ enabled: boolean }>('/celebrations/settings/', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }),
    }),
};
