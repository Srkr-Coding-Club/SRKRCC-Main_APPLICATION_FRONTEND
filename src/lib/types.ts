export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  updated_at?: string;
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
  start_time: string;
  end_time: string;
  image_url?: string;
  form_slug?: string;
  speaker?: string;
  tags?: string[];
}

export interface Hackathon {
  id: number;
  title: string;
  slug: string;
  is_flagship: boolean;
  theme: string;
  description: string;
  prize_pool: string;
  start_date: string;
  end_date: string;
  image_url?: string;
  form_slug?: string;
  tracks?: string[];
  team_size?: string;
}

/** IconCoders is an individual DSA-challenge competition — its own entity,
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
  /** Where to actually solve it — a LeetCode/GFG/etc. problem page. No in-house judge exists. */
  external_url?: string;
  external_platform?: string;
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
 * Canonical validation-rule shape — a strict superset of what the builder used to
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
  | 'RATING'
  | 'LINEAR_SCALE'
  | 'MATRIX_RADIO'
  | 'MATRIX_CHECKBOX'
  | 'SIGNATURE';

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
  confirmation_email_enabled?: boolean;
  confirmation_email_template?: number | string | null;
  /** QR-code attendance tracking — see apps/forms/models.py's attendance_* fields. */
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
// QR-code attendance types — see apps/attendance/serializers.py & views.py
// ---------------------------------------------------------------------------

/** GET /api/forms/<id>/attendance/sessions/ — one row per scannable session. */
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

/** GET /api/forms/<id>/attendance/my-badge/ — the caller's own badge. */
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

/** Maps club-member profile attributes to this form's own field IDs (see FormBuilderTab's Automation card). */
export interface ClubIdFieldMapping {
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

