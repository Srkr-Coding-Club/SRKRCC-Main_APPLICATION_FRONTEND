/** Shape returned by GET /api/forms/{slug}/analytics/ (apps/forms/analytics.py). */

export interface FieldStats {
  field_id: number;
  label: string;
  type: string;
  answered: number;
  answer_rate: number;
  options?: { option: string; count: number }[];
  other_count?: number;
  numeric?: { min: number; max: number; average: number };
  distinct?: number;
  most_common?: { value: string; count: number }[];
}

export interface FormAnalytics {
  form: { id: number; slug: string; title: string };
  total_responses: number;
  responses_analysed: number;
  truncated: boolean;
  first_response_at: string | null;
  last_response_at: string | null;
  days: number;
  timeline: { date: string; count: number }[];
  unfinished: { count: number; stopped_after: { field_id: number | null; label: string; count: number }[] };
  fields: FieldStats[];
}

export function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Share of the answers that picked an option, 0-100, for drawing a bar. */
export function barWidth(count: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, Math.round((count / total) * 100))) : 0;
}
