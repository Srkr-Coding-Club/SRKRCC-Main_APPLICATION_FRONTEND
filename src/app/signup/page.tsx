import React, { Suspense } from 'react';
import SignupCard from '@/components/SignupCard';

/** Static shell — Amplify/CloudFront can cache; signup runs in the browser. */
export const revalidate = 3600;

export default function SignupPage() {
  return (
    <div className="flex w-full flex-1 bg-[#FAFAFC] dark:bg-[#0D0E15]">
      <Suspense fallback={null}>
        <SignupCard pageLayout />
      </Suspense>
    </div>
  );
}
