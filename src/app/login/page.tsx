'use client';

import React, { Suspense } from 'react';
import LoginCard from '@/components/LoginCard';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}