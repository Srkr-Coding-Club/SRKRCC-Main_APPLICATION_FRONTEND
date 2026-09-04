import React from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Form } from '@/lib/types';
import FormsRow from '@/components/FormsRow';
import PageHero from '@/components/PageHero';
import {
  FileText,
  ListFilter,
} from 'lucide-react';
import { ClipboardList } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forms & Registrations Center',
  description:
    'Browse active registration forms, RSVP to club workshops, and apply for hackathons and student lead positions.',
};

async function getPublishedForms(): Promise<Form[]> {
  try {
    // REAL BACKEND CALL — KEEP THIS
    const forms = await fetchApi<Form[]>('/forms/');

    const now = Date.now();

    return forms.filter((f) => {
      if (f.status !== 'PUBLISHED' && f.status !== 'SCHEDULED') {
        return false;
      }

      const closeTime = f.close_at
        ? new Date(f.close_at).getTime()
        : null;

      // Hide expired forms
      if (closeTime && now >= closeTime) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.warn(
      'Backend unavailable. Using temporary mock form data.',
      error,
    );

    // TEMPORARY MOCK DATA
    // This runs only when your backend/API is unavailable.
    return [
      {
        id: 'mock-1',
        slug: 'hackoverflow-2026-registration',
        title: 'HackOverflow 2026 Registration',
        description:
          'Register your team for HackOverflow and compete with talented developers to build innovative solutions.',
        category: 'Hackathon',
        status: 'PUBLISHED',
        open_at: '2026-09-01T09:00:00.000Z',
        close_at: '2026-12-15T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-2',
        slug: 'coding-club-core-team',
        title: 'SRKR Coding Club Core Team Recruitment',
        description:
          'Join the core team and become part of a passionate community building technical events and developer experiences.',
        category: 'Recruitment',
        status: 'PUBLISHED',
        open_at: '2026-09-01T09:00:00.000Z',
        close_at: '2026-11-30T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-3',
        slug: 'modern-web-development',
        title: 'Modern Web Development Workshop',
        description:
          'A hands-on workshop covering React, Next.js, Tailwind CSS and modern frontend development.',
        category: 'Workshop',
        status: 'PUBLISHED',
        open_at: '2026-09-01T09:00:00.000Z',
        close_at: '2026-10-30T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-4',
        slug: 'ai-ml-bootcamp',
        title: 'AI & Machine Learning Bootcamp',
        description:
          'Explore artificial intelligence and machine learning through practical sessions, projects and real-world applications.',
        category: 'Bootcamp',
        status: 'PUBLISHED',
        open_at: '2026-09-01T09:00:00.000Z',
        close_at: '2026-12-01T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-5',
        slug: 'open-source-drive',
        title: 'Open Source Contribution Drive',
        description:
          'Start your open-source journey by collaborating on projects, learning Git workflows and making your first contribution.',
        category: 'Open Source',
        status: 'PUBLISHED',
        open_at: '2026-09-01T09:00:00.000Z',
        close_at: '2026-11-15T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-6',
        slug: 'competitive-programming',
        title: 'Competitive Programming Challenge',
        description:
          'Test your problem-solving skills against fellow students in an exciting programming competition.',
        category: 'Competition',
        status: 'PUBLISHED',
        open_at: '2026-09-01T09:00:00.000Z',
        close_at: '2026-10-20T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-7',
        slug: 'cloud-computing-workshop',
        title: 'Cloud Computing Workshop',
        description:
          'Learn about cloud infrastructure, containers, deployment and modern application architecture.',
        category: 'Workshop',
        status: 'SCHEDULED',
        open_at: '2026-10-01T09:00:00.000Z',
        close_at: '2026-11-01T23:59:00.000Z',
        image_url: undefined,
      },

      {
        id: 'mock-8',
        slug: 'cybersecurity-program',
        title: 'Cybersecurity Awareness Program',
        description:
          'Learn essential cybersecurity concepts and understand how modern applications and systems are protected.',
        category: 'Security',
        status: 'SCHEDULED',
        open_at: '2026-10-05T09:00:00.000Z',
        close_at: '2026-11-05T23:59:00.000Z',
        image_url: undefined,
      },
    ];
  }
}

export default async function FormsCenterPage() {
  const formsToDisplay = await getPublishedForms();
  const now = Date.now();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        <PageHero
          icon={<ClipboardList className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB FORMS CENTER"
          title="Active Registrations & Submissions"
          description="Explore and fill out official application forms for upcoming hackathons, workshops, core team recruitment, and feedback surveys."
          className="!p-6 sm:!p-10"
        />

        {/* Filter & Count Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <ListFilter className="w-5 h-5 text-[#FF7A00]" />
            <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">
              Open Forms ({formsToDisplay.length})
            </h2>
          </div>

          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing all active & open club forms
          </span>
        </div>

        {/* Forms Grid */}
        {formsToDisplay.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">No Public Forms Currently Active</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Check back soon for new hackathon registrations, workshop RSVPs, and membership application forms.
            </p>
          </div>
        ) : (
          <FormsRow forms={formsToDisplay} now={now} />
        )}

      </div>
    </div>
  );
}
