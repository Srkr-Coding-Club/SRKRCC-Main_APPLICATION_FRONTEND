/**
 * Field rules for the signup and sign-in forms.
 *
 * These mirror `apps/accounts/validators.py` and `RegisterSerializer` on the
 * Django side. The server is the authority - this copy exists so a member sees
 * the problem as they type instead of after a round trip. If a rule changes in
 * one place it must change in the other, or the form will accept input the API
 * then rejects.
 */

// --- Name --------------------------------------------------------------------

/** Letters (incl. accented), spaces, hyphens, apostrophes, periods. No digits. */
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '\-.][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

/** Strips characters a person's name can never contain, for use while typing. */
export function sanitizeNameInput(value: string): string {
  return value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ '\-.]/g, '');
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateFullName(value: string): string | undefined {
  const name = normalizeName(value);
  if (!name) return 'Full name is required.';
  if (name.length < NAME_MIN_LENGTH) return `Name must be at least ${NAME_MIN_LENGTH} characters long.`;
  if (name.length > NAME_MAX_LENGTH) return `Name must be at most ${NAME_MAX_LENGTH} characters long.`;
  if (/\d/.test(name)) return 'Name cannot contain numbers.';
  if (!NAME_REGEX.test(name)) {
    return 'Name may only contain letters, spaces, hyphens and apostrophes.';
  }
  return undefined;
}

const OTHER_COLLEGE_NAME_REGEX = /^[A-Za-z0-9À-ÖØ-öø-ÿ][A-Za-z0-9À-ÖØ-öø-ÿ &.,'()/-]*$/;
const OTHER_COLLEGE_NAME_MIN_LENGTH = 3;
const OTHER_COLLEGE_NAME_MAX_LENGTH = 150;

/** For the "my college isn't listed" free-text field. Mirrors apps/accounts/validators.py. */
export function validateOtherCollegeName(value: string): string | undefined {
  const name = normalizeName(value);
  if (!name) return 'Enter your college name.';
  if (name.length < OTHER_COLLEGE_NAME_MIN_LENGTH) return `College name must be at least ${OTHER_COLLEGE_NAME_MIN_LENGTH} characters long.`;
  if (name.length > OTHER_COLLEGE_NAME_MAX_LENGTH) return `College name must be at most ${OTHER_COLLEGE_NAME_MAX_LENGTH} characters long.`;
  if (!OTHER_COLLEGE_NAME_REGEX.test(name)) return "College name may only contain letters, numbers, spaces and . , & ' ( ) / -";
  return undefined;
}

export { OTHER_COLLEGE_NAME_MAX_LENGTH };

/** Splits a validated full name into the first/last pair the API expects. */
export function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = normalizeName(value).split(' ');
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

// --- Email -------------------------------------------------------------------

const EMAIL_REGEX =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
export const EMAIL_MAX_LENGTH = 254;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | undefined {
  const email = normalizeEmail(value);
  if (!email) return 'Email is required.';
  if (email.length > EMAIL_MAX_LENGTH) return 'Email address is too long.';
  if (!email.includes('@')) return 'Email must contain an @ sign.';
  if (!EMAIL_REGEX.test(email)) {
    return 'Enter a valid email address, for example you@example.com.';
  }
  return undefined;
}

// --- Roll number -------------------------------------------------------------

const ROLL_NUMBER_REGEX = /^[0-9]{2}[A-Z0-9]{8}$/;
export const ROLL_NUMBER_LENGTH = 10;

/** Uppercases, drops non-alphanumerics and caps length, for use while typing. */
export function sanitizeRollNumberInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROLL_NUMBER_LENGTH);
}

/** Optional field - an empty value is valid (nothing to validate). */
export function validateRollNumber(value: string): string | undefined {
  const roll = sanitizeRollNumberInput(value);
  if (!roll) return undefined;
  if (roll.length !== ROLL_NUMBER_LENGTH) {
    return `Roll number must be exactly ${ROLL_NUMBER_LENGTH} characters (you have ${roll.length}).`;
  }
  if (!ROLL_NUMBER_REGEX.test(roll)) {
    return 'Roll number must start with a 2-digit year followed by 8 alphanumeric characters (e.g. 21B91A0501).';
  }
  return undefined;
}

// --- Phone number --------------------------------------------------------------

const PHONE_NUMBER_REGEX = /^\d{10}$/;
export const PHONE_NUMBER_LENGTH = 10;

/** Strips everything but digits and caps length, for use while typing. */
export function sanitizePhoneNumberInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_NUMBER_LENGTH);
}

/** Optional field - an empty value is valid (nothing to validate). */
export function validatePhoneNumber(value: string): string | undefined {
  const phone = value.replace(/\D/g, '');
  if (!phone) return undefined;
  if (phone.length !== PHONE_NUMBER_LENGTH || !PHONE_NUMBER_REGEX.test(phone)) {
    return `Phone number must be exactly ${PHONE_NUMBER_LENGTH} digits, numbers only.`;
  }
  return undefined;
}

// --- Affiliate (Club) ID -----------------------------------------------------

/**
 * The Club ID shapes in use: `<2-digit year>SCC<3+ digits>` (25SCC277, 26SCC123) and `<1-2 digit year>CCA<3+ digits>`
 * (21CCA041, 1CCA041). Mirrors apps/accounts/services/club_id_service.py.
 */
const AFFILIATE_ID_REGEX = /^(\d{1,2})(SCC|CCA)(\d{3,})$/;
export const AFFILIATE_ID_EXAMPLES = '25SCC277 or 21CCA041';

export function sanitizeAffiliateIdInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

export function validateAffiliateId(value: string): string | undefined {
  const id = sanitizeAffiliateIdInput(value);
  if (!id) return 'Affiliate ID is required when you mark yourself as an affiliate.';
  const match = AFFILIATE_ID_REGEX.exec(id);
  if (!match) {
    return `Affiliate ID must look like ${AFFILIATE_ID_EXAMPLES}: the year, SCC or CCA, then the number (3 digits or more).`;
  }
  if (match[2] === 'SCC' && match[1].length !== 2) {
    return 'An SCC Affiliate ID needs a two-digit year, like 25SCC277.';
  }
  return undefined;
}

// --- Password ----------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

/**
 * The checklist rendered under the password field. Mirrors the server's
 * password rules (ComplexPasswordValidator).
 */
export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`;
  }
  if (/\s/.test(password)) return 'Password must not contain spaces.';
  const unmet = getPasswordRules(password).filter((rule) => !rule.met);
  if (unmet.length > 0) {
    return `Password needs: ${unmet.map((rule) => rule.label.toLowerCase()).join(', ')}.`;
  }
  return undefined;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | undefined {
  if (!confirmation) return 'Please re-enter your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return undefined;
}

/** 0–4 score driving the strength meter. Presentation only; not a gate on its own. */
export function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = getPasswordRules(password).filter((rule) => rule.met).length;
  if (password.length >= 12) score += 1;
  if (/(.)\1{2,}/.test(password)) score -= 1; // "aaa" style runs

  const normalized = Math.max(0, Math.min(4, score - 1));
  return { score: normalized, label: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][normalized] };
}

// --- Server error mapping ----------------------------------------------------

/** Field errors keyed by the signup form's own field names. */
export type SignupFieldErrors = Partial<
  Record<'fullName' | 'email' | 'rollNumber' | 'college' | 'branch' | 'year' | 'phoneNumber' | 'affiliateId' | 'password' | 'confirmPassword', string>
>;

const API_FIELD_TO_FORM_FIELD: Record<string, keyof SignupFieldErrors> = {
  first_name: 'fullName',
  last_name: 'fullName',
  username: 'email', // username is derived from email; never shown as its own field
  email: 'email',
  roll_number: 'rollNumber',
  college_id: 'college',
  other_college_name: 'college',
  branch: 'branch',
  year: 'year',
  phone_number: 'phoneNumber',
  club_id: 'affiliateId',
  password: 'password',
};

/**
 * Turns a DRF `{field: [messages]}` body into errors anchored to the inputs the
 * member actually filled in, so a rejection lands under the offending field
 * rather than as one anonymous toast.
 */
export function mapApiErrorsToFields(apiErrors: Record<string, unknown> | null | undefined): SignupFieldErrors {
  const mapped: SignupFieldErrors = {};
  if (!apiErrors || typeof apiErrors !== 'object') return mapped;

  for (const [apiField, value] of Object.entries(apiErrors)) {
    const formField = API_FIELD_TO_FORM_FIELD[apiField];
    if (!formField) continue;
    const message = Array.isArray(value) ? String(value[0]) : String(value);
    if (message && !mapped[formField]) mapped[formField] = message;
  }
  return mapped;
}
