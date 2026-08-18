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
  roll_number?: string;
  branch?: string;
  year?: number;
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

/** Multi-rule conditional logic schema (v2). */
export interface ConditionalRule {
  if: string | number;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface ConditionalLogic {
  logic?: 'AND' | 'OR';
  rules?: ConditionalRule[];
  /** Legacy single-rule fields — kept for backward compat */
  if?: string | number;
  equals?: string;
  operator?: string;
  value?: string;
  /** Legacy alias used by old builder */
  parent?: string;
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
  is_required: boolean;
  options?: string[];
  /** Row labels for MATRIX_RADIO and MATRIX_CHECKBOX fields. */
  rows?: string[];
  /** Minimum value for RATING / LINEAR_SCALE. */
  min_value?: number;
  /** Maximum value for RATING / LINEAR_SCALE. */
  max_value?: number;
  conditional_logic?: ConditionalLogic;
  validation_rules?: Record<string, any>;
  order: number;
}

export interface Form {
  id: number | string;
  title: string;
  slug: string;
  description: string;
  image_url?: string;
  category?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'CLOSED';
  version?: number;
  allow_multiple_responses?: boolean;
  allow_edits_until?: string;
  open_at?: string;
  close_at?: string;
  fields?: FormField[];
  created_at?: string;
  updated_at?: string;
}

/** Shape of a single response submission answer. */
export interface FormAnswer {
  field: number;
  /** For MATRIX fields, value is Record<string, string>; for CHECKBOX, string[]; otherwise string. */
  value: string | string[] | Record<string, string> | null;
}

// ---------------------------------------------------------------------------
// Data Management Center types
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
  submitted_at: string;
  is_manual_entry: boolean;
  is_test_submission: boolean;
  form_version: number;
  user: ResponseUser | null;
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
