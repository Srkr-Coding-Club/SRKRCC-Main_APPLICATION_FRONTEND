'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Copy, Linkedin, Printer } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { BTN_ACCENT, BTN_QUIET } from '@/components/hackathons/dashboardStyles';

interface CertificateActionsProps {
  /** What the certificate is for: the event or hackathon title. */
  subject: string;
  /** Verification code printed on the certificate. */
  code: string;
  /** Who issued it. */
  organizer: string;
  /** ISO date of the event, for the LinkedIn issue date. */
  date: string | null;
}

const LINKEDIN_ADD_URL = 'https://www.linkedin.com/profile/add';

export function linkedInCertificateUrl({ subject, code, organizer, date }: CertificateActionsProps, verifyUrl: string): string {
  const issued = date ? new Date(date) : new Date();
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `${subject} participation`,
    organizationName: organizer,
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: verifyUrl,
    certId: code,
  });
  return `${LINKEDIN_ADD_URL}?${params.toString()}`;
}

/** Print or save as PDF, copy the public verification link, and add the certificate to LinkedIn. */
export function CertificateActions(props: CertificateActionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const verifyPath = `/certificates/verify/${encodeURIComponent(props.code)}`;
  const verifyUrl = typeof window === 'undefined' ? verifyPath : `${window.location.origin}${verifyPath}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy', 'Select the link below and copy it by hand.');
    }
  };

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => window.print()} className={BTN_ACCENT}><Printer className="h-3.5 w-3.5" /> Print or save as PDF</button>
        <button type="button" onClick={copy} className={BTN_QUIET}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Link copied' : 'Copy verification link'}
        </button>
        <a href={linkedInCertificateUrl(props, verifyUrl)} target="_blank" rel="noopener noreferrer" className={BTN_QUIET}>
          <Linkedin className="h-3.5 w-3.5" /> Add to LinkedIn
        </a>
      </div>
      <p className="min-w-0 break-all text-xs text-journey-muted">Anyone can verify it at <Link href={verifyPath} className="font-bold text-journey-accent hover:underline">{verifyUrl}</Link></p>
    </div>
  );
}
