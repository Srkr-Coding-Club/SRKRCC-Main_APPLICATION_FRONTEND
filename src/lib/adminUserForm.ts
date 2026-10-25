import type { CollegeChoice } from '@/lib/colleges';
import { UNTOUCHED_COLLEGE_CHOICE } from '@/lib/colleges';
import {
  normalizeEmail,
  sanitizeAffiliateIdInput,
  sanitizeRollNumberInput,
  splitFullName,
  validateAffiliateId,
  validateEmail,
  validateFullName,
  validateOtherCollegeName,
  validatePassword,
  validatePhoneNumber,
  validateRollNumber,
} from '@/lib/validation/auth';

export type NewUserRole = 'AFFILIATE' | 'NON_AFFILIATE' | 'VOLUNTEER';

/** Everything the admin's "Create New User" form holds. */
export interface NewUserForm {
  name: string;
  email: string;
  rollNumber: string;
  phoneNumber: string;
  college: CollegeChoice;
  branch: string;
  /** "1" to "4". */
  year: string;
  role: NewUserRole;
  clubId: string;
  password: string;
}

export const BRANCHES = ['CSE', 'IT', 'AIML', 'AIDS', 'CIC', 'CSBS', 'CSIT', 'CSD', 'ECE', 'EEE', 'MECH', 'CIVIL'];
export const YEAR_OPTIONS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

export const EMPTY_NEW_USER: NewUserForm = {
  name: '',
  email: '',
  rollNumber: '',
  phoneNumber: '',
  college: UNTOUCHED_COLLEGE_CHOICE,
  branch: 'CSE',
  year: '1',
  role: 'NON_AFFILIATE',
  clubId: '',
  password: '',
};

export type NewUserField = 'name' | 'email' | 'rollNumber' | 'phoneNumber' | 'college' | 'branch' | 'year' | 'role' | 'clubId' | 'password';
export type NewUserErrors = Partial<Record<NewUserField | 'form', string>>;

/** The same rules the server applies, so most mistakes are caught before a request is made. */
export function validateNewUser(form: NewUserForm): NewUserErrors {
  const errors: NewUserErrors = {};
  const set = (field: NewUserField, message: string | undefined) => { if (message) errors[field] = message; };

  set('name', validateFullName(form.name));
  set('email', validateEmail(form.email));
  set('rollNumber', validateRollNumber(form.rollNumber));
  set('phoneNumber', form.phoneNumber.trim() ? validatePhoneNumber(form.phoneNumber) : undefined);
  if (form.college.otherName !== null) set('college', validateOtherCollegeName(form.college.otherName));
  if (!BRANCHES.includes(form.branch)) errors.branch = 'Choose a branch.';
  if (!YEAR_OPTIONS.some((option) => option.value === form.year)) errors.year = 'Choose the year of study (1 to 4).';
  if (form.role === 'AFFILIATE' || form.clubId.trim()) set('clubId', validateAffiliateId(form.clubId));
  if (!form.password) errors.password = 'Set a password for the account.';
  else set('password', validatePassword(form.password));
  return errors;
}

/** The body for `POST /auth/register/`. A college left untouched is not sent: the server then uses the club's home college. */
export function buildRegisterPayload(form: NewUserForm): Record<string, unknown> {
  const { firstName, lastName } = splitFullName(form.name);
  const roll = sanitizeRollNumberInput(form.rollNumber);
  const club = sanitizeAffiliateIdInput(form.clubId);
  return {
    email: normalizeEmail(form.email),
    password: form.password,
    first_name: firstName,
    last_name: lastName,
    role: form.role,
    branch: form.branch,
    year: Number(form.year),
    ...(roll ? { roll_number: roll } : {}),
    ...(form.phoneNumber.trim() ? { phone_number: form.phoneNumber.replace(/\D/g, '') } : {}),
    ...(form.college.otherName !== null
      ? { other_college_name: form.college.otherName.trim() }
      : form.college.college ? { college_id: form.college.college.id } : {}),
    ...(club ? { club_id: club } : {}),
  };
}

const API_FIELD: Record<string, NewUserField> = {
  first_name: 'name', last_name: 'name', email: 'email', roll_number: 'rollNumber', phone_number: 'phoneNumber',
  college_id: 'college', college: 'college', other_college_name: 'college', branch: 'branch', year: 'year', role: 'role',
  club_id: 'clubId', password: 'password',
};

/** Turns the server's `{field: [messages]}` into messages under the inputs they are about. Anything unmapped goes to `form`. */
export function mapRegisterErrors(body: unknown): NewUserErrors {
  const mapped: NewUserErrors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return mapped;
  for (const [field, value] of Object.entries(body as Record<string, unknown>)) {
    const message = Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' ? value : '';
    if (!message) continue;
    const target = API_FIELD[field] ?? 'form';
    if (!mapped[target]) mapped[target] = message;
  }
  return mapped;
}

/** The first field with an error, in the order the form shows them, so it can be focused. */
export const FIELD_ORDER: NewUserField[] = ['name', 'email', 'rollNumber', 'phoneNumber', 'college', 'branch', 'year', 'role', 'clubId', 'password'];
export const firstErrorField = (errors: NewUserErrors): NewUserField | null => FIELD_ORDER.find((field) => errors[field]) ?? null;
