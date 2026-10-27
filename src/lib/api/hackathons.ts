import { fetchApi } from '@/lib/api-client';
import { downloadServerExport, type ExportFormat } from '@/lib/exportApi';
import type {
  AdminRoundEntry,
  AdminIdeasPayload,
  AdminSubmissionsPayload,
  CertificateVerification,
  CheckInNoShows,
  CheckInStats,
  CheckInRoster,
  FinderListing,
  Hackathon,
  HackathonAnalytics,
  HackathonAward,
  AutoShortlistResult,
  WithdrawalOverview,
  CriterionTarget,
  HackathonCertificate,
  IdeaLeaderboardPayload,
  JudgingIdeasPayload,
  RoundRuleKey,
  HackathonIdea,
  HackathonPermissionKey,
  HackathonStaffRole,
  IdeaDraft,
  JoinRequestRow,
  JoinRequestsPayload,
  IdeaFileInfo,
  IdeaFileKind,
  IdeaStatus,
  MyHackathonPermissions,
  MyIdeaPayload,
  HackathonResults,
  HackathonStaffMember,
  JudgeReview,
  JudgingCriterion,
  JudgingPayload,
  LeaderboardPayload,
  MyCheckIn,
  MySubmissionPayload,
  ShowcaseProject,
  SubmissionDraft,
  SubmissionReviewRow,
  HackathonAnnouncement,
  HackathonDeleteImpact,
  HackathonRound,
  HackathonStage,
  HackathonStats,
  HackathonTeam,
  HackathonTeamInvite,
  MyTeamPayload,
  ProblemStatement,
  RoundEntryStatus,
  TeamEmailSettingsPayload,
  UserLookupResult,
} from '@/lib/types';

const enc = encodeURIComponent;

/** A team's problem: a statement id, or an open-innovation problem - never both. */
export interface TeamProblemBody {
  problem_statement?: number | null;
  open_innovation?: { title: string; description: string; domain: string } | null;
}

export interface ProblemStatementUploadResult {
  created: number;
  skipped: number;
  codes: string[];
  errors: { row: number; message: string }[];
}
/** What a participant provides when joining: the organizers' rules and extra questions. */
export interface RegistrationInput {
  accept_rules?: boolean;
  answers?: Record<string, string | boolean>;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body ?? {}) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });

/** The downloads the server renders for one hackathon (apps/hackathons/exports.py). */
export type HackathonExportKind = 'teams' | 'participants' | 'ideas' | 'submissions' | 'rounds' | 'check-in';

/** Typed wrappers for /api/hackathons/* (see apps/hackathons/urls.py). */
export const hackathonApi = {
  /** Saves a server-rendered export; ``params`` narrow it (teams: ids, rounds: round and status). */
  exportFile: (slug: string, kind: HackathonExportKind, format: ExportFormat, params: Record<string, string | number | undefined> = {}) =>
    downloadServerExport(`/hackathons/${enc(slug)}/export/${kind}/`, format, params),
  // --- public / participant ---
  get: (slug: string) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/`),
  problemStatements: (slug: string) => fetchApi<ProblemStatement[]>(`/hackathons/${enc(slug)}/problem-statements/`),
  announcements: (slug: string) => fetchApi<HackathonAnnouncement[]>(`/hackathons/${enc(slug)}/announcements/`),
  myTeam: (slug: string) => fetchApi<MyTeamPayload>(`/hackathons/${enc(slug)}/my-team/`),
  myTeams: () => fetchApi<HackathonTeam[]>('/hackathons/my-teams/'),
  myInvites: () => fetchApi<HackathonTeamInvite[]>('/hackathons/my-invites/'),
  createTeam: (slug: string, body: TeamProblemBody & RegistrationInput & { name: string }) =>
    fetchApi<HackathonTeam>(`/hackathons/${enc(slug)}/teams/`, json(body)),
  saveMyRegistration: (slug: string, body: RegistrationInput) =>
    fetchApi<{ rules_accepted_at: string | null; answers: Record<string, string | boolean>; missing: string[] }>(
      `/hackathons/${enc(slug)}/my-registration/`, patch(body),
    ),
  updateTeamRecruiting: (teamId: number, body: { looking_for_members: boolean; looking_for: string }) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${teamId}/`, patch(body)),
  myPermissions: (slug: string) => fetchApi<MyHackathonPermissions>(`/hackathons/${enc(slug)}/my-permissions/`),
  myIdea: (slug: string) => fetchApi<MyIdeaPayload>(`/hackathons/${enc(slug)}/my-idea/`),
  /** Ask for a signed upload form for the idea's slides or payment screenshot. */
  ideaFileUpload: (slug: string, body: { kind: IdeaFileKind; name: string; size: number; type: string }) =>
    fetchApi<{ file: IdeaFileInfo; post: { url: string; fields: Record<string, string> }; max_bytes: number }>(`/hackathons/${enc(slug)}/my-idea/files/`, json(body)),
  ideaFileComplete: (slug: string, fileId: string) =>
    fetchApi<{ file: IdeaFileInfo }>(`/hackathons/${enc(slug)}/my-idea/files/${fileId}/`, { method: 'POST' }),
  ideaFileDiscard: (slug: string, fileId: string) =>
    fetchApi<null>(`/hackathons/${enc(slug)}/my-idea/files/${fileId}/`, { method: 'DELETE' }),
  /** A 60-second link to a saved idea file. The payment screenshot is for organizers and the team only. */
  ideaFileLink: (slug: string, ideaId: number, kind: 'deck' | 'payment', inline = false) =>
    fetchApi<{ url: string; expires_in: number; inline: boolean }>(`/hackathons/${enc(slug)}/ideas/${ideaId}/files/${kind}/link/${inline ? '?inline=1' : ''}`),
  /** The payment QR code: organizers upload it (settings permission); registered team members and organizers can see it. */
  ideaQrUpload: (slug: string, body: { name: string; size: number; type: string }) =>
    fetchApi<{ file: IdeaFileInfo; post: { url: string; fields: Record<string, string> }; max_bytes: number }>(`/hackathons/${enc(slug)}/idea-qr/`, json(body)),
  ideaQrComplete: (slug: string, fileId: string) =>
    fetchApi<{ file: IdeaFileInfo; payment_qr: { id: string; name: string } | null }>(`/hackathons/${enc(slug)}/idea-qr/${fileId}/`, { method: 'POST' }),
  ideaQrRemove: (slug: string) => fetchApi<null>(`/hackathons/${enc(slug)}/idea-qr/`, { method: 'DELETE' }),
  ideaQrLink: (slug: string) => fetchApi<{ url: string; expires_in: number; inline: boolean }>(`/hackathons/${enc(slug)}/idea-qr/link/`),
  saveIdea: (slug: string, body: IdeaDraft) =>
    fetchApi<MyIdeaPayload>(`/hackathons/${enc(slug)}/my-idea/`, { method: 'PUT', body: JSON.stringify(body) }),
  mySubmission: (slug: string) => fetchApi<MySubmissionPayload>(`/hackathons/${enc(slug)}/my-submission/`),
  saveSubmission: (slug: string, body: SubmissionDraft) =>
    fetchApi<MySubmissionPayload>(`/hackathons/${enc(slug)}/my-submission/`, { method: 'PUT', body: JSON.stringify(body) }),
  myCheckIn: (slug: string) => fetchApi<MyCheckIn>(`/hackathons/${enc(slug)}/my-check-in/`),
  myCertificate: (slug: string) => fetchApi<HackathonCertificate>(`/hackathons/${enc(slug)}/my-certificate/`),
  verifyCertificate: (code: string) => fetchApi<CertificateVerification>(`/hackathons/certificates/verify/${enc(code)}/`),
  results: (slug: string) => fetchApi<HackathonResults>(`/hackathons/${enc(slug)}/results/`),
  showcase: (slug: string) => fetchApi<{ enabled: boolean; projects: ShowcaseProject[] }>(`/hackathons/${enc(slug)}/showcase/`),
  finder: {
    list: (slug: string) => fetchApi<FinderListing>(`/hackathons/${enc(slug)}/finder/`),
    saveProfile: (slug: string, body: { skills: string; note: string }) =>
      fetchApi<{ skills: string; note: string }>(`/hackathons/${enc(slug)}/finder/me/`, put(body)),
    withdraw: (slug: string) => fetchApi<{ withdrawn: true }>(`/hackathons/${enc(slug)}/finder/me/`, { method: 'DELETE' }),
    invite: (slug: string, seekerId: number) =>
      fetchApi<{ invited: true }>(`/hackathons/${enc(slug)}/finder/seekers/${seekerId}/invite/`, json({})),
    requestToJoin: (slug: string, teamId: number, message: string, registration?: RegistrationInput) =>
      fetchApi<{ requested: true; request: JoinRequestRow }>(`/hackathons/${enc(slug)}/finder/teams/${teamId}/request/`, json({ message, ...registration })),
    /** Requests waiting for you (as a leader) and the ones you sent. */
    requests: (slug: string) => fetchApi<JoinRequestsPayload>(`/hackathons/${enc(slug)}/finder/requests/`),
    /** The leader accepts or declines; the sender cancels. */
    answerRequest: (slug: string, requestId: number, action: 'accept' | 'decline' | 'cancel') =>
      fetchApi<{ request: JoinRequestRow }>(`/hackathons/${enc(slug)}/finder/requests/${requestId}/${action}/`, json({})),
  },
  judging: {
    ideas: (slug: string) => fetchApi<JudgingIdeasPayload>(`/hackathons/${enc(slug)}/judging/ideas/`),
    reviewIdea: (slug: string, ideaId: number, body: { scores: Record<string, number>; comment: string }) =>
      fetchApi<JudgeReview>(`/hackathons/${enc(slug)}/judging/ideas/${ideaId}/`, json(body)),
    list: (slug: string) => fetchApi<JudgingPayload>(`/hackathons/${enc(slug)}/judging/`),
    review: (slug: string, submissionId: number, body: { scores: Record<string, number>; comment: string }) =>
      fetchApi<JudgeReview>(`/hackathons/${enc(slug)}/judging/${submissionId}/`, json(body)),
  },
  checkIn: {
    roster: (slug: string, params: { q?: string; missing?: boolean; limit?: number; offset?: number } = {}) => {
      const search = new URLSearchParams();
      if (params.q) search.set('q', params.q);
      if (params.missing) search.set('missing', '1');
      if (params.limit) search.set('limit', String(params.limit));
      if (params.offset) search.set('offset', String(params.offset));
      const suffix = search.toString();
      return fetchApi<CheckInRoster>(`/hackathons/${enc(slug)}/check-in/${suffix ? `?${suffix}` : ''}`);
    },
    stats: (slug: string) => fetchApi<CheckInStats>(`/hackathons/${enc(slug)}/check-in/stats/`),
    noShows: (slug: string) => fetchApi<CheckInNoShows>(`/hackathons/${enc(slug)}/check-in/no-shows/`),
    remindNoShows: (slug: string) =>
      fetchApi<{ reminded: number }>(`/hackathons/${enc(slug)}/check-in/no-shows/`, json({ action: 'remind' })),
    withdrawNoShows: (slug: string, teamIds: number[]) =>
      fetchApi<{ withdrawn: number }>(`/hackathons/${enc(slug)}/check-in/no-shows/`, json({ action: 'withdraw', team_ids: teamIds })),
    checkIn: (slug: string, body: { user_id?: number; token?: string; scanned_at?: string; override?: boolean; reason?: string }) =>
      fetchApi<{ created: boolean; user_id: number; name: string; team_name: string; checked_in_at: string; checked_in_by: string | null }>(
        `/hackathons/${enc(slug)}/check-in/`, json(body),
      ),
    undo: (slug: string, userId: number) =>
      fetchApi<{ deleted: true }>(`/hackathons/${enc(slug)}/check-in/${userId}/`, { method: 'DELETE' }),
  },
  lookupUser: (slug: string, query: string, teamId?: number) => {
    const params = new URLSearchParams();
    if (query.includes('@') && query.includes('.')) {
      params.set('email', query);
    } else {
      params.set('q', query);
    }
    if (teamId) params.set('team_id', String(teamId));
    return fetchApi<UserLookupResult>(`/hackathons/${enc(slug)}/user-lookup/?${params.toString()}`);
  },
  acceptInvite: (id: number, registration: RegistrationInput = {}) =>
    fetchApi<{ accepted: true; team: HackathonTeam; hackathon_slug: string }>(`/hackathons/invites/${id}/accept/`, json(registration)),
  declineInvite: (id: number) => fetchApi<{ declined: true }>(`/hackathons/invites/${id}/decline/`, json({})),

  // --- team (leader / member / admin) ---
  team: (id: number) => fetchApi<HackathonTeam>(`/hackathons/teams/${id}/`),
  updateTeam: (id: number, body: TeamProblemBody & { name?: string }) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/`, patch(body)),
  invite: (id: number, email: string) =>
    fetchApi<{ invite: HackathonTeamInvite; team: HackathonTeam }>(`/hackathons/teams/${id}/invite/`, json({ email })),
  inviteByEmail: (id: number, email: string) =>
    fetchApi<{ invite: { id: number; email: string }; team: HackathonTeam }>(`/hackathons/teams/${id}/invite-by-email/`, json({ email })),
  cancelEmailInvite: (id: number, inviteId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/cancel-email-invite/`, json({ invite_id: inviteId })),
  cancelInvite: (id: number, inviteId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/cancel-invite/`, json({ invite_id: inviteId })),
  removeMember: (id: number, userId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/remove-member/`, json({ user_id: userId })),
  transferLeadership: (id: number, userId: number) =>
    fetchApi<HackathonTeam>(`/hackathons/teams/${id}/transfer-leadership/`, json({ user_id: userId })),
  /** A member just leaves. The only member withdraws the team: a reason is required, and a team that holds a place waits for an organizer. */
  leaveTeam: (id: number, reason?: string) =>
    fetchApi<{ left: boolean; withdrawal_requested: boolean; hackathon_slug: string }>(`/hackathons/teams/${id}/leave/`, json(reason ? { reason } : {})),
  cancelWithdrawal: (id: number) => fetchApi<HackathonTeam>(`/hackathons/teams/${id}/cancel-withdrawal/`, json({})),

  // --- admin ---
  admin: {
    withdrawals: (slug: string) => fetchApi<WithdrawalOverview>(`/hackathons/${enc(slug)}/withdrawals/`),
    decideWithdrawal: (slug: string, id: number, body: { approve: boolean; note?: string }) =>
      fetchApi<{ id: number; status: string }>(`/hackathons/${enc(slug)}/withdrawals/${id}/decide/`, json(body)),
    allowMoreTeams: (slug: string, body: { user_id: number; extra: number; reason?: string }) =>
      fetchApi<{ user_id: number; extra: number }>(`/hackathons/${enc(slug)}/team-allowances/`, json(body)),
    update: (slug: string, body: Partial<Hackathon>) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/`, patch(body)),
    setOpen: (slug: string, open: boolean) =>
      fetchApi<Hackathon>(`/hackathons/${enc(slug)}/${open ? 'reopen' : 'close'}/`, json({})),
    clone: (slug: string, body: { title: string; slug?: string; start_date: string; copy_problem_statements?: boolean }) =>
      fetchApi<{ slug: string; title: string }>(`/hackathons/${enc(slug)}/clone/`, json(body)),
    analytics: (slug: string) => fetchApi<HackathonAnalytics>(`/hackathons/${enc(slug)}/analytics/`),
    submissions: (slug: string) => fetchApi<AdminSubmissionsPayload>(`/hackathons/${enc(slug)}/submissions/`),
    remindMissingSubmissions: (slug: string) =>
      fetchApi<{ reminded: number }>(`/hackathons/${enc(slug)}/submissions/remind/`, json({})),
    submissionReviews: (slug: string, submissionId: number) =>
      fetchApi<SubmissionReviewRow[]>(`/hackathons/${enc(slug)}/submissions/${submissionId}/reviews/`),
    criteria: (slug: string, target: CriterionTarget = 'PROJECT') =>
      fetchApi<Required<JudgingCriterion>[]>(`/hackathons/${enc(slug)}/criteria/?target=${target}`),
    saveCriteria: (slug: string, criteria: JudgingCriterion[], target: CriterionTarget = 'PROJECT') =>
      fetchApi<Required<JudgingCriterion>[]>(`/hackathons/${enc(slug)}/criteria/`, put({ criteria, target })),
    seedCriteria: (slug: string, target: CriterionTarget = 'PROJECT') =>
      fetchApi<Required<JudgingCriterion>[]>(`/hackathons/${enc(slug)}/criteria/?target=${target}`, json({})),
    ideaLeaderboard: (slug: string) => fetchApi<IdeaLeaderboardPayload>(`/hackathons/${enc(slug)}/leaderboard/?target=IDEA`),
    ideaReviews: (slug: string, ideaId: number) =>
      fetchApi<SubmissionReviewRow[]>(`/hackathons/${enc(slug)}/ideas/${ideaId}/reviews/`),
    reorderRounds: (slug: string, ids: number[]) =>
      fetchApi<HackathonRound[]>(`/hackathons/${enc(slug)}/rounds/reorder/`, json({ ids })),
    autoShortlist: (
      slug: string,
      id: number,
      body: { rule: RoundRuleKey; value?: number; reject_rest?: boolean; apply?: boolean; confirm_published?: boolean; confirm_over_limit?: boolean },
    ) => fetchApi<AutoShortlistResult & { round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/auto-shortlist/`, json(body)),
    staff: (slug: string) => fetchApi<HackathonStaffMember[]>(`/hackathons/${enc(slug)}/staff/`),
    addStaff: (slug: string, email: string, role: HackathonStaffRole, permissions?: HackathonPermissionKey[]) =>
      fetchApi<HackathonStaffMember>(`/hackathons/${enc(slug)}/staff/`, json({ email, role, ...(permissions ? { permissions } : {}) })),
    updateStaffPermissions: (slug: string, id: number, permissions: HackathonPermissionKey[]) =>
      fetchApi<HackathonStaffMember>(`/hackathons/${enc(slug)}/staff/${id}/`, patch({ permissions })),
    ideas: (slug: string) => fetchApi<AdminIdeasPayload>(`/hackathons/${enc(slug)}/ideas/`),
    reviewIdea: (slug: string, id: number, body: { status: Exclude<IdeaStatus, 'SUBMITTED'>; feedback: string }) =>
      fetchApi<HackathonIdea>(`/hackathons/${enc(slug)}/ideas/${id}/review/`, json(body)),
    remindMissingIdeas: (slug: string) => fetchApi<{ reminded: number }>(`/hackathons/${enc(slug)}/ideas/remind/`, json({})),
    removeStaff: (slug: string, id: number) =>
      fetchApi<{ deleted: true }>(`/hackathons/${enc(slug)}/staff/${id}/`, { method: 'DELETE' }),
    leaderboard: (slug: string) => fetchApi<LeaderboardPayload>(`/hackathons/${enc(slug)}/leaderboard/`),
    winners: (slug: string) => fetchApi<HackathonAward[]>(`/hackathons/${enc(slug)}/winners/`),
    saveWinners: (slug: string, winners: HackathonAward[]) =>
      fetchApi<HackathonAward[]>(`/hackathons/${enc(slug)}/winners/`, put({ winners })),
    publishResults: (slug: string, notify = true) =>
      fetchApi<{ published: boolean; published_at: string | null }>(`/hackathons/${enc(slug)}/results/publish/`, json({ notify })),
    unpublishResults: (slug: string) =>
      fetchApi<{ published: boolean }>(`/hackathons/${enc(slug)}/results/unpublish/`, json({})),
    certificates: (slug: string) =>
      fetchApi<{ eligible: number; preview: HackathonCertificate }>(`/hackathons/${enc(slug)}/certificates/`),
    hide: (slug: string) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/hide/`, json({})),
    show: (slug: string) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/show/`, json({})),
    deleteImpact: (slug: string) => fetchApi<HackathonDeleteImpact>(`/hackathons/${enc(slug)}/delete-impact/`),
    remove: (slug: string, confirmSlug: string) =>
      fetchApi<void>(`/hackathons/${enc(slug)}/?confirm_slug=${encodeURIComponent(confirmSlug)}`, { method: 'DELETE' }),
    teamEmails: {
      get: (slug: string) => fetchApi<TeamEmailSettingsPayload>(`/hackathons/${enc(slug)}/team-emails/`),
      save: (slug: string, emails: Record<string, { enabled: boolean; subject: string; body: string }>) =>
        fetchApi<TeamEmailSettingsPayload>(`/hackathons/${enc(slug)}/team-emails/`, put({ emails })),
      test: (slug: string, email: string, subject: string, body: string) =>
        fetchApi<{ sent_to: string }>(`/hackathons/${enc(slug)}/team-emails/test/`, json({ email, subject, body })),
    },
    remindForming: (slug: string) => fetchApi<{ reminded: number }>(`/hackathons/${enc(slug)}/remind-forming/`, json({})),
    timeline: {
      list: (slug: string) => fetchApi<HackathonStage[]>(`/hackathons/${enc(slug)}/timeline/`),
      create: (slug: string, body: Partial<HackathonStage>) =>
        fetchApi<HackathonStage>(`/hackathons/${enc(slug)}/timeline/`, json(body)),
      update: (slug: string, id: number, body: Partial<HackathonStage>) =>
        fetchApi<HackathonStage>(`/hackathons/${enc(slug)}/timeline/${id}/`, patch(body)),
      remove: (slug: string, id: number) =>
        fetchApi<{ deleted: true }>(`/hackathons/${enc(slug)}/timeline/${id}/`, { method: 'DELETE' }),
      reorder: (slug: string, ids: number[]) =>
        fetchApi<HackathonStage[]>(`/hackathons/${enc(slug)}/timeline/reorder/`, json({ ids })),
      importRounds: (slug: string) =>
        fetchApi<{ created: number; stages: HackathonStage[] }>(`/hackathons/${enc(slug)}/timeline/import-rounds/`, json({})),
    },
    publish: (slug: string) => fetchApi<Hackathon>(`/hackathons/${enc(slug)}/publish/`, json({})),
    stats: (slug: string) => fetchApi<HackathonStats>(`/hackathons/${enc(slug)}/stats/`),

    uploadProblemStatements: (slug: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return fetchApi<ProblemStatementUploadResult>(`/hackathons/${enc(slug)}/problem-statements/upload/`, {
        method: 'POST',
        body: form,
      });
    },
    createProblemStatement: (slug: string, body: Partial<ProblemStatement>) =>
      fetchApi<ProblemStatement>(`/hackathons/${enc(slug)}/problem-statements/`, json(body)),
    updateProblemStatement: (slug: string, id: number, body: Partial<ProblemStatement>) =>
      fetchApi<ProblemStatement>(`/hackathons/${enc(slug)}/problem-statements/${id}/`, patch(body)),
    reorderProblemStatements: (slug: string, ids: number[]) =>
      fetchApi<ProblemStatement[]>(`/hackathons/${enc(slug)}/problem-statements/reorder/`, json({ ids })),
    deleteProblemStatement: (slug: string, id: number, force = false) =>
      fetchApi<{ deleted: true; teams_unassigned?: number }>(
        `/hackathons/${enc(slug)}/problem-statements/${id}/${force ? '?force=true' : ''}`,
        { method: 'DELETE' }
      ),

    teams: (slug: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return fetchApi<HackathonTeam[]>(`/hackathons/${enc(slug)}/teams/${qs ? `?${qs}` : ''}`);
    },
    createTeam: (slug: string, body: TeamProblemBody & { name: string; leader_email?: string }) =>
      fetchApi<HackathonTeam>(`/hackathons/${enc(slug)}/teams/`, json(body)),
    deleteTeam: (id: number) =>
      fetchApi<{ deleted: true; id: number }>(`/hackathons/teams/${id}/`, { method: 'DELETE' }),
    addMember: (teamId: number, email: string) =>
      fetchApi<HackathonTeam>(`/hackathons/teams/${teamId}/admin-add-member/`, json({ email })),
    setTeamStatus: (teamId: number, status: string, reason = '') =>
      fetchApi<HackathonTeam>(`/hackathons/teams/${teamId}/admin-set-status/`, json({ status, reason })),

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
      body: { team_ids: number[]; status: RoundEntryStatus; feedback?: string; admin_notes?: string; confirm_published?: boolean; confirm_over_limit?: boolean },
    ) => fetchApi<{ updated: number; round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/decide/`, json(body)),
    publishRound: (
      slug: string,
      id: number,
      body: { announce?: boolean; message?: string; email?: boolean; announce_rejected?: boolean } = {},
    ) =>
      fetchApi<{ round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/publish/`, json(body)),
    unpublishRound: (slug: string, id: number) =>
      fetchApi<{ round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/unpublish/`, json({})),
    populateRound: (slug: string, id: number) =>
      fetchApi<{ added: number; round: HackathonRound }>(`/hackathons/${enc(slug)}/rounds/${id}/populate/`, json({})),
    advanceRound: (slug: string, id: number) =>
      fetchApi<{ promoted: number; already_in_round: number; target_round: HackathonRound }>(
        `/hackathons/${enc(slug)}/rounds/${id}/advance/`,
        json({})
      ),
    addTeamToRound: (slug: string, id: number, teamId: number) =>
      fetchApi<{ added: boolean; entry_id: number; round: HackathonRound }>(
        `/hackathons/${enc(slug)}/rounds/${id}/add-team/`,
        json({ team_id: teamId })
      ),
    removeTeamFromRound: (slug: string, id: number, teamId: number) =>
      fetchApi<{ removed: boolean; round: HackathonRound }>(
        `/hackathons/${enc(slug)}/rounds/${id}/remove-team/`,
        json({ team_id: teamId })
      ),

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

    uploadAsset: (slug: string | null | undefined, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const path = slug
        ? `/hackathons/${enc(slug)}/upload-asset/`
        : `/hackathons/upload-asset/`;
      return fetchApi<{
        url: string;
        name: string;
        size: number;
        width: number | null;
        height: number | null;
        format: string | null;
      }>(path, {
        method: 'POST',
        body: formData,
      });
    },

    getAssetUploadPresigned: (body: { filename: string; content_type: string; size?: number; slug?: string | null }) => {
      const path = body.slug
        ? `/hackathons/${enc(body.slug)}/asset-presigned-url/`
        : `/hackathons/asset-presigned-url/`;
      return fetchApi<{
        mode: 's3' | 'local';
        post?: { url: string; fields: Record<string, string> };
        public_url?: string;
        key?: string;
        upload_url?: string;
        max_bytes?: number;
      }>(path, json(body));
    },
  },
};

/** Best human-readable message from a fetchApi error (backend sends {detail, code}). */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { message?: string; body?: any } | null;
  return e?.body?.detail || e?.body?.error || e?.message || fallback;
}
