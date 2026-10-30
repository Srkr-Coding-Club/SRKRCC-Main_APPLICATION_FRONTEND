export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  updated_at?: string;
}

export type AnnouncementType = 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';

export interface Announcement {
  id: number;
  title: string;
  /** Markdown - rendered via MarkdownRenderer, same as Event/Hackathon descriptions. */
  message: string;
  type: AnnouncementType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationCategory = 'GENERAL' | 'HACKATHON' | 'EVENT' | 'FORM' | 'TEAM' | 'SYSTEM';

export interface UserNotification {
  id: number;
  title: string;
  message: string;
  type: AnnouncementType;
  category: NotificationCategory;
  link_url?: string;
  /** What can be done from the notification itself, e.g. JOIN_REQUEST (accept or decline). */
  action_kind?: string;
  /** "<hackathon slug>:<request id>" for a JOIN_REQUEST. */
  action_ref?: string;
  /** Set once the action was taken (by anyone): ACCEPTED, DECLINED or CANCELLED. */
  action_outcome?: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  created_by_name: string;
}

export interface NotificationListResponse {
  unread_count: number;
  results: UserNotification[];
}

export interface BroadcastPayload {
  title: string;
  message: string;
  type?: AnnouncementType;
  category?: NotificationCategory;
  link_url?: string;
  channels: ('IN_APP' | 'EMAIL')[];
  audience: 'ALL' | 'ROLE' | 'HACKATHON' | 'USERS';
  target_role?: string;
  target_hackathon_slug?: string;
  target_user_ids?: number[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  club_id?: string;
  membership_status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ALUMNI' | 'PENDING';
  roll_number?: string;
  branch?: string;
  year?: number;
  phone_number?: string;
  github_profile?: string;
  linkedin_profile?: string;
  registered_at?: string;
  referred_by_display?: string;
  referred_by_raw?: string;
  created_from?: string;
  created_at?: string;
}

export interface Event {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  venue: string;
  capacity: number;
  status?: 'LIVE' | 'CLOSED';
  /** Nullable: the event may not have a finalized schedule yet ("Date to be announced"). */
  start_time: string | null;
  end_time: string | null;
  visible_from?: string | null;
  visible_until?: string | null;
  is_hidden?: boolean;
  poster_image?: string | null;
  registration_form?: number | null;
  form_slug?: string;
  form_title?: string;
  /** When the linked form opens/closes to new submissions - distinct from start_time/end_time (when the event itself happens). */
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  registration_count?: number;
  /** One-click registration: the form is made only of profile details, so a member registers with one click. */
  is_quick_registration?: boolean;
  /** The member details a one-click event collects (profile keys such as 'full_name', 'phone_number'). */
  registration_profile_fields?: ProfileFieldKey[];
  /** Write-only: the details to collect; the server builds the registration form from them. */
  quick_registration_fields?: ProfileFieldKey[];
}

/** What deleting a hackathon removes (GET /hackathons/{slug}/delete-impact/). */
export interface HackathonDeleteImpact {
  teams: number;
  members: number;
  problem_statements: number;
  rounds: number;
  round_entries: number;
  announcements: number;
  stages: number;
  submissions: number;
}

export interface Hackathon {
  id: number;
  title: string;
  slug: string;
  theme: string;
  description: string;
  prize_pool: string;
  status?: 'DRAFT' | 'LIVE' | 'CLOSED';
  start_date: string;
  end_date: string;
  visible_from?: string | null;
  visible_until?: string | null;
  is_hidden?: boolean;
  /** True only when an admin hid it (as opposed to the visible_from / visible_until window). */
  is_manually_hidden?: boolean;
  banner_image?: string | null;
  /** Admin-chosen framing of the banner; empty object = centred, no zoom. */
  banner_crop?: { x?: number; y?: number; zoom?: number; mode?: 'crop' | 'full' };
  registration_form?: number | null;
  form_slug?: string;
  form_title?: string;
  registration_count?: number;
  team_count?: number;
  /** Teams that meet the minimum size (team_count also includes ones still forming). */
  registered_team_count?: number;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  min_team_size?: number;
  max_team_size?: number;
  team_edits_locked?: boolean;
  required_profile_fields?: ProfileFieldKey[];
  /** Admin-configured domains problem statements are filed under (also the public filter order). */
  problem_domains?: string[];
  /** Public page presentation (all editable in the admin Settings tab). */
  mode?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  venue?: string;
  organizer_name?: string;
  logo_image?: string | null;
  tags?: string[];
  prizes?: { title: string; amount: string; description: string }[];
  /** Organizer-written FAQ; empty/absent = the standard FAQ is shown. */
  faq?: { question: string; answer: string }[];
  is_registration_open?: boolean;
  allow_open_innovation?: boolean;
  /** Event operations, all switched and configured by organizers. */
  features?: HackathonFeatures;
  max_teams?: number | null;
  max_participants?: number | null;
  waitlist_enabled?: boolean;
  waitlisted_team_count?: number;
  is_full?: boolean;
  eligibility?: HackathonEligibility;
  rules?: string;
  require_rules_acceptance?: boolean;
  registration_questions?: RegistrationQuestion[];
  problem_statements_reveal_at?: string | null;
  problems_revealed?: boolean;
  submission_opens_at?: string | null;
  submission_deadline?: string | null;
  submissions_open?: boolean;
  idea_opens_at?: string | null;
  /** QR codes work from check_in_opens_at and scans stop after check_in_closes_at (empty = no limit). */
  check_in_opens_at?: string | null;
  check_in_closes_at?: string | null;
  /** Days and slots per day people are checked in on; they generate the check-in sessions. */
  check_in_days?: number;
  check_in_slots_per_day?: number;
  idea_deadline?: string | null;
  /** Organizers must approve an idea before it counts. */
  idea_review_required?: boolean;
  /** Rupees a team pays with its idea (0 = free); the payment screenshot is then required. */
  idea_fee_amount?: number;
  payment_stage?: PaymentStage;
  /** Which QR code image teams pay to (its id), or null when none was uploaded. */
  payment_qr_id?: string | null;
  idea_payment_note?: string;
  idea_deck_required?: boolean;
  idea_linkedin_required?: boolean;
  /** Teams may edit a submitted idea. */
  idea_edits_enabled?: boolean;
  idea_edits_until?: string | null;
  /** Only teams with an accepted idea may submit a project. */
  project_requires_approved_idea?: boolean;
  results_published_at?: string | null;
  results_published?: boolean;
  show_leaderboard?: boolean;
  certificate_config?: Partial<CertificateConfig>;
  mentors?: PublicPerson[];
  judges?: PublicPerson[];
  sponsors?: HackathonSponsor[];
  contacts?: HackathonContact[];
  community_links?: { label: string; url: string }[];
  venue_map_url?: string | null;
}

export type HackathonFeatureKey = 'ideas' | 'submissions' | 'judging' | 'check_in' | 'certificates' | 'team_finder' | 'showcase';
export type HackathonFeatures = Partial<Record<HackathonFeatureKey, boolean>>;
export interface HackathonEligibility {
  colleges?: string[];
  branches?: string[];
  years?: string[];
}
export type RegistrationQuestionType = 'text' | 'textarea' | 'select' | 'checkbox' | 'url' | 'number';
export interface RegistrationQuestion {
  key: string;
  label: string;
  type: RegistrationQuestionType;
  required: boolean;
  options?: string[];
}
export interface PublicPerson {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  link: string;
}
export interface HackathonSponsor {
  name: string;
  logo_url: string;
  url: string;
  tier: string;
}
export interface HackathonContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}
export type CertificateEligibility = 'REGISTERED' | 'SUBMITTED' | 'CHECKED_IN';
export interface CertificateConfig {
  title: string;
  body: string;
  signatory_name: string;
  signatory_title: string;
  eligibility: CertificateEligibility;
  released: boolean;
}

// ---------------------------------------------------------------------------
// Hackathon team formation, rounds and announcements
// (apps/hackathons on the backend)
// ---------------------------------------------------------------------------

export type HackathonTeamStatus = 'FORMING' | 'REGISTERED' | 'DISQUALIFIED' | 'WITHDRAWN' | 'PAYMENT_PENDING' | 'PAYMENT_REJECTED';
/** When the fee is paid: with the registration (team creation), with the idea, or never. */
export type PaymentStage = 'NONE' | 'REGISTRATION' | 'IDEA';
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type TeamInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
export type RoundStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
export type RoundEntryStatus = 'PENDING' | 'SHORTLISTED' | 'REJECTED';
export type HackathonAnnouncementAudience = 'PUBLIC' | 'PARTICIPANTS' | 'ROUND_ALL' | 'ROUND_SHORTLISTED' | 'ROUND_REJECTED' | 'TEAMS';

export interface ProblemStatement {
  id: number;
  code: string;
  title: string;
  description: string;
  /** The problem's domain (e.g. EdTech). */
  domain: string;
  tags: string[];
  max_teams: number | null;
  is_active: boolean;
  order: number;
  team_count: number;
  total_teams_count?: number;
  /** null = unlimited */
  slots_left: number | null;
}

export interface ProblemStatementBrief {
  id: number;
  code: string;
  title: string;
  domain: string;
}

/** A team's own problem when it goes open innovation instead of picking a statement. */
export interface OpenInnovationProblem {
  /** Generated ID, OI-<team id>. */
  code?: string;
  title: string;
  description: string;
  domain: string;
}

export interface HackathonTeamMember {
  user_id: number;
  name: string;
  email: string;
  club_id: string | null;
  role: 'LEADER' | 'MEMBER';
  joined_at: string;
  /** Shown to the team's own members only; never in the team finder. */
  phone_number?: string | null;
  branch?: string | null;
  year?: number | null;
  roll_number?: string | null;
  college?: string;
  answers?: Record<string, string | boolean>;
  rules_accepted_at?: string | null;
}

export interface HackathonTeamInvite {
  id: number;
  team_id: number;
  team_name: string;
  hackathon_slug: string;
  hackathon_title: string;
  invited_user: { id: number; name: string; email: string };
  invited_by_name: string | null;
  problem_statement: ProblemStatementBrief | null;
  is_open_innovation: boolean;
  member_count: number;
  status: TeamInviteStatus;
  created_at: string;
  responded_at: string | null;
}

export interface TeamRoundEntryBrief {
  id: number;
  round_id: number;
  round_name: string;
  round_order: number;
  status: RoundEntryStatus;
  feedback: string;
  admin_notes: string;
  decided_at: string | null;
  has_details: boolean;
}

export interface HackathonTeam {
  id: number;
  name: string;
  hackathon_slug: string;
  status: HackathonTeamStatus;
  /** Queued because the hackathon was at capacity when the team formed. */
  is_waitlisted?: boolean;
  /** Why the organizers disqualified or withdrew the team. */
  status_reason?: string;
  looking_for_members?: boolean;
  looking_for?: string;
  problem_statement: ProblemStatementBrief | null;
  /** Set (and problem_statement null) when the team brought its own problem. */
  open_innovation: OpenInnovationProblem | null;
  leader_id: number | null;
  members: HackathonTeamMember[];
  member_count: number;
  pending_invites: HackathonTeamInvite[];
  /** Invites to addresses that have no account yet. */
  pending_email_invites?: { id: number; email: string; created_at: string }[];
  created_at: string;
  updated_at: string;
  /** Admin view only */
  leader_email?: string | null;
  round_entries?: TeamRoundEntryBrief[];
  /** /my-teams/ only */
  hackathon_title?: string;
  is_leader?: boolean;
}

export interface ParticipantRound {
  id: number;
  order: number;
  name: string;
  kind: RoundKind;
  effective_status: RoundStatus;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  status: RoundStatus;
  results_published: boolean;
  entry: { status: RoundEntryStatus; feedback: string; details_submitted: boolean } | null;
  details_form: {
    slug: string;
    title: string;
    status: string;
    open_at: string | null;
    close_at: string | null;
    can_submit: boolean;
  } | null;
}

/** A leader's request to withdraw a team that holds a place; organizers decide. */
export interface MyWithdrawalRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  reason: string;
  created_at: string;
  decision_note: string;
  decided_at: string | null;
}

export interface WithdrawalRow {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  reason: string;
  created_at: string;
  team_id: number;
  team_name: string;
  team_status: HackathonTeamStatus;
  is_waitlisted: boolean;
  requested_by: string;
  requested_by_email: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
}

export interface TeamRepeater {
  user_id: number;
  name: string;
  email: string;
  teams_created: number;
  teams_withdrawn: number;
  extra_allowed: number;
  at_limit: boolean;
}

export interface WithdrawalOverview {
  pending: WithdrawalRow[];
  decided: WithdrawalRow[];
  repeaters: TeamRepeater[];
  limits: { max_teams: number; cooldown_minutes: number };
}

/** What the team's own members see of the fee paid at registration. The organizers' reason is never part of it. */
export interface TeamPaymentSummary {
  id: number;
  status: PaymentStatus;
  amount: number;
  transaction_id: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface MyTeamPayload {
  hackathon: Hackathon;
  profile_missing: string[];
  team: HackathonTeam | null;
  payment?: TeamPaymentSummary | null;
  /** The latest withdrawal request on the team (pending or decided), if any. */
  withdrawal_request?: MyWithdrawalRequest | null;
  /** What one person may do: teams they can create, and the wait after withdrawing one. */
  team_limits?: { max_teams: number; cooldown_minutes: number };
  is_leader: boolean;
  invites: HackathonTeamInvite[];
  rounds: ParticipantRound[];
  /** The caller's own answers to the organizers' rules and questions. */
  registration: { rules_accepted: boolean; answers: Record<string, string | boolean>; missing: string[] } | null;
}

export interface UserLookupResult {
  found: boolean;
  id?: number;
  name?: string;
  email?: string;
  club_id?: string | null;
  can_invite: boolean;
  reason: string;
  results?: UserLookupResult[];
}

/** A timeline stage as the public hackathon page sees it: no teams, results or forms. */
export interface PublicStage {
  id: number;
  order: number;
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  badge: string;
  location: string;
  tone: string;
  marker: 'DATE' | 'ICON';
  icon: string;
  link_label: string;
  link_url: string;
}

/** The admin view of a timeline stage. */
export interface HackathonStage extends PublicStage {
  is_visible: boolean;
  source_round: number | null;
  source_round_name?: string;
  created_at: string;
  updated_at: string;
}

export type RoundKind = 'GENERAL' | 'SCREENING' | 'IDEA_REVIEW' | 'PROJECT_REVIEW' | 'PITCH' | 'FINAL';

export interface HackathonRound {
  id: number;
  order: number;
  name: string;
  kind: RoundKind;
  /** How many teams should go through; shortlisting more asks for confirmation. */
  shortlist_limit: number | null;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  status: RoundStatus;
  /** What the dates say right now (falls back to `status` when no dates are set). */
  effective_status: RoundStatus;
  details_form: number | null;
  details_form_slug?: string | null;
  details_form_title?: string | null;
  results_published: boolean;
  entry_counts: Record<RoundEntryStatus, number> & {
    total: number;
    details_submitted: number;
    next_round_id?: number | null;
    next_round_name?: string | null;
    promoted_to_next?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface AdminRoundEntry {
  id: number;
  team_id: number;
  team_name: string;
  team_status: HackathonTeamStatus;
  leader_email: string | null;
  member_count: number;
  problem_statement: ProblemStatementBrief | null;
  /** PS-001 for a statement, OI-<id> for open innovation. */
  problem_code: string | null;
  status: RoundEntryStatus;
  admin_notes: string;
  feedback: string;
  decided_by_name: string | null;
  decided_at: string | null;
  details_response_id: number | null;
  is_promoted_to_next?: boolean;
  /** Facts that help decide, from the idea and project phases and check-in. */
  idea_status: IdeaStatus | null;
  idea_score: number | null;
  has_project: boolean;
  project_score: number | null;
  checked_in: number;
}

export interface HackathonAnnouncement {
  id: number;
  title: string;
  message: string;
  type: AnnouncementType;
  audience: HackathonAnnouncementAudience;
  audience_label: string;
  round_name: string | null;
  publish_at: string;
  created_at: string;
  /** Admin view only */
  round?: number | null;
  target_teams?: number[];
  target_team_names?: string[];
  is_active?: boolean;
  expires_at?: string | null;
  send_email?: boolean;
  /** When the audience email was dispatched; null = not sent yet. */
  emailed_at?: string | null;
  created_by_name?: string | null;
}

export interface TeamEmailSetting {
  key: string;
  label: string;
  when: string;
  recipients: string;
  enabled: boolean;
  /** Organizer override; empty = use `default_subject`. */
  subject: string;
  /** Organizer override; empty = use `default_body`. */
  body: string;
  default_subject: string;
  default_body: string;
}

export interface TeamEmailSettingsPayload {
  emails: TeamEmailSetting[];
  placeholders: { key: string; description: string }[];
}

export interface PaymentRow {
  id: number;
  team_id: number;
  team_name: string;
  team_status: HackathonTeamStatus;
  leader_name: string;
  leader_email: string;
  leader_phone: string;
  members: number;
  amount: number;
  transaction_id: string;
  status: PaymentStatus;
  reason: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  screenshot: { id: string; name: string; size: number; type: string; state: string } | null;
  problem: string;
}

export interface PaymentQueue {
  counts: Record<PaymentStatus, number>;
  fee_amount: number;
  stage: PaymentStage;
  payments: PaymentRow[];
}

export type PaymentAction = 'verify' | 'reject' | 'reopen' | 'remove';

export interface HackathonStats {
  teams_by_status: Record<HackathonTeamStatus, number>;
  teams_total: number;
  participants: number;
  pending_invites: number;
  open_innovation_teams: number;
  problem_statements: { id: number; code: string; title: string; teams: number; max_teams: number | null }[];
  rounds: ({ id: number; order: number; name: string; results_published: boolean; total: number; details_submitted: number } & Record<RoundEntryStatus, number>)[];
  forming_teams: { id: number; name: string; leader_email: string | null; members: number; needed: number }[];
  min_team_size: number;
  registration_closes_at: string | null;
  is_registration_open: boolean;
}

/** IconCoders is an individual DSA-challenge competition - its own entity,
 * not a flagship Hackathon row (they're structurally different: individual
 * vs. team-based). */
export interface IconCodersChallenge {
  id: number;
  title: string;
  slug: string;
  edition: string;
  theme: string;
  description: string;
  format: 'INDIVIDUAL';
  difficulty_tier?: string;
  start_date: string;
  end_date: string;
  image_url?: string;
  form_slug?: string;
}

export interface IconCodersHallOfFameEntry {
  year: string;
  participantName: string;
  project: string;
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  scheduled_date: string;
  points?: number;
  solved_count?: number;
  tags?: string[];
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  /** Where to actually solve it - a LeetCode/GFG/etc. problem page. No in-house judge exists. */
  external_url?: string;
  external_platform?: string;
}

export interface CodeQuestSubmission {
  id: number;
  problem: number;
  problem_title: string;
  scheduled_date: string;
  user: number;
  user_name: string;
  user_email: string;
  code: string;
  language: string;
  is_correct: boolean;
  created_at: string;
}

export interface JobListing {
  id: number;
  title: string;
  slug: string;
  company_name: string;
  company_logo?: string;
  job_type: 'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME';
  location: string;
  stipend?: string;
  deadline: string;
  description?: string;
  form_slug?: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author?: any;
  author_role?: string;
  read_time?: string;
  category?: string;
  image_url?: string;
  cover_image?: string;
  tags?: string[];
  published_at?: string;
}

/**
 * Canonical validation-rule shape - a strict superset of what the builder used to
 * write. Mirrors `apps/forms/validation/schema.py::RULE_COMPAT` on the backend;
 * both sides enforce the same keys.
 */
export type TextFormat =
  | 'any' | 'alpha' | 'alphabetic' | 'alphanumeric' | 'numeric' | 'integer'
  | 'decimal' | 'email' | 'phone' | 'url' | 'username' | 'slug' | 'date' | 'time';

export type CrossFieldOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'required_if';

export interface CrossFieldRule {
  op: CrossFieldOp;
  /** the OTHER field's id this one is compared against */
  field: number | string;
  /** required_if only: the other field's value that triggers the requirement */
  equals?: string;
  message?: string;
}

export interface ValidationRules {
  // text / paragraph
  minLength?: number;
  maxLength?: number;
  exactLength?: number;
  minWords?: number;
  maxWords?: number;
  pattern?: string;
  format?: TextFormat;
  allowedChars?: string;
  disallowedChars?: string;
  startsWith?: string;
  endsWith?: string;
  contains?: string;
  notContains?: string;
  // number
  minValue?: number;
  maxValue?: number;
  exactValue?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  integerOnly?: boolean;
  allowNegative?: boolean;
  positiveOnly?: boolean;
  step?: number;
  // email
  allowedDomains?: string[] | string;
  blockedDomains?: string[] | string;
  allowMultiple?: boolean;
  normalizeCase?: boolean;
  // phone
  minDigits?: number;
  maxDigits?: number;
  numericOnly?: boolean;
  // url
  requireHttps?: boolean;
  // date / time
  minDate?: string;
  maxDate?: string;
  notBefore?: string;
  notAfter?: string;
  pastOnly?: boolean;
  futureOnly?: boolean;
  allowToday?: boolean;
  minTime?: string;
  maxTime?: string;
  // choice
  allowOther?: boolean;
  minSelected?: number;
  maxSelected?: number;
  exactSelected?: number;
  // file
  allowedFileTypes?: string;
  blockedFileTypes?: string;
  maxFileSizeMB?: number;
  minFileSizeKB?: number;
  minFiles?: number;
  maxFiles?: number;
  // matrix
  requiredRows?: string[];
  allRowsRequired?: boolean;
  minPerRow?: number;
  maxPerRow?: number;
  // cross-field + custom message
  crossField?: CrossFieldRule[];
  patternError?: string;
  /** The admin's own wording per failure. Keys: any rule name, plus "required", "type", "options", "unique", "optionLimits". */
  messages?: Record<string, string>;
  /** No other response may give the same answer (case-insensitive). */
  unique?: boolean;
  /** {option: how many responses may choose it}; a full option stops being offered. */
  optionLimits?: Record<string, number>;
  /** Pre-filled on the form: text, a number or date as text, an option, or a list of options. */
  defaultValue?: string | string[];
  /** HIDDEN questions: the link parameter (?name=value) that fills the answer. */
  queryParam?: string;
  /** CALCULATED questions: arithmetic over {question id} references, e.g. "{12} * {13}". */
  formula?: string;
  /** CALCULATED questions: places after the decimal point, 0-6. */
  decimals?: number;
}

export type ConditionalOperator =
  | 'equals' | 'not_equals'
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'not_between'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'matches_regex' | 'not_matches_regex' | 'is_empty' | 'is_not_empty'
  | 'selected' | 'not_selected' | 'includes' | 'not_includes'
  | 'includes_any' | 'includes_all'
  | 'before' | 'after' | 'on' | 'before_or_equal' | 'after_or_equal' | 'date_between';

export type ConditionalAction = 'show' | 'hide' | 'require' | 'optional';

export interface ConditionalLeaf {
  field: number | string;
  operator: ConditionalOperator;
  value?: any;
}
export interface ConditionalGroup {
  logic: 'AND' | 'OR';
  rules: (ConditionalLeaf | ConditionalGroup)[];
}
export interface ConditionalLogic extends ConditionalGroup {
  action?: ConditionalAction;
}

/** One entry of the backend's structured 400 body. */
export interface SubmissionErrorItem {
  field_id: number | null;
  label?: string | null;
  code: string;
  message: string;
  rule?: string;
  context?: Record<string, any>;
}
export interface SubmissionErrorBody {
  detail: string;
  code: string;
  errors: SubmissionErrorItem[];
  warnings: SubmissionErrorItem[];
}

export type FieldType =
  | 'TEXT'
  | 'PARAGRAPH'
  | 'EMAIL'
  | 'NUMBER'
  | 'PHONE'
  | 'URL'
  | 'DROPDOWN'
  | 'RADIO'
  | 'CHECKBOX'
  | 'FILE'
  | 'MULTI_FILE'
  | 'DATE'
  | 'TIME'
  | 'SECTION'
  | 'PAGE_BREAK'
  | 'HIDDEN'
  | 'CALCULATED'
  | 'RATING'
  | 'LINEAR_SCALE'
  | 'MATRIX_RADIO'
  | 'MATRIX_CHECKBOX'
  | 'SIGNATURE'
  | 'CLUB_ID';

/** Profile attribute a FormField can be bound to via FormField.profile_field - see apps.forms.models.ProfileField (backend). */
export type ProfileFieldKey =
  | 'full_name'
  | 'email'
  | 'phone_number'
  | 'branch'
  | 'roll_number'
  | 'college'
  | 'year'
  | 'club_id';

export interface FormField {
  id: number | string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  is_required: boolean;
  options?: string[];
  /** Row labels for MATRIX_RADIO and MATRIX_CHECKBOX fields. */
  rows?: string[];
  /** Minimum value for RATING / LINEAR_SCALE. */
  min_value?: number;
  /** Maximum value for RATING / LINEAR_SCALE. */
  max_value?: number;
  /** Canonical shape {logic, rules, action}; legacy {if,equals} still accepted by the normalizer. */
  conditional_logic?: ConditionalLogic | Record<string, any>;
  validation_rules?: ValidationRules;
  order: number;
  is_deleted?: boolean;
  /** When set, this question is never asked of the user - the server resolves it from the submitter's own profile at submission time and it renders read-only. */
  profile_field?: ProfileFieldKey | null;
}

export interface Form {
  id: number | string;
  title: string;
  slug: string;
  description: string;
  image_url?: string;
  category?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'CLOSED' | 'ARCHIVED';
  version?: number;
  allow_multiple_responses?: boolean;
  allow_response_editing?: boolean;
  enable_prefill?: boolean;
  max_responses_per_user?: number;
  /** Auto-close the form once this many total (non-test) responses are received. Leave blank for unlimited. */
  max_total_responses?: number | null;
  /** Reject a submission if any EMAIL-type field's value has already been used to answer this same form. */
  prevent_duplicate_email_answers?: boolean;
  allow_edits_until?: string;
  open_at?: string;
  close_at?: string;
  club_id_enabled?: boolean;
  club_id_prefix?: string;
  club_id_field_mapping?: ClubIdFieldMapping;
  club_id_verification_enabled?: boolean;
  confirmation_email_enabled?: boolean;
  confirmation_email_template?: number | string | null;
  confirmation_notification_enabled?: boolean;
  notify_admin_on_submission?: boolean;
  notify_members_on_publish?: boolean;
  notification_title?: string;
  notification_message?: string;
  /** After submitting: thank-you text ({{id}} is piped), where to go next and after how many seconds. */
  confirmation_message?: string;
  redirect_url?: string;
  redirect_delay_seconds?: number;
  /** Ask for a Cloudflare Turnstile check before the response is accepted. */
  captcha_enabled?: boolean;
  /** Language of the form's own buttons and prompts: 'en' | 'te' | 'hi' (lib/i18n/formStrings.ts). */
  language?: string;
  /** QR-code attendance tracking - see apps/forms/models.py's attendance_* fields. */
  attendance_enabled?: boolean;
  attendance_start_date?: string | null;
  attendance_days?: number;
  attendance_sessions_per_day?: 1 | 2 | 3;
  attendance_window_minutes?: number | null;
  fields?: FormField[];
  created_at?: string;
  updated_at?: string;
  response_count?: number;
}

// ---------------------------------------------------------------------------
// QR-code attendance types - see apps/attendance/serializers.py & views.py
// ---------------------------------------------------------------------------

/** GET /api/forms/<id>/attendance/sessions/ - one row per scannable session. */
export interface AttendanceSession {
  id: number;
  form: number;
  day_index: number;
  session_label: 'MORNING' | 'AFTERNOON' | 'EVENING';
  session_label_display: string;
  date: string;
  opens_at: string | null;
  closes_at: string | null;
}

/** GET /api/forms/<id>/attendance/my-badge/ - the caller's own badge. */
export interface AttendanceBadge {
  token: string;
  response_id: number;
  revoked: boolean;
}

/** POST /api/attendance/scan/ response body. */
export interface AttendanceScanResult {
  success: boolean;
  new_scan: boolean;
  already_recorded: boolean;
  display_name: string;
  response_id: number;
  session_id: number;
  scanned_at: string;
}

/** Structured error body returned by /api/attendance/scan/ on 400/404. */
export interface AttendanceScanError {
  error: string;
  code?: 'BADGE_NOT_FOUND' | 'BADGE_REVOKED' | 'SESSION_NOT_FOUND' | 'FORM_MISMATCH' | 'OUTSIDE_SCAN_WINDOW';
}

/** GET /api/forms/<id>/attendance/report/ */
export interface AttendanceSessionSummary {
  id: number;
  day_index: number;
  session_label: 'MORNING' | 'AFTERNOON' | 'EVENING';
  date: string;
  attended_count: number;
  total_registrants: number;
  percentage: number;
}

export interface AttendanceRegistrantRow {
  response_id: number;
  display_name: string;
  sessions: Record<number, boolean>;
}

export interface AttendanceReport {
  sessions: AttendanceSessionSummary[];
  registrants: AttendanceRegistrantRow[];
}

/** GET /api/forms/<id>/attendance/my-record/ - the caller's own session-by-session attendance. */
export interface MyAttendanceSessionRow {
  id: number;
  day_index: number;
  session_label: 'MORNING' | 'AFTERNOON' | 'EVENING';
  session_label_display: string;
  date: string;
  opens_at: string | null;
  attended: boolean;
}

export interface MyAttendanceRecord {
  sessions: MyAttendanceSessionRow[];
  attended_count: number;
  total_sessions: number;
  percentage: number;
}

/** Maps club-member profile attributes to this form's own field IDs (see FormBuilderTab's Automation card). */
export interface ClubIdFieldMapping {
  club_id?: number | string;
  email?: number | string;
  full_name?: number | string;
  phone_number?: number | string;
  branch?: number | string;
  roll_number?: number | string;
}

export interface EmailTemplateSummary {
  id: number;
  name: string;
  display_title: string;
  subject_template: string;
  allowed_parameters: string[];
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Data Management Center types (Members / Responses / CSV Ingestion / Health)
// ---------------------------------------------------------------------------

/** Single error entry from a bulk ingest session. */
export interface IngestError {
  row: number;
  field: string;
  value: string;
  error: string;
}

/** Summary returned by POST /api/forms/{slug}/bulk-ingest/ */
export interface BulkIngestResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: IngestError[];
  session_id?: number;
  cached?: boolean;
}

/** A single row of CSV data mapped to { field_id: value } */
export type BulkIngestRow = Record<string, string>;

/** Stats block from GET /api/forms/data-health/ */
export interface DataHealthStats {
  total_forms: number;
  published_forms: number;
  total_responses: number;
  completion_rate: number;
  warning_count: number;
  last_export: string | null;
}

/** Warning entry from data-health endpoint */
export interface DataHealthWarning {
  type: string;
  form_id: number;
  form_title: string;
  message: string;
  action_link: 'health' | 'forms' | 'responses' | 'csv' | 'members';
}

/** Recent activity entry from data-health endpoint */
export interface ActivityItem {
  type: 'submission' | 'csv_import' | 'form_close';
  actor: string;
  detail: string;
  timestamp: string;
}

/** Full data-health API response */
export interface DataHealthResponse {
  stats: DataHealthStats;
  warnings: DataHealthWarning[];
  recent_activity: ActivityItem[];
}

/** Enriched answer for the responses viewer */
export interface AnswerDetail {
  field_id: number;
  field_label: string;
  field_type: FieldType;
  value: string | string[] | Record<string, string> | null;
}

/** User summary nested in ResponseDetail */
export interface ResponseUser {
  id: number;
  name: string;
  email: string;
}

/** Full response detail with user + enriched answers */
export interface ConfirmationEmailStatus {
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
  sent_at: string | null;
  error_message: string;
  recipient_email: string;
}

export interface ResponseDetail {
  id: number;
  form_id?: number;
  form_title?: string;
  form_slug?: string;
  submitted_at: string;
  is_manual_entry: boolean;
  is_test_submission: boolean;
  form_version: number;
  user: ResponseUser | null;
  user_name?: string;
  user_email?: string;
  answers: AnswerDetail[];
  confirmation_email_enabled?: boolean;
  confirmation_email?: ConfirmationEmailStatus | null;
  confirmation_notification_enabled?: boolean;
  confirmation_notification?: {
    id: number;
    title: string;
    message: string;
    type: string;
    category: string;
    is_read: boolean;
    created_at: string | null;
  } | null;
}

/** Paginated response from DRF PageNumberPagination */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** A form submission linked to a member */
export interface MemberFormSubmission {
  form_id: number;
  form_title: string;
  submitted_at: string;
}

/** Member record from GET /api/members/ */
export interface MemberRecord {
  user_id: number;
  name: string;
  email: string;
  total_submissions: number;
  last_active: string | null;
  forms_submitted: MemberFormSubmission[];
}

/** Duplicate record from check-duplicates endpoint */
export interface DuplicateRecord {
  email: string;
  response_id: number;
  submitted_at: string;
}

// ---------------------------------------------------------------------------
// Universal Backup Center & Raw Vault Types
// ---------------------------------------------------------------------------

export type BackupDomainKey = 'USERS' | 'FORMS' | 'EVENTS' | 'HACKATHONS' | 'UNKNOWN_RAW';

export interface BackupDomainMetadata {
  key: BackupDomainKey;
  display_name: string;
  description: string;
  required_fields: string[];
  expected_fields: Record<string, string[]>;
  is_schemaless: boolean;
}

export interface BackupJobRecord {
  id: string;
  original_filename: string;
  file_size_bytes: number;
  file_format: 'CSV' | 'XLSX';
  file_sha256: string;
  total_rows: number;
  headers: string[];
  suggested_domain: BackupDomainKey | string;
  suggestion_confidence: string;
  status: 'PENDING' | 'PARSED' | 'AWAITING_DOMAIN_SELECTION' | 'READY' | 'PARTIALLY_IMPORTED' | 'ARCHIVED_RAW' | 'FAILED' | 'EXPIRED';
  created_at: string;
  uploader: string;
}

export interface ImportAttemptSummary {
  id: string;
  target_domain: string;
  target_form_id?: number | null;
  required_fields_satisfied: boolean;
  schema_confidence_percentage: string;
  total_records: number;
  valid_records: number;
  conflict_records: number;
  status: string;
  committed_at?: string | null;
}

export interface UniversalBackupDetail extends BackupJobRecord {
  attempts: ImportAttemptSummary[];
  has_raw_archive: boolean;
  raw_archive_id?: string | null;
}

export interface UniversalAnalysisResponse {
  backup_id: string;
  target_domain: string;
  domain_display: string;
  required_fields_satisfied: boolean;
  schema_confidence_percentage: string;
  is_eligible_for_structured_import: boolean;
  suggested_mapping: Record<string, string>;
  unmapped_headers: string[];
  headers: string[];
  expected_fields: Record<string, string[]>;
  required_fields: string[];
}

export interface UniversalPreviewRow {
  source_row_number: number;
  raw_data: Record<string, any>;
  normalized_data: Record<string, any>;
  action: 'CREATE' | 'UPDATE' | 'SKIP' | 'CONFLICT';
  is_valid: boolean;
  error_message: string;
}

export interface UniversalPreviewResponse {
  attempt_id: string;
  backup_id: string;
  target_domain: string;
  total_records: number;
  valid_records: number;
  conflict_records: number;
  inserted_records: number;
  updated_records: number;
  required_fields_satisfied: boolean;
  schema_confidence_percentage: string;
  unmapped_columns: string[];
  rows_sample: UniversalPreviewRow[];
  status: string;
}

export interface UniversalCommitResult {
  success: boolean;
  imported_count: number;
  new_users_count?: number;
  updated_users_count?: number;
  inserted_count?: number;
  updated_count?: number;
  already_committed?: boolean;
  archive_id?: string;
  is_raw_vault?: boolean;
}


// ---------------------------------------------------------------------------
// Hackathon event operations: submissions, judging, results, check-in, finder
// ---------------------------------------------------------------------------

export type SubmissionWindowState = 'OFF' | 'NOT_OPEN' | 'OPEN' | 'CLOSED';

export interface HackathonSubmission {
  id: number;
  team_id: number;
  team_name: string;
  project_title: string;
  tagline: string;
  description: string;
  repo_url: string;
  demo_url: string | null;
  video_url: string | null;
  slides_url: string | null;
  tech_stack: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MySubmissionPayload {
  state: SubmissionWindowState;
  /** Whether the idea phase lets this team into the project phase. */
  gate: { required: boolean; satisfied: boolean; reason: string };
  opens_at: string | null;
  deadline: string | null;
  submission: HackathonSubmission | null;
  can_edit: boolean;
}

export interface SubmissionDraft {
  project_title: string;
  tagline: string;
  description: string;
  repo_url: string;
  demo_url: string;
  video_url: string;
  slides_url: string;
  tech_stack: string[];
  is_public: boolean;
}

export interface AdminSubmissionRow extends Omit<HackathonSubmission, 'created_at' | 'team_name'> {
  /** Team name. */
  team: string;
  team_status: string;
  score: number;
  review_count: number;
  submitted_at: string;
}

export interface AdminSubmissionsPayload {
  state: SubmissionWindowState;
  rows: AdminSubmissionRow[];
  missing: { id: number; name: string }[];
}

export type CriterionTarget = 'PROJECT' | 'IDEA';

export interface JudgingCriterion {
  id?: number;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  order?: number;
}

export type HackathonPermissionKey =
  | 'settings' | 'content' | 'teams' | 'rounds' | 'ideas' | 'submissions' | 'judging' | 'judge' | 'results' | 'check_in' | 'insights' | 'staff';
export type HackathonStaffRole = 'ORGANIZER' | 'JUDGE' | 'VOLUNTEER';

export interface HackathonStaffMember {
  id: number;
  role: HackathonStaffRole;
  user_id: number;
  email: string;
  name: string;
  permissions: HackathonPermissionKey[];
}

export interface MyHackathonPermissions {
  permissions: HackathonPermissionKey[];
  is_site_organizer: boolean;
  roles: HackathonStaffRole[];
  catalog: { key: HackathonPermissionKey; label: string; description: string }[];
  presets: Record<HackathonStaffRole, HackathonPermissionKey[]>;
}

export interface JudgeReview {
  scores: Record<string, number>;
  comment: string;
  total: number;
}

export interface JudgingSubmission extends HackathonSubmission {
  is_own_team: boolean;
  my_review: JudgeReview | null;
}

export interface JudgingPayload {
  enabled: boolean;
  criteria: Required<JudgingCriterion>[];
  submissions: JudgingSubmission[];
  reviewed: number;
  total: number;
  /** Idea scoring is on: ideas are scored against their own rubric. */
  ideas_scoring?: boolean;
}

export interface LeaderboardRow {
  rank: number;
  submission_id: number;
  team_id: number;
  team_name: string;
  project_title: string;
  score: number;
  review_count: number;
}

export interface LeaderboardPayload {
  judges: number;
  rows: LeaderboardRow[];
  criteria: Required<JudgingCriterion>[];
}

export interface SubmissionReviewRow {
  id: number;
  judge: string;
  scores: Record<string, number>;
  comment: string;
  total: number;
  updated_at: string;
}

export interface HackathonAward {
  id?: number;
  team_id: number;
  team_name?: string;
  title: string;
  rank: number;
  prize: string;
  note: string;
}

export interface HackathonResults {
  published: boolean;
  published_at?: string | null;
  winners: (HackathonAward & { project_title: string; project_url: string })[];
  leaderboard: LeaderboardRow[];
}

export interface ShowcaseProject {
  id: number;
  team_name: string;
  project_title: string;
  tagline: string;
  description: string;
  repo_url: string;
  demo_url: string | null;
  video_url: string | null;
  slides_url: string | null;
  tech_stack: string[];
  award: string | null;
  members: string[];
}

export type CheckInVia = 'MEMBER_QR' | 'TEAM_QR' | 'LIST' | 'OVERRIDE';
export type CheckInScanMode = 'MEMBERS' | 'TEAMS' | 'BOTH';
export type CheckInWindow = 'NOT_OPEN' | 'OPEN' | 'CLOSED';

/** One scannable moment of the event: Day 2 Afternoon, Lunch, ... The main one is the arrival check-in. */
export interface CheckInSessionInfo {
  id: number;
  name: string;
  day_index: number;
  slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  date: string;
  is_main: boolean;
  needs_arrival: boolean;
  counts_for_certificate: boolean;
  scan_mode: CheckInScanMode;
  is_active: boolean;
  /** The schedule no longer has this day or slot; kept because people were checked in. */
  outside_schedule: boolean;
  opens_at: string | null;
  closes_at: string | null;
  window: CheckInWindow;
  /** Only in the sessions list. */
  checked_in?: number;
}

export interface CheckInParticipant {
  user_id: number;
  name: string;
  email: string;
  team_id: number;
  team_name: string;
  role: 'LEADER' | 'MEMBER';
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  via: CheckInVia | null;
}

/** Someone whose team is not registered (forming or waitlisted); only organizers see these and can let them in. */
export interface CheckInHeldBack {
  user_id: number;
  name: string;
  email: string;
  team_name: string;
  why: string;
}

export interface CheckInRoster {
  participants: CheckInParticipant[];
  /** Everyone on a placed team, whatever the filter. */
  total: number;
  checked_in: number;
  /** Rows matching the current search / filter (participants holds the first `limit` of them). */
  count: number;
  limit: number;
  offset: number;
  held_back: CheckInHeldBack[];
  session: CheckInSessionInfo;
}

export interface CheckInStats {
  total: number;
  overrides: number;
  volunteers: { name: string; count: number }[];
  /** 15 for a normal event, 60 once arrivals span more than two days. */
  bucket_minutes: number;
  timeline: { at: string; count: number }[];
  /** How people were checked in: their own code, the team's code, ticked from the list, or let in by an organizer. */
  by_via: Partial<Record<CheckInVia, number>>;
  /** Team scans (one per batch). */
  team_scans: number;
  session: CheckInSessionInfo;
}

/** One member of a scanned team and where they stand in the session. */
export interface TeamScanMember {
  user_id: number;
  name: string;
  role: 'LEADER' | 'MEMBER';
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  via: CheckInVia | null;
  /** Why they cannot be checked in without an organizer: they have not arrived yet. */
  blocked: 'NOT_ARRIVED' | null;
}

/** What a team's code opens. Nobody is checked in until the volunteer picks the people who are there. */
export interface TeamScanResult {
  kind: 'team';
  team: { id: number; name: string; status: HackathonTeamStatus; placed: boolean; problem_code: string | null; problem_title: string | null };
  session: CheckInSessionInfo;
  members: TeamScanMember[];
  all_checked_in: boolean;
  can_override: boolean;
}

export interface MemberScanResult {
  kind: 'member';
  created: boolean;
  user_id: number;
  name: string;
  team_name: string;
  checked_in_at: string;
  checked_in_by: string | null;
  session_id: number;
  via: CheckInVia;
}

export interface TeamBatchPerson {
  user_id: number;
  name: string | null;
  status: 'created' | 'already' | 'refused';
  code?: string;
  detail?: string;
  checked_in_at?: string;
}

export interface TeamBatchResult {
  /** Null when nobody new was checked in. */
  batch_id: string | null;
  team: { id: number; name: string };
  session_id: number;
  results: TeamBatchPerson[];
  created: number;
  already: number;
  refused: number;
}

/** A participant's standing in one session. */
export interface MyCheckInSession {
  id: number;
  name: string;
  is_main: boolean;
  date: string;
  window: CheckInWindow;
  opens_at: string | null;
  closes_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

export interface CheckInNoShows {
  window: 'NOT_OPEN' | 'OPEN' | 'CLOSED';
  /** The session the numbers are about (the arrival check-in unless another was asked for). */
  session?: CheckInSessionInfo;
  teams: { team_id: number; name: string; members: number }[];
  absent_participants: number;
  waitlisted_teams: number;
}

export interface MyCheckIn {
  /** Empty unless some session is open. */
  token: string;
  /** The whole team's code (empty unless some session is open). */
  team_token: string;
  team: { id: number; name: string };
  sessions: MyCheckInSession[];
  window: 'NOT_OPEN' | 'OPEN' | 'CLOSED';
  opens_at: string | null;
  closes_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

export interface HackathonCertificate {
  kind: 'PARTICIPATION' | 'WINNER';
  title: string;
  body: string;
  name: string;
  team: string;
  hackathon: string;
  organizer: string;
  date: string;
  signatory_name: string;
  signatory_title: string;
  code: string;
}

export interface CertificateVerification {
  valid: boolean;
  name: string;
  hackathon: string;
  kind: 'PARTICIPATION' | 'WINNER';
  award: string | null;
  team: string;
}

export interface FinderSeeker {
  id: number;
  name: string;
  skills: string;
  note: string;
  profile: string;
  is_me: boolean;
  /** Only sent to team leaders, so they can call before inviting. */
  phone?: string;
}

export interface FinderTeam {
  id: number;
  name: string;
  looking_for: string;
  members: number;
  max_members: number;
  problem: string | null;
  leader: string;
}

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

/** A request to join a team: what the sender sees, and (with `name` and below) what the leader sees. */
export interface JoinRequestRow {
  id: number;
  team_id: number;
  team_name: string;
  status: JoinRequestStatus;
  message: string;
  created_at: string;
  decided_at: string | null;
  name?: string;
  profile?: string;
  skills?: string;
  /** Mobile number, sent only to the team's leader on an incoming request. */
  phone?: string;
  /** Why accepting would fail right now (the team is full, registration closed...), or empty. */
  blocked_reason?: string;
}

export interface JoinRequestsPayload {
  incoming: JoinRequestRow[];
  mine: JoinRequestRow[];
}

export interface FinderListing {
  seekers: FinderSeeker[];
  teams: FinderTeam[];
  my_profile: { skills: string; note: string } | null;
  my_requests: JoinRequestRow[];
}

export interface HackathonAnalytics {
  funnel: { key: string; label: string; count: number }[];
  checked_in: number;
  waitlisted_teams: number;
  by_branch: { label: string; count: number }[];
  by_year: { label: string; count: number }[];
  by_college: { label: string; count: number }[];
  joined_per_day: { date: string; count: number }[];
  capacity: { max_teams: number | null; max_participants: number | null; placed_teams: number; placed_participants: number };
}

// Phase 1 of submissions: the idea (plan), reviewed before the project (implementation) phase.
export type IdeaStatus = 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

export interface HackathonIdea {
  /** Average judge score out of 100 against the idea rubric. */
  score: number;
  review_count: number;
  id: number;
  team_id: number;
  team_name: string;
  title: string;
  problem: string;
  solution: string;
  plan: string;
  tech_stack: string[];
  deck_url: string | null;
  linkedin_url: string | null;
  /** The uploaded .ppt / .pptx. */
  deck_file: IdeaFileInfo | null;
  /** Only sent to the team and to organizers; never to judges. */
  payment_proof?: IdeaFileInfo | null;
  transaction_id?: string;
  status: IdeaStatus;
  feedback: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  state: string;
}

export type IdeaFileKind = 'DECK' | 'PAYMENT';

export interface IdeaDraft {
  title: string;
  problem: string;
  solution: string;
  plan: string;
  tech_stack: string[];
  deck_url: string;
  linkedin_url: string;
  transaction_id: string;
  /** Left out = keep the saved file, null = remove it, an id = use that upload. */
  deck_file_id?: string | null;
  payment_file_id?: string | null;
}

/** The organizers' choices for the idea form. */
export interface IdeaConfig {
  fee_amount: number;
  payment_note: string;
  deck_required: boolean;
  linkedin_required: boolean;
  files_available: boolean;
  /** The QR code teams scan to pay, if the organizers uploaded one. */
  payment_qr: { id: string; name: string } | null;
  edits_enabled: boolean;
  edits_until: string | null;
}

export interface MyIdeaPayload {
  state: SubmissionWindowState;
  opens_at: string | null;
  deadline: string | null;
  review_required: boolean;
  project_requires_idea: boolean;
  idea: HackathonIdea | null;
  can_edit: boolean;
  /** Why a team that already submitted cannot edit now (empty when it can). */
  edit_blocked_reason: string;
  config: IdeaConfig;
}

export interface AdminIdeasPayload {
  state: SubmissionWindowState;
  rows: (HackathonIdea & { team_status: string })[];
  missing: { id: number; name: string }[];
  counts: Record<IdeaStatus, number>;
  config: IdeaConfig;
}

export type RoundRuleKey =
  | 'PROJECT_SCORE_TOP' | 'PROJECT_SCORE_MIN' | 'IDEA_SCORE_TOP' | 'IDEA_SCORE_MIN' | 'IDEA_APPROVED' | 'HAS_PROJECT' | 'CHECKED_IN' | 'ALL_CHECKED_IN';

export interface AutoShortlistRow {
  entry_id: number;
  team_id: number;
  team_name: string;
  status: RoundEntryStatus;
  metric: number | null;
  selected: boolean;
}

export interface AutoShortlistResult {
  rule: RoundRuleKey;
  selected: AutoShortlistRow[];
  not_selected: AutoShortlistRow[];
  applied: boolean;
  limit: number | null;
  over_limit: boolean;
}

export interface IdeaLeaderboardRow {
  rank: number;
  idea_id: number;
  team_id: number;
  team_name: string;
  title: string;
  status: IdeaStatus;
  score: number;
  review_count: number;
}

export interface IdeaLeaderboardPayload {
  judges: number;
  rows: IdeaLeaderboardRow[];
  criteria: Required<JudgingCriterion>[];
}

export interface JudgingIdea extends HackathonIdea {
  is_own_team: boolean;
  my_review: JudgeReview | null;
}

export interface JudgingIdeasPayload {
  enabled: boolean;
  criteria: Required<JudgingCriterion>[];
  ideas: JudgingIdea[];
  reviewed: number;
  total: number;
}

/** One happy moment to show a person (a team registered, a welcome, a shortlisting...). Kept on their account until seen. */
export type CelebrationSize = 'SMALL' | 'MEDIUM' | 'BIG';

export interface Celebration {
  id: number;
  kind: string;
  size: CelebrationSize;
  title: string;
  message: string;
  link_url: string;
  payload: Record<string, string | number | boolean>;
  created_at: string;
}
