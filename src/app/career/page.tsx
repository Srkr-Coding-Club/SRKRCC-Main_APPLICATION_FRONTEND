import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { JobListing } from '@/lib/types';
import {
  Briefcase,
  Building,
  MapPin,
  Clock,
  ArrowRight,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Career Hub & Tech Opportunities',
  description:
    'Discover campus placements, off-campus tech internships, and full-time hiring drives curated for SRKR Engineering College students.',
};

async function getJobs(): Promise<JobListing[]> {
  try {
    const fetched = await fetchApi<JobListing[]>('/career/');
    if (fetched && fetched.length > 0) return fetched;
  } catch (error) {
    // Fallback to career listings
  }

  return [
    {
      id: 1,
      title: 'Full Stack Software Engineer Intern',
      slug: 'full-stack-software-engineer-intern',
      company_name: 'Tech Corp Solutions',
      job_type: 'INTERNSHIP',
      location: 'Hyderabad / Hybrid',
      stipend: '₹40,000 / month',
      deadline: '2025-06-30',
      description: 'Looking for 3rd and 4th year CSE/IT students proficient in React, Node.js, and PostgreSQL for 6-month summer tech internship.',
      form_slug: 'core-team-recruitment-2025',
    },
    {
      id: 2,
      title: 'Junior AI/ML Research Engineer',
      slug: 'junior-aiml-research-engineer',
      company_name: 'Innovate AI Labs',
      job_type: 'FULL_TIME',
      location: 'Bengaluru / Onsite',
      stipend: '₹12.5 LPA Package',
      deadline: '2025-07-15',
      description: 'Full-time campus placement opening for graduating B.Tech students with hands-on experience in PyTorch and model deployment.',
    },
    {
      id: 3,
      title: 'UI/UX Product Design Apprentice',
      slug: 'uiux-product-design-apprentice',
      company_name: 'DesignCraft Studios',
      job_type: 'INTERNSHIP',
      location: 'Remote',
      stipend: '₹25,000 / month',
      deadline: '2025-06-25',
      description: 'Work alongside lead product designers creating design systems, Figma wireframes, and interactive web prototypes.',
    },
  ];
}

export default async function CareerPage() {
  const jobs = await getJobs();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <Briefcase className="w-4 h-4 text-[#FF7A00]" />
              <span>SRKR CODING CLUB CAREER HUB</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Internships & Placement Drives
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Explore exclusive software engineering internships, campus recruitment drives, and referral applications for SRKRCC members.
            </p>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-md border ${
                      j.job_type === 'INTERNSHIP'
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border-orange-200 dark:border-orange-800'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    {j.job_type}
                  </span>

                  <span className="text-xs font-mono font-bold text-rose-500">
                    Deadline: {j.deadline}
                  </span>
                </div>

                {/* Job Title & Company */}
                <div>
                  <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
                    {j.title}
                  </h3>
                  <p className="text-xs font-bold text-[#8B2E3B] dark:text-rose-400 flex items-center space-x-1.5 mt-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>{j.company_name}</span>
                  </p>
                </div>

                {j.description && (
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    {j.description}
                  </p>
                )}

                {/* Location & Stipend */}
                <div className="pt-2 space-y-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-[#FF7A00]" />
                    <span>{j.location}</span>
                  </div>

                  {j.stipend && (
                    <div className="flex items-center space-x-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span>{j.stipend}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Direct Application
                </span>

                <Link
                  href={j.form_slug ? `/forms/${j.form_slug}` : '/forms'}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
