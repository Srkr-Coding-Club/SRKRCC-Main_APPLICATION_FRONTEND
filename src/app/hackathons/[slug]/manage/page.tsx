'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { HackathonManager } from '@/components/admin/hackathon/HackathonManager';

export const dynamic = 'force-dynamic';

/** The control room for people with a role in this one hackathon (organizers, judges, volunteers). The server enforces every action. */
export default function ManageHackathonPage() {
  const { slug } = useParams<{ slug: string }>();
  const signedIn = useRequireLogin(`/hackathons/${slug}/manage`);
  if (!signedIn) return null;
  return (
    <Suspense fallback={null}>
      <HackathonManager slug={slug} basePath={`/hackathons/${slug}/manage`} backHref={`/hackathons/${slug}`} backLabel="Hackathon page" />
    </Suspense>
  );
}
