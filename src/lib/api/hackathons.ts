import { fetchApi } from '@/lib/api-client';
import type {
  AdminRoundEntry,
  Hackathon,
  HackathonAnnouncement,
  HackathonRound,
  HackathonStats,
  HackathonTeam,
  HackathonTeamInvite,
  MyTeamPayload,
  ProblemStatement,
  RoundEntryStatus,
  UserLookupResult,
} from '@/lib/types';

const enc = encodeURIComponent;
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body ?? {}) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });

/** Typed wrappers for /api/hackathons/* (see apps/hackathons/urls.py). */
export const hackathonApi = {
  // --- public / participant ---
  get: (slug: string) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/`),
  problemStatements: (slug: string) => fetchApi<ProblemStatement[]>(`/hackathons/${enc(slug)}/problem-statements/`),
  announcements: (slug: string) => fetchApi<HackathonAnnouncement[]>(`/hackathons/${enc(slug)}/announcements/`),
  myTeam: (slug: string) => fetchApi<MyTeamPayload>(`/hackathons/${enc(slug)}/my-team/`),
  myTeams: () => fetchApi<HackathonTeam[]>('/hackathons/my-teams/'),
  myInvites: () => fetchApi<HackathonTeamInvite[]>('/hackathons/my-invites/'),
  createTeam: (slug: string, body: { name: string; problem_statement: number | null }) =>
    fetchApi<HackathonTeam>(`/hackathons/${enc(slug)}/teams/`, json(body)),
  lookupUser: (slug: string, email: string) =>
    fetchApi<UserLookupResult>(`/hackathons/${enc(slug)}/user-lookup/?email=${enc(email)}`),
  acceptInvite: (id: number) =>
    fetchApi<{ accepted: true; team: HackathonTeam; hackathon_slug: string }>(`/hackathons/invites/${id}/accept/`, json({})),
  declineInvite: (id: number) => fetchApi<{ declined: true }>(`/hackathons/invites/${id}/decline/`, json({})),

  // --- team (leader / member / admin) ---
  team: (id: number) => fetchApi<HackathonTeam>(`/hackathons/teams/${id}/`),
  updateTeam: (id: number, body: { name?: string; problem_statement?: number | null }) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/`, patch(body)),
  invite: (id: number, email: string) =>
    fetchApi<{ invite: HackathonTeamInvite; team: HackathonTeam }>(`/hackathons/teams/${id}/invite/`, json({ email })),
  cancelInvite: (id: number, inviteId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/cancel-invite/`, json({ invite_id: inviteId })),
  removeMember: (id: number, userId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/remove-member/`, json({ user_id: userId })),
  transferLeadership: (id: number, userId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/transfer-leadership/`, json({ user_id: userId })),
  leaveTeam: (id: number) => fetchApi<{ left: true; hackathon_slug: string }>(`/hackathons/teams/${id}/leave/`, json({})),

  // --- admin ---
  admin: {
    update: (slug: string, body: Partial<Hackathon>) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/`, patch(body)),
    setOpen: (slug: string, open: boolean) =>
      fetchApi<Hackathon>(`/hackathons/${enc(slug)}/${open ? 'reopen' : 'close'}/`, json({})),
    stats: (slug: string) => fetchApi<HackathonStats>(`/hackathons/${enc(slug)}/stats/`),

    createProblemStatement: (slug: string, body: Partial<ProblemStatement>) =>
      fetchApi<ProblemStatement>(`/hackathons/${enc(slug)}/problem-statements/`, json(body)),
    updateProblemStatement: (slug: string, id: number, body: Partial<ProblemStatement>) =>
      fetchApi<ProblemStatement>(`/hackathons/${enc(slug)}/problem-statements/${id}/`, patch(body)),
    deleteProblemStatement: (slug: string, id: number) =>
      fetchApi<{ deleted: true }>(`/hackathons/${enc(slug)}/problem-statements/${id}/`, { method: 'DELETE' }),

    teams: (slug: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return fetchApi<HackathonTeam[]>(`/hackathons/${enc(slug)}/teams/${qs ? `?${qs}` : ''}`);
    },
    addMember: (teamId: number, email: string) =>
      fetchApi<HackathonTeam>(`/hackathons/teams/${teamId}/admin-add-member/`, json({ email })),
    setTeamStatus: (teamId: number, status: string) =>
      fetchApi<HackathonTeam>(`/hackathons/teams/${teamId}/admin-set-status/`, json({ status })),

    rounds: (slug: string) => fetchApi<HackathonRound[]>(`/hackathons/${enc(slug)}/rounds/`),
    createRound: (slug: string, body: Partial<HackathonRound> & { populate?: boolean }) =>
      fetchApi<HackathonRound>(`/hackathons/${enc(slug)}/rounds/`, json(body)),
    updateRound: (slug: string, id: number, body: Partial<HackathonRound>) =>
      fetchApi<HackathonRound>(`/hackathons/${enc(slug)}/rounds/${id}/`, patch(body)),
    deleteRound: (slug: string, id: number) =>
      fetchApi<{ deleted: true }>(`/hackathons/${enc(slug)}/rounds/${id}/`, { method: 'DELETE' }),
    roundEntries: (slug: string, id: number) =>
      fetchApi<AdminRoundEntry[]>(`/hackathons/${enc(slug)}/rounds/${id}/entries/`),
    decide: (
      slug: string,
      id: number,
      body: { team_ids: number[]; status: RoundEntryStatus; feedback?: string; admin_notes?: string },
    ) => fetchApi<{ updated: number; round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/decide/`, json(body)),
    publishRound: (slug: string, id: number, body: { announce?: boolean; message?: string } = {}) =>
      fetchApi<{ round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/publish/`, json(body)),
    unpublishRound: (slug: string, id: number) =>
      fetchApi<{ round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/unpublish/`, json({})),
    populateRound: (slug: string, id: number) =>
      fetchApi<{ added: number; round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/populate/`, json({})),

    announcements: (slug: string) =>
      fetchApi<HackathonAnnouncement[]>(`/hackathons/${enc(slug)}/announcements/?all=true`),
    createAnnouncement: (slug: string, body: Record<string, unknown>) =>
      fetchApi<HackathonAnnouncement>(`/hackathons/${enc(slug)}/announcements/`, json(body)),
    updateAnnouncement: (slug: string, id: number, body: Record<string, unknown>) =>
      fetchApi<HackathonAnnouncement>(`/hackathons/${enc(slug)}/announcements/${id}/`, patch(body)),
    deleteAnnouncement: (slug: string, id: number) =>
      fetchApi<{ deleted: true }>(`/hackathons/${enc(slug)}/announcements/${id}/`, { method: 'DELETE' }),
    notifyAnnouncement: (slug: string, id: number) =>
      fetchApi<{ recipients: number }>(`/hackathons/${enc(slug)}/announcements/${id}/notify/`, json({})),
  },
};

/** Best human-readable message from a fetchApi error (backend sends {detail, code}). */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { message?: string; body?: any } | null;
  return e?.body?.detail || e?.body?.error || e?.message || fallback;
}
