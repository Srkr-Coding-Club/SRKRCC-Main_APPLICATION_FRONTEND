'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { replaceWithProgress } from '@/lib/routeProgress';

/** Sends signed-out visitors to the login page and back. Returns true once someone is signed in. */
export function useRequireLogin(returnPath: string): boolean {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) setSignedIn(true);
    else replaceWithProgress(router, `/login?next=${encodeURIComponent(returnPath)}`);
  }, [router, returnPath]);

  return signedIn;
}
