'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, LogIn, ArrowLeft, Loader2 } from 'lucide-react';
import { getStoredUser, isAuthenticated, isAdminOrLead } from '@/lib/auth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuth(isAuthenticated());
    setIsAdmin(isAdminOrLead());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
        <div className="flex items-center space-x-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Verifying security clearances...</span>
        </div>
      </div>
    );
  }

  if (!isAuth || !isAdmin) {
    const user = getStoredUser();
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 px-4 flex items-center justify-center transition-colors duration-300">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#151722] border border-rose-500/20 dark:border-rose-500/20 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold font-mono uppercase tracking-wider">
              Access Restricted
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Admin Clearance Required
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isAuth
                ? `You are signed in as (${user?.email}) with role [${user?.role || 'MEMBER'}]. Administrative privileges (ADMIN or CLUB_LEAD) are required to access this control room.`
                : 'You must be signed in with an administrative account to access the Admin Control Room.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?next=/admin"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition"
            >
              <LogIn className="w-4 h-4" />
              Sign In as Admin
            </Link>
            <Link
              href="/profile"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
