import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { Form } from '@/lib/types';
import {
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  ListFilter,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forms & Registrations Center',
  description:
    'Browse active registration forms, RSVP to club workshops, and apply for hackathons and student lead positions.',
};

async function getPublishedForms(): Promise<Form[]> {
  try {
    const forms = await fetchApi<Form[]>('/forms/');
    return forms.filter((f) => f.status === 'PUBLISHED');
  } catch {
    return [];
  }
}

export default async function FormsCenterPage() {
  const fetchedForms = await getPublishedForms();

  // Fallback realistic published forms if database is currently empty
  const fallbackForms: Form[] = [
    {
      id: 101,
      title: 'IconCoders Flagship Hackathon 2025 Registration',
      slug: 'iconcoders-hackathon-2025',
      description: 'Official registration form for SRKR Coding Club annual flagship hackathon. Form your team of 2-4 members and submit project domain.',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      category: 'Hackathon',
      status: 'PUBLISHED',
      open_at: '2025-05-01T00:00:00Z',
      close_at: '2025-06-15T23:59:59Z',
      fields: [
        { id: 1, label: 'Team Leader Name', type: 'TEXT', is_required: true, order: 1 },
        { id: 2, label: 'Email Address', type: 'EMAIL', is_required: true, order: 2 },
        { id: 3, label: 'Roll Number & Branch', type: 'TEXT', is_required: true, order: 3 },
        { id: 4, label: 'Selected Track', type: 'DROPDOWN', options: ['AI/ML', 'Web Dev', 'Mobile App', 'Blockchain', 'Open Innovation'], is_required: true, order: 4 },
      ],
    },
    {
      id: 102,
      title: 'Web Development Workshop RSVP & Tool Kit',
      slug: 'web-dev-workshop-rsvp',
      description: 'Reserve your physical seat for the hands-on React & Next.js workshop in SRKR Seminar Hall.',
      image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      category: 'Workshop',
      status: 'PUBLISHED',
      open_at: '2025-05-10T00:00:00Z',
      close_at: '2025-05-24T09:00:00Z',
      fields: [
        { id: 5, label: 'Full Name', type: 'TEXT', is_required: true, order: 1 },
        { id: 6, label: 'College Email', type: 'EMAIL', is_required: true, order: 2 },
        { id: 7, label: 'Current Year of Study', type: 'RADIO', options: ['1st Year', '2nd Year', '3rd Year', '4th Year'], is_required: true, order: 3 },
      ],
    },
    {
      id: 103,
      title: 'Core Team & Volunteer Recruitment 2025-26',
      slug: 'core-team-recruitment-2025',
      description: 'Apply to become an executive member or volunteer in Tech, Design, Event Management, or Public Relations wing.',
      image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      category: 'Recruitment',
      status: 'PUBLISHED',
      open_at: '2025-05-15T00:00:00Z',
      close_at: '2025-06-30T23:59:59Z',
      fields: [
        { id: 8, label: 'Full Name', type: 'TEXT', is_required: true, order: 1 },
        { id: 9, label: 'Preferred Wing', type: 'DROPDOWN', options: ['Tech & Dev', 'Design & UI/UX', 'Events & Logistics', 'PR & Media'], is_required: true, order: 2 },
        { id: 10, label: 'Why do you want to join SRKRCC?', type: 'PARAGRAPH', is_required: true, order: 3 },
      ],
    },
    {
      id: 104,
      title: 'Codequest Daily Feedback & Streak Rewards',
      slug: 'codequest-feedback-survey',
      description: 'Share feedback regarding problem difficulties, platform UX, and claim your 30-day streak milestone reward.',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      category: 'Survey',
      status: 'PUBLISHED',
      open_at: '2025-05-01T00:00:00Z',
      close_at: '2025-12-31T23:59:59Z',
      fields: [
        { id: 11, label: 'Codequest Username', type: 'TEXT', is_required: true, order: 1 },
        { id: 12, label: 'Rating of Problem Statements', type: 'RADIO', options: ['5 Stars - Excellent', '4 Stars - Good', '3 Stars - Moderate', 'Below 3 Stars'], is_required: true, order: 2 },
      ],
    },
  ];

  const formsToDisplay = fetchedForms.length > 0 ? fetchedForms : fallbackForms;

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <ClipboardList className="w-4 h-4 text-[#FF7A00]" />
              <span>SRKR CODING CLUB FORMS CENTER</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Active Registrations & Submissions
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Explore and fill out official application forms for upcoming hackathons, workshops, core team recruitment, and feedback surveys.
            </p>
          </div>
        </div>

        {/* Filter & Count Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <ListFilter className="w-5 h-5 text-[#FF7A00]" />
            <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">
              Published Forms ({formsToDisplay.length})
            </h2>
          </div>

          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing all open & published club forms
          </span>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {formsToDisplay.map((form) => (
            <div
              key={form.slug || form.id}
              className="bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Form Cover Banner Image */}
                {form.image_url && (
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={form.image_url}
                      alt={form.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#151722] via-transparent to-transparent"></div>
                    {form.category && (
                      <span className="absolute top-3 left-4 text-xs font-bold uppercase tracking-wider text-white bg-[#FF7A00] px-3 py-1 rounded-md shadow-sm">
                        {form.category}
                      </span>
                    )}
                  </div>
                )}

                {/* Content Box */}
                <div className="p-6 space-y-4">
                  {/* Status Pill if no image */}
                  {!form.image_url && (
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                        <FileText className="w-6 h-6" />
                      </div>

                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OPEN / PUBLISHED</span>
                      </span>
                    </div>
                  )}

                  {/* Form Title & Description */}
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
                      {form.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-2">
                      {form.description}
                    </p>
                  </div>

                  {/* Date & Meta Info */}
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {form.open_at && (
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-[#FF7A00]" />
                        <span>Open: {new Date(form.open_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {form.close_at && (
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-[#8B2E3B] dark:text-rose-400" />
                        <span>Closes: {new Date(form.close_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {form.fields && (
                      <div className="flex items-center space-x-1.5 font-mono text-[#FF7A00] bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{form.fields.length} Fields</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Online Submission
                </span>

                <Link
                  href={`/forms/${form.slug}`}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition"
                >
                  <span>Fill Form</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
