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
  role: 'MEMBER' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
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

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  minSelected?: number;
  maxSelected?: number;
  minDate?: string;
  maxDate?: string;
  allowedFileTypes?: string;
  maxFileSizeMB?: number;
  patternError?: string;
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
  conditional_logic?: any;
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
  allow_edits_until?: string;
  open_at?: string;
  close_at?: string;
  club_id_enabled?: boolean;
  club_id_prefix?: string;
  club_id_field_mapping?: ClubIdFieldMapping;
  confirmation_email_enabled?: boolean;
  confirmation_email_template?: number | string | null;
  fields?: FormField[];
  created_at?: string;
  updated_at?: string;
  response_count?: number;
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

