'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import SignupCard from '@/components/SignupCard';

export default function SignupPage() {
  const router = useRouter();

  return (
    <Suspense fallback={null}>
      <SignupCard onClose={() => router.back()} />
    </Suspense>
  );
}
