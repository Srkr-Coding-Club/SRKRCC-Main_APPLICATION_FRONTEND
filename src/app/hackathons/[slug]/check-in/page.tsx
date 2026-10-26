'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ScanLine } from 'lucide-react';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { CheckInConsole } from '@/components/hackathons/CheckInConsole';

/** For check-in volunteers (and organizers) working a phone at the entrance. */
export default function CheckInPage() {
  const { slug } = useParams<{ slug: string }>();
  const signedIn = useRequireLogin(`/hackathons/${slug}/check-in`);

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="mx-auto max-w-3xl space-y-5 px-4 sm:px-6">
        <Link href={`/hackathons/${slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted sm:min-h-8 hover:text-journey-accent"><ArrowLeft className="h-4 w-4" /> Hackathon page</Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl"><ScanLine className="h-6 w-6 text-journey-accent" /> Check-in</h1>
        {signedIn && <CheckInConsole slug={slug} />}
      </div>
    </div>
  );
}
