'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession } from '@/lib/auth';

/** Ends the session and goes to the login page: what the profile page's sign-out button does. */
export function useSignOut() {
  const router = useRouter();
  return useCallback(() => {
    clearAuthSession();
    router.push('/login');
  }, [router]);
}
