import { fetchApi } from '@/lib/api-client';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface MembershipRequest {
  id: number;
  status: RequestStatus;
  status_label: string;
  message: string;
  note: string;
  club_id: string;
  created_at: string;
  decided_at: string | null;
}

export interface Blocker { code: string; message: string; fix?: string; missing?: string[]; until?: string }

export interface MyMembership {
  club_id: string | null;
  role: string;
  request: MembershipRequest | null;
  can_request: boolean;
  blockers: Blocker[];
}

export interface QueueRow extends MembershipRequest {
  person: {
    id: number; name: string; email: string; email_verified: boolean; phone: string; roll_number: string; branch: string; year: number | null;
    college: string; role: string; membership_status: string; club_id: string | null; joined: string;
  };
  decided_by: string;
}

export interface QueuePage { count: number; next: string | null; previous: string | null; results: QueueRow[]; counts: Record<RequestStatus, number> }
export interface BulkApproval { done: number; failed: { id: number; error: string; code: string }[] }

const post = (body: unknown = {}): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const membershipApi = {
  me: () => fetchApi<MyMembership>('/auth/club-membership/me/'),
  request: (message: string) => fetchApi<{ request: MembershipRequest; auto_approved: boolean }>('/auth/club-membership/request/', post({ message })),
  cancel: () => fetchApi<{ request: MembershipRequest }>('/auth/club-membership/cancel/', post()),
  queue: (params: { status?: string; q?: string; page?: number }) => {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.q) search.set('q', params.q);
    if (params.page && params.page > 1) search.set('page', String(params.page));
    const text = search.toString();
    return fetchApi<QueuePage>(`/auth/club-membership/requests/${text ? `?${text}` : ''}`);
  },
  approve: (id: number) => fetchApi<QueueRow>(`/auth/club-membership/requests/${id}/approve/`, post()),
  reject: (id: number, reason: string) => fetchApi<QueueRow>(`/auth/club-membership/requests/${id}/reject/`, post({ reason })),
  bulkApprove: (ids: number[]) => fetchApi<BulkApproval>('/auth/club-membership/requests/bulk-approve/', post({ ids })),
};
