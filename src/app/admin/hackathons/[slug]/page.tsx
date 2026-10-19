'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { HackathonManager } from '@/components/admin/hackathon/HackathonManager';

export const dynamic = 'force-dynamic';

export default function AdminHackathonManagePage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <Suspense fallback={null}>
      <HackathonManager slug={slug} basePath={`/admin/hackathons/${slug}`} backHref="/admin/hackathons" backLabel="All hackathons" />
    </Suspense>
  );
}
