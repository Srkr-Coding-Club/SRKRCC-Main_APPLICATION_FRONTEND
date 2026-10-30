import { fetchApi } from '@/lib/api-client';
import type { DirectoryPage } from '@/lib/userDirectory';

export interface ClubIdPerson {
  id: number;
  name: string;
  email: string;
  role: string;
  membership_status: string;
  club_id: string | null;
  email_verified: boolean;
}

export type ReservationStatus = 'RESERVED' | 'CLAIMED' | 'RELEASED';

export interface ClubIdReservation {
  id: number;
  club_id: string;
  email: string;
  reason: string;
  source: string;
  status: ReservationStatus;
  created_at: string;
  created_by: string;
  claimed_at: string | null;
  claimed_by: string;
  released_at: string | null;
}

export interface ClubIdEvent {
  id: number;
  club_id: string;
  kind: string;
  kind_label: string;
  user_email: string;
  other_email: string;
  actor_email: string;
  reason: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ClubIdCounter {
  prefix: string;
  year: number;
  next_sequence: number;
  next_id: string;
  in_use: number;
  highest: number;
  gaps: number;
  has_counter: boolean;
  editable: boolean;
}

export interface ClubIdOverview {
  counters: ClubIdCounter[];
  totals: { holders: number; reserved: number; retired: number };
}

export type ClubIdLookup =
  | { kind: 'id'; club_id: string; holder: ClubIdPerson | null; reservation: ClubIdReservation | null; retired: boolean; events: ClubIdEvent[] }
  | { kind: 'person'; people: ClubIdPerson[]; reservations: ClubIdReservation[] };

export interface EventPage { count: number; next: string | null; previous: string | null; results: ClubIdEvent[] }

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const clubIdApi = {
  overview: () => fetchApi<ClubIdOverview>('/auth/club-ids/overview/'),
  lookup: (q: string) => fetchApi<ClubIdLookup>(`/auth/club-ids/lookup/${query({ q })}`),
  events: (params: { page?: number; q?: string; kind?: string; club_id?: string }) => fetchApi<EventPage>(`/auth/club-ids/events/${query({ ...params, page_size: 25 })}`),
  reservations: (status?: string) => fetchApi<{ results: ClubIdReservation[] }>(`/auth/club-ids/reservations/${query({ status })}`),
  reserve: (body: { email?: string; club_id?: string; reason?: string; year?: number }) => fetchApi<ClubIdReservation>('/auth/club-ids/reservations/', post(body)),
  release: (id: number, reason = '') => fetchApi<ClubIdReservation>(`/auth/club-ids/reservations/${id}/release/`, post({ reason })),
  allocate: (body: { user_id: number; reason: string; year?: number }) => fetchApi<{ person: ClubIdPerson }>('/auth/club-ids/allocate/', post(body)),
  assign: (body: { user_id: number; club_id: string; reason: string; allow_retired?: boolean }) => fetchApi<{ person: ClubIdPerson }>('/auth/club-ids/assign/', post(body)),
  reassign: (body: { club_id: string; to_user_id: number; reason: string; confirm: string }) =>
    fetchApi<{ from: ClubIdPerson; to: ClubIdPerson; holder_demoted: boolean }>('/auth/club-ids/reassign/', post(body)),
  clear: (body: { user_id: number; reason: string; confirm: string }) => fetchApi<{ person: ClubIdPerson; club_id: string; demoted: boolean }>('/auth/club-ids/clear/', post(body)),
  setCounter: (body: { year: number; next_sequence: number; reason: string; prefix?: string }) => fetchApi<{ prefix: string; year: number; next_sequence: number }>('/auth/club-ids/counters/', post(body)),
  /** Everybody who holds an id, ordered by id, one page at a time. */
  registry: (params: { page?: number; q?: string; prefix?: string; status?: string }) =>
    fetchApi<DirectoryPage>(`/auth/users/directory/${query({ scope: 'members', ordering: 'club_id', page: params.page && params.page > 1 ? params.page : undefined, q: params.q, club_id_prefix: params.prefix, membership_status: params.status })}`),
  /** People who could be given an id: a search over everybody, a few at a time. */
  people: (q: string, withoutId = false) =>
    fetchApi<DirectoryPage>(`/auth/users/directory/${query({ q, page_size: 8, ordering: 'name', member: withoutId ? 'no' : undefined })}`),
};
