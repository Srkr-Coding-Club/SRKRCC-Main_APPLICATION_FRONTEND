import { fetchApi } from '@/lib/api-client';
import type {
  UserNotification,
  NotificationListResponse,
  BroadcastPayload,
} from '@/lib/types';

export const notificationsApi = {
  list: (unreadOnly = false, limit = 50) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.set('unread_only', 'true');
    if (limit) params.set('limit', String(limit));
    return fetchApi<NotificationListResponse>(`/notifications/?${params.toString()}`);
  },

  unreadCount: () =>
    fetchApi<{ unread_count: number }>('/notifications/unread-count/'),

  markRead: (id: number) =>
    fetchApi<{ notification: UserNotification; unread_count: number }>(
      `/notifications/${id}/read/`,
      { method: 'POST' }
    ),

  markAllRead: () =>
    fetchApi<{ marked_count: number; unread_count: number }>(
      '/notifications/mark-all-read/',
      { method: 'POST' }
    ),

  delete: (id: number) =>
    fetchApi<{ deleted: true; id: number; unread_count: number }>(
      `/notifications/${id}/`,
      { method: 'DELETE' }
    ),

  broadcast: (payload: BroadcastPayload) =>
    fetchApi<{
      total_recipients: number;
      in_app_count: number;
      email_count: number;
      email_job_id: number | null;
    }>('/notifications/broadcast/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  broadcastHistory: () =>
    fetchApi<
      Array<{
        id: number;
        campaign_name: string;
        total_recipients: number;
        status: string;
        created_at: string;
      }>
    >('/notifications/broadcast-history/'),
};
