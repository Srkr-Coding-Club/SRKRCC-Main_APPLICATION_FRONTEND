'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginCard from '@/components/LoginCard';

export default function LoginPage() {
  return (
    <div className="flex w-full flex-1 bg-[#FAFAFC] dark:bg-[#0D0E15]">
      <Suspense
        fallback={
          <div className="flex min-h-[calc(100dvh-4.625rem)] w-full items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              <span className="text-sm font-medium">Loading sign in...</span>
            </div>
          </div>
        }
      >
        <LoginCard pageLayout />
      </Suspense>
    </div>
  );
}