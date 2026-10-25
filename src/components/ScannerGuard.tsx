'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogIn, Loader2, RefreshCw, LogOut, QrCode } from 'lucide-react';
import { getStoredUser, fetchAndSyncCurrentUser, subscribeToAuthResync, clearAuthSession, AuthUser } from '@/lib/auth';
import BrainLogo from '@/components/BrainLogo';

// Mirrors the backend's apps.attendance.permissions.IsVolunteerOrAbove exactly
// - VOLUNTEER included, unlike AdminGuard's ADMIN/CLUB_LEAD-only check. That
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
      <main className="journey-type relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-journey-bg px-5 py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)] dark:opacity-[0.18]" />
        <div className="relative flex max-w-md flex-col items-center space-y-4 rounded-[24px] border border-journey-text/10 bg-journey-surface p-6 text-center shadow-[0_24px_60px_-30px_rgba(30,41,59,0.35)] dark:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-journey-accent/20 bg-journey-accent/10">
            <Loader2 className="h-6 w-6 animate-spin text-journey-accent" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-semibold text-journey-text">Verifying Scanner Access</h3>
            <p className="text-sm leading-relaxed text-journey-muted">Checking your role with the security gateway…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuth || !canScan) {
    const roleName = currentUser?.role || 'NON_AFFILIATE';
    const email = currentUser?.email || 'Unknown';

    return (
      <main className="journey-type relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-journey-bg px-5 py-12 transition-colors duration-300 sm:px-8 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)] dark:opacity-[0.18]" />
        <section className="relative w-full max-w-md space-y-6 overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface p-5 text-center shadow-[0_24px_60px_-30px_rgba(30,41,59,0.35)] sm:p-8 dark:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.16),transparent)]" />
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-journey-live/20 bg-journey-live/10 text-journey-live shadow-inner sm:h-16 sm:w-16">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-journey-live/20 bg-journey-live/10 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-journey-live">
              Scanner Access Restricted
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">Volunteer Clearance Required</h1>

            {isAuth ? (
              <div className="mt-3 space-y-3 rounded-2xl border border-journey-text/10 bg-journey-bg/70 p-4 text-left text-sm text-journey-muted">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span>Current User:</span>
                  <span className="break-all font-medium text-journey-text sm:max-w-[200px] sm:truncate">{email}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Current Role:</span>
                  <span className="rounded-full border border-journey-text/10 bg-journey-surface px-2.5 py-1 font-mono text-[11px] font-semibold text-journey-text">
                    {roleName}
                  </span>
                </div>
                <p className="border-t border-journey-text/10 pt-3 text-xs leading-relaxed">
                  QR check-in scanning is reserved for <strong className="text-journey-accent">VOLUNTEER</strong>,{' '}
                  <strong className="text-journey-accent">CLUB_LEAD</strong>, and <strong className="text-journey-accent">ADMIN</strong> roles.
                  Ask a club lead to grant you the Volunteer role from the admin Users tab.
                </p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-journey-muted">
                You must be signed in to access the attendance scanner.
              </p>
            )}
          </div>

          <div className="relative flex flex-col gap-3 pt-1">
            {isAuth ? (
              <>
                <button
                  onClick={() => checkPermissions()}
                  disabled={checkingServer}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-journey-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/10 transition hover:bg-journey-accent/90 active:scale-[0.98] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingServer ? 'animate-spin' : ''}`} />
                  Re-check My Permissions
                </button>
                <button
                  onClick={handleSwitchAccount}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-journey-text/15 bg-journey-bg/70 px-4 py-2.5 text-sm font-semibold text-journey-text transition hover:border-journey-accent/40 hover:bg-journey-accent/5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Switch Account
                </button>
              </>
            ) : (
              <Link
                href="/login?next=/attendance/scan"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-journey-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/10 transition hover:bg-journey-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {/* Minimal header - deliberately not AdminNavbar. A volunteer gets scanner
          access only, not links into Users/Data Center/Forms/etc. */}
      <header className="sticky top-0 z-40 border-b border-journey-text/10 bg-journey-bg/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrainLogo size={28} showRays={false} animated={false} />
            <span className="flex min-w-0 items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-journey-text">
              <QrCode className="h-4 w-4 shrink-0 text-journey-accent" />
              <span className="truncate">Attendance Scanner</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="hidden max-w-48 truncate font-mono text-xs text-journey-muted md:inline">{currentUser?.email}</span>
            <span className="rounded-full border border-journey-text/10 bg-journey-surface px-2.5 py-1 font-mono text-[10px] font-semibold text-journey-muted">
              {currentUser?.role}
            </span>
            <Link
              href="/profile"
              className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-journey-muted transition hover:text-journey-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent"
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
