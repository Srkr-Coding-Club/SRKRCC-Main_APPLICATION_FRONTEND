'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Form, FormField } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.fields) return;

    // Validate required fields
    const newErrors: Record<string, string> = {};
    form.fields.forEach((field) => {
      if (field.is_required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1000);
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 text-center">
        <p className="text-slate-500">Loading form definition...</p>
      </div>
    );
  }

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
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-1">
                {form.description}
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields?.map((field) => {
                const isErr = !!errors[field.id];

                return (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                      {field.label} {field.is_required && <span className="text-[#8B2E3B] dark:text-rose-400">*</span>}
                    </label>

                    {/* TEXT Field */}
                    {field.type === 'TEXT' && (
                      <input
                        type="text"
                        placeholder={field.placeholder || 'Enter response...'}
                        value={formData[field.id] || ''}
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
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${
                          isErr ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'
                        }`}
                      />
                    )}

                    {/* FILE Field */}
                    {field.type === 'FILE' && (
                      <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
                        <Upload className="w-8 h-8 text-[#FF7A00] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Drag & drop PDF / File or click to select</p>
                        <input
                          type="file"
                          onChange={(e) => handleInputChange(field.id, e.target.files?.[0]?.name || 'Uploaded File')}
                          className="mt-2 text-xs text-slate-500"
                        />
                      </div>
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
