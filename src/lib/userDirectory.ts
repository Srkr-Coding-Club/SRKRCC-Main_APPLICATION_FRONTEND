import { fetchApi } from '@/lib/api-client';
import type { College } from '@/lib/colleges';

export type EmailState = 'VERIFIED' | 'UNVERIFIED' | 'OVERDUE' | 'DISPUTED';
export type DirectoryRole = 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
export type DirectoryMembership = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ALUMNI' | 'PENDING';
export type DirectoryScope = 'users' | 'members';

/** One person as the organizer's directory shows them (apps/accounts/user_directory.py). */
export interface DirectoryUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: DirectoryRole;
  club_id: string | null;
  membership_status: DirectoryMembership;
  roll_number: string | null;
  college: College | null;
  other_college_name: string;
  branch: string | null;
  year: number | null;
  phone_number: string | null;
  github_profile: string | null;
  linkedin_profile: string | null;
  registered_at: string | null;
  created_from: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  password_status: 'ACTIVE' | 'NEEDS_SETUP';
  email_verified_at: string | null;
  email_disputed_at: string | null;
  email_state: EmailState;
  email_days_left: number | null;
  email_deadline: string | null;
  referred_by_display: string;
}

export interface DirectoryPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: DirectoryUser[];
}

export interface DirectorySummary {
  total: number;
  verified: number;
  unverified: number;
  overdue: number;
  disputed: number;
  members: number;
  needs_password: number;
  by_role: Record<DirectoryRole, number>;
  by_membership_status: Record<DirectoryMembership, number>;
}

export interface DirectoryFilters {
  q: string;
  role: string;
  membership_status: string;
  email: string;
  member: '' | 'yes' | 'no';
  branch: string;
  year: string;
  /**
   * College name fragment for client-side filtering (catalogue name or typed-in name).
   * Kept in the page URL; never sent to the directory API.
   */
  college: string;
  ordering: string;
  page: number;
}

export const EMPTY_FILTERS: DirectoryFilters = {
  q: '', role: '', membership_status: '', email: '', member: '', branch: '', year: '', college: '', ordering: 'newest', page: 1,
};
export const PAGE_SIZE = 25;
const KEYS = Object.keys(EMPTY_FILTERS) as (keyof DirectoryFilters)[];

/** Filters the directory API understands (college is applied in the browser). */
export function withoutClientCollege(filters: DirectoryFilters): DirectoryFilters {
  return { ...filters, college: '' };
}

/** The college label shown for a person (catalogue or typed-in). */
export function directoryCollegeName(user: Pick<DirectoryUser, 'college' | 'other_college_name'>): string {
  return (user.college?.name || user.other_college_name || '').trim();
}

/** The query string for the page address or the server; blank filters and the first page are left out. */
export function toQuery(
  filters: DirectoryFilters,
  scope: DirectoryScope,
  extra: Record<string, string> = {},
  options: { includeClientCollege?: boolean } = {},
): string {
  const includeClientCollege = options.includeClientCollege !== false;
  const params = new URLSearchParams();
  for (const key of KEYS) {
    if (!includeClientCollege && key === 'college') continue;
    const value = filters[key];
    if (value === '' || value === EMPTY_FILTERS[key] || (key === 'page' && value === 1)) continue;
    params.set(key, String(value));
  }
  if (scope === 'members') params.set('scope', 'members');
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return params.toString();
}

/** Reads filters back from a page's own query string (so a filtered view can be shared or refreshed). */
export function fromSearchParams(params: URLSearchParams): DirectoryFilters {
  const page = Number(params.get('page'));
  return {
    ...EMPTY_FILTERS,
    q: params.get('q') ?? '',
    role: params.get('role') ?? '',
    membership_status: params.get('membership_status') ?? '',
    email: params.get('email') ?? '',
    member: (['yes', 'no'] as const).find((value) => value === params.get('member')) ?? '',
    branch: params.get('branch') ?? '',
    year: params.get('year') ?? '',
    college: (params.get('college') ?? '').trim(),
    ordering: params.get('ordering') || EMPTY_FILTERS.ordering,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export const hasActiveFilters = (filters: DirectoryFilters) => KEYS.some((key) => key !== 'page' && key !== 'ordering' && filters[key] !== EMPTY_FILTERS[key]);

const post = (body: unknown = {}): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Load every directory row via a page fetcher (so tests can inject the mocked list). */
export async function listAllDirectoryUsers(
  fetchPage: (page: number) => Promise<DirectoryPage>,
): Promise<DirectoryUser[]> {
  const people: DirectoryUser[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 50) {
    const reply = await fetchPage(page);
    people.push(...reply.results);
    hasMore = Boolean(reply.next);
    page += 1;
  }
  return people;
}

/** Case-insensitive substring match on the person's college label. */
export function filterUsersByCollegeName(users: DirectoryUser[], collegeQuery: string): DirectoryUser[] {
  const wanted = collegeQuery.trim().toLowerCase();
  if (!wanted) return users;
  return users.filter((user) => directoryCollegeName(user).toLowerCase().includes(wanted));
}

export function paginateUsers(users: DirectoryUser[], page: number, pageSize = PAGE_SIZE): DirectoryPage {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  const results = users.slice(start, start + pageSize);
  return {
    count: users.length,
    next: start + pageSize < users.length ? 'client-next' : null,
    previous: safePage > 1 ? 'client-prev' : null,
    results,
  };
}

export const directoryApi = {
  list: (filters: DirectoryFilters, scope: DirectoryScope, extra: Record<string, string> = {}) =>
    fetchApi<DirectoryPage>(`/auth/users/directory/?${toQuery(withoutClientCollege(filters), scope, extra, { includeClientCollege: false })}`),
  summary: (scope: DirectoryScope) => fetchApi<DirectorySummary>(`/auth/users/directory/summary/${scope === 'members' ? '?scope=members' : ''}`),
  recipients: async (filters: DirectoryFilters, scope: DirectoryScope) => {
    const collegeQuery = filters.college.trim();
    if (!collegeQuery) {
      return fetchApi<{ recipients: { id: number; email: string }[]; truncated: boolean; limit: number }>(
        `/auth/users/directory/recipients/?${toQuery(withoutClientCollege({ ...filters, page: 1 }), scope, {}, { includeClientCollege: false })}`,
      );
    }
    const people = await listAllDirectoryUsers((page) =>
      directoryApi.list({ ...withoutClientCollege(filters), page }, scope, { page_size: '100' }),
    );
    const matched = filterUsersByCollegeName(people, collegeQuery);
    return {
      recipients: matched.map((user) => ({ id: user.id, email: user.email })),
      truncated: false,
      limit: matched.length,
    };
  },
  markVerified: (id: number) => fetchApi<{ verified: true; changed: boolean }>(`/auth/users/${id}/verify-email/`, post()),
  extendDeadline: (id: number, days: number) => fetchApi<{ deadline: string }>(`/auth/users/${id}/verification/extend/`, post({ days })),
  resendVerification: (id: number) => fetchApi<{ sent: true; email_masked: string }>(`/auth/users/${id}/verification/resend/`, post()),
  update: (id: number, fields: Record<string, unknown>) =>
    fetchApi<Record<string, unknown>>(`/auth/users/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) }),
};
