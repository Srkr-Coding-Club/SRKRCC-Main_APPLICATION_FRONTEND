import type { ProfileFieldKey } from '@/lib/types';

/** Profile attributes a hackathon can require, in the order admins see them. Mirrors apps.forms.models.ProfileField. */
export const PROFILE_FIELD_OPTIONS: { key: ProfileFieldKey; label: string }[] = [
  { key: 'full_name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'phone_number', label: 'Phone number' },
  { key: 'college', label: 'College' },
  { key: 'branch', label: 'Branch' },
  { key: 'year', label: 'Year' },
  { key: 'roll_number', label: 'Roll number' },
  { key: 'club_id', label: 'Club ID' },
];

export function profileFieldLabel(key: string): string {
  return PROFILE_FIELD_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
