'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Mail } from 'lucide-react';
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

  const defaultFaqs: FAQItem[] = [
    {
      question: 'Who is eligible to participate in this hackathon?',
      answer:
        'Anyone with an SRKR Coding Club account who meets the profile requirements listed on this page can register a team. Beginners and experienced developers are both welcome. If you do not have an account yet, sign up first.',
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
        'Certificates and prizes are decided by the organizers for each hackathon. Watch the announcements tab and your team dashboard for what applies to this edition.',
    },
  ];

  // An organizer-written FAQ replaces the standard one entirely.
  const faqs: FAQItem[] = hackathon.faq?.length ? hackathon.faq : defaultFaqs;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="rounded-2xl border border-journey-text/10 bg-journey-surface/50 overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-sm sm:text-base text-journey-text hover:text-journey-accent transition"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 shrink-0 text-journey-accent" />
                  <span>{faq.question}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-journey-muted transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-journey-accent' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-journey-text/80 leading-relaxed border-t border-journey-text/5">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support / Contact banner */}
      <div className="rounded-2xl border border-journey-text/10 bg-journey-text/[0.03] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-journey-text">Still have questions?</h3>
          <p className="text-xs text-journey-muted">Reach out to the SRKR Coding Club organizing team anytime.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="mailto:srkrcodingclub@gmail.com"
            className="inline-flex items-center gap-1.5 rounded-lg border border-journey-text/10 bg-journey-surface px-3.5 py-2 text-xs font-bold text-journey-text/90 hover:text-journey-accent transition"
          >
            <Mail className="h-3.5 w-3.5 text-journey-accent" />
            srkrcodingclub@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
