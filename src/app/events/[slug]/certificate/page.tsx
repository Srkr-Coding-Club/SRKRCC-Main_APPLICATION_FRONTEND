'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { EventCertificate } from '@/lib/types';
import { eventCertificateApi } from '@/lib/api/events';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { CertificateSheet } from '@/components/hackathons/CertificateSheet';
import { CertificateActions } from '@/components/hackathons/CertificateActions';
import { PANEL } from '@/components/hackathons/dashboardStyles';

export default function EventCertificatePage() {
  const { slug } = useParams<{ slug: string }>();
  const signedIn = useRequireLogin(`/events/${slug}/certificate`);
  const [certificate, setCertificate] = useState<EventCertificate | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (signedIn) eventCertificateApi.mine(slug).then(setCertificate).catch((err) => setError(apiErrorMessage(err, 'Could not load your certificate.')));
  }, [signedIn, slug]);

  return (
    <div className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href="/profile" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted sm:min-h-8 hover:text-journey-accent print:hidden"><ArrowLeft className="h-4 w-4" /> My profile</Link>
        <h1 className="sr-only">Your certificate</h1>
        {error && <p role="alert" className={`${PANEL} text-sm text-journey-text/80`}>{error}</p>}
        {!certificate && !error && <div className="aspect-[1.414/1] w-full max-w-4xl animate-pulse rounded-lg bg-journey-text/10" aria-busy="true" />}
        {certificate && (
          <>
            <CertificateSheet certificate={certificate} />
            <CertificateActions subject={certificate.event} code={certificate.code} organizer={certificate.organizer} date={certificate.date} />
          </>
        )}
      </div>
    </div>
  );
}
