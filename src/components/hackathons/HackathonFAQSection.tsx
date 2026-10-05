'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Mail, Phone, ExternalLink } from 'lucide-react';
import type { Hackathon } from '@/lib/types';

interface FAQItem {
  question: string;
  answer: string;
}

export function HackathonFAQSection({ hackathon }: { hackathon: Hackathon }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const min = hackathon.min_team_size || 1;
  const max = hackathon.max_team_size || 4;
  const teamSizeText = min === max ? `${max} members` : `${min} to ${max} members`;

  const faqs: FAQItem[] = [
    {
      question: 'Who is eligible to participate in this hackathon?',
      answer:
        'All registered college students with an active SRKR Coding Club account are eligible to register. Both beginners and experienced developers are welcome! If you do not have an account yet, sign up to get started.',
    },
    {
      question: 'What are the team size constraints?',
      answer: `Teams must consist of ${teamSizeText}. You can form your team during registration, and the team leader can invite teammates by entering their registered email address.`,
    },
    {
      question: 'Can a participant join more than one team?',
      answer:
        'No. Platform integrity enforces a strict one-team-per-member rule for each hackathon. If you accept an invite to join a team, any other pending invites for this hackathon are automatically cancelled.',
    },
    {
      question: 'How do Problem Statements and capacity limits work?',
      answer:
        'Each problem statement may have a maximum team limit set by the organizers. Once all slots for a statement are filled, it will be marked as "Full". We recommend forming your team and registering early to secure your preferred problem statement.',
    },
    {
      question: 'What if we want to build our own idea instead of a predefined statement?',
      answer: hackathon.allow_open_innovation
        ? 'Open Innovation is enabled for this hackathon! Teams can select Open Innovation during team creation to submit their own custom project title, domain, and description (which receives a unique OI-xxx tracking code).'
        : 'Open Innovation is not enabled for this edition. All participating teams must choose from the official predefined problem statements.',
    },
    {
      question: 'Can we change our team members or problem statement later?',
      answer:
        'Team leaders can update team details, invite or remove members, and switch problem statements as long as team registrations are still open and team changes have not been locked by the organizers.',
    },
    {
      question: 'How does the evaluation and elimination process work?',
      answer:
        'The hackathon proceeds through structured elimination rounds. All registered teams enter Round 1. After evaluation by organizers and judges, shortlisted teams advance to the subsequent rounds and may be prompted to submit additional presentation or demo details from their participant dashboard.',
    },
    {
      question: 'Will participants receive certificates?',
      answer:
        'Yes! All verified participants with valid team submissions will receive official digital certificates of participation, and winning teams will receive cash prize payouts, trophies, and merit certificates.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-sm sm:text-base text-[#1A1A2E] dark:text-white hover:text-[#FF7A00] transition"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 shrink-0 text-[#FF7A00]" />
                  <span>{faq.question}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#FF7A00]' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support / Contact banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Still have questions?</h4>
          <p className="text-xs text-slate-500">Reach out to the SRKR Coding Club organizing team anytime.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="mailto:srkrcodingclub@gmail.com"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FF7A00] transition"
          >
            <Mail className="h-3.5 w-3.5 text-[#FF7A00]" />
            srkrcodingclub@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
