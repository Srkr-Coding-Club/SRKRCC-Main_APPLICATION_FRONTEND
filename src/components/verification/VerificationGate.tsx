'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useEmailVerification } from '@/context/EmailVerificationContext';
import { getStoredUser } from '@/lib/auth';
import { isPrivateRoute, needsVerification, restrictsFeatures } from '@/lib/emailVerification';
import { BlockedScreen } from './BlockedScreen';
import { VerifyDialog } from './VerifyDialog';

/** Wraps the page: a blocked person sees the verify screen in place of a private page; everything else passes through. */
export function VerificationGate({ children }: { children: React.ReactNode }) {
  const { state } = useEmailVerification();
  const pathname = usePathname() || '/';
  const blocked = needsVerification(state) && state.blocked && isPrivateRoute(pathname);
  // Admin tools need a verified address from day one (the server refuses them otherwise), so say so up front instead of
  // letting every panel fail on its own.
  const role = typeof window === 'undefined' ? undefined : getStoredUser()?.role;
  const staffLocked = !blocked && restrictsFeatures(state) && (pathname === '/admin' || pathname.startsWith('/admin/')) && (role === 'ADMIN' || role === 'CLUB_LEAD');
  return (
    <>
      {blocked ? <BlockedScreen /> : staffLocked ? <BlockedScreen reason="staff" /> : children}
      {/* When a whole screen already says it, a dialog on top would only repeat it. */}
      {!blocked && !staffLocked && <VerifyDialog />}
    </>
  );
}
