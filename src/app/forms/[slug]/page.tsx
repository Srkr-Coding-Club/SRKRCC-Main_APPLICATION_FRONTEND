'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Form, FormField } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { getStoredUser, setStoredUser, AuthUser } from '@/lib/auth';
import { getConstraintHint, validateFieldValue } from '@/lib/formValidation';
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
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

/**
 * Intelligent matcher that matches FormField definitions to authenticated student profile fields.
 */
function matchUserDetailToField(field: FormField, user: AuthUser | null): any {
  if (!user || !field) return undefined;
  const label = (field.label || '').toLowerCase().trim();
  const placeholder = (field.placeholder || '').toLowerCase().trim();
  const type = field.type;

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

export default function FormDetailSubmissionPage() {
  const { toast } = useToast();
  const params = useParams();
  const slug = params?.slug as string;

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [existingResponse, setExistingResponse] = useState<any | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [canEditResponse, setCanEditResponse] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Check user authentication & fetch fresh profile details
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      fetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh && fresh.id) {
            const merged = { ...user, ...fresh };
            setCurrentUser(merged);
            setStoredUser(merged);
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
      try {
        const fetched = await fetchApi<Form>(`/forms/${slug}/`);
        if (fetched && fetched.title) {
          setForm(fetched);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
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
          setIsEditMode(true);

          // Pre-populate formData with previously submitted answers
          const prefill: Record<string, any> = {};
          if (res.response.answers && Array.isArray(res.response.answers)) {
            res.response.answers.forEach((ans: any) => {
              const fieldKey = ans.field_id !== undefined ? String(ans.field_id) : String(ans.field);
              prefill[fieldKey] = ans.value;
            });
          }
          setFormData((prev) => ({ ...prefill, ...prev }));
        }
      } catch (err) {
        console.warn('[My Response Check Error]:', err);
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
          if (field.type === 'SECTION') return;
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

  // Load draft from localStorage on mount (only if no existing submitted response)
  useEffect(() => {
    if (slug && !hasSubmitted) {
      try {
        const savedDraft = localStorage.getItem(`srkrcc_form_draft_${slug}`);
        if (savedDraft) {
          setFormData((prev) => ({ ...JSON.parse(savedDraft), ...prev }));
        }
      } catch {}
    }
  }, [slug, hasSubmitted]);

  const handleInputChange = (fieldId: number | string, value: any) => {
    if (hasSubmitted && !canEditResponse) return; // Prevent edits when locked

    setFormData((prev) => {
      const next = { ...prev, [String(fieldId)]: value };
      try {
        if (slug && !hasSubmitted) localStorage.setItem(`srkrcc_form_draft_${slug}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (errors[String(fieldId)] || errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[String(fieldId)];
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setShowLoginModal(true);
      toast.warning('Sign In Required', 'Please sign in with your college account to submit this form.');
      return;
    }

    if (hasSubmitted && !canEditResponse) {
      toast.error('Submission Locked', 'You have already submitted this form and edits are disabled.');
      return;
    }

    if (!form || !form.fields) return;

    const newErrors: Record<string, string> = {};
    form.fields.forEach((field) => {
      if (field.type === 'SECTION') return;
      const error = validateFieldValue(field, formData[String(field.id)] ?? formData[field.id]);
      if (error) newErrors[String(field.id)] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Validation Error', 'Please complete all required fields correctly.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const answersPayload = Object.entries(formData)
        .filter(([fieldId]) => {
          const field = form.fields?.find((f) => String(f.id) === String(fieldId));
          return field && field.type !== 'SECTION';
        })
        .map(([fieldId, value]) => ({
          field: Number(fieldId) || fieldId,
          value: value,
        }));

      const idempotencyKey = `sub_${form.id}_${currentUser.id}_${isEditMode ? 'edit_' : ''}${Date.now()}`;

      await fetchApi('/forms/submissions/', {
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
        }),
      });

      try {
        if (slug) localStorage.removeItem(`srkrcc_form_draft_${slug}`);
      } catch {}

      if (isEditMode) {
        toast.success('Response Updated!', `Your updated response for ${form.title} has been saved.`);
      } else {
        toast.success('Registration Received!', `Your response for ${form.title} was successfully submitted.`);
      }
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('[Form Submit Error]:', err);
      const errMsg = err?.message || err?.error || 'Failed to submit form to server.';
      setSubmissionError(errMsg);
      toast.error('Submission Failed', errMsg);
    } finally {
      setIsSubmitting(false);
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
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
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
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      
      {/* Login Required Modal Dialog */}
      {showLoginModal && !currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151722] rounded-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-center relative overflow-hidden">
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
                href={`/login?redirect=/forms/${slug}`}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-sm shadow-md transition"
              >
                <span>Click Here to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                href={`/signup?redirect=/forms/${slug}`}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
              >
                Create New Account
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              Continue in preview mode
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/forms"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] px-4 py-2 rounded-lg bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Forms Center</span>
          </Link>
        </div>

        {/* Success Confirmation Card */}
        {isSubmitted ? (
          <div className="bg-white dark:bg-[#151722] rounded-xl p-8 sm:p-12 border border-emerald-200 dark:border-emerald-900/50 shadow-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
              Submission Received!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Thank you for submitting your response for <strong className="text-[#1A1A2E] dark:text-white">{form.title}</strong>. A confirmation has been recorded under your verified account.
            </p>
            <div className="pt-4">
              <Link
                href="/forms"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#FF7A00] text-white font-bold text-sm shadow-sm hover:bg-[#E06B00] transition"
              >
                <span>Return to Forms Center</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Form Content Card */
          <div className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-md space-y-8">
            
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
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <UserCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Submitting as verified user: <strong className="text-white">{currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : currentUser.username || currentUser.email}</strong> ({currentUser.email})</span>
                    </div>
                  </div>

                  {/* Previous submission & Edit Mode banner */}
                  {hasSubmitted && (
                    canEditResponse ? (
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                        <Edit3 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-blue-300">
                            Response Edit Mode Active
                          </p>
                          <p className="text-blue-300/80">
                            You previously submitted this form on {existingResponse?.submitted_at ? new Date(existingResponse.submitted_at).toLocaleString('en-IN') : 'earlier'}. You can update your answers below and click <strong>Update Response</strong> to save your changes.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                        <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-amber-300">
                            Response Already Submitted (Edits Locked)
                          </p>
                          <p className="text-amber-300/80">
                            You submitted your response on {existingResponse?.submitted_at ? new Date(existingResponse.submitted_at).toLocaleString('en-IN') : 'earlier'}. Further changes are closed.
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-[#FF7A00] flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">Sign In Required</p>
                      <p className="text-slate-500 dark:text-slate-400">You must be logged in to fill and submit this form.</p>
                    </div>
                  </div>
                  <Link
                    href={`/login?redirect=/forms/${slug}`}
                    className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs whitespace-nowrap shadow transition text-center"
                  >
                    Click Here to Log In
                  </Link>
                </div>
              )}

              {submissionError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-300">
                    <p className="font-bold text-rose-400">Submission Notice</p>
                    <p className="mt-0.5 text-rose-300/80">{submissionError}</p>
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
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-300">
                        <p className="font-bold">Draft Preview Mode</p>
                        <p className="mt-0.5 text-amber-400/80">This form has not been published yet. Responses submitted here are for testing only.</p>
                      </div>
                    </div>
                  );
                }

                if (form.status === 'CLOSED' || isAfterClose) {
                  return (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-rose-300">
                        <p className="font-bold">Submissions Closed</p>
                        <p className="mt-0.5 text-rose-300/80">
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
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-300">
                        <p className="font-bold">Scheduled Launch Window</p>
                        <p className="mt-0.5 text-blue-300/80">
                          Submissions will automatically open on{' '}
                          <strong>{new Date(form.open_at!).toLocaleString('en-IN')}</strong>. Please check back then.
                        </p>
                      </div>
                    </div>
                  );
                }

                if (form.status === 'SCHEDULED' && !isBeforeOpen && !isAfterClose) {
                  return (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-300">
                        <p className="font-bold">Scheduled Window Live</p>
                        <p className="mt-0.5 text-emerald-300/80">
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
              {form.fields?.map((field) => {
                const isErr = !!errors[field.id];
                const hint = getConstraintHint(field);

                if (field.type === 'SECTION') {
                  return (
                    <div key={field.id} className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-lg font-bold text-[#FF7A00]">{field.label}</h3>
                      {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
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
                  <div key={field.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                        {field.label} {field.is_required && <span className="text-[#8B2E3B] dark:text-rose-400">*</span>}
                      </label>
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

                    {/* TEXT Field */}
                    {field.type === 'TEXT' && (
                      <input
                        type="text"
                        placeholder={field.placeholder || 'Enter response...'}
                        value={fieldVal}
                        maxLength={field.validation_rules?.maxLength}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* EMAIL Field */}
                    {field.type === 'EMAIL' && (
                      <input
                        type="email"
                        placeholder={field.placeholder || 'email@example.com'}
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* PHONE Field */}
                    {field.type === 'PHONE' && (
                      <input
                        type="tel"
                        placeholder={field.placeholder || '+91 9876543210'}
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* URL Field */}
                    {field.type === 'URL' && (
                      <input
                        type="url"
                        placeholder={field.placeholder || 'https://...'}
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* PARAGRAPH Field */}
                    {field.type === 'PARAGRAPH' && (
                      <textarea
                        rows={4}
                        placeholder={field.placeholder || 'Type details here...'}
                        value={fieldVal}
                        maxLength={field.validation_rules?.maxLength}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* DROPDOWN Field */}
                    {field.type === 'DROPDOWN' && (
                      <select
                        value={fieldVal}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      >
                        <option value="">Select option...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {/* RADIO Field */}
                    {field.type === 'RADIO' && (
                      <div className="space-y-2 pt-1">
                        {field.options?.map((opt) => (
                          <label key={opt} className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name={`field-${field.id}`}
                              value={opt}
                              checked={fieldVal === opt}
                              onChange={(e) => handleInputChange(field.id, e.target.value)}
                              className="w-4 h-4 text-[#FF7A00] focus:ring-[#FF7A00]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* NUMBER Field */}
                    {field.type === 'NUMBER' && (
                      <input
                        type="number"
                        placeholder={field.placeholder || 'Enter number...'}
                        value={fieldVal}
                        min={field.validation_rules?.minValue}
                        max={field.validation_rules?.maxValue}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* CHECKBOX Field */}
                    {field.type === 'CHECKBOX' && (
                      <div className="space-y-2 pt-1">
                        {field.options?.map((opt) => (
                          <label key={opt} className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              value={opt}
                              checked={Array.isArray(formData[field.id]) && formData[field.id].includes(opt)}
                              onChange={(e) => {
                                const curr = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                                const next = e.target.checked ? [...curr, opt] : curr.filter((i: string) => i !== opt);
                                handleInputChange(field.id, next);
                              }}
                              className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* DATE Field */}
                    {field.type === 'DATE' && (
                      <input
                        type="date"
                        value={formData[field.id] || ''}
                        min={field.validation_rules?.minDate}
                        max={field.validation_rules?.maxDate}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* TIME Field */}
                    {field.type === 'TIME' && (
                      <input
                        type="time"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* FILE / MULTI_FILE Field */}
                    {(field.type === 'FILE' || field.type === 'MULTI_FILE') && (
                      <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
                        <Upload className="w-8 h-8 text-[#FF7A00] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Drag & drop {field.type === 'MULTI_FILE' ? 'files' : 'a file'} or click to select
                        </p>
                        <input
                          type="file"
                          multiple={field.type === 'MULTI_FILE'}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
                            handleInputChange(field.id, field.type === 'MULTI_FILE' ? files : files[0]);
                          }}
                          className="mt-2 text-xs text-slate-500"
                        />
                        {Array.isArray(formData[field.id]) && formData[field.id].length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-2">{formData[field.id].map((f: any) => f.name).join(', ')}</p>
                        )}
                        {formData[field.id] && !Array.isArray(formData[field.id]) && (
                          <p className="text-[11px] text-slate-400 mt-2">{formData[field.id].name}</p>
                        )}
                      </div>
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
                      <p className="text-xs text-rose-500 font-semibold flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors[field.id]}</span>
                      </p>
                    )}
                  </div>
                );
              })}

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
                        <span>You must sign in to submit your response</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowLoginModal(true)}
                        className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-sm shadow-sm transition"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Sign In to Fill Form</span>
                      </button>
                    </div>
                  );
                }

                if (hasSubmitted && !canEditResponse) {
                  return (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                        <Lock className="w-4 h-4" />
                        <span>You have already submitted a response for this form</span>
                      </p>
                      <button
                        type="button"
                        disabled={true}
                        className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-slate-800 text-slate-400 font-extrabold text-sm shadow-sm opacity-60 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Response Already Submitted</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || isClosed || isBeforeOpen}
                      className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-base shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>
                        {isSubmitting
                          ? (isEditMode ? 'Saving Updates...' : 'Submitting...')
                          : isBeforeOpen
                          ? 'Submissions Not Yet Open'
                          : isClosed
                          ? 'Submissions Closed'
                          : isEditMode
                          ? 'Update Response'
                          : 'Submit Form'}
                      </span>
                      {isEditMode ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })()}
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
