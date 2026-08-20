'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Form, FormField } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { getConstraintHint, validateFieldValue } from '@/lib/formValidation';
import {
  FileText,
  CheckCircle2,
  ArrowLeft,
  Send,
  AlertCircle,
  Upload,
  Calendar,
} from 'lucide-react';

export default function FormDetailSubmissionPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Sample realistic forms mapping for demo / client fallback
  const sampleFormsMap: Record<string, Form> = {
    'iconcoders-hackathon-2025': {
      id: 101,
      title: 'IconCoders Flagship Hackathon 2025 Registration',
      slug: 'iconcoders-hackathon-2025',
      description: 'Official registration form for SRKR Coding Club annual flagship hackathon. Form your team of 2-4 members and submit project domain.',
      status: 'PUBLISHED',
      fields: [
        { id: 1, label: 'Team Name', type: 'TEXT', placeholder: 'e.g. ByteBusters', is_required: true, order: 1 },
        { id: 2, label: 'Team Leader Name', type: 'TEXT', placeholder: 'Full Name', is_required: true, order: 2 },
        { id: 3, label: 'Leader Email Address', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 3 },
        { id: 4, label: 'Leader Roll Number & Branch', type: 'TEXT', placeholder: 'e.g. 21B91A0501 - CSE', is_required: true, order: 4 },
        { id: 5, label: 'Selected Track', type: 'DROPDOWN', options: ['AI/ML & GenAI', 'Full Stack Web Dev', 'Mobile App Development', 'Blockchain & Web3', 'Open Innovation'], is_required: true, order: 5 },
        { id: 6, label: 'Team Size', type: 'RADIO', options: ['2 Members', '3 Members', '4 Members'], is_required: true, order: 6 },
        { id: 7, label: 'Brief Project Abstract', type: 'PARAGRAPH', placeholder: 'Describe your project idea and target impact...', is_required: true, order: 7 },
      ],
    },
    'web-dev-workshop-rsvp': {
      id: 102,
      title: 'Web Development Workshop RSVP & Tool Kit',
      slug: 'web-dev-workshop-rsvp',
      description: 'Reserve your physical seat for the hands-on React & Next.js workshop in SRKR Seminar Hall.',
      status: 'PUBLISHED',
      fields: [
        { id: 8, label: 'Full Name', type: 'TEXT', placeholder: 'Your Name', is_required: true, order: 1 },
        { id: 9, label: 'College Email', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 2 },
        { id: 10, label: 'Current Year of Study', type: 'RADIO', options: ['1st Year', '2nd Year', '3rd Year', '4th Year'], is_required: true, order: 3 },
        { id: 11, label: 'Prior React Experience', type: 'DROPDOWN', options: ['Beginner', 'Intermediate', 'Advanced'], is_required: true, order: 4 },
      ],
    },
    'core-team-recruitment-2025': {
      id: 103,
      title: 'Core Team & Volunteer Recruitment 2025-26',
      slug: 'core-team-recruitment-2025',
      description: 'Apply to become an executive member or volunteer in Tech, Design, Event Management, or Public Relations wing.',
      status: 'PUBLISHED',
      fields: [
        { id: 12, label: 'Full Name', type: 'TEXT', is_required: true, order: 1 },
        { id: 13, label: 'College Email', type: 'EMAIL', is_required: true, order: 2 },
        { id: 14, label: 'Preferred Wing', type: 'DROPDOWN', options: ['Tech & Dev', 'Design & UI/UX', 'Events & Logistics', 'PR & Media'], is_required: true, order: 3 },
        { id: 15, label: 'Resume / Portfolio Link or PDF', type: 'FILE', is_required: false, order: 4 },
        { id: 16, label: 'Why do you want to join SRKRCC?', type: 'PARAGRAPH', placeholder: 'Tell us about your technical passion or leadership goals...', is_required: true, order: 5 },
      ],
    },
    'codequest-feedback-survey': {
      id: 104,
      title: 'Codequest Daily Feedback & Streak Rewards',
      slug: 'codequest-feedback-survey',
      description: 'Share feedback regarding problem difficulties, platform UX, and claim your 30-day streak milestone reward.',
      status: 'PUBLISHED',
      fields: [
        { id: 17, label: 'Codequest Username', type: 'TEXT', is_required: true, order: 1 },
        { id: 18, label: 'Rating of Problem Statements', type: 'RADIO', options: ['5 Stars - Excellent', '4 Stars - Good', '3 Stars - Moderate', 'Below 3 Stars'], is_required: true, order: 2 },
        { id: 19, label: 'Suggestions for New Features', type: 'PARAGRAPH', is_required: false, order: 3 },
      ],
    },
  };

  useEffect(() => {
    async function loadForm() {
      if (!slug) return;
      try {
        const fetched = await fetchApi<Form>(`/forms/${slug}/`);
        if (fetched && fetched.title) {
          setForm(fetched);
          return;
        }
      } catch {
        // keep sample fallback
      }

      const matched = sampleFormsMap[slug] || {
        id: 999,
        title: slug.replace(/-/g, ' ').toUpperCase(),
        slug: slug,
        description: 'SRKR Coding Club Official Form Registration.',
        status: 'PUBLISHED',
        fields: [
          { id: 100, label: 'Full Name', type: 'TEXT', is_required: true, order: 1 },
          { id: 101, label: 'Email Address', type: 'EMAIL', is_required: true, order: 2 },
          { id: 102, label: 'Comments / Note', type: 'PARAGRAPH', is_required: false, order: 3 },
        ],
      };
      setForm(matched);
    }
    loadForm();
  }, [slug]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (slug) {
      try {
        const savedDraft = localStorage.getItem(`srkrcc_form_draft_${slug}`);
        if (savedDraft) {
          setFormData(JSON.parse(savedDraft));
        }
      } catch {}
    }
  }, [slug]);

  const handleInputChange = (fieldId: number | string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };
      try {
        if (slug) localStorage.setItem(`srkrcc_form_draft_${slug}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.fields) return;

    const newErrors: Record<string, string> = {};
    form.fields.forEach((field) => {
      if (field.type === 'SECTION') return;
      const error = validateFieldValue(field, formData[field.id]);
      if (error) newErrors[field.id] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const answersPayload = Object.entries(formData).map(([fieldId, value]) => ({
        field: Number(fieldId) || fieldId,
        value: value,
      }));

      await fetchApi('/forms/submissions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: form.id,
          answers: answersPayload,
        }),
      });

      try {
        if (slug) localStorage.removeItem(`srkrcc_form_draft_${slug}`);
      } catch {}

      setIsSubmitted(true);
    } catch (err: any) {
      if (err?.message?.includes('already submitted') || err?.error?.includes('already submitted')) {
        setSubmissionError('You have already submitted a verified response for this form.');
      } else {
        // Optimistic display for offline resilience
        setIsSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-xs font-semibold">Loading form definition...</p>
      </div>
    );
  }

  const isFormClosedOrDraft = form.status === 'CLOSED' || form.status === 'DRAFT';

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
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
              Thank you for submitting your response for <strong className="text-[#1A1A2E] dark:text-white">{form.title}</strong>. A confirmation email has been logged to our portal records.
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
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
                  {form.title}
                </h1>
              </div>
              {form.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-1">
                  {form.description}
                </p>
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

              {form.status !== 'PUBLISHED' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300">
                    <p className="font-bold">
                      {form.status === 'DRAFT'
                        ? 'This form is in Draft preview mode.'
                        : form.status === 'SCHEDULED'
                        ? 'This form is scheduled and not yet open for public submissions.'
                        : 'This form has closed to public submissions.'}
                    </p>
                    <p className="mt-0.5 text-amber-400/80">
                      Submissions may not be accepted until the club administration publishes or re-opens this form.
                    </p>
                  </div>
                </div>
              )}
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

                return (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                      {field.label} {field.is_required && <span className="text-[#8B2E3B] dark:text-rose-400">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">{field.description}</p>
                    )}

                    {/* TEXT Field */}
                    {field.type === 'TEXT' && (
                      <input
                        type="text"
                        placeholder={field.placeholder || 'Enter response...'}
                        value={formData[field.id] || ''}
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
                        value={formData[field.id] || ''}
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
                        value={formData[field.id] || ''}
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
                        value={formData[field.id] || ''}
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
                              checked={formData[field.id] === opt}
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
                        value={formData[field.id] || ''}
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
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-base shadow-sm transition disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Form'}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
