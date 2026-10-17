'use client';

import React, { Suspense } from 'react';
import SignupCard from '@/components/SignupCard';

export default function SignupPage() {
  return (
    <main className="flex w-full flex-1 bg-[#FAFAFC] dark:bg-[#0D0E15]">
      <Suspense fallback={null}>
        <SignupCard pageLayout />
      </Suspense>
    </main>
  );
}
