'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogIn, Loader2, RefreshCw, LogOut, QrCode } from 'lucide-react';
import { getStoredUser, fetchAndSyncCurrentUser, subscribeToAuthResync, clearAuthSession, AuthUser } from '@/lib/auth';
import BrainLogo from '@/components/BrainLogo';

// Mirrors the backend's apps.attendance.permissions.IsVolunteerOrAbove exactly
// — VOLUNTEER included, unlike AdminGuard's ADMIN/CLUB_LEAD-only check. That
// gate sits in front of every /admin/* route, so a volunteer (a role that
// exists specifically to scan attendance without any other admin capability)
// could never reach the scanner: they'd hit "Admin Access Required" before
// the page ever asked the browser for camera permission.
const SCANNER_ROLES = new Set(['ADMIN', 'CLUB_LEAD', 'VOLUNTEER']);

export default function ScannerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const checkPermissions = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setCurrentUser(getStoredUser());
      setCheckingServer(true);
    }
    try {
      const serverUser = await fetchAndSyncCurrentUser();
      if (serverUser) {
        setIsAuth(true);
        setCanScan(SCANNER_ROLES.has(serverUser.role));
        setCurrentUser(serverUser);
      } else {
        setIsAuth(false);
        setCanScan(false);
      }
    } catch {
      // Fail closed on the initial check, same reasoning as AdminGuard: a
      // network error verifying the session is not proof of scan access.
      if (!silent) {
        setIsAuth(false);
        setCanScan(false);
      }
    } finally {
      if (!silent) {
        setCheckingServer(false);
        setMounted(true);
      }
    }
  }, []);

  useEffect(() => {
    checkPermissions();
    const unsubscribe = subscribeToAuthResync(() => checkPermissions({ silent: true }));
    return unsubscribe;
  }, [checkPermissions]);

  const handleSwitchAccount = () => {
    clearAuthSession();
    router.push('/login?next=/attendance/scan');
  };

  if (!mounted || checkingServer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
        <div className="flex flex-col items-center space-y-4 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Verifying Scanner Access</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Checking your role with the security gateway…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuth || !canScan) {
    const roleName = currentUser?.role || 'NON_AFFILIATE';
    const email = currentUser?.email || 'Unknown';

    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 px-4 flex items-center justify-center transition-colors duration-300">
        <div className="max-w-md w-full p-8 rounded-3xl glass-panel border border-rose-500/20 dark:border-rose-500/20 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold font-mono uppercase tracking-wider">
              Scanner Access Restricted
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Volunteer Clearance Required</h1>

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
                  QR check-in scanning is reserved for <strong className="text-orange-500">VOLUNTEER</strong>,{' '}
                  <strong className="text-orange-500">CLUB_LEAD</strong>, and <strong className="text-orange-500">ADMIN</strong> roles.
                  Ask a club lead to grant you the Volunteer role from the admin Users tab.
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                You must be signed in to access the attendance scanner.
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isAuth ? (
              <>
                <button
                  onClick={() => checkPermissions()}
                  disabled={checkingServer}
                  className="w-full px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingServer ? 'animate-spin' : ''}`} />
                  Re-check My Permissions
                </button>
                <button
                  onClick={handleSwitchAccount}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Switch Account
                </button>
              </>
            ) : (
              <Link
                href="/login?next=/attendance/scan"
                className="w-full px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Minimal header — deliberately not AdminNavbar. A volunteer gets scanner
          access only, not links into Users/Data Center/Forms/etc. */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0D0E15]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrainLogo size={28} showRays={false} animated={false} />
            <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#1A1A2E] dark:text-white">
              <QrCode className="w-4 h-4 text-[#FF7A00]" />
              Attendance Scanner
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline text-xs font-mono text-slate-400">{currentUser?.email}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {currentUser?.role}
            </span>
            <Link
              href="/profile"
              className="text-xs font-bold text-slate-500 hover:text-[#FF7A00] transition"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
