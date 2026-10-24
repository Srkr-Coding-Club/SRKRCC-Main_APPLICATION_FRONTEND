'use client';

import React, { useState, useEffect,useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Form, FormField, CrossFieldRule, ProfileFieldKey } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { getStoredUser, fetchAndSyncCurrentUser, AuthUser } from '@/lib/auth';
import { displayCollegeName } from '@/lib/colleges';
import { getConstraintHint, validateSubmission, validateFieldValue, getCrossFieldError } from '@/lib/formValidation';
import { computeLayout, isFieldRequired } from '@/lib/formConditional';
import { nextReachable, pageIndexByField, pageProgress, previousReachable, settlePage } from '@/lib/formPages';
import { clearFormBackup, useFormDraft } from '@/lib/hooks/useFormDraft';
import FileUploadField from '@/components/forms/FileUploadField';
import { useUploadConfig } from '@/lib/uploadConfig';
import { isNonAnswerType } from '@/lib/fieldTypes';
import { calculatedValues } from '@/lib/formula';
import { pipeText } from '@/lib/formPiping';
import { defaultAnswers, hiddenAnswers } from '@/lib/formDefaults';
import { useToast } from '@/context/ToastContext';
import {
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
  Upload,
  Calendar,
  Lock,
  UserCheck,
  Edit3,
  RefreshCw,
  Sparkles,
  Check,
  ChevronDown,
  Star,
  Info,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { SubmissionThanks } from '@/components/forms/SubmissionThanks';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { restrictsFeatures } from '@/lib/emailVerification';
import { normalizeLanguage, translate, type FormStringKey } from '@/lib/i18n/formStrings';
import { TurnstileWidget } from '@/components/forms/TurnstileWidget';
import {
  SpotlightInput,
  SpotlightTextarea,
  SpotlightSelect,
  FieldLabel,
  BottomGradient,
} from '@/components/ui/InputField';
import Portal from '@/components/ui/Portal';

/**
 * Intelligent matcher that matches FormField definitions to authenticated student profile fields.
 */
const mockFormCatalog: Record<string, Form> = {
  'hackathon-registration-2026': {
    id: 101,
    title: 'Hackathon Registration 2026',
    slug: 'hackathon-registration-2026',
    description:
      'Join our flagship annual hackathon for a fast-paced innovation sprint with coding, design, and product challenges.',
    image_url:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    category: 'Hackathon',
    status: 'PUBLISHED',
    open_at: '2026-08-29T10:00:00Z',
    close_at: '2026-09-12T23:59:00Z',
    allow_multiple_responses: false,
    enable_prefill: true,
    fields: [
      { id: 1, label: 'Full Name', type: 'TEXT', placeholder: 'Your full name', is_required: true, order: 1 },
      { id: 2, label: 'Email Address', type: 'EMAIL', placeholder: 'you@example.com', is_required: true, order: 2 },
      { id: 3, label: 'Phone Number', type: 'PHONE', placeholder: '+91 9876543210', is_required: true, order: 3 },
      { id: 4, label: 'College / University', type: 'TEXT', placeholder: 'Your college name', is_required: true, order: 4 },
      { id: 5, label: 'Branch', type: 'DROPDOWN', placeholder: 'Select your branch', is_required: true, options: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'Other'], order: 5 },
      { id: 6, label: 'Current Year', type: 'RADIO', is_required: true, options: ['1st Year', '2nd Year', '3rd Year', '4th Year'], order: 6 },
      { id: 7, label: 'Team Size', type: 'NUMBER', placeholder: 'e.g. 3', is_required: true, validation_rules: { minValue: 1, maxValue: 5 }, order: 7 },
      { id: 8, label: 'What excites you about this hackathon?', type: 'PARAGRAPH', placeholder: 'Tell us your motivation...', is_required: true, order: 8 },
      { id: 9, label: 'Track Preference', type: 'CHECKBOX', is_required: false, options: ['Web', 'AI/ML', 'Mobile', 'Cybersecurity', 'IoT'], order: 9 },
    ],
  },
  'react-ui-design-workshop': {
    id: 102,
    title: 'Workshop RSVP: React & UI Design',
    slug: 'react-ui-design-workshop',
    description:
      'Attend our live workshop on React patterns, component thinking, and polished UI design workflows.',
    category: 'Workshop',
    status: 'SCHEDULED',
    open_at: '2026-09-03T09:00:00Z',
    close_at: '2026-09-09T18:00:00Z',
    allow_multiple_responses: false,
    enable_prefill: true,
    fields: [
      { id: 1, label: 'Full Name', type: 'TEXT', placeholder: 'Your name', is_required: true, order: 1 },
      { id: 2, label: 'Email Address', type: 'EMAIL', placeholder: 'you@example.com', is_required: true, order: 2 },
      { id: 3, label: 'Year of Study', type: 'DROPDOWN', is_required: true, options: ['1st Year', '2nd Year', '3rd Year', '4th Year'], order: 3 },
      { id: 4, label: 'Skill Level', type: 'RADIO', is_required: true, options: ['Beginner', 'Intermediate', 'Advanced'], order: 4 },
      { id: 5, label: 'What do you want to learn?', type: 'PARAGRAPH', placeholder: 'Share your goals...', is_required: false, order: 5 },
    ],
  },
  'core-team-recruitment-2026': {
    id: 103,
    title: 'Core Team Recruitment 2026',
    slug: 'core-team-recruitment-2026',
    description:
      'Apply to be part of the club leadership team for events, design, content, outreach, and technical initiatives.',
    category: 'Recruitment',
    status: 'PUBLISHED',
    open_at: '2026-08-20T08:00:00Z',
    close_at: '2026-09-06T20:00:00Z',
    allow_multiple_responses: false,
    enable_prefill: true,
    fields: [
      { id: 1, label: 'Full Name', type: 'TEXT', placeholder: 'Your name', is_required: true, order: 1 },
      { id: 2, label: 'Student Email', type: 'EMAIL', placeholder: 'yourcollegeid@college.edu', is_required: true, order: 2 },
      { id: 3, label: 'Phone Number', type: 'PHONE', placeholder: '+91 9876543210', is_required: true, order: 3 },
      { id: 4, label: 'Department', type: 'DROPDOWN', is_required: true, options: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'Other'], order: 4 },
      { id: 5, label: 'Preferred Role', type: 'RADIO', is_required: true, options: ['Technical', 'Design', 'Content', 'Outreach', 'Operations'], order: 5 },
      { id: 6, label: 'Why do you want to join?', type: 'PARAGRAPH', placeholder: 'Share your motivation...', is_required: true, order: 6 },
    ],
  },
  'student-feedback-survey': {
    id: 104,
    title: 'Student Feedback Survey',
    slug: 'student-feedback-survey',
    description:
      'Let us know what you liked, what needs improvement, and what events you would like to see next.',
    category: 'Feedback',
    status: 'PUBLISHED',
    open_at: '2026-08-25T00:00:00Z',
    close_at: '2026-09-20T23:59:00Z',
    allow_multiple_responses: true,
    enable_prefill: true,
    fields: [
      { id: 1, label: 'Name', type: 'TEXT', placeholder: 'Your name', is_required: false, order: 1 },
      { id: 2, label: 'Email', type: 'EMAIL', placeholder: 'you@example.com', is_required: false, order: 2 },
      { id: 3, label: 'How satisfied are you with the club events?', type: 'RADIO', is_required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'], order: 3 },
      { id: 4, label: 'What should we improve?', type: 'PARAGRAPH', placeholder: 'Your feedback matters...', is_required: true, order: 4 },
    ],
  },
};

const mockFormAliases: Record<string, string> = {
  'hackoverflow-2026-registration': 'hackathon-registration-2026',
  'coding-club-core-team': 'core-team-recruitment-2026',
  'modern-web-development': 'react-ui-design-workshop',
};

const mockFormTitles: Record<string, string> = {
  'ai-ml-bootcamp': 'AI & Machine Learning Bootcamp',
  'open-source-drive': 'Open Source Contribution Drive',
  'competitive-programming': 'Competitive Programming Challenge',
  'cloud-computing-workshop': 'Cloud Computing Workshop',
  'cybersecurity-program': 'Cybersecurity Awareness Program',
};

function getFallbackForm(slug: string): Form | null {
  const normalizedSlug = decodeURIComponent(slug);
  const aliasedForm = mockFormCatalog[mockFormAliases[normalizedSlug] || normalizedSlug];
  if (aliasedForm) {
    return { ...aliasedForm, slug: normalizedSlug };
  }

  const title = mockFormTitles[normalizedSlug];
  if (!title) return null;

  return {
    id: `mock-${normalizedSlug}`,
    title,
    slug: normalizedSlug,
    description: `Participate in this SRKR Coding Club program and share your details with the organizing team.`,
    category: 'Program',
    status: 'PUBLISHED',
    open_at: '2026-09-01T09:00:00.000Z',
    close_at: '2026-12-31T23:59:00.000Z',
    allow_multiple_responses: false,
    enable_prefill: true,
    fields: [
      { id: 1, label: 'Full Name', type: 'TEXT', placeholder: 'Your full name', is_required: true, order: 1 },
      { id: 2, label: 'Email Address', type: 'EMAIL', placeholder: 'you@example.com', is_required: true, order: 2 },
      { id: 3, label: 'What would you like to learn or contribute?', type: 'PARAGRAPH', placeholder: 'Share your interests...', is_required: true, order: 3 },
    ],
  };
}

function matchUserDetailToField(field: FormField, user: AuthUser | null): any {
  if (!user || !field) return undefined;
  const label = (field.label || '').toLowerCase().trim();
  const placeholder = (field.placeholder || '').toLowerCase().trim();
  const type = field.type;

  if (type === 'CLUB_ID' && user.club_id) return user.club_id;

  // 1. Full Name / Student Name
  const isName = (
    label === 'name' ||
    label === 'full name' ||
    label === 'student name' ||
    label === 'candidate name' ||
    label === 'applicant name' ||
    label === 'your name' ||
    label.includes('full name') ||
    label.includes('student name') ||
    (label.includes('name') && !label.includes('father') && !label.includes('mother') && !label.includes('team') && !label.includes('project') && !label.includes('college'))
  );
  if (isName && (type === 'TEXT' || type === 'PARAGRAPH')) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.username || user.email.split('@')[0];
  }

  // 2. Email Address
  const isEmail = (
    type === 'EMAIL' ||
    label === 'email' ||
    label === 'email address' ||
    label === 'college email' ||
    label === 'student email' ||
    label.includes('email')
  );
  if (isEmail && user.email) {
    return user.email;
  }

  // 3. Phone / Mobile / Contact Number
  const isPhone = (
    type === 'PHONE' ||
    label === 'phone' ||
    label === 'phone number' ||
    label === 'mobile' ||
    label === 'mobile number' ||
    label === 'contact number' ||
    label === 'whatsapp number' ||
    label.includes('phone') ||
    label.includes('mobile') ||
    label.includes('contact')
  );
  if (isPhone) {
    const phone = user.phone_number || user.phone;
    if (phone) return phone;
  }

  // 4. Roll Number / Reg Number / Hall Ticket / Student ID
  const isRollNumber = (
    label.includes('roll') ||
    label.includes('reg') ||
    label.includes('registration') ||
    label.includes('hall ticket') ||
    label.includes('student id') ||
    label.includes('ht no')
  );
  if (isRollNumber && user.roll_number) {
    return user.roll_number;
  }

  // 4b. College / University / Institution (a "college email" label was already claimed above)
  const isCollege = (
    label.includes('college') ||
    label.includes('university') ||
    label.includes('institution')
  );
  const collegeName = displayCollegeName(user);
  if (isCollege && collegeName && (type === 'TEXT' || type === 'PARAGRAPH')) {
    return collegeName;
  }

  // 5. Branch / Department
  const isBranch = (
    label === 'branch' ||
    label === 'department' ||
    label === 'dept' ||
    label.includes('branch') ||
    label.includes('department')
  );
  if (isBranch && user.branch) {
    if ((type === 'DROPDOWN' || type === 'RADIO') && field.options && field.options.length > 0) {
      const matched = field.options.find(
        (opt) => opt.toLowerCase().includes(user.branch!.toLowerCase()) || user.branch!.toLowerCase().includes(opt.toLowerCase())
      );
      if (matched) return matched;
    }
    return user.branch;
  }

  // 6. Year of Study
  const isYear = (
    label === 'year' ||
    label === 'year of study' ||
    label === 'current year' ||
    label.includes('year of study') ||
    label.includes('current year')
  );
  if (isYear && user.year) {
    const yearStr = String(user.year);
    if ((type === 'DROPDOWN' || type === 'RADIO') && field.options && field.options.length > 0) {
      const matched = field.options.find(
        (opt) => opt.includes(yearStr) || (yearStr === '1' && opt.toLowerCase().includes('1st')) || (yearStr === '2' && opt.toLowerCase().includes('2nd')) || (yearStr === '3' && opt.toLowerCase().includes('3rd')) || (yearStr === '4' && opt.toLowerCase().includes('4th'))
      );
      if (matched) return matched;
    }
    return yearStr;
  }

  // 7. GitHub Profile
  const isGithub = (
    label.includes('github') ||
    label.includes('git profile') ||
    placeholder.includes('github.com')
  );
  if (isGithub && user.github_profile) {
    return user.github_profile;
  }

  // 8. LinkedIn Profile
  const isLinkedin = (
    label.includes('linkedin') ||
    placeholder.includes('linkedin.com')
  );
  if (isLinkedin && user.linkedin_profile) {
    return user.linkedin_profile;
  }

  return undefined;
}

/**
 * Explicit profile lookup for a FormField.profile_field mapping - unlike
 * matchUserDetailToField's label-guessing above, this is an admin-chosen,
 * unambiguous binding, so it needs no heuristics. Keys mirror
 * apps.forms.serializers.PROFILE_FIELD_GETTERS on the backend, which is the
 * one that actually resolves and writes the value on submit; this copy only
 * drives what the confirmation view displays before that happens.
 */
function resolveProfileFieldValue(profileField: ProfileFieldKey, user: AuthUser | null): string | undefined {
  if (!user) return undefined;
  switch (profileField) {
    case 'full_name': {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      return name || user.username || undefined;
    }
    case 'email':
      return user.email || undefined;
    case 'phone_number':
      return user.phone_number || user.phone || undefined;
    case 'branch':
      return user.branch || undefined;
    case 'roll_number':
      return user.roll_number || undefined;
    case 'college':
      return displayCollegeName(user) || undefined;
    case 'year':
      return user.year !== undefined && user.year !== null ? String(user.year) : undefined;
    case 'club_id':
      return user.club_id || undefined;
    default:
      return undefined;
  }
}

interface ModernSelectProps {
  id: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

function ModernSelect({
  id,
  value,
  options,
  placeholder = "Select an option",
  onChange,
  onBlur,
  hasError = false,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((option) => option === value);

  // Keyboard: Escape closes and gives focus back; the arrow keys open the list and move through it.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const items = () => Array.from(selectRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const list = items();
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'ArrowDown' ? Math.min(list.length - 1, at + 1) : at <= 0 ? -1 : at - 1;
      (next < 0 ? triggerRef.current : list[next])?.focus();
    } else if ((event.key === 'Home' || event.key === 'End') && isOpen) {
      event.preventDefault();
      const list = items();
      (event.key === 'Home' ? list[0] : list[list.length - 1])?.focus();
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={selectRef}
      className="relative w-full"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger: carries the question's id so its label (and a failed submit's focus) reaches it */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onBlur={onBlur}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid ?? hasError}
        aria-describedby={ariaDescribedBy}
        className={`
          group flex w-full items-center justify-between
          rounded-xl
          border
          bg-white dark:bg-[#101117]
          px-4 py-3.5
          text-left
          shadow-[0_1px_2px_rgba(0,0,0,0.03)]
          outline-none
          transition-all duration-200
          active:scale-[0.99]
          ${
            isOpen
              ? "border-[#FF7A00] ring-4 ring-[#FF7A00]/10"
              : hasError
                ? "border-rose-400 dark:border-rose-500/60"
                : "border-slate-200 dark:border-slate-800 hover:border-[#FF7A00]/50"
          }
        `}
      >
        <span
          className={`
            truncate text-sm
            ${
              selectedOption
                ? "font-medium text-slate-800 dark:text-slate-100"
                : "font-medium text-slate-400 dark:text-slate-500"
            }
          `}
        >
          {selectedOption || placeholder}
        </span>

        <ChevronDown
          className={`
            ml-3 h-4 w-4 shrink-0
            text-slate-400
            transition-transform duration-200
            ${isOpen ? "rotate-180 text-[#FF7A00]" : ""}
          `}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="
            absolute left-0 right-0 top-[calc(100%+8px)]
            z-50
            overflow-hidden
            rounded-xl
            glass-panel-solid
            p-1.5
            shadow-[0_12px_35px_rgba(0,0,0,0.12)]
            dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)]
            animate-in fade-in-0 zoom-in-95 slide-in-from-top-1
            duration-150
          "
          role="listbox"
          aria-labelledby={`${id}-label`}
        >
          {/* Placeholder */}
          <button
            type="button"
            onClick={() => handleSelect("")}
            className={`
              flex w-full items-center justify-between
              rounded-lg
              px-3 py-2.5
              text-left text-sm
              transition-colors duration-150
              active:scale-[0.98]
              ${
                !value
                  ? "bg-[#FF7A00]/10 text-[#D85F00] dark:text-[#FF9A4A]"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              }
            `}
            role="option"
            aria-selected={!value}
          >
            <span>{placeholder}</span>

            {!value && (
              <Check className="h-4 w-4 text-[#FF7A00]" />
            )}
          </button>

          {/* Options */}
          {options.map((option) => {
            const selected = value === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`
                  flex w-full items-center justify-between
                  rounded-lg
                  px-3 py-2.5
                  text-left text-sm
                  transition-all duration-150
                  active:scale-[0.98]
                  ${
                    selected
                      ? "bg-[#FF7A00]/10 font-semibold text-[#D85F00] dark:text-[#FF9A4A]"
                      : "font-medium text-slate-700 dark:text-slate-300 hover:bg-[#FF7A00]/[0.06] hover:text-[#D85F00] dark:hover:text-[#FF9A4A]"
                  }
                `}
                role="option"
                aria-selected={selected}
              >
                <span className="truncate">{option}</span>

                {selected && (
                  <Check className="ml-3 h-4 w-4 shrink-0 text-[#FF7A00]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SignaturePadProps {
  id: string;
  value: string;
  onChange: (dataUrl: string) => void;
  // Takes the just-finalized value directly rather than the caller re-reading
  // its own `formData` after `onChange` - that read raced the (batched, not
  // yet re-rendered) state update and always saw the pre-stroke value, so the
  // field falsely flashed "required" immediately after every signature.
  onBlur?: (value: string) => void;
  hasError?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * SIGNATURE field - a canvas the user can draw on with mouse or touch.
 * The answer value stored via `onChange` is a PNG data URL, cleared to ''
 * by the Clear button (treated as empty by `isEmpty()` for required checks).
 */
function SignaturePad({
  id,
  value,
  onChange,
  onBlur,
  hasError = false,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  // Keep the canvas in sync with an externally-set value (prefill / draft
  // restore). Was `[]` (mount-only) despite the comment above claiming it
  // stays in sync - an existing response's signature loaded asynchronously
  // (editing an already-submitted form) arrives well after this component's
  // first render, so the canvas never drew it and `hasDrawn` never flipped
  // to true, making a genuinely-signed field look empty and fail the
  // required-field check. `[value]` is the fix; re-running per completed
  // stroke (endDraw's own onChange feeding back into `value`) just redraws
  // identical pixels from what's already on the canvas - harmless.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    setHasDrawn(!!value);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      if (!t) return null;
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;
    drawingRef.current = true;
    lastPointRef.current = point;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const point = getPoint(e);
    if (!canvas || !ctx || !point || !lastPointRef.current) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasDrawn) setHasDrawn(true);
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : '';
    if (canvas) onChange(dataUrl);
    onBlur?.(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange('');
    onBlur?.('');
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-xl border overflow-hidden bg-white dark:bg-[#101117] ${
          hasError ? 'border-rose-400 dark:border-rose-500/60' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <canvas
          ref={canvasRef}
          id={id}
          width={600}
          height={200}
          className="w-full h-[200px] cursor-crosshair touch-none"
          aria-invalid={ariaInvalid ?? hasError}
          aria-describedby={ariaDescribedBy}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400 dark:text-slate-600">
            Sign here
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="min-h-8 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] transition active:scale-95"
      >
        Clear
      </button>
    </div>
  );
}

/**
 * True if `f`'s crossField rules or conditional_logic reference `targetId` -
 * used by handleInputChange to find which OTHER fields might have a stale
 * error once `targetId`'s value changes (its required_if trigger, its
 * comparison value, or the condition that shows/requires it).
 */
function fieldReferencesTarget(f: FormField, targetId: number | string): boolean {
  const cross = f.validation_rules?.crossField as CrossFieldRule[] | undefined;
  if (Array.isArray(cross) && cross.some((rule) => String(rule.field) === String(targetId))) return true;

  const cond: any = f.conditional_logic;
  if (cond && typeof cond === 'object') {
    const stack: any[] = Array.isArray(cond.rules) ? [...cond.rules] : [cond];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node.rules)) {
        stack.push(...node.rules);
        continue;
      }
      const ref = node.field ?? node.if;
      if (ref !== undefined && ref !== null && String(ref) === String(targetId)) return true;
    }
  }
  return false;
}

export default function FormDetailSubmissionPage() {
  const { toast } = useToast();
  const params = useParams();
  const slug = params?.slug as string;

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Fields the user has blurred at least once - gates when an error is allowed
  // to display, so nothing appears red before the user has touched the field.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadConfig = useUploadConfig();
  // Questions whose files are still being sent; the form cannot be submitted until they finish.
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const anyUploading = Object.values(uploadingFields).some(Boolean);
  const setFieldUploading = React.useCallback((fieldId: number | string, busy: boolean) => {
    setUploadingFields((prev) => (!!prev[String(fieldId)] === busy ? prev : { ...prev, [String(fieldId)]: busy }));
  }, []);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  // Bot protection: the honeypot stays empty for people; the Turnstile token is single-use, so every attempt asks for a new one.
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  // Seconds left before submitting is allowed again after the server asked us to slow down (HTTP 429).
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const [existingResponse, setExistingResponse] = useState<any | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [canEditResponse, setCanEditResponse] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Multi-page forms: which page is showing, and whether the "already answered?" lookup has finished
  // (a saved draft is only offered once we know this is not an edit of a submitted response).
  const [currentPage, setCurrentPage] = useState(0);
  // Places left on options that have a limit: { questionId: { option: placesLeft } }.
  const [availability, setAvailability] = useState<Record<string, Record<string, number>>>({});
  const [submissionChecked, setSubmissionChecked] = useState(false);

  // Conditional-logic layout - which fields are visible / required right now,
  // recomputed whenever an answer changes. Mirrors the backend engine.
  const layout = React.useMemo(
    () => computeLayout((form?.fields as any) || [], formData),
    [form?.fields, formData],
  );

  // Pages: a PAGE_BREAK starts a new one and routing can skip pages, so the page shown is
  // always settled against the current answers.
  const multiPage = layout.pages.length > 1;
  const activePage = settlePage(layout, currentPage);
  const fieldPages = React.useMemo(() => pageIndexByField(layout), [layout]);
  const pageNumbers = pageProgress(layout, activePage);

  // Calculated questions: worked out from the answers so far (the server works them out again on submit).
  const calculated = React.useMemo(
    () => calculatedValues((form?.fields as FormField[]) || [], formData, layout.visible),
    [form?.fields, formData, layout],
  );
  useEffect(() => {
    if (!calculated.size) return;
    setFormData((prev) => {
      let next = prev;
      calculated.forEach((result, key) => {
        if (JSON.stringify(prev[key] ?? null) === JSON.stringify(result)) return;
        if (next === prev) next = { ...prev };
        if (result === null) delete next[key]; else next[key] = result;
      });
      return next;
    });
  }, [calculated]);

  // A choice that turned out to be full is dropped from a new response (the server refuses it anyway).
  useEffect(() => {
    if (isEditMode || !Object.keys(availability).length) return;
    setFormData((prev) => {
      let next = prev;
      for (const [fieldId, left] of Object.entries(availability)) {
        const full = new Set(Object.entries(left).filter(([, n]) => n <= 0).map(([option]) => option.trim().toLowerCase()));
        const current = prev[fieldId];
        const isFull = (v: unknown) => full.has(String(v ?? '').trim().toLowerCase());
        if (Array.isArray(current) && current.some(isFull)) {
          if (next === prev) next = { ...prev };
          next[fieldId] = current.filter((v) => !isFull(v));
        } else if (typeof current === 'string' && current && isFull(current)) {
          if (next === prev) next = { ...prev };
          next[fieldId] = '';
        }
      }
      return next;
    });
  }, [availability, isEditMode]);

  // {{id}} in a title, description or note shows that question's answer.
  const fieldsById = React.useMemo(
    () => new Map(((form?.fields as FormField[]) || []).map((f) => [String(f.id), f])),
    [form?.fields],
  );
  const pipe = (text?: string) => pipeText(text, formData, fieldsById, layout.visible);
  // The form's own words (buttons, progress, prompts) in the language its admin chose.
  const t = (key: FormStringKey, values?: Record<string, string | number>) => translate(form?.language, key, values);

  const loadAvailability = React.useCallback(async () => {
    try {
      setAvailability((await fetchApi<Record<string, Record<string, number>>>(`/forms/${slug}/availability/`)) || {});
    } catch {
      /* the server still enforces every limit; this only hides options that are already full */
    }
  }, [slug]);
  useEffect(() => {
    const limited = ((form?.fields as FormField[]) || []).some((f) => Object.keys(f.validation_rules?.optionLimits || {}).length > 0);
    if (limited) void loadAvailability();
    else setAvailability({});
  }, [form, loadAvailability]);

  // Answers a condition decides: `set_value` fills a question in, and `restrict_options` drops a
  // choice that is no longer allowed. The server enforces both again on submit.
  useEffect(() => {
    if (!layout.setValues.size && !layout.allowedOptions.size) return;
    setFormData((prev) => {
      let next = prev;
      const put = (key: string, value: any) => {
        if (next === prev) next = { ...prev };
        if (value === undefined) delete next[key]; else next[key] = value;
      };
      layout.setValues.forEach((value, key) => {
        if (JSON.stringify(prev[key]) !== JSON.stringify(value)) put(key, value);
      });
      layout.allowedOptions.forEach((allowed, key) => {
        const ok = new Set(allowed.map((a) => a.trim().toLowerCase()));
        const current = prev[key];
        if (Array.isArray(current)) {
          const kept = current.filter((c) => ok.has(String(c).trim().toLowerCase()));
          if (kept.length !== current.length) put(key, kept);
        } else if (typeof current === 'string' && current && !ok.has(current.trim().toLowerCase())) {
          put(key, '');
        }
      });
      return next;
    });
  }, [layout]);

  // "Already submitted, can't edit it" only actually locks the form when this
  // is a single-response form. When the form allows multiple responses, a
  // prior submission must never block a new, independent one - the backend
  // already enforces the real limit (max_responses_per_user) and reports it
  // as its own submission error. `hasSubmitted && !canEditResponse` used to
  // be read as "locked" everywhere in this file regardless of that flag, so
  // a form configured to allow both multiple responses AND response editing
  // (or even just multiple responses with editing off) silently could never
  // accept a second submission - every input was blocked outright.
  const isLockedToSingleExistingResponse = hasSubmitted && !canEditResponse && form?.allow_multiple_responses !== true;

  // Defaults and hidden values start a fresh response off (never an edit of a submitted one).
  const startedFormRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!form?.fields || !submissionChecked || isEditMode || startedFormRef.current === String(form.id)) return;
    startedFormRef.current = String(form.id);
    const fields = form.fields as FormField[];
    setFormData((prev) => {
      const defaults = defaultAnswers(fields, prev);
      const hidden = hiddenAnswers(fields, window.location.search, prev);
      return Object.keys(defaults).length || Object.keys(hidden).length ? { ...prev, ...defaults, ...hidden } : prev;
    });
  }, [form, submissionChecked, isEditMode]);

  // Anyone may read a form, but filling one in needs a verified email address (when the site enforces it).
  const verification = useEmailVerification();
  const verifyLocked = !!currentUser && restrictsFeatures(verification.state);

  // What an untouched form holds, so the autosave can tell the person's own typing from the form's starting values.
  const freshAnswers = React.useMemo(() => {
    const fields = (form?.fields as FormField[]) || [];
    return { ...defaultAnswers(fields, {}), ...hiddenAnswers(fields, typeof window === 'undefined' ? '' : window.location.search, {}) };
  }, [form]);

  // Autosave: unfinished answers (and the page) are kept on the server and offered again on return.
  const draft = useFormDraft({
    slug,
    owner: currentUser?.id,
    freshAnswers: freshAnswers,
    keepUploads: uploadConfig.direct_upload,
    fields: (form?.fields as FormField[]) || [],
    enabled: !!currentUser && !!form && submissionChecked && !isEditMode && !isSubmitted && !isLockedToSingleExistingResponse && verification.loaded && uploadConfig.loaded && !verifyLocked,
    formData,
    currentPage: activePage,
    onRestore: (restored) => {
      // A fresh link's hidden values win over an older draft's.
      setFormData((prev) => ({ ...prev, ...restored.answers, ...hiddenAnswers((form?.fields as FormField[]) || [], window.location.search, restored.answers) }));
      setCurrentPage(restored.current_page);
      const hasFiles = ((form?.fields as FormField[]) || []).some((f) => ['FILE', 'MULTI_FILE', 'SIGNATURE'].includes(f.type));
      toast.info(
        'Welcome back',
        restored.form_changed
          ? 'We restored your saved answers. The form was updated since, so please check them.'
          : hasFiles && !uploadConfig.direct_upload
          ? 'We restored your saved answers. Files are not saved, so attach them again.'
          : 'We restored your saved answers.',
      );
    },
  });

  // Check user authentication & fetch fresh profile details
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      // Goes through the token-refreshing proxy (unlike a raw fetch to /api/auth/me,
      // which 401s outright once the 1-hour access token expires without refreshing it).
      fetchAndSyncCurrentUser()
        .then((fresh) => {
          if (fresh) {
            setCurrentUser(fresh);
          }
        })
        .catch(() => {});
    } else {
      setShowLoginModal(true);
    }
  }, []);

  useEffect(() => {
    async function loadForm() {
      if (!slug) return;
      setLoading(true);
      // This page component is reused (not remounted) when navigating
      // client-side between two different forms - e.g. submitting one form
      // and clicking through to a "next form" link - since Next.js treats
      // /forms/[slug] as the same page instance across dynamic-param
      // changes. Without this reset, the PREVIOUS form's typed answers,
      // validation errors, and "already submitted"/edit-mode state all
      // carried over into the newly-loaded form: a just-submitted form's
      // isSubmitted=true would make the next form open straight to the
      // "submission complete" screen before the user ever saw it.
      setForm(null);
      setNotFound(false);
      setFormData({});
      setErrors({});
      setTouched({});
      setHasAttemptedSubmit(false);
      setIsSubmitting(false);
      setIsSubmitted(false);
      setSubmissionError(null);
      setExistingResponse(null);
      setHasSubmitted(false);
      setCanEditResponse(true);
      setIsEditMode(false);
      setCurrentPage(0);
      setSubmissionChecked(false);
      startedFormRef.current = null;
      try {
        const fetched = await fetchApi<Form>(`/forms/${slug}/`);
        if (fetched && fetched.title && fetched.fields) {
          setForm(fetched);
          setNotFound(false);
          return;
        }

        const fallback = getFallbackForm(slug);
        if (fallback) {
          setForm(fallback);
          setNotFound(false);
          return;
        }

        setNotFound(true);
      } catch {
        const fallback = getFallbackForm(slug);
        if (fallback) {
          setForm(fallback);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [slug]);

  // Check if current user has already submitted this form and load their response for editing
  useEffect(() => {
    async function checkUserSubmission() {
      if (!slug || !currentUser) return;
      try {
        const res = await fetchApi<{
          has_submitted: boolean;
          can_edit: boolean;
          allow_multiple_responses?: boolean;
          allow_response_editing?: boolean;
          response: any | null;
        }>(`/forms/${slug}/my-response/?user_id=${currentUser.id}`);

        if (res && res.has_submitted && res.response) {
          setHasSubmitted(true);
          setExistingResponse(res.response);
          setCanEditResponse(res.can_edit);
          // Edit mode - pre-fill this response and PATCH it on submit - only
          // makes sense for a single-response form. When the form allows
          // multiple responses, having a PAST response must not silently
          // turn every future submit into an edit of that one response: the
          // user should get a fresh, blank form and be able to add another
          // independent submission (up to the backend's own per-user cap).
          setIsEditMode(!res.allow_multiple_responses);

          if (!res.allow_multiple_responses) {
            // Only prefill the existing answers when editing a single response.
            const prefill: Record<string, any> = {};
            if (res.response.answers && Array.isArray(res.response.answers)) {
              res.response.answers.forEach((ans: any) => {
                const fieldKey = ans.field_id !== undefined ? String(ans.field_id) : String(ans.field);
                prefill[fieldKey] = ans.value;
              });
            }
            setFormData((prev) => ({ ...prev, ...prefill }));
          }
        }
      } catch (err) {
        console.warn('[My Response Check Error]:', err);
      } finally {
        setSubmissionChecked(true);
      }
    }

    if (slug && currentUser) {
      checkUserSubmission();
    }
  }, [slug, currentUser]);

  // Automatically match and pre-fill student profile details into uncompleted fields when prefill is active and limit is 1
  useEffect(() => {
    const isAutoPrefillActive = form && form.enable_prefill !== false && !form.allow_multiple_responses;
    if (isAutoPrefillActive && form && form.fields && currentUser && !hasSubmitted) {
      setFormData((prev) => {
        let changed = false;
        const next = { ...prev };
        form.fields!.forEach((field) => {
          if (isNonAnswerType(field.type)) return;
          const fieldKey = String(field.id);
          const currentVal = next[fieldKey];
          // Fill if currentVal is undefined, empty string, or null
          if (currentVal === undefined || currentVal === '' || currentVal === null) {
            const matchedValue = matchUserDetailToField(field, currentUser);
            if (matchedValue !== undefined && matchedValue !== '') {
              next[fieldKey] = matchedValue;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [form, currentUser, hasSubmitted]);

  // Profile-bound fields (field.profile_field) are authoritative, not a
  // convenience: the server always resolves and overwrites their value from
  // the submitter's profile at submission time regardless of what's sent -
  // including on an edit - so this stays in sync even when hasSubmitted is
  // true (unlike the heuristic effect above, which deliberately backs off
  // once there's a real submitted answer to avoid clobbering it). Skipping it
  // in edit mode would leave formData empty for a profile field the read-only
  // display and the missing-profile gate below both resolve independently,
  // letting a required-but-empty field slip past those checks only to fail
  // validateSubmission's own required check at submit time.
  useEffect(() => {
    if (!form || !form.fields || !currentUser) return;
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };
      form.fields!.forEach((field) => {
        if (!field.profile_field) return;
        const resolved = resolveProfileFieldValue(field.profile_field, currentUser);
        const key = String(field.id);
        if (resolved !== undefined && next[key] !== resolved) {
          next[key] = resolved;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [form, currentUser, hasSubmitted]);

  const handleInputChange = (field: FormField, value: any) => {
    const fieldId = field.id;
    if (isLockedToSingleExistingResponse) return; // Prevent edits when locked

    const nextFormData = { ...formData, [String(fieldId)]: value };
    setFormData(nextFormData);

    const allFields = (form?.fields as FormField[]) || [];

    // Once an error is already showing for this field, re-check on every
    // keystroke so it can clear (or update) the moment the value is fixed -
    // matches Formik's validateOnChange-after-error behavior.
    const selfFlagged = !!(errors[String(fieldId)] || errors[fieldId]);

    // Any OTHER field whose crossField/required_if rules or conditional_logic
    // reference this field may now be stale (e.g. a "required when X is
    // answered" error that should clear, or a comparison that now fails).
    // Only re-check fields already touched or currently showing an error -
    // never flag a field the user hasn't reached yet.
    const dependents = allFields.filter((f) => {
      if (String(f.id) === String(fieldId)) return false;
      const alreadyFlagged = !!(touched[String(f.id)] || errors[String(f.id)] || errors[f.id]);
      return alreadyFlagged && fieldReferencesTarget(f, fieldId);
    });

    if (selfFlagged || dependents.length) {
      const nextLayout = computeLayout(allFields, nextFormData);
      setErrors((prev) => {
        const next = { ...prev };
        const revalidate = (f: FormField) => {
          const key = String(f.id);
          const val = nextFormData[key] ?? nextFormData[f.id as any];
          const required = isFieldRequired(f, nextLayout);
          const message = validateFieldValue(f, val, required) || getCrossFieldError(f, allFields, nextFormData, nextLayout);
          delete next[key];
          delete next[f.id as any];
          if (message) next[key] = message;
        };
        if (selfFlagged) revalidate(field);
        for (const dep of dependents) revalidate(dep);
        return next;
      });
    }
  };

  // Runs once per blur, validating only the field that lost focus - cheap
  // enough to call on every field in a long form, unlike a full re-validation.
  const handleFieldBlur = (field: FormField, value: any) => {
    const fieldId = String(field.id);
    setTouched((prev) => (prev[fieldId] ? prev : { ...prev, [fieldId]: true }));
    const required = isFieldRequired(field, layout);
    const message =
      validateFieldValue(field, value, required) ||
      getCrossFieldError(field, (form?.fields as FormField[]) || [], formData, layout);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field.id];
      delete next[fieldId];
      if (message) next[fieldId] = message;
      return next;
    });
  };

  // There is no binary-upload endpoint - files are captured inline as data URLs
  // (bounded by the field's max size, or 5 MB) so the answer stores something
  // that can actually be viewed / downloaded from the responses tab.
  // Must not exceed the server ceiling (FORM_UPLOAD_MAX_FILE_BYTES: 4 MB on Lambda, whose 6 MB
  // request cap also has to fit the base64-encoded file).
  const MAX_INLINE_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 4;
  const handleFileChange = async (field: FormField, fileList: FileList | null) => {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    // Picking a file is itself an interaction - mark touched now so a
    // too-large-file error (set directly below) isn't hidden pending a blur.
    setTouched((prev) => (prev[String(field.id)] ? prev : { ...prev, [String(field.id)]: true }));
    const capMb = Number(field.validation_rules?.maxFileSizeMB) || MAX_INLINE_FILE_MB;
    const out: { name: string; size: number; type: string; url: string }[] = [];
    for (const f of picked) {
      if (f.size > capMb * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          [String(field.id)]: `"${f.name}" is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${capMb} MB.`,
        }));
        continue;
      }
      try {
        const url = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(f);
        });
        out.push({ name: f.name, size: f.size, type: f.type || 'application/octet-stream', url });
      } catch {
        setErrors((prev) => ({ ...prev, [String(field.id)]: `Could not read "${f.name}".` }));
      }
    }
    if (!out.length) return;
    handleInputChange(field, field.type === 'MULTI_FILE' ? out : out[0]);
  };

  // Bring a question into view, switching to its page first when it is on another one.
  const focusField = (fieldId: number | string) => {
    const page = fieldPages.get(String(fieldId));
    if (page !== undefined && page !== activePage) setCurrentPage(page);
    setTimeout(() => {
      const target = document.getElementById(`field-${fieldId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Move the keyboard (and screen reader) to the question: itself if it can take focus, else its first control.
      const focusable = target.matches('input,select,textarea,button,[tabindex]')
        ? target
        : target.querySelector<HTMLElement>('input,select,textarea,button,[tabindex]:not([tabindex="-1"])');
      focusable?.focus({ preventScroll: true });
    }, 80);
  };

  const scrollToFormTop = () => {
    setTimeout(() => document.getElementById('form-page-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // Leaving a page checks only the questions on it; the whole form is checked again on submit.
  const goNext = () => {
    const target = nextReachable(layout, activePage);
    if (target === null || !form?.fields) return;
    const allFields = form.fields as FormField[];
    const onThisPage = new Set(layout.pages[activePage]);
    const pageFields = allFields.filter((f) => onThisPage.has(String(f.id)) && layout.visible.has(String(f.id)) && !isNonAnswerType(f.type));

    const pageErrors: Record<string, string> = {};
    for (const f of pageFields) {
      const message =
        validateFieldValue(f, formData[String(f.id)], isFieldRequired(f, layout)) ||
        getCrossFieldError(f, allFields, formData, layout);
      if (message) pageErrors[String(f.id)] = message;
    }
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(pageFields.map((f) => [String(f.id), true])) }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const f of pageFields) delete next[String(f.id)];
      return { ...next, ...pageErrors };
    });

    const firstBad = pageFields.find((f) => pageErrors[String(f.id)]);
    if (firstBad) {
      toast.error('Please fix the highlighted fields', pageErrors[String(firstBad.id)]);
      focusField(firstBad.id);
      return;
    }
    setCurrentPage(target);
    scrollToFormTop();
  };

  const goBack = () => {
    const target = previousReachable(layout, activePage);
    if (target === null) return;
    setCurrentPage(target);
    scrollToFormTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setShowLoginModal(true);
      toast.warning('Sign In Required', 'Please sign in with your college account to submit this form.');
      return;
    }

    if (verifyLocked) {
      verification.openDialog({ reason: 'feature' });
      return;
    }

    if (anyUploading) {
      toast.warning('Files are still uploading', 'Please wait for the uploads to finish, then submit.');
      return;
    }

    if (isLockedToSingleExistingResponse) {
      toast.error('Submission Locked', 'You have already submitted this form and edits are disabled.');
      return;
    }

    if (!form || !form.fields) return;

    // Pressing Enter (or the form's own submit) on an earlier page just moves on.
    if (multiPage && nextReachable(layout, activePage) !== null) {
      goNext();
      return;
    }

    // From here on, every field's error (not just touched ones) is allowed to display.
    setHasAttemptedSubmit(true);

    // Client-side pre-check - mirrors the backend engine (conditional visibility,
    // required, type + rule + cross-field). The backend re-validates everything.
    const { errors: clientErrors, payload } = validateSubmission(form.fields, formData);
    if (clientErrors.length > 0) {
      const map: Record<string, string> = {};
      for (const e of clientErrors) if (e.field_id != null && !map[String(e.field_id)]) map[String(e.field_id)] = e.message;
      setErrors(map);
      const first = clientErrors[0];
      toast.error('Please fix the highlighted fields', first.message);
      // go to the first field with an error, on whichever page it is
      if (first.field_id != null) focusField(first.field_id);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setErrors({});
    try {
      // Only submit answers for fields the conditional layout leaves visible.
      const answersPayload = Object.entries(payload).map(([fieldId, value]) => ({
        field: Number(fieldId) || fieldId,
        value,
      }));

      // Editing an existing response must PATCH that exact response in place -
      // POSTing again would create a brand-new row (the backend's create()-side
      // auto-update-in-place path only fires when the form disallows multiple
      // responses; with multiple responses allowed there's no way for create()
      // to know which prior response "update" means, so it always inserts).
      const isEditingExisting = isEditMode && !!existingResponse?.id;

      let result: any;
      if (isEditingExisting) {
        result = await fetchApi(`/forms/submissions/${existingResponse.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersPayload }),
        });
      } else {
        const idempotencyKey = `sub_${form.id}_${currentUser.id}_${Date.now()}`;
        result = await fetchApi('/forms/submissions/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            form: form.id,
            user: currentUser.id,
            answers: answersPayload,
            idempotency_key: idempotencyKey,
            hp_q7z4: honeypot,
            ...(form.captcha_enabled ? { captcha_token: captchaToken } : {}),
          }),
        });
      }

      if (Array.isArray(result?.warnings) && result.warnings.length > 0) {
        toast.info('Submitted with notes', result.warnings[0].message);
      }
      if (isEditMode) {
        toast.success('Response Updated!', `Your updated response for ${form.title} has been saved.`);
      } else {
        toast.success('Registration Received!', `Your response for ${form.title} was successfully submitted.`);
      }
      clearFormBackup(slug, currentUser?.id);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('[Form Submit Error]:', err);
      // The backend returns { detail, code, errors:[{field_id, code, message, ...}] }.
      const body = err?.body;
      if (body && Array.isArray(body.errors) && body.errors.length > 0) {
        const map: Record<string, string> = {};
        for (const e of body.errors) if (e.field_id != null && !map[String(e.field_id)]) map[String(e.field_id)] = e.message;
        setErrors(map);
        const generic = body.errors.filter((e: any) => e.field_id == null).map((e: any) => e.message);
        setSubmissionError(generic[0] || body.detail || 'Some answers need fixing.');
        toast.error('Submission Rejected', body.errors[0].message || body.detail);
        if (body.errors.some((e: any) => e.code === 'OPTION_FULL')) void loadAvailability();
        const firstId = body.errors.find((e: any) => e.field_id != null)?.field_id;
        if (firstId != null) focusField(firstId);
      } else if (err?.status === 429) {
        // Rate limited: nothing was lost, the answers stay on screen and Submit comes back after the wait.
        setCooldown(Math.min(Math.max(Number(err?.retryAfter) || 5, 1), 60));
        setSubmissionError(t('tooFast'));
      } else {
        const errMsg = err?.message || err?.error || 'Failed to submit form to server.';
        setSubmissionError(errMsg);
        toast.error('Submission Failed', errMsg);
      }
    } finally {
      setIsSubmitting(false);
      if (form?.captcha_enabled) setCaptchaReset((n) => n + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-xs font-semibold">Loading form definition...</p>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 px-4 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Form Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The registration form you are looking for ({slug}) does not exist or has been removed.
          </p>
          <div className="pt-2">
            <Link
              href="/forms"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Forms</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFormClosedOrDraft = form.status === 'CLOSED' || form.status === 'DRAFT';

  return (
    <div lang={normalizeLanguage(form.language)} className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">

      {/* Login Required Modal Dialog */}
      {showLoginModal && !currentUser && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="glass-panel rounded-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-center relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#FF7A00] flex items-center justify-center mx-auto border border-orange-500/20">
                <Lock className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Sign In to Fill This Form</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  You must be logged in with your college account to submit responses for <strong className="text-slate-900 dark:text-white">{form.title}</strong>.
                </p>
              </div>

              <div className="pt-2 space-y-2.5">
                <Link
                  href={`/login?next=/forms/${slug}`}
                  className="group/btn relative w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#E06B00] text-white font-extrabold text-sm shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] transition"
                >
                  <span>Click Here to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                  <BottomGradient />
                </Link>

                <Link
                  href={`/signup?next=/forms/${slug}`}
                  className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                >
                  Create New Account
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition active:scale-95"
              >
                Continue in preview mode
              </button>
            </div>
          </div>
        </Portal>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">

        {/* Back Link */}
        <div>
          <Link
            href="/forms"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] px-4 py-2 rounded-lg glass-panel border border-slate-200 dark:border-slate-800 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Forms Center</span>
          </Link>
        </div>

        {/* Success Confirmation Card */}
        {isSubmitted ? (
          <SubmissionThanks
            title={form.title}
            message={pipe(form.confirmation_message)}
            redirectUrl={form.redirect_url}
            delaySeconds={form.redirect_delay_seconds}
            updated={isEditMode}
            showAttendanceNote={!!form.attendance_enabled}
            language={form.language}
          />
        ) : (
          /* Form Content Card - shadow-input styling to match Aceternity's signup-form card */
          <div className="relative glass-panel rounded-none md:rounded-2xl p-6 sm:p-10 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] space-y-8">
            {/* Glow behind the glass panel - see the matching comment on the
                success card above for why this is needed at all. */}
            <div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] opacity-70 blur-2xl hidden md:block"
              style={{ background: 'radial-gradient(circle at 50% 10%, #FF7A0033, transparent 70%)' }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, #8B2E3B66, #FF7A00, #8B2E3B66)' }}
            />

            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
                  {form.title}
                </h1>
              </div>
              {form.description && (
                <div className="pt-1 pl-1">
                  <MarkdownRenderer content={form.description} />
                </div>
              )}

              {/* Authentication Status Banner */}
              {currentUser ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                      <UserCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Submitting as verified user: <strong className="text-emerald-900 dark:text-white">{currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : currentUser.username || currentUser.email}</strong> ({currentUser.email})</span>
                    </div>
                  </div>

                  {/* Previous submission & Edit Mode banner - single-response
                      forms only. On a multi-response form this would show
                      "Edit Mode Active" or "Edits Locked" for what's actually
                      just a normal, independent new submission. */}
                  {hasSubmitted && form?.allow_multiple_responses !== true && (
                    canEditResponse ? (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
                        <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-blue-800 dark:text-blue-300">
                            Response Edit Mode Active
                          </p>
                          <p className="text-blue-700/80 dark:text-blue-300/80">
                            You previously submitted this form on {existingResponse?.submitted_at ? new Date(existingResponse.submitted_at).toLocaleString('en-IN') : 'earlier'}. You can update your answers below and click <strong>Update Response</strong> to save your changes.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-amber-800 dark:text-amber-300">
                            Response Already Submitted (Edits Locked)
                          </p>
                          <p className="text-amber-700/80 dark:text-amber-300/80">
                            You submitted your response on {existingResponse?.submitted_at ? new Date(existingResponse.submitted_at).toLocaleString('en-IN') : 'earlier'}. Further changes are closed.
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {hasSubmitted && form.attendance_enabled && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Your attendance QR badge is on your profile. Go to Profile → Registered Events to view it.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-[#FF7A00] flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">Sign In Required</p>
                      <p className="text-slate-500 dark:text-slate-400">You must be logged in to fill and submit this form.</p>
                    </div>
                  </div>
                  <Link
                    href={`/login?next=/forms/${slug}`}
                    className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs whitespace-nowrap shadow transition text-center"
                  >
                    Click Here to Log In
                  </Link>
                </div>
              )}

              {submissionError && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800 dark:text-rose-300">
                    <p className="font-bold text-rose-700 dark:text-rose-400">Submission Notice</p>
                    <p className="mt-0.5 text-rose-700/80 dark:text-rose-300/80">{submissionError}</p>
                  </div>
                </div>
              )}

              {/* Status & Schedule Window Banners */}
              {(() => {
                const now = Date.now();
                const openTime = form.open_at ? new Date(form.open_at).getTime() : null;
                const closeTime = form.close_at ? new Date(form.close_at).getTime() : null;

                const isBeforeOpen = openTime !== null && now < openTime;
                const isAfterClose = closeTime !== null && now > closeTime;

                if (form.status === 'DRAFT') {
                  return (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 dark:text-amber-300">
                        <p className="font-bold">Draft Preview Mode</p>
                        <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">This form has not been published yet. Responses submitted here are for testing only.</p>
                      </div>
                    </div>
                  );
                }

                if (form.status === 'CLOSED' || isAfterClose) {
                  return (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-rose-800 dark:text-rose-300">
                        <p className="font-bold">Submissions Closed</p>
                        <p className="mt-0.5 text-rose-700/80 dark:text-rose-300/80">
                          {closeTime
                            ? `The deadline for this form ended on ${new Date(form.close_at!).toLocaleString('en-IN')}.`
                            : 'This form has been closed to new responses by club leadership.'}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (form.status === 'SCHEDULED' && isBeforeOpen) {
                  return (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-800 dark:text-blue-300">
                        <p className="font-bold">Scheduled Launch Window</p>
                        <p className="mt-0.5 text-blue-700/80 dark:text-blue-300/80">
                          Submissions will automatically open on{' '}
                          <strong>{new Date(form.open_at!).toLocaleString('en-IN')}</strong>. Please check back then.
                        </p>
                      </div>
                    </div>
                  );
                }

                if (form.status === 'SCHEDULED' && !isBeforeOpen && !isAfterClose) {
                  return (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-800 dark:text-emerald-300">
                        <p className="font-bold">Scheduled Window Live</p>
                        <p className="mt-0.5 text-emerald-700/80 dark:text-emerald-300/80">
                          This form is open for submissions
                          {form.close_at && ` until ${new Date(form.close_at).toLocaleString('en-IN')}`}.
                        </p>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {(multiPage || draft.status !== 'idle') && (
                <div id="form-page-top" className="space-y-2 scroll-mt-24">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{multiPage ? t('pageOf', { n: pageNumbers.number, total: pageNumbers.total }) : ''}</span>
                    <span className="font-semibold" role="status" aria-live="polite">
                      {draft.status === 'saving' && t('savingDraft')}
                      {draft.status === 'saved' && (draft.savedAt ? t('draftSavedAt', { time: draft.savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }) : t('draftSaved'))}
                      {draft.status === 'error' && t('draftFailed')}
                    </span>
                  </div>
                  {multiPage && (
                    <div
                      role="progressbar"
                      aria-label={t('progress')}
                      aria-valuemin={1}
                      aria-valuemax={pageNumbers.total}
                      aria-valuenow={pageNumbers.number}
                      className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
                    >
                      <div className="h-full bg-[#FF7A00] transition-all duration-300" style={{ width: `${(pageNumbers.number / pageNumbers.total) * 100}%` }} />
                    </div>
                  )}
                </div>
              )}
              {verifyLocked && (
                <div role="region" aria-label="Email verification" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-bold">Verify your email address to fill in this form.</p>
                  <p className="mt-1">You can read the questions now. Answering needs a verified email.</p>
                  <button type="button" onClick={() => verification.openDialog({ reason: 'feature' })} className="mt-3 min-h-9 rounded-lg bg-[#C25100] px-4 py-2 text-sm font-bold text-white hover:bg-[#A84600]">Verify email</button>
                </div>
              )}
              <fieldset disabled={verifyLocked} className="m-0 min-w-0 space-y-6 border-0 p-0 [&[disabled]]:opacity-70 [&[disabled]_canvas]:pointer-events-none">
              {form.fields?.map((sourceField) => {
                // restrict_options narrows the choices a condition allows; a full option (optionLimits) is not offered
                // unless this person already holds it. {{id}} in the text shows that question's answer.
                const allowedOptions = layout.allowedOptions.get(String(sourceField.id));
                const placesLeft = availability[String(sourceField.id)];
                // Someone editing a response they already submitted keeps the place they hold.
                const held = new Set(!isEditMode ? [] : (Array.isArray(formData[String(sourceField.id)]) ? formData[String(sourceField.id)] : [formData[String(sourceField.id)]])
                  .map((v: any) => String(v ?? '').trim().toLowerCase()));
                const offered = (sourceField.options || []).filter((o) => {
                  const key = String(o).trim().toLowerCase();
                  if (allowedOptions && !allowedOptions.some((a) => a.trim().toLowerCase() === key)) return false;
                  if (placesLeft && (placesLeft[o] ?? Infinity) <= 0 && !held.has(key)) return false;
                  return true;
                });
                const field: FormField = {
                  ...sourceField,
                  label: pipe(sourceField.label) || sourceField.label,
                  description: pipe(sourceField.description),
                  ...(sourceField.options ? { options: offered } : {}),
                };
                const limitedPlaces = placesLeft
                  ? Object.entries(placesLeft).filter(([, left]) => left > 0 && left <= 10).map(([option, left]) => `${option} (${left} left)`)
                  : [];
                if (multiPage && fieldPages.get(String(field.id)) !== activePage) return null;
                const conditionMessage = pipe(layout.messages.get(String(field.id)));
                const hasFieldError = !!(errors[field.id] || errors[String(field.id)]);
                // Only show an error once the user has left this field, or a
                // submit attempt has already happened - never pre-emptively.
                const isFieldTouched = !!touched[String(field.id)];
                const isErr = hasFieldError && (isFieldTouched || hasAttemptedSubmit);
                const hint = getConstraintHint(field);
                const errorId = isErr ? `field-${field.id}-error` : undefined;

                // Conditional visibility - a hidden field (or section) is not rendered, not
                // validated and not submitted (the backend enforces the same).
                if (!layout.visible.has(String(field.id))) return null;

                if (field.type === 'PAGE_BREAK') {
                  return (
                    <div key={field.id} className="space-y-1">
                      {field.label && <h2 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{field.label}</h2>}
                      {field.description && <p className="text-sm text-slate-500 dark:text-slate-400">{field.description}</p>}
                    </div>
                  );
                }

                if (field.type === 'HIDDEN') return null;

                if (field.type === 'CALCULATED') {
                  const result = calculated.get(String(field.id));
                  return (
                    <div key={field.id} className="flex w-full flex-col space-y-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-3.5 py-2.5">
                      <FieldLabel>{field.label}</FieldLabel>
                      {field.description && <p className="text-xs text-slate-400 dark:text-slate-500">{field.description}</p>}
                      <p className="text-lg font-extrabold text-[#1A1A2E] dark:text-white" aria-live="polite">
                        {result === null || result === undefined
                          ? '-'
                          : result.toLocaleString('en-IN', { maximumFractionDigits: 6 })}
                      </p>
                    </div>
                  );
                }

                const messageNote = conditionMessage ? (
                  <div role="note" className="flex items-start gap-2 rounded-lg border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-xs text-sky-800 dark:text-sky-300">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{conditionMessage}</span>
                  </div>
                ) : null;

                if (field.type === 'SECTION') {
                  return (
                    <div key={field.id} className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div>
                        <h3 className="text-lg font-bold text-[#FF7A00]">{field.label}</h3>
                        {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
                      </div>
                      {messageNote}
                    </div>
                  );
                }

                const conditionallyRequired = isFieldRequired(field as any, layout);

                // Profile-bound field - never an input. The server resolves
                // and writes this value from the submitter's own profile at
                // submission time no matter what (if anything) is sent for
                // it, so it's shown read-only here rather than editable.
                if (field.profile_field) {
                  const resolvedValue = resolveProfileFieldValue(field.profile_field, currentUser);
                  const isMissing = resolvedValue === undefined || resolvedValue === '';
                  return (
                    <div
                      key={field.id}
                      className={`flex w-full flex-col space-y-1.5 rounded-lg border px-3.5 py-2.5 ${
                        isMissing
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel required={conditionallyRequired}>{field.label}</FieldLabel>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF7A00] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>From your profile</span>
                        </span>
                      </div>
                      {isMissing ? (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          Missing from your profile.{' '}
                          <Link href="/profile" className="underline font-semibold">Update your profile</Link> to register.
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{resolvedValue}</p>
                      )}
                    </div>
                  );
                }

                const fieldVal = formData[String(field.id)] ?? formData[field.id] ?? '';
                const isAutoMatched = (
                  form &&
                  form.enable_prefill !== false &&
                  !form.allow_multiple_responses &&
                  currentUser &&
                  !hasSubmitted &&
                  matchUserDetailToField(field, currentUser) !== undefined &&
                  String(fieldVal) === String(matchUserDetailToField(field, currentUser))
                );

                return (
                  <div key={field.id} className="flex w-full flex-col space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor={`field-${field.id}`} required={conditionallyRequired}>
                        {field.label}
                      </FieldLabel>
                      {isAutoMatched && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto-filled</span>
                        </span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">{field.description}</p>
                    )}
                    {messageNote}
                    {limitedPlaces.length > 0 && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Places left: {limitedPlaces.join(', ')}</p>
                    )}
                    {layout.setValues.has(String(field.id)) && (
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Filled in automatically from your other answers.</p>
                    )}

                    {/* TEXT Field */}
                    {(field.type === 'TEXT' || field.type === 'CLUB_ID') && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="text"
                        placeholder={field.placeholder || (field.type === 'CLUB_ID' ? 'Enter your Club ID...' : 'Enter response...')}
                        value={fieldVal}
                        maxLength={field.validation_rules?.maxLength}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* EMAIL Field */}
                    {field.type === 'EMAIL' && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="email"
                        placeholder={field.placeholder || 'email@example.com'}
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* PHONE Field */}
                    {field.type === 'PHONE' && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="tel"
                        placeholder={field.placeholder || '+91 9876543210'}
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* URL Field */}
                    {field.type === 'URL' && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="url"
                        placeholder={field.placeholder || 'https://...'}
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* PARAGRAPH Field */}
                    {field.type === 'PARAGRAPH' && (
                      <SpotlightTextarea
                        id={`field-${field.id}`}
                        rows={4}
                        placeholder={field.placeholder || 'Type details here...'}
                        value={fieldVal}
                        maxLength={field.validation_rules?.maxLength}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* DROPDOWN Field */}
                    {field.type === "DROPDOWN" && (
                      <ModernSelect
                        id={`field-${field.id}`}
                        value={fieldVal}
                        options={field.options || []}
                        placeholder="Select an option"
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                        onChange={(value) => handleInputChange(field, value)}
                        onBlur={() => handleFieldBlur(field, fieldVal)}
                      />
                    )}

                    {/* RADIO Field */}
                    {field.type === 'RADIO' && (
                      <div
                        className="grid gap-2.5 pt-1"
                        role="radiogroup"
                        aria-labelledby={`field-${field.id}-label`}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      >
                        {field.options?.map((opt) => {
                          const selected = fieldVal === opt;

                          return (
                            <label
                              key={opt}
                              className={`
                                group relative flex items-center gap-3.5
                                rounded-xl border
                                px-4 py-3.5
                                cursor-pointer
                                transition-all duration-200
                                select-none
                                ${
                                  selected
                                    ? 'border-[#FF7A00] bg-[#FF7A00]/[0.07] shadow-[0_0_0_3px_rgba(255,122,0,0.08)]'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101117] hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/[0.025]'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name={`field-${field.id}`}
                                value={opt}
                                checked={selected}
                                onChange={(e) => handleInputChange(field, e.target.value)}
                                onBlur={() => handleFieldBlur(field, fieldVal)}
                                className="sr-only"
                              />

                              {/* Custom Radio */}
                              <span
                                className={`
                                  flex h-5 w-5 shrink-0 items-center justify-center
                                  rounded-full border-2
                                  transition-all duration-200
                                  ${
                                    selected
                                      ? 'border-[#FF7A00] bg-[#FF7A00]'
                                      : 'border-slate-300 dark:border-slate-600 group-hover:border-[#FF7A00]/60'
                                  }
                                `}
                              >
                                {selected && (
                                  <span className="h-2 w-2 rounded-full bg-white" />
                                )}
                              </span>

                              <span
                                className={`
                                  text-sm leading-5 transition-colors min-w-0 [overflow-wrap:anywhere]
                                  ${
                                    selected
                                      ? 'font-semibold text-[#D85F00] dark:text-[#FF9A4A]'
                                      : 'font-medium text-slate-700 dark:text-slate-300'
                                  }
                                `}
                              >
                                {opt}
                              </span>

                              {/* Selected check indicator */}
                              {selected && (
                                <span className="ml-auto text-[#FF7A00]">
                                  <CheckCircle2 className="h-4 w-4" />
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* NUMBER Field */}
                    {field.type === 'NUMBER' && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="number"
                        placeholder={field.placeholder || 'Enter number...'}
                        value={fieldVal}
                        min={field.validation_rules?.minValue}
                        max={field.validation_rules?.maxValue}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* CHECKBOX Field */}
                    {field.type === 'CHECKBOX' && (
                      <div
                        className="grid gap-2.5 pt-1"
                        role="group"
                        aria-labelledby={`field-${field.id}-label`}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      >
                        {field.options?.map((opt) => {
                          const selected =
                            Array.isArray(formData[field.id]) &&
                            formData[field.id].includes(opt);

                          return (
                            <label
                              key={opt}
                              className={`
                                group flex items-center gap-3.5
                                rounded-xl border
                                px-4 py-3.5
                                cursor-pointer
                                select-none
                                transition-all duration-200
                                ${
                                  selected
                                    ? 'border-[#FF7A00] bg-[#FF7A00]/[0.07] shadow-[0_0_0_3px_rgba(255,122,0,0.08)]'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101117] hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/[0.025]'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                value={opt}
                                checked={selected}
                                onChange={(e) => {
                                  const curr = Array.isArray(formData[field.id])
                                    ? formData[field.id]
                                    : [];

                                  const next = e.target.checked
                                    ? [...curr, opt]
                                    : curr.filter((i: string) => i !== opt);

                                  handleInputChange(field, next);
                                }}
                                onBlur={() => handleFieldBlur(field, formData[field.id])}
                                className="sr-only"
                              />

                              {/* Custom Checkbox */}
                              <span
                                className={`
                                  flex h-5 w-5 shrink-0 items-center justify-center
                                  rounded-md border-2
                                  transition-all duration-200
                                  ${
                                    selected
                                      ? 'border-[#FF7A00] bg-[#FF7A00] text-white'
                                      : 'border-slate-300 dark:border-slate-600 group-hover:border-[#FF7A00]/60'
                                  }
                                `}
                              >
                                {selected && (
                                  <svg
                                    className="h-3.5 w-3.5"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path
                                      d="m5 10 3 3 7-7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </span>

                              <span
                                className={`
                                  text-sm leading-5
                                  ${
                                    selected
                                      ? 'font-semibold text-[#D85F00] dark:text-[#FF9A4A]'
                                      : 'font-medium text-slate-700 dark:text-slate-300'
                                  }
                                `}
                              >
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* DATE Field */}
                    {field.type === 'DATE' && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="date"
                        value={formData[field.id] || ''}
                        min={field.validation_rules?.minDate}
                        max={field.validation_rules?.maxDate}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* TIME Field */}
                    {field.type === 'TIME' && (
                      <SpotlightInput
                        id={`field-${field.id}`}
                        type="time"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onBlur={(e) => handleFieldBlur(field, e.target.value)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* FILE / MULTI_FILE Field */}
                    {(field.type === 'FILE' || field.type === 'MULTI_FILE') && uploadConfig.direct_upload && !currentUser && (
                      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">Sign in to attach files to this form.</p>
                    )}
                    {(field.type === 'FILE' || field.type === 'MULTI_FILE') && uploadConfig.direct_upload && !!currentUser && (
                      <FileUploadField
                        slug={slug}
                        fieldId={Number(field.id)}
                        multiple={field.type === 'MULTI_FILE'}
                        rules={field.validation_rules}
                        defaultMb={uploadConfig.default_mb}
                        value={formData[field.id]}
                        invalid={isErr}
                        describedBy={errorId}
                        disabled={isLockedToSingleExistingResponse}
                        onChange={(next) => handleInputChange(field, next)}
                        onBusyChange={(busy) => setFieldUploading(field.id, busy)}
                        onBlur={() => handleFieldBlur(field, formData[field.id])}
                        onProblem={(message) => setErrors((prev) => {
                          if (message) setTouched((t) => ({ ...t, [String(field.id)]: true }));
                          const next = { ...prev };
                          if (message) next[String(field.id)] = message; else delete next[String(field.id)];
                          return next;
                        })}
                      />
                    )}
                    {(field.type === 'FILE' || field.type === 'MULTI_FILE') && !uploadConfig.direct_upload && (
                      <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center bg-[#FAFAFC] dark:bg-[#0D0E15] hover:border-[#FF7A00]/50 transition">
                        <Upload className="w-8 h-8 text-[#FF7A00] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Drag & drop {field.type === 'MULTI_FILE' ? 'files' : 'a file'} or click to select
                        </p>
                        <input
                          type="file"
                          id={`field-${field.id}`}
                          aria-invalid={isErr}
                          aria-describedby={errorId}
                          multiple={field.type === 'MULTI_FILE'}
                          accept={field.validation_rules?.allowedFileTypes || undefined}
                          onChange={(e) => { void handleFileChange(field, e.target.files); }}
                          onBlur={() => handleFieldBlur(field, formData[field.id])}
                          className="mt-2 block w-full min-w-0 max-w-full min-h-9 text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-800 dark:file:bg-slate-700 dark:file:text-slate-100"
                        />
                        {(() => {
                          const val = formData[field.id];
                          const items: any[] = Array.isArray(val) ? val : val ? [val] : [];
                          if (!items.length) return null;
                          return (
                            <div className="mt-3 flex flex-wrap justify-center gap-3">
                              {items.map((f, i) => {
                                const isImg = typeof f?.type === 'string'
                                  ? f.type.startsWith('image/')
                                  : /\.(png|jpe?g|gif|webp|svg)$/i.test(f?.name || '');
                                return (
                                  <div key={i} className="flex flex-col items-center gap-1 max-w-[120px]">
                                    {isImg && f?.url ? (
                                      <img src={f.url} alt={f.name} className="w-20 h-20 object-cover rounded border border-slate-300 dark:border-slate-700" />
                                    ) : (
                                      <FileText className="w-8 h-8 text-slate-400" />
                                    )}
                                    <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{f?.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* RATING Field */}
                    {field.type === 'RATING' && (() => {
                      const min = field.min_value ?? 1;
                      const max = field.max_value ?? 5;
                      const current = Number(fieldVal) || 0;
                      const stars: number[] = [];
                      for (let i = min; i <= max; i++) stars.push(i);
                      return (
                        <div
                          className="flex items-center gap-2 pt-1"
                          role="radiogroup"
                          aria-labelledby={`field-${field.id}-label`}
                          aria-invalid={isErr}
                          aria-describedby={errorId}
                        >
                          {stars.map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleInputChange(field, i)}
                              onBlur={() => handleFieldBlur(field, i)}
                              aria-label={`${i} star${i === 1 ? '' : 's'}`}
                              aria-pressed={current >= i}
                              className="p-1 transition-transform duration-100 active:scale-90"
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${
                                  current >= i
                                    ? 'fill-[#FF7A00] text-[#FF7A00]'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {/* LINEAR_SCALE Field */}
                    {field.type === 'LINEAR_SCALE' && (() => {
                      const min = field.min_value ?? 1;
                      const max = field.max_value ?? 5;
                      const current = fieldVal === '' || fieldVal === undefined || fieldVal === null ? null : Number(fieldVal);
                      const nums: number[] = [];
                      for (let i = min; i <= max; i++) nums.push(i);
                      return (
                        <div
                          className="flex flex-wrap items-center gap-2 pt-1"
                          role="radiogroup"
                          aria-labelledby={`field-${field.id}-label`}
                          aria-invalid={isErr}
                          aria-describedby={errorId}
                        >
                          {nums.map((i) => {
                            const selected = current === i;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleInputChange(field, i)}
                                onBlur={() => handleFieldBlur(field, i)}
                                aria-pressed={selected}
                                className={`h-10 w-10 rounded-lg border text-sm font-bold transition-all active:scale-90 ${
                                  selected
                                    ? 'border-[#FF7A00] bg-[#FF7A00] text-white'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#FF7A00]/50'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* MATRIX_RADIO Field */}
                    {field.type === 'MATRIX_RADIO' && (() => {
                      const rows = field.rows || [];
                      const cols = field.options || [];
                      const matrixVal: Record<string, string> =
                        formData[field.id] && typeof formData[field.id] === 'object' && !Array.isArray(formData[field.id])
                          ? formData[field.id]
                          : {};
                      return (
                        <div
                          className="overflow-x-auto pt-1"
                          role="group"
                          aria-labelledby={`field-${field.id}-label`}
                          aria-label={field.label}
                          aria-invalid={isErr}
                          aria-describedby={errorId}
                        >
                          {cols.length > 3 && <p className="sm:hidden pb-1 text-[11px] text-slate-600 dark:text-slate-400">{t('swipeHint')}</p>}
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr>
                                <th scope="col" className="text-left p-2"><span className="sr-only">Row</span></th>
                                {cols.map((c) => (
                                  <th key={c} scope="col" className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => (
                                <tr key={row} className="border-t border-slate-100 dark:border-slate-800">
                                  <th scope="row" className="p-2 text-left font-medium text-slate-700 dark:text-slate-300 min-w-[6.5rem] [overflow-wrap:anywhere]">{row}</th>
                                  {cols.map((c) => {
                                    const selected = matrixVal[row] === c;
                                    return (
                                      <td key={c} className="p-2 text-center">
                                        <input
                                          type="radio"
                                          name={`field-${field.id}-${row}`}
                                          aria-label={`${row}: ${c}`}
                                          checked={selected}
                                          onChange={() => {
                                            const next = { ...matrixVal, [row]: c };
                                            handleInputChange(field, next);
                                          }}
                                          onBlur={() => handleFieldBlur(field, matrixVal)}
                                          className="h-6 w-6 accent-[#FF7A00] cursor-pointer"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* MATRIX_CHECKBOX Field */}
                    {field.type === 'MATRIX_CHECKBOX' && (() => {
                      const rows = field.rows || [];
                      const cols = field.options || [];
                      const matrixVal: Record<string, string[]> =
                        formData[field.id] && typeof formData[field.id] === 'object' && !Array.isArray(formData[field.id])
                          ? formData[field.id]
                          : {};
                      return (
                        <div
                          className="overflow-x-auto pt-1"
                          role="group"
                          aria-labelledby={`field-${field.id}-label`}
                          aria-label={field.label}
                          aria-invalid={isErr}
                          aria-describedby={errorId}
                        >
                          {cols.length > 3 && <p className="sm:hidden pb-1 text-[11px] text-slate-600 dark:text-slate-400">{t('swipeHint')}</p>}
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr>
                                <th scope="col" className="text-left p-2"><span className="sr-only">Row</span></th>
                                {cols.map((c) => (
                                  <th key={c} scope="col" className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => {
                                const cell: string[] = Array.isArray(matrixVal[row]) ? matrixVal[row] : [];
                                return (
                                  <tr key={row} className="border-t border-slate-100 dark:border-slate-800">
                                    <th scope="row" className="p-2 text-left font-medium text-slate-700 dark:text-slate-300 min-w-[6.5rem] [overflow-wrap:anywhere]">{row}</th>
                                    {cols.map((c) => {
                                      const selected = cell.includes(c);
                                      return (
                                        <td key={c} className="p-2 text-center">
                                          <input
                                            type="checkbox"
                                            aria-label={`${row}: ${c}`}
                                            checked={selected}
                                            onChange={(e) => {
                                              const nextCell = e.target.checked
                                                ? [...cell, c]
                                                : cell.filter((x) => x !== c);
                                              const next = { ...matrixVal, [row]: nextCell };
                                              handleInputChange(field, next);
                                            }}
                                            onBlur={() => handleFieldBlur(field, matrixVal)}
                                            className="h-6 w-6 accent-[#FF7A00] cursor-pointer"
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* SIGNATURE Field */}
                    {field.type === 'SIGNATURE' && (
                      <SignaturePad
                        id={`field-${field.id}`}
                        value={typeof fieldVal === 'string' ? fieldVal : ''}
                        onChange={(dataUrl) => handleInputChange(field, dataUrl)}
                        onBlur={(dataUrl) => handleFieldBlur(field, dataUrl)}
                        hasError={isErr}
                        aria-invalid={isErr}
                        aria-describedby={errorId}
                      />
                    )}

                    {/* Character counter / constraint hint */}
                    {(field.type === 'TEXT' || field.type === 'PARAGRAPH') && field.validation_rules?.maxLength ? (
                      <p className="text-[11px] text-slate-400 text-right">
                        {formData[field.id]?.length || 0}/{field.validation_rules.maxLength}
                      </p>
                    ) : (
                      hint && <p className="text-[11px] text-slate-400">{hint}</p>
                    )}

                    {/* Error message */}
                    {isErr && (
                      <p
                        id={errorId}
                        role="alert"
                        aria-live="polite"
                        className="text-xs text-rose-500 font-semibold flex items-center space-x-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors[field.id] || errors[String(field.id)]}</span>
                      </p>
                    )}
                  </div>
                );
              })}
              </fieldset>

              {/* Submit Action */}
              {(() => {
                const now = Date.now();
                const openTime = form.open_at ? new Date(form.open_at).getTime() : null;
                const closeTime = form.close_at ? new Date(form.close_at).getTime() : null;
                const isBeforeOpen = form.status === 'SCHEDULED' && openTime !== null && now < openTime;
                const isAfterClose = closeTime !== null && now > closeTime;
                const isClosed = form.status === 'CLOSED' || isAfterClose;

                if (!currentUser) {
                  return (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                        <Lock className="w-4 h-4" />
                        <span>{t('signInRequired')}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowLoginModal(true)}
                        className="group/btn relative inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#E06B00] dark:from-[#FF7A00] dark:to-[#A8460A] text-white font-extrabold text-sm shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] transition active:scale-[0.98]"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{t('signInButton')}</span>
                        <BottomGradient />
                      </button>
                    </div>
                  );
                }

                if (isLockedToSingleExistingResponse) {
                  return (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                        <Lock className="w-4 h-4" />
                        <span>{t('alreadySubmitted')}</span>
                      </p>
                      <button
                        type="button"
                        disabled={true}
                        className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-slate-800 text-slate-400 font-extrabold text-sm shadow-sm opacity-60 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{t('alreadySubmittedButton')}</span>
                      </button>
                    </div>
                  );
                }

                // A required profile-bound field with nothing to show for it
                // (e.g. phone number never set) can never pass validation -
                // the server would reject it the same way. Send them to fix
                // their profile instead of letting them hit that on submit -
                // but only when the form would otherwise actually accept a
                // submission; a closed/not-yet-open form should still show
                // that, not a profile-completion prompt implying they could
                // register right now by fixing their profile.
                const missingRequiredProfileFields = (form.fields || []).filter(
                  (f) => f.profile_field && f.is_required && resolveProfileFieldValue(f.profile_field, currentUser) === undefined
                );
                if (missingRequiredProfileFields.length > 0 && !isClosed && !isBeforeOpen) {
                  return (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Complete your profile to register. Missing: {missingRequiredProfileFields.map((f) => f.label).join(', ')}</span>
                      </p>
                      <Link
                        href="/profile"
                        className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#E06B00] text-white font-extrabold text-sm shadow-sm transition active:scale-[0.98]"
                      >
                        <span>Update Your Profile</span>
                      </Link>
                    </div>
                  );
                }

                const hasNextPage = multiPage && nextReachable(layout, activePage) !== null;
                const hasPreviousPage = multiPage && previousReachable(layout, activePage) !== null;
                return (
                  <>
                  {/* Honeypot: invisible and unreachable for people, tempting for bots. */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                    <label>
                      Leave this field empty
                      <input type="text" name="hp_q7z4" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                    </label>
                  </div>
                  {form.captcha_enabled && !isEditMode && !hasNextPage && (
                    <div className="pt-4">
                      <TurnstileWidget onToken={setCaptchaToken} resetSignal={captchaReset} language={form.language} />
                    </div>
                  )}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    {hasPreviousPage ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-[#FF7A00] transition active:scale-[0.98]"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('back')}</span>
                      </button>
                    ) : <span />}
                    {hasNextPage ? (
                      <button
                        key="next-page"
                        type="button"
                        onClick={goNext}
                        disabled={isClosed || isBeforeOpen}
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#E06B00] dark:from-[#FF7A00] dark:to-[#A8460A] text-white font-extrabold text-base transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span>{t('next')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                    <button
                      key="submit-form"
                      type="submit"
                      disabled={isSubmitting || anyUploading || isClosed || isBeforeOpen || cooldown > 0 || verifyLocked || (!!form.captcha_enabled && !isEditMode && !captchaToken)}
                      className="group/btn relative inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#E06B00] dark:from-[#FF7A00] dark:to-[#A8460A] text-white font-extrabold text-base shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>
                        {cooldown > 0
                          ? t('tryAgainIn', { n: cooldown })
                          : isSubmitting
                          ? (isEditMode ? t('savingUpdates') : t('submitting'))
                          : isBeforeOpen
                          ? t('notYetOpen')
                          : isClosed
                          ? t('closed')
                          : isEditMode
                          ? t('update')
                          : t('submit')}
                      </span>
                      {isEditMode ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      <BottomGradient />
                    </button>
                    )}
                  </div>
                  </>
                );
              })()}
            </form>
          </div>
        )}

      </div>
    </div>
  );
}