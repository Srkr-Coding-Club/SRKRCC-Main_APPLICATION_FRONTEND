'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogIn, ArrowLeft, Loader2, RefreshCw, UserCheck, Home, LogOut } from 'lucide-react';
import { getStoredUser, isAuthenticated, isAdminOrLead, fetchAndSyncCurrentUser, clearAuthSession, AuthUser } from '@/lib/auth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const checkPermissions = useCallback(async (forceServer = false) => {
    const localUser = getStoredUser();
    const localAuth = isAuthenticated();
    const localAdmin = isAdminOrLead();

    setIsAuth(localAuth);
    setIsAdmin(localAdmin);
    setCurrentUser(localUser);

    // If already verified locally as admin/lead and not forcing a server check, we can allow immediate access
    if (localAdmin && !forceServer) {
      setMounted(true);
      return;
    }

    // Otherwise, check live permissions against the backend server (/auth/me/)
    setCheckingServer(true);
    try {
      const serverUser = await fetchAndSyncCurrentUser();
      if (serverUser) {
        const serverIsAdmin = serverUser.role === 'ADMIN' || serverUser.role === 'CLUB_LEAD';
        setIsAuth(true);
        setIsAdmin(serverIsAdmin);
        setCurrentUser(serverUser);
      } else {
        setIsAuth(false);
        setIsAdmin(false);
      }
    } catch {
      // Fall back to local evaluation
    } finally {
      setCheckingServer(false);
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const handleSwitchAccount = () => {
    clearAuthSession();
    router.push('/login?next=/admin');
  };

  if (!mounted || checkingServer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
        <div className="flex flex-col items-center space-y-4 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Verifying Administrative Clearance</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Authenticating access levels with the security gateway…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuth || !isAdmin) {
    const roleName = currentUser?.role || 'MEMBER';
    const email = currentUser?.email || 'Unknown';

    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 px-4 flex items-center justify-center transition-colors duration-300">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#151722] border border-rose-500/20 dark:border-rose-500/20 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold font-mono uppercase tracking-wider">
              Clearance Restricted
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Admin Access Required
            </h1>
            
            {isAuth ? (
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 space-y-2 text-left bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current User:</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Role:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {roleName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  Access to the Admin Control Room is reserved for <strong className="text-orange-500">CLUB_LEAD</strong> and <strong className="text-orange-500">ADMIN</strong> roles.
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                You must be signed in with an administrative account to access the Admin Control Room.
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isAuth ? (
              <>
                <button
                  onClick={() => checkPermissions(true)}
                  disabled={checkingServer}
                  className="w-full px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingServer ? 'animate-spin' : ''}`} />
                  Re-check My Permissions
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSwitchAccount}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Switch Account
                  </button>
                  <Link
                    href="/profile"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    My Profile
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Link
                  href="/login?next=/admin"
                  className="w-full sm:w-auto flex-1 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
