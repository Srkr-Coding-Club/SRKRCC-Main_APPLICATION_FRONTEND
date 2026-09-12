'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginCard from '@/components/LoginCard';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
          <div className="flex items-center space-x-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Loading sign in...</span>
          </div>
        </div>
      }
    >
      <LoginCard />
    </Suspense>
  );
}