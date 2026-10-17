export interface College {
  id: number;
  code: string;
  name: string;
  district: string;
  state: string;
}

export interface CollegePage {
  count: number;
  next: string | null;
  results: College[];
}

/**
 * What the member picked. `otherName` non-null means "my college isn't listed":
 * the typed name is stored instead of a catalogue row. All-null is the untouched
 * state, where the club's home college applies.
 */
export interface CollegeChoice {
  college: College | null;
  otherName: string | null;
}

export const UNTOUCHED_COLLEGE_CHOICE: CollegeChoice = { college: null, otherName: null };

export function collegeChoiceFromProfile(profile: { college?: College | null; other_college_name?: string | null } | null): CollegeChoice {
  if (profile?.college) return { college: profile.college, otherName: null };
  if (profile?.other_college_name) return { college: null, otherName: profile.other_college_name };
  return UNTOUCHED_COLLEGE_CHOICE;
}

/** The member's college as text, whether it came from the catalogue or was typed in. */
export function displayCollegeName(profile: { college?: College | null; other_college_name?: string | null } | null): string | null {
  return profile?.college?.name || profile?.other_college_name || null;
}

/** The club's home college - what an account gets when the member does not pick another. */
export const DEFAULT_COLLEGE_CODE = 'C-24163';
export const DEFAULT_COLLEGE_NAME = 'SRKR Engineering College';

export const COLLEGE_PAGE_SIZE = 30;

export function formatCollegeLocation(college: Pick<College, 'district' | 'state'>): string {
  return [college.district, college.state].filter(Boolean).join(', ');
}

/**
 * Public catalogue lookup through the BFF proxy. A plain fetch rather than
 * fetchApi: the endpoint is anonymous, so a 401 must never trigger a login
 * redirect, and fetchApi would ignore the caller's AbortSignal.
 */
export async function fetchColleges(
  params: { query: string; page: number },
  signal?: AbortSignal,
): Promise<CollegePage> {
  const search = new URLSearchParams({ page: String(params.page), page_size: String(COLLEGE_PAGE_SIZE) });
  if (params.query) search.set('q', params.query);

  const res = await fetch(`/api/proxy/colleges?${search.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`College search failed (${res.status}).`);
  }
  return res.json();
}
