'use client';

import React, { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Hash,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Users,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';

import { useRouter, useSearchParams } from 'next/navigation';
import { registerUser, loginUser, RegistrationError } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';
import {
  SignupFieldErrors,
  getPasswordRules,
  getPasswordStrength,
  mapApiErrorsToFields,
  normalizeEmail,
  sanitizeAffiliateIdInput,
  sanitizeNameInput,
  sanitizeRollNumberInput,
  splitFullName,
  validateAffiliateId,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
  validatePasswordNotSimilarToIdentity,
  validateRollNumber,
} from '@/lib/validation/auth';

function isSafeNextPath(next: string | null): next is string {
  return !!next && next.startsWith('/') && !next.startsWith('//');
}

const BRANCHES = [
  { value: 'CSE', label: 'CSE' },
  { value: 'IT', label: 'IT' },
  { value: 'AIML', label: 'AI & ML' },
  { value: 'AIDS', label: 'AI & DS' },
  { value: 'CIC', label: 'CIC' },
  { value: 'CSBS', label: 'CSBS' },
  { value: 'CSIT', label: 'CSIT' },
  { value: 'CSD', label: 'CSD' },
  { value: 'ECE', label: 'ECE' },
  { value: 'EEE', label: 'EEE' },
  { value: 'MECH', label: 'MECH' },
  { value: 'CIVIL', label: 'CIVIL' },
];

const YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

type FieldName = keyof SignupFieldErrors;

/** DOM ids so a failed submit can focus the first offending input. */
const FIELD_INPUT_ID: Record<FieldName, string> = {
  fullName: 'signup-full-name',
  email: 'signup-email',
  rollNumber: 'signup-roll-number',
  branch: 'signup-branch',
  year: 'signup-year',
  affiliateId: 'signup-affiliate-id',
  password: 'signup-password',
  confirmPassword: 'signup-confirm-password',
};

/** Submit-order, so the error summary and focus land on the topmost problem. */
const FIELD_ORDER: FieldName[] = [
  'fullName',
  'email',
  'rollNumber',
  'branch',
  'year',
  'affiliateId',
  'password',
  'confirmPassword',
];

const STRENGTH_BAR_COLORS = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];
const STRENGTH_TEXT_COLORS = ['text-rose-500', 'text-rose-500', 'text-amber-500', 'text-lime-600', 'text-emerald-500'];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-rose-500">
      <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    rollNumber: '',
    branch: 'CSE',
    year: '2',
    isAffiliate: false,
    affiliateId: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  /** Fields the member has left at least once — gates inline errors while typing. */
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  /** Errors returned by the API, which outrank the client-side check until the field changes. */
  const [serverErrors, setServerErrors] = useState<SignupFieldErrors>({});

  const clientErrors = useMemo<SignupFieldErrors>(() => {
    const errors: SignupFieldErrors = {};
    errors.fullName = validateFullName(formData.fullName);
    errors.email = validateEmail(formData.email);
    errors.rollNumber = validateRollNumber(formData.rollNumber);
    if (formData.isAffiliate) {
      errors.affiliateId = validateAffiliateId(formData.affiliateId);
    }
    errors.password =
      validatePassword(formData.password) ||
      validatePasswordNotSimilarToIdentity(formData.password, [formData.email, formData.fullName]);
    errors.confirmPassword = validatePasswordConfirmation(formData.password, formData.confirmPassword);
    return errors;
  }, [formData]);

  const visibleError = (field: FieldName): string | undefined =>
    serverErrors[field] || (touched[field] ? clientErrors[field] : undefined);

  const identityIdentifiers = [formData.email, formData.fullName];
  const passwordRules = getPasswordRules(formData.password, identityIdentifiers);
  const strength = getPasswordStrength(formData.password, identityIdentifiers);
  const emailAlreadyRegistered = Boolean(serverErrors.email?.toLowerCase().includes('already exists'));

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // A server verdict describes the value that was submitted, so it stops
    // applying the moment that value changes.
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field as FieldName];
      return next;
    });
  };

  const markTouched = (field: FieldName) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));
    setServerErrors({});

    const firstInvalid = FIELD_ORDER.find((field) => clientErrors[field]);
    if (firstInvalid) {
      toast.warning('Check Your Details', clientErrors[firstInvalid]!);
      document.getElementById(FIELD_INPUT_ID[firstInvalid])?.focus();
      return;
    }

    setIsLoading(true);
    const email = normalizeEmail(formData.email);
    const { firstName, lastName } = splitFullName(formData.fullName);

    try {
      await registerUser({
        // `username` is intentionally not sent — the server derives it from the
        // email and de-duplicates it, so two people sharing an email local part
        // no longer collide.
        email,
        password: formData.password,
        first_name: firstName,
        last_name: lastName,
        roll_number: sanitizeRollNumberInput(formData.rollNumber),
        branch: formData.branch,
        year: Number(formData.year),
        role: formData.isAffiliate ? 'AFFILIATE' : 'NON_AFFILIATE',
        club_id: formData.isAffiliate ? sanitizeAffiliateIdInput(formData.affiliateId) : undefined,
      });

      await loginUser(email, formData.password);
      setSuccess(true);
      toast.success('Account Created', `Welcome to SRKR Coding Club, ${firstName}!`);

      setTimeout(() => {
        router.push(isSafeNextPath(nextUrl) ? nextUrl : '/profile');
      }, 500);
    } catch (err) {
      const registrationError = err as RegistrationError;
      const mapped = mapApiErrorsToFields(registrationError.fieldErrors);

      if (Object.keys(mapped).length > 0) {
        setServerErrors(mapped);
        const firstServerField = FIELD_ORDER.find((field) => mapped[field]);
        if (firstServerField) {
          toast.error('Registration Failed', mapped[firstServerField]!);
          document.getElementById(FIELD_INPUT_ID[firstServerField])?.focus();
        }
      } else {
        toast.error('Registration Failed', registrationError?.message || 'Please check your inputs and try again.');
      }
      setIsLoading(false);
    }
  };

  const inputClasses = (field: FieldName, extra = 'pl-10 pr-4') =>
    `w-full ${extra} py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white transition-colors focus:outline-none focus:ring-2 ${
      visibleError(field)
        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
        : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:ring-[#FF7A00]/25'
    }`;

  const labelClasses = 'block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white';

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 sm:py-16 flex items-center justify-center transition-colors duration-300">
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="glass-panel rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20 space-y-8">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-[#FFE5CC] dark:bg-[#8B2E3B]/30">
              <BrainLogo size={44} showRays={true} animated={false} />
            </div>

            <div className="flex justify-center">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border border-orange-200 dark:border-orange-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>STUDENT REGISTRATION</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
              Join SRKR Coding Club
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Create your developer profile to register for flagship hackathons, workshops, and daily problem streaks.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-7">

            {/* ---- Section: Your details ---- */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                Your Details
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.fullName} className={labelClasses}>
                    Full Name <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id={FIELD_INPUT_ID.fullName}
                      type="text"
                      autoComplete="name"
                      inputMode="text"
                      maxLength={60}
                      placeholder="John Doe"
                      value={formData.fullName}
                      aria-invalid={Boolean(visibleError('fullName'))}
                      aria-describedby={visibleError('fullName') ? 'signup-full-name-error' : undefined}
                      // Digits and symbols are stripped as they are typed, so the
                      // field cannot hold a value the API would reject.
                      onChange={(e) => handleChange('fullName', sanitizeNameInput(e.target.value))}
                      onBlur={() => markTouched('fullName')}
                      disabled={isLoading || success}
                      className={inputClasses('fullName')}
                    />
                  </div>
                  <FieldError id="signup-full-name-error" message={visibleError('fullName')} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.email} className={labelClasses}>
                    College Email <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id={FIELD_INPUT_ID.email}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      placeholder="student@srkr.ac.in"
                      value={formData.email}
                      aria-invalid={Boolean(visibleError('email'))}
                      aria-describedby={visibleError('email') ? 'signup-email-error' : undefined}
                      onChange={(e) => handleChange('email', e.target.value.replace(/\s/g, ''))}
                      onBlur={() => markTouched('email')}
                      disabled={isLoading || success}
                      className={inputClasses('email')}
                    />
                  </div>
                  <FieldError id="signup-email-error" message={visibleError('email')} />
                  {emailAlreadyRegistered && (
                    <Link
                      href={isSafeNextPath(nextUrl) ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login'}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#FF7A00] hover:text-[#E06B00]"
                    >
                      Sign in with this email instead
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                  {!visibleError('email') && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      This is your unique login ID for the site.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ---- Section: Academic ---- */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                Academic
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.rollNumber} className={labelClasses}>
                    Roll Number <span className="text-slate-400 font-medium normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      id={FIELD_INPUT_ID.rollNumber}
                      type="text"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder="21B91A0501"
                      value={formData.rollNumber}
                      aria-invalid={Boolean(visibleError('rollNumber'))}
                      aria-describedby={visibleError('rollNumber') ? 'signup-roll-error' : undefined}
                      // Uppercased and clipped to 10 alphanumerics on the way in.
                      onChange={(e) => handleChange('rollNumber', sanitizeRollNumberInput(e.target.value))}
                      onBlur={() => markTouched('rollNumber')}
                      disabled={isLoading || success}
                      className={`${inputClasses('rollNumber', 'pl-9 pr-12')} font-mono tracking-wide`}
                    />
                    <span
                      className={`absolute inset-y-0 right-3 flex items-center text-[11px] font-mono font-semibold ${
                        formData.rollNumber.length === 10 ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    >
                      {formData.rollNumber.length}/10
                    </span>
                  </div>
                  <FieldError id="signup-roll-error" message={visibleError('rollNumber')} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.branch} className={labelClasses}>
                    Branch <span className="text-[#FF7A00]">*</span>
                  </label>
                  <select
                    id={FIELD_INPUT_ID.branch}
                    value={formData.branch}
                    onChange={(e) => handleChange('branch', e.target.value)}
                    disabled={isLoading || success}
                    className={inputClasses('branch', 'px-3')}
                  >
                    {BRANCHES.map((branch) => (
                      <option key={branch.value} value={branch.value}>
                        {branch.label}
                      </option>
                    ))}
                  </select>
                  <FieldError id="signup-branch-error" message={visibleError('branch')} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.year} className={labelClasses}>
                    Year of Study <span className="text-[#FF7A00]">*</span>
                  </label>
                  <select
                    id={FIELD_INPUT_ID.year}
                    value={formData.year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    disabled={isLoading || success}
                    className={inputClasses('year', 'px-3')}
                  >
                    {YEARS.map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                  <FieldError id="signup-year-error" message={visibleError('year')} />
                </div>
              </div>

              {/* Affiliate toggle — replaces the old "Register As" role picker.
                  This checkbox sets the account's role directly: checked sends
                  AFFILIATE (and requires the Club ID handed out offline),
                  unchecked sends NON_AFFILIATE. */}
              <div
                className={`rounded-xl border transition-colors ${
                  formData.isAffiliate
                    ? 'border-[#FF7A00] bg-orange-50/60 dark:bg-orange-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-[#FAFAFC] dark:bg-[#0D0E15]'
                }`}
              >
                <label className="flex items-start gap-3 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAffiliate}
                    onChange={(e) => {
                      handleChange('isAffiliate', e.target.checked);
                      if (!e.target.checked) {
                        handleChange('affiliateId', '');
                        setTouched((prev) => ({ ...prev, affiliateId: false }));
                      }
                    }}
                    disabled={isLoading || success}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 dark:border-slate-700 text-[#FF7A00] accent-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/30"
                  />
                  <span className="space-y-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A2E] dark:text-white">
                      <Users className="w-3.5 h-3.5 text-[#FF7A00]" />
                      Are you an affiliate?
                    </span>
                    <span className="block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Tick this only if a club representative already gave you a Club Affiliate ID. Otherwise leave it
                      unticked — one will be assigned to you.
                    </span>
                  </span>
                </label>

                {formData.isAffiliate && (
                  <div className="px-4 pb-4 space-y-1.5">
                    <label htmlFor={FIELD_INPUT_ID.affiliateId} className={labelClasses}>
                      Affiliate ID <span className="text-[#FF7A00]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <input
                        id={FIELD_INPUT_ID.affiliateId}
                        type="text"
                        autoFocus
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="25SCC277"
                        value={formData.affiliateId}
                        aria-invalid={Boolean(visibleError('affiliateId'))}
                        aria-describedby={visibleError('affiliateId') ? 'signup-affiliate-error' : undefined}
                        onChange={(e) => handleChange('affiliateId', sanitizeAffiliateIdInput(e.target.value))}
                        onBlur={() => markTouched('affiliateId')}
                        disabled={isLoading || success}
                        className={`${inputClasses('affiliateId')} glass-panel font-mono tracking-wide`}
                      />
                    </div>
                    <FieldError id="signup-affiliate-error" message={visibleError('affiliateId')} />
                    {!visibleError('affiliateId') && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Format: two-digit year, then SCC, then your number — e.g. 25SCC277.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ---- Section: Security ---- */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                Security
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.password} className={labelClasses}>
                    Password <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id={FIELD_INPUT_ID.password}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      maxLength={72}
                      placeholder="••••••••"
                      value={formData.password}
                      aria-invalid={Boolean(visibleError('password'))}
                      aria-describedby={visibleError('password') ? 'signup-password-error' : 'signup-password-rules'}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => markTouched('password')}
                      disabled={isLoading || success}
                      className={inputClasses('password', 'pl-10 pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-100 active:scale-90"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError id="signup-password-error" message={visibleError('password')} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={FIELD_INPUT_ID.confirmPassword} className={labelClasses}>
                    Confirm Password <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id={FIELD_INPUT_ID.confirmPassword}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      maxLength={72}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      aria-invalid={Boolean(visibleError('confirmPassword'))}
                      aria-describedby={visibleError('confirmPassword') ? 'signup-confirm-error' : undefined}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      onBlur={() => markTouched('confirmPassword')}
                      disabled={isLoading || success}
                      className={inputClasses('confirmPassword', 'pl-10 pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-100 active:scale-90"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError id="signup-confirm-error" message={visibleError('confirmPassword')} />
                  {!visibleError('confirmPassword') && formData.confirmPassword && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                      <Check className="w-3.5 h-3.5" />
                      Passwords match
                    </p>
                  )}
                </div>
              </div>

              {/* Strength meter + live rule checklist */}
              {formData.password && (
                <div id="signup-password-rules" className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFC] dark:bg-[#0D0E15] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((segment) => (
                        <span
                          key={segment}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            segment < strength.score ? STRENGTH_BAR_COLORS[strength.score] : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${STRENGTH_TEXT_COLORS[strength.score]}`}>
                      {strength.label}
                    </span>
                  </div>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {passwordRules.map((rule) => (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-1.5 text-[11px] font-medium ${
                          rule.met ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {rule.met ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0" />}
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full inline-flex items-center justify-center space-x-2 py-3.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account created — redirecting…</span>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              href={isSafeNextPath(nextUrl) ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login'}
              className="font-bold text-[#FF7A00] hover:text-[#E06B00]"
            >
              Sign In Here
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}
