/**
 * Field rules for the signup and sign-in forms.
 *
 * These mirror `apps/accounts/validators.py` and `RegisterSerializer` on the
 * Django side. The server is the authority — this copy exists so a member sees
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
    return 'Enter a valid email address, for example student@srkr.ac.in.';
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

/** Optional field — an empty value is valid (nothing to validate). */
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

/** Optional field — an empty value is valid (nothing to validate). */
export function validatePhoneNumber(value: string): string | undefined {
  const phone = value.replace(/\D/g, '');
  if (!phone) return undefined;
  if (phone.length !== PHONE_NUMBER_LENGTH || !PHONE_NUMBER_REGEX.test(phone)) {
    return `Phone number must be exactly ${PHONE_NUMBER_LENGTH} digits, numbers only.`;
  }
  return undefined;
}

// --- Affiliate (Club) ID -----------------------------------------------------

/** `<2-digit year><3-letter prefix><3+ digit sequence>`, e.g. 25SCC277. */
const AFFILIATE_ID_REGEX = /^(\d{2})([A-Z]{3})(\d{3,})$/;
const AFFILIATE_PREFIX = 'SCC';

export function sanitizeAffiliateIdInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

export function validateAffiliateId(value: string): string | undefined {
  const id = sanitizeAffiliateIdInput(value);
  if (!id) return 'Affiliate ID is required when you mark yourself as an affiliate.';
  const match = AFFILIATE_ID_REGEX.exec(id);
  if (!match) {
    return 'Affiliate ID must look like 25SCC277 — two-digit year, three letters, then the number.';
  }
  if (match[2] !== AFFILIATE_PREFIX) {
    return `Affiliate ID prefix must be ${AFFILIATE_PREFIX}, e.g. 25${AFFILIATE_PREFIX}277.`;
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
 * Extracts the identity fragments a password must not contain — the local
 * part of an email, and each word of a name — mirroring what Django's
 * UserAttributeSimilarityValidator checks server-side. Fragments under 4
 * characters are skipped: they'd false-positive on common short syllables.
 */
function identityFragments(identifiers: Array<string | undefined>): string[] {
  const fragments: string[] = [];
  for (const raw of identifiers) {
    const value = (raw || '').trim();
    if (!value) continue;
    const emailLocal = value.split('@')[0];
    for (const word of `${value} ${emailLocal}`.split(/[\s@._-]+/)) {
      const cleaned = word.trim().toLowerCase();
      if (cleaned.length >= 4) fragments.push(cleaned);
    }
  }
  return Array.from(new Set(fragments));
}

function containsIdentityFragment(password: string, identifiers: Array<string | undefined>): boolean {
  const lowered = password.toLowerCase();
  return identityFragments(identifiers).some((fragment) => lowered.includes(fragment));
}

/**
 * The checklist rendered under the password field. Same rules the server
 * enforces — the "no personal info" rule only appears when `identifiers` is
 * given, so the meter and checklist never disagree with the blocking error:
 * a password can't show as fully green/"Strong" while still being rejected
 * for containing the member's own name or email.
 */
export function getPasswordRules(password: string, identifiers?: Array<string | undefined>): PasswordRule[] {
  const rules: PasswordRule[] = [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  if (identifiers && identityFragments(identifiers).length > 0) {
    rules.push({
      id: 'identity',
      label: 'Does not contain your name or email',
      met: !containsIdentityFragment(password, identifiers),
    });
  }
  return rules;
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

/**
 * Catches passwords Django's UserAttributeSimilarityValidator would reject, so
 * the member isn't told about it only after submitting.
 */
export function validatePasswordNotSimilarToIdentity(
  password: string,
  identifiers: Array<string | undefined>,
): string | undefined {
  return containsIdentityFragment(password, identifiers)
    ? 'Password must not contain your name or email address.'
    : undefined;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | undefined {
  if (!confirmation) return 'Please re-enter your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return undefined;
}

/**
 * 0–4 score driving the strength meter. Presentation only; not a gate on its
 * own — but it factors in the identity rule (when `identifiers` is passed) so
 * it can never read "Strong" while that rule is the reason submission is
 * blocked.
 */
export function getPasswordStrength(
  password: string,
  identifiers?: Array<string | undefined>,
): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  const rules = getPasswordRules(password, identifiers);
  let score = rules.filter((rule) => rule.met).length;
  if (password.length >= 12) score += 1;
  if (/(.)\1{2,}/.test(password)) score -= 1; // "aaa" style runs
  if (identifiers && !rules.find((rule) => rule.id === 'identity')?.met) score = Math.min(score, 1);

  const normalized = Math.max(0, Math.min(4, score - 1));
  return { score: normalized, label: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][normalized] };
}

// --- Server error mapping ----------------------------------------------------

/** Field errors keyed by the signup form's own field names. */
export type SignupFieldErrors = Partial<
  Record<'fullName' | 'email' | 'rollNumber' | 'branch' | 'year' | 'phoneNumber' | 'affiliateId' | 'password' | 'confirmPassword', string>
>;

const API_FIELD_TO_FORM_FIELD: Record<string, keyof SignupFieldErrors> = {
  first_name: 'fullName',
  last_name: 'fullName',
  username: 'email', // username is derived from email; never shown as its own field
  email: 'email',
  roll_number: 'rollNumber',
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
