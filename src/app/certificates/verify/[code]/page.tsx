import React from 'react';
import type { Metadata } from 'next';
import { BadgeCheck, ShieldX } from 'lucide-react';
import { lookupCertificate } from '@/lib/certificateVerify';

export const dynamic = 'force-dynamic';

type VerifyParams = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: VerifyParams): Promise<Metadata> {
  const result = await lookupCertificate(decodeURIComponent((await params).code));
  const title = result ? `${result.name}: ${result.subject} certificate` : 'Verify a certificate';
  return {
    title,
    description: result ? `A genuine ${result.type.toLowerCase()} certificate awarded to ${result.name} for ${result.subject}.` : 'Check that a certificate from SRKR Coding Club is genuine.',
    robots: { index: false },
  };
}

export default async function VerifyCertificatePage({ params }: VerifyParams) {
  const { code } = await params;
  const result = await lookupCertificate(decodeURIComponent(code));

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="glass-panel w-full max-w-lg space-y-4 rounded-2xl border border-journey-text/10 p-8 text-center">
        {result ? (
          <>
            <BadgeCheck className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-journey-text">This certificate is genuine</h1>
            <dl className="space-y-1 text-sm text-journey-text/80">
              <div><dt className="inline font-semibold">Awarded to: </dt><dd className="inline">{result.name}</dd></div>
              <div><dt className="inline font-semibold">For: </dt><dd className="inline">{result.subject}</dd></div>
              {result.team && <div><dt className="inline font-semibold">Team: </dt><dd className="inline">{result.team}</dd></div>}
              <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{result.type}</dd></div>
            </dl>
          </>
        ) : (
          <>
            <ShieldX className="mx-auto h-12 w-12 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-journey-text">We could not verify this certificate</h1>
            <p className="text-sm text-journey-muted">The code is not valid. Check that it was copied in full, or ask the person for the verification link printed on the certificate.</p>
          </>
        )}
      </div>
    </div>
  );
}
