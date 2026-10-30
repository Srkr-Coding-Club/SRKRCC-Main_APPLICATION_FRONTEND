'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import {
  User as UserIcon,
  Mail,
  Hash,
  BookOpen,
  Award,
  Phone,
  Calendar,
  CalendarCheck,
  Code2,
  Flame,
  Trophy,
  UserCheck,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  FileText,
  ShieldAlert,
  Loader2,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  QrCode,
  Copy,
  Check,
  Pencil,
  X,
  AlertTriangle,
} from 'lucide-react';
import { getStoredUser, setStoredUser, clearAuthSession, isAuthenticated } from '@/lib/auth';
import { fetchApi } from '@/lib/api-client';
import { EditProfileModal } from '@/components/EditProfileModal';
import { EmailVerificationCard } from '@/components/verification/EmailVerificationCard';
import { CelebrationSettingsCard } from '@/components/celebrations/CelebrationSettingsCard';
import { College, displayCollegeName } from '@/lib/colleges';
import { MyHackathonsPanel } from '@/components/hackathons/MyHackathonsPanel';
import { AttendanceBadgeModal } from '@/components/AttendanceBadgeModal';

export const dynamic = 'force-dynamic';

interface RegisteredEventItem {
  id: number;
  form_id?: number;
  form_slug?: string;
  title: string;
  track: string;
  date: string;
  status: string;
  badgeBg: string;
  attendance_enabled?: boolean;
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: string;
}

interface FullUserProfile {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  club_id?: string;
  membership_status?: string;
  roll_number?: string;
  college?: College | null;
  other_college_name?: string;
  branch?: string;
  year?: number | string;
  phone_number?: string;
  github_profile?: string;
  linkedin_profile?: string;
  registered_at?: string;
  referred_by_display?: string;
  streak: number;
  problems_solved: number;
  events_count: number;
  events_registered_count: number;
  events_attended_count: number;
  hackathon_teams_count: number;
  registered_events: RegisteredEventItem[];
  badges: BadgeItem[];
}

/* ---------- helpers ---------- */

// Single place that maps the API profile -> the stored (cached) user shape.
const toStoredUser = (data: FullUserProfile) => ({
  id: data.id,
  email: data.email,
  username: data.username,
  first_name: data.first_name,
  last_name: data.last_name,
  role: data.role as any,
  club_id: data.club_id,
  membership_status: data.membership_status,
  roll_number: data.roll_number,
  college: data.college,
  other_college_name: data.other_college_name,
  branch: data.branch,
  year: data.year,
  phone_number: data.phone_number,
  github_profile: data.github_profile,
  linkedin_profile: data.linkedin_profile,
  registered_at: data.registered_at,
  referred_by_display: data.referred_by_display,
});

// Reads the year from the profile, tolerating a few common field names.
const extractYear = (p: any): number | string | undefined => {
  if (!p) return undefined;
  const candidates = [p.year, p.year_of_study, p.academic_year, p.study_year, p.current_year];
  for (const c of candidates) {
    if (c !== null && c !== undefined && c !== '') return c;
  }
  return undefined;
};

// Turns a year value into 1-4. Tolerates 3, "3", "3rd", "3rd Year", "III",
// and a 4-digit joining year such as 2024 (converted to the current study year).
const parseYear = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  const str = String(raw).trim().toUpperCase();
  const digit = str.match(/\d+/);
  if (digit) {
    const n = parseInt(digit[0], 10);
    if (n >= 1 && n <= 4) return n;
    if (n >= 2000 && n <= 2100) {
      const now = new Date();
      const academicStart = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
      const y = academicStart - n + 1;
      return y >= 1 && y <= 4 ? y : null;
    }
    return null;
  }
  const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
  return roman[str.replace(/[^IV]/g, '')] ?? null;
};

// "23rd Sep 2026 · 5:30 PM" (time is skipped when the source has no time part)
const formatEventDate = (raw: string): string => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = d.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const base = `${day}${suffix} ${month} ${d.getFullYear()}`;
  const hasTime = /\d{1,2}:\d{2}/.test(raw);
  if (!hasTime) return base;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${base} · ${time}`;
};

const surface =
  'relative overflow-hidden rounded-3xl border border-journey-text/10 bg-white/65 shadow-[0_20px_50px_-36px_rgba(26,26,46,0.45)] backdrop-blur-xl dark:bg-white/[0.04]';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-journey-bg';

const BADGE_TONES: Record<string, { tile: string; glow: string; icon: React.ReactNode }> = {
  orange: {
    tile: 'border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/30',
    glow: '#FF7A0040',
    icon: <Flame className="h-6 w-6 text-journey-accent" />,
  },
  purple: {
    tile: 'border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30',
    glow: '#a855f740',
    icon: <Award className="h-6 w-6 text-purple-500" />,
  },
  emerald: {
    tile: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30',
    glow: '#10b98140',
    icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
  },
};

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// Accepts "https://github.com/name", "github.com/name" or just "name".
const toHref = (value: string, base: string): string => {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.includes('.')) return `https://${v}`;
  return `https://${base}${v}`;
};

// Last path segment of the URL, used as the visible handle.
const handleFromUrl = (value: string): string => {
  const cleaned = value.trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || cleaned;
};

/* ---------- sub-components ---------- */

function InfoItem({ icon, text, mono, title }: { icon: React.ReactNode; text: string; mono?: boolean; title?: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2 text-xs text-journey-muted sm:text-[13px]" title={title ?? text}>
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-journey-accent/10 text-journey-accent">{icon}</span>
      <span className={`truncate font-medium text-journey-text ${mono ? 'font-mono text-xs' : ''}`}>{text}</span>
    </span>
  );
}

function LinkItem({ icon, href, base }: { icon: React.ReactNode; href: string; base: string }) {
  const url = toHref(href, base);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={`group/link inline-flex min-w-0 max-w-full items-center gap-2 rounded-md text-xs sm:text-[13px] ${focusRing}`}
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-journey-accent/10 text-journey-accent">{icon}</span>
      <span className="truncate font-medium text-journey-text underline-offset-2 transition group-hover/link:text-journey-accent group-hover/link:underline">
        {handleFromUrl(href) || href}
      </span>
    </a>
  );
}

// A titled block of details, stacked one below another.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative mt-4 border-t border-journey-text/10 pt-4">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-journey-muted">{title}</p>
      <div className="flex flex-col items-start gap-2.5">{children}</div>
    </div>
  );
}

function ProfileCard({
  name,
  clubId,
  email,
  phone,
  rollNumber,
  collegeName,
  yearBranch,
  github,
  linkedin,
  since,
  referredBy,
  copied,
  onCopy,
  onEdit,
  onLogout,
}: {
  name: string;
  clubId: string | null;
  email: string;
  phone: string | null;
  rollNumber: string | null;
  collegeName: string | null;
  yearBranch: string | null;
  github: string | null;
  linkedin: string | null;
  since: string | null;
  referredBy: string | null;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onLogout: () => void;
}) {
  const hasContact = Boolean(email || phone);
  const hasAcademic = Boolean(rollNumber || yearBranch || collegeName);
  const hasProfiles = Boolean(github || linkedin);
  const hasMeta = Boolean(since || referredBy);

  return (
    <section aria-label="Profile" className={`p-5 sm:p-6 ${surface}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[radial-gradient(circle,#FF7A0033,transparent_70%)] blur-2xl"
      />

      {/* row 1: avatar (round) + name & club id */}
      <div className="relative flex items-center gap-4">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] p-[3px] shadow-[0_12px_34px_-12px_rgba(255,122,0,0.6)] sm:h-24 sm:w-24">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-journey-bg font-display text-3xl font-semibold text-journey-text sm:text-4xl">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="break-words font-display text-2xl font-semibold leading-tight tracking-[-0.04em] text-journey-text sm:text-3xl">{name}</h1>
          {clubId ? (
            <button
              type="button"
              onClick={onCopy}
              title="Click to copy Club ID"
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border border-journey-accent/25 bg-journey-accent/10 px-2.5 py-0.5 font-mono text-xs font-bold text-journey-accent transition hover:bg-journey-accent/15 active:scale-95 ${focusRing}`}
            >
              <span>{clubId}</span>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-70" />}
            </button>
          ) : (
            <span className="inline-flex rounded-full bg-journey-text/[0.06] px-2.5 py-0.5 text-xs font-bold text-journey-muted">ID Pending</span>
          )}
        </div>
      </div>

      {/* row 2: contact */}
      {hasContact && (
        <Section title="Contact">
          {email && <InfoItem icon={<Mail className="h-3.5 w-3.5" />} text={email} mono />}
          {phone && <InfoItem icon={<Phone className="h-3.5 w-3.5" />} text={phone} />}
        </Section>
      )}

      {/* row 3: academic */}
      {hasAcademic && (
        <Section title="Academic">
          {rollNumber && <InfoItem icon={<Hash className="h-3.5 w-3.5" />} text={rollNumber} />}
          {yearBranch && <InfoItem icon={<BookOpen className="h-3.5 w-3.5" />} text={yearBranch} />}
          {collegeName && <InfoItem icon={<BookOpen className="h-3.5 w-3.5" />} text={collegeName} />}
        </Section>
      )}

      {/* row 4: profiles */}
      {hasProfiles && (
        <Section title="Profiles">
          {github && <LinkItem icon={<GithubIcon className="h-3.5 w-3.5" />} href={github} base="github.com/" />}
          {linkedin && <LinkItem icon={<LinkedinIcon className="h-3.5 w-3.5" />} href={linkedin} base="linkedin.com/in/" />}
        </Section>
      )}

      {/* footer: edit + logout, then membership meta */}
      <div className="relative mt-4 flex flex-col gap-3 border-t border-journey-text/10 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onEdit}
            className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-journey-text/10 bg-journey-text/[0.045] px-4 py-1.5 text-xs font-bold text-journey-text transition hover:border-journey-accent/30 hover:bg-journey-text/[0.08] active:scale-[0.98] ${focusRing}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-journey-accent px-4 py-1.5 text-xs font-bold text-journey-on-accent shadow-[0_10px_26px_-10px_rgba(255,122,0,0.8)] transition hover:brightness-110 active:scale-[0.98] ${focusRing}`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>
        {hasMeta && (
          <div className="flex flex-col items-start gap-2">
            {since && (
              <span className="inline-flex items-center gap-1.5 text-xs text-journey-muted">
                <Calendar className="h-3.5 w-3.5" />
                Since <strong className="font-semibold text-journey-text">{since}</strong>
              </span>
            )}
            {referredBy && (
              <span className="inline-flex items-center gap-1.5 text-xs text-journey-muted">
                <UserIcon className="h-3.5 w-3.5" />
                Onboarded by <strong className="font-semibold text-journey-text">{referredBy}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  unit,
  icon,
  iconClassName,
  valueClassName,
  glow,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  iconClassName: string;
  valueClassName: string;
  glow: string;
}) {
  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-journey-text/10 bg-white/65 min-h-[9.5rem] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-journey-accent/30 dark:bg-white/[0.04] sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-70 blur-2xl transition-opacity group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 30% 30%, ${glow}, transparent 70%)` }}
      />
      <span className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>{icon}</span>
      <div className="relative mt-6 min-w-0">
        <p className={`truncate font-display text-2xl font-semibold leading-none tracking-[-0.04em] sm:text-3xl ${valueClassName}`}>
          {value}
          {unit && <span className="ml-1 text-xs font-medium tracking-normal text-journey-muted sm:text-sm">{unit}</span>}
        </p>
        <p className="mt-2 text-xs font-medium text-journey-muted sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

function Notice({
  tone,
  icon,
  title,
  children,
  action,
}: {
  tone: 'amber' | 'rose';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const styles =
    tone === 'amber'
      ? 'border-amber-500/25 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400'
      : 'border-rose-500/25 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300';
  return (
    <div role="alert" className={`flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 text-left sm:flex-row sm:items-center ${styles}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0">{icon}</span>
        <div className="text-xs">
          <p className="font-bold">{title}</p>
          <p className="mt-0.5 leading-relaxed text-journey-muted">{children}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// Side notification (top right) shown when the live profile couldn't be fetched.
function RefreshNotice({ onRetry, onClose, retrying }: { onRetry: () => void; onClose: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="toast-in fixed right-4 top-20 z-[60] w-[calc(100vw-2rem)] max-w-sm sm:top-24">
      <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-journey-bg/95 p-4 shadow-[0_24px_60px_-24px_rgba(26,26,46,0.6)] backdrop-blur-xl">
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-journey-text">Refresh Failed</p>
          <p className="mt-0.5 text-xs leading-relaxed text-journey-muted">Couldn&apos;t refresh your profile. Showing cached data.</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className={`mt-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-journey-accent px-3.5 py-1 text-xs font-bold text-journey-on-accent transition hover:brightness-110 active:scale-95 disabled:opacity-60 ${focusRing}`}
          >
            {retrying && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{retrying ? 'Retrying…' : 'Retry'}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-journey-muted transition hover:bg-journey-text/[0.08] hover:text-journey-text active:scale-95 ${focusRing}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EventTicket({ evt, onShowQr }: { evt: RegisteredEventItem; onShowQr: () => void }) {
  const accent = '#FF7A00';
  const canShowQr = evt.attendance_enabled && evt.form_id;
  // Keep the status colours coming from the API, but drop any border classes so it reads as a plain tag.
  const statusClasses = (evt.badgeBg || '')
    .split(/\s+/)
    .filter((c) => c && !/(^|:)border/.test(c))
    .join(' ');

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-journey-text/10 bg-white/65 shadow-[0_20px_50px_-36px_rgba(26,26,46,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-journey-accent/30 dark:bg-white/[0.04] sm:flex-row">
      {/* main */}
      <div className="relative min-w-0 flex-1 space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            <FileText className="h-3 w-3" />
            {evt.track}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses}`}>
            <CheckCircle2 className="h-3 w-3" />
            <span>{evt.status}</span>
          </span>
        </div>

        <h3 className="font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-journey-text sm:text-xl">{evt.title}</h3>

        <p className="inline-flex items-center gap-2 text-xs font-medium text-journey-muted sm:text-[13px]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-journey-accent/10 text-journey-accent">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <span className="text-journey-text">{formatEventDate(evt.date)}</span>
        </p>
      </div>

      {/* tear line + stub */}
      <div
        className="relative flex items-center justify-center border-t border-dashed border-journey-text/20 p-4 sm:w-44 sm:border-l sm:border-t-0"
        style={{ backgroundColor: `${accent}0d` }}
      >
        {/* punched notches */}
        <span
          aria-hidden="true"
          className="absolute -left-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-journey-bg sm:-top-3 sm:left-0 sm:-translate-x-1/2 sm:translate-y-0"
        />
        <span
          aria-hidden="true"
          className="absolute -right-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-journey-bg sm:-bottom-3 sm:left-0 sm:right-auto sm:top-auto sm:-translate-x-1/2 sm:translate-y-0"
        />

        {canShowQr ? (
          <button
            type="button"
            onClick={onShowQr}
            className={`flex w-full flex-row items-center justify-center gap-3 rounded-2xl bg-journey-accent px-4 py-3 text-journey-on-accent shadow-[0_10px_26px_-10px_rgba(255,122,0,0.8)] transition hover:brightness-110 active:scale-[0.98] sm:aspect-square sm:h-28 sm:w-28 sm:flex-col sm:gap-1.5 sm:px-2 sm:py-2 ${focusRing}`}
          >
            <QrCode className="h-7 w-7" />
            <span className="text-xs font-bold sm:text-center sm:leading-tight">View QR Badge</span>
          </button>
        ) : (
          <div className="flex flex-row items-center gap-2 sm:flex-col sm:gap-1.5" style={{ color: accent }}>
            <CheckCircle2 className="h-8 w-8" />
            <span className="text-xs font-bold uppercase tracking-wider">Registered</span>
          </div>
        )}
      </div>
    </article>
  );
}

function BadgeTile({ badge, compact = false }: { badge: BadgeItem; compact?: boolean }) {
  const tone = BADGE_TONES[badge.tone] ?? BADGE_TONES.emerald;
  return (
    <div className={`relative h-full overflow-hidden rounded-xl border ${compact ? 'flex items-center gap-2 p-2 text-left' : 'p-5 text-center'} transition duration-300 hover:-translate-y-0.5 ${tone.tile}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/3 rounded-full blur-2xl"
        style={{ background: tone.glow }}
      />
      <span className={`relative flex flex-shrink-0 items-center justify-center bg-white/80 shadow-sm ring-1 ring-journey-text/5 dark:bg-white/[0.07] ${compact ? 'h-9 w-9 rounded-xl' : 'mx-auto h-14 w-14 rounded-2xl'}`}>
        {tone.icon}
      </span>
      <div className={compact ? 'relative min-w-0' : ''}>
        <p className={`relative font-display text-sm font-semibold text-journey-text ${compact ? 'truncate' : 'mt-3'}`}>{badge.title}</p>
        <p className={`relative text-[11px] leading-relaxed text-journey-muted ${compact ? 'mt-0.5 line-clamp-2' : 'mt-1'}`}>{badge.description}</p>
      </div>
    </div>
  );
}

const MOTION_CSS = `
@keyframes badge-in{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:none}}
@keyframes tile-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
@keyframes toast-in{from{opacity:0;transform:translateX(1.5rem)}to{opacity:1;transform:none}}
.badge-in{animation:badge-in 560ms cubic-bezier(.22,.8,.24,1) both}
.tile-in{animation:tile-in 320ms ease-out both}
.toast-in{animation:toast-in 320ms cubic-bezier(.22,.8,.24,1) both}
@media (prefers-reduced-motion:reduce){.badge-in,.tile-in,.toast-in{animation:none}}
`;

function BadgesCard({
  badges,
  open,
  onToggle,
  className,
}: {
  badges: BadgeItem[];
  open: boolean;
  onToggle: () => void;
  className: string;
}) {
  // Assumption: the API returns badges newest-first, so the first one is the "most recent".
  const featured = badges[0] ?? null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={badges.length === 0}
        aria-expanded={false}
        aria-label={badges.length > 0 ? 'Show all badges' : 'No badges yet'}
        className={`group ${className} relative flex flex-col justify-between overflow-hidden rounded-2xl border border-journey-text/10 bg-white/65 min-h-[9.5rem] p-4 text-left backdrop-blur-xl transition duration-300 sm:p-5 hover:-translate-y-0.5 hover:border-journey-accent/30 disabled:cursor-default disabled:hover:translate-y-0 dark:bg-white/[0.04] ${focusRing}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,#10b98140,transparent_70%)] opacity-70 blur-2xl transition-opacity group-hover:opacity-100"
        />
        <div className="relative flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </span>
          {badges.length > 0 && (
            <ArrowRight className="h-5 w-5 text-journey-muted transition group-hover:translate-x-1 group-hover:text-journey-accent" />
          )}
        </div>
        <div className="relative mt-6 min-w-0">
          <p className="truncate font-display text-2xl font-semibold leading-none tracking-[-0.04em] text-emerald-600 dark:text-emerald-400 sm:text-3xl">{badges.length}</p>
          <p className="mt-2 truncate text-xs font-medium text-journey-muted sm:text-sm">
            {featured ? `Badges · ${featured.title}` : 'Badges'}
          </p>
        </div>
      </button>
    );
  }

  return (
    <section aria-label="All badges" className={`${className} ${surface} flex min-h-[10rem] flex-col overflow-hidden p-4 sm:p-6`}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-journey-muted">Badges · {badges.length}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={true}
          aria-label="Back to overview"
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-journey-text/10 text-journey-muted transition hover:border-journey-accent/30 hover:text-journey-accent active:scale-95 ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 snap-x gap-2 overflow-x-auto pb-1">
        {badges.map((b, i) => (
          <div key={b.id} className="badge-in w-44 min-h-0 flex-shrink-0 snap-start" style={{ animationDelay: `${i * 120}ms` }}>
            <BadgeTile badge={b} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className={`space-y-3 p-8 text-center sm:p-12 ${surface}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 opacity-60 blur-2xl"
        style={{ background: 'radial-gradient(circle at 50% 0%, #FF7A0026, transparent 65%)' }}
      />
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-journey-accent/10 text-journey-accent">{icon}</span>
      <p className="font-display text-lg font-semibold text-journey-text">{title}</p>
      <p className="mx-auto max-w-md text-xs leading-relaxed text-journey-muted sm:text-sm">{text}</p>
      {children}
    </div>
  );
}

/* ---------- page ---------- */

function ProfileContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedClubId, setCopiedClubId] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [qrBadgeEvent, setQrBadgeEvent] = useState<RegisteredEventItem | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?next=/profile');
      return;
    }

    // Load initial local user for instant optimistic UI (never overwrites data that is already live)
    const localUser = getStoredUser();
    if (localUser) {
      setProfile(
        (prev) =>
          prev ?? {
            id: localUser.id,
            email: localUser.email,
            username: localUser.username,
            first_name: localUser.first_name,
            last_name: localUser.last_name,
            role: localUser.role || 'NON_AFFILIATE',
            club_id: localUser.club_id,
            membership_status: localUser.membership_status || 'ACTIVE',
            roll_number: localUser.roll_number,
            college: localUser.college,
            other_college_name: localUser.other_college_name,
            branch: localUser.branch,
            year: extractYear(localUser),
            phone_number: localUser.phone_number,
            github_profile: localUser.github_profile,
            linkedin_profile: localUser.linkedin_profile,
            registered_at: localUser.registered_at,
            referred_by_display: localUser.referred_by_display,
            streak: 0,
            problems_solved: 0,
            events_count: 0,
            events_registered_count: 0,
            events_attended_count: 0,
            hackathon_teams_count: 0,
            registered_events: [],
            badges: [],
          }
      );
    }

    // Fetch live, real-time calculated database profile
    setRefreshError(false);
    fetchApi<FullUserProfile>('/auth/me/')
      .then((data) => {
        if (data && data.email) {
          // If the API response has no year, keep the one we already had cached.
          const merged: FullUserProfile = { ...data, year: extractYear(data) ?? extractYear(localUser) };
          setProfile(merged);
          setStoredUser(toStoredUser(merged));
        }
      })
      .catch(() => {
        // Tolerant fallback - keep showing the cached/local profile, but let the user know.
        setRefreshError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, refreshAttempt]);

  const handleLogout = () => {
    clearAuthSession();
    router.push('/login');
  };

  const handleProfileUpdated = (data: FullUserProfile) => {
    const year = extractYear(data);
    setProfile((prev) => {
      const next = prev ? { ...prev, ...data } : data;
      return { ...next, year: year ?? prev?.year };
    });
    setStoredUser(toStoredUser({ ...data, year: year ?? profile?.year }));
  };

  const copyClubId = async (clubId: string) => {
    try {
      await navigator.clipboard.writeText(clubId);
      setCopiedClubId(true);
      toast.success('Club ID Copied', `Copied ${clubId} to clipboard.`);
      setTimeout(() => setCopiedClubId(false), 2000);
    } catch {
      toast.error('Copy Failed', 'Could not copy the Club ID to your clipboard.');
    }
  };

  // "3/4 CSE" style: current year out of 4, followed by the branch (null when neither is known)
  const parsedYear = parseYear(extractYear(profile));
  const yearBranch =
    [parsedYear ? `${parsedYear}/4` : null, profile?.branch?.trim() || null].filter(Boolean).join(' ') || null;

  const user = {
    name: profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || profile.email.split('@')[0]
      : 'Developer',
    email: profile?.email || 'student@srkr.ac.in',
    clubId: profile?.club_id || null,
    membershipStatus: profile?.membership_status || 'ACTIVE',
    rollNumber: profile?.roll_number?.trim() || null,
    yearBranch,
    collegeName: displayCollegeName(profile),
    role: profile?.role || 'NON_AFFILIATE',
    registeredAt: profile?.registered_at
      ? new Date(profile.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null,
    referredBy: profile?.referred_by_display || null,
    phone: profile?.phone_number?.trim() || null,
    github: profile?.github_profile?.trim() || null,
    linkedin: profile?.linkedin_profile?.trim() || null,
    streak: profile?.streak ?? 0,
    problemsSolved: profile?.problems_solved ?? 0,
    eventsRegistered: profile?.events_registered_count ?? 0,
    eventsAttended: profile?.events_attended_count ?? 0,
    hackathonTeams: profile?.hackathon_teams_count ?? 0,
  };

  const registeredEvents = profile?.registered_events || [];
  const badges = profile?.badges || [];
  const isStaff = user.role === 'ADMIN' || user.role === 'CLUB_LEAD';
  const canScan = user.role === 'VOLUNTEER' || isStaff;

  const actionBtn = `inline-flex min-h-11 flex-1 basis-[8rem] items-center justify-center gap-2 rounded-2xl border border-journey-text/10 bg-white/65 px-4 py-2 text-xs font-bold text-journey-text backdrop-blur transition hover:border-journey-accent/30 hover:bg-white/90 active:scale-[0.98] dark:bg-white/[0.04] dark:hover:bg-white/[0.07] ${focusRing}`;

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-journey-bg py-6 text-journey-text transition-colors duration-300 sm:py-10">
      <style>{MOTION_CSS}</style>

      {/* side notification: profile refresh failed */}
      {refreshError && (
        <RefreshNotice
          retrying={loading}
          onClose={() => setRefreshError(false)}
          onRetry={() => {
            setLoading(true);
            setRefreshAttempt((prev) => prev + 1);
          }}
        />
      )}

      {/* ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[30rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(var(--journey-accent)/0.14),transparent_68%)] blur-2xl" />
        <div className="absolute -top-28 right-[-12rem] h-96 w-96 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(var(--journey-live)/0.10),transparent_70%)] blur-2xl" />
        <div className="absolute left-[-10rem] top-64 h-80 w-80 rounded-full bg-[radial-gradient(ellipse_at_center,#8B2E3B1f,transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:space-y-6">
        {/* top bar */}
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-journey-accent">
            Member space <span className="text-journey-muted">/ Your profile</span>
          </p>
          {loading && (
            <span className="inline-flex items-center gap-2 text-xs text-journey-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
              Syncing
            </span>
          )}
        </div>

        {/* notices */}
        {!loading && profile && !profile.roll_number && (
          <Notice
            tone="amber"
            icon={<Hash className="h-5 w-5 text-amber-500" />}
            title="Add Your Roll Number"
            action={
              <button
                onClick={() => setIsEditModalOpen(true)}
                className={`min-h-10 whitespace-nowrap rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-700 active:scale-[0.98] dark:bg-amber-500 dark:hover:bg-amber-400 ${focusRing}`}
              >
                Add Roll Number
              </button>
            }
          >
            You haven&apos;t set your roll number yet. Add it so event attendance and certificates can be matched to your official student record.
          </Notice>
        )}

        {authError === 'admin_access_required' && (
          <Notice tone="rose" icon={<ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />} title="Admin Clearance Required">
            Your account role is <strong>{user.role}</strong>. Access to the Admin Control Room is restricted to users with <strong>ADMIN</strong> or{' '}
            <strong>CLUB_LEAD</strong> permissions.
          </Notice>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
          {/* ===== Identity column ===== */}
          <aside className="space-y-4 lg:self-start">
            <ProfileCard
              name={user.name}
              clubId={user.clubId}
              email={user.email}
              phone={user.phone}
              rollNumber={user.rollNumber}
              collegeName={user.collegeName}
              yearBranch={user.yearBranch}
              github={user.github}
              linkedin={user.linkedin}
              since={user.registeredAt}
              referredBy={user.referredBy}
              copied={copiedClubId}
              onCopy={() => user.clubId && copyClubId(user.clubId)}
              onEdit={() => setIsEditModalOpen(true)}
              onLogout={handleLogout}
            />

            <EmailVerificationCard />

            <CelebrationSettingsCard />

            {(isStaff || canScan) && (
              <div className="flex flex-wrap gap-2.5">
                {isStaff && (
                  <Link
                    href="/admin"
                    className={`inline-flex min-h-11 flex-1 basis-[8rem] items-center justify-center gap-2 rounded-2xl bg-journey-accent px-4 py-2 text-xs font-bold text-journey-on-accent shadow-[0_10px_26px_-10px_rgba(255,122,0,0.8)] transition hover:brightness-110 active:scale-[0.98] ${focusRing}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Admin Room</span>
                  </Link>
                )}
                {/* VOLUNTEER can't reach /admin, so this is their only in-app path to the scanner. */}
                {canScan && (
                  <Link href="/attendance/scan" className={actionBtn}>
                    <QrCode className="h-4 w-4" />
                    <span>Scan Attendance</span>
                  </Link>
                )}
              </div>
            )}
          </aside>

          {/* ===== Activity column ===== */}
          <div className="min-w-0 space-y-6 lg:min-h-[34rem] lg:space-y-8">
            {/* 6 cards beside the profile card; opening badges takes over the whole block */}
            <section aria-label="Your activity and badges" className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {!badgesOpen &&
                [
                  {
                    label: 'Events registered',
                    value: String(user.eventsRegistered),
                    icon: <CalendarCheck className="h-5 w-5" />,
                    iconClassName: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
                    valueClassName: 'text-sky-600 dark:text-sky-400',
                    glow: '#0ea5e940',
                  },
                  {
                    label: 'Events attended',
                    value: String(user.eventsAttended),
                    icon: <UserCheck className="h-5 w-5" />,
                    iconClassName: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                    valueClassName: 'text-emerald-600 dark:text-emerald-400',
                    glow: '#10b98140',
                  },
                  {
                    label: 'Hackathon teams',
                    value: String(user.hackathonTeams),
                    icon: <Trophy className="h-5 w-5" />,
                    iconClassName: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                    valueClassName: 'text-amber-700 dark:text-amber-400',
                    glow: '#f59e0b40',
                  },
                  {
                    label: 'Problems solved',
                    value: String(user.problemsSolved),
                    icon: <Code2 className="h-5 w-5" />,
                    iconClassName: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
                    valueClassName: 'text-violet-600 dark:text-violet-400',
                    glow: '#8b5cf640',
                  },
                  {
                    label: 'Codequest streak',
                    value: String(user.streak),
                    unit: 'Days',
                    icon: <Flame className="h-5 w-5" />,
                    iconClassName: 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400',
                    valueClassName: 'text-red-600 dark:text-red-400',
                    glow: '#ef444440',
                  },
                ].map((stat) => (
                  <div key={stat.label} className="tile-in">
                    <StatTile {...stat} />
                  </div>
                ))}

              <BadgesCard
                badges={badges}
                open={badgesOpen}
                onToggle={() => setBadgesOpen((prev) => !prev)}
                className={badgesOpen ? 'col-span-2 xl:col-span-3' : ''}
              />
            </section>

            {/* registered events, one by one */}
            <section aria-labelledby="events-title" className="space-y-6 sm:space-y-7">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h2
                    id="events-title"
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 font-display text-[clamp(1.2rem,5vw,1.5rem)] font-semibold tracking-tight text-journey-text sm:text-2xl"
                  >
                    <span className="min-w-0 [font-family:var(--font-display)]">My Enrolled Events & Submissions</span>
                    <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-journey-accent/10 px-1.5 text-[11px] font-bold text-journey-accent">
                      {registeredEvents.length}
                    </span>
                  </h2>
                </div>
                <Link href="/forms" className="inline-flex flex-shrink-0 items-center gap-1 self-end text-xs font-bold text-journey-accent transition hover:gap-2 sm:self-auto">
                  Forms Center <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {registeredEvents.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {registeredEvents.map((evt) => (
                    <EventTicket key={evt.id} evt={evt} onShowQr={() => setQrBadgeEvent(evt)} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="h-7 w-7" />}
                  title="No active registrations yet"
                  text="Discover upcoming workshops, hackathons, and algorithm challenges in the club portal."
                >
                  <Link
                    href="/events"
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full bg-journey-accent px-5 py-2 text-xs font-bold text-journey-on-accent shadow-[0_8px_24px_-10px_rgba(255,122,0,0.8)] transition hover:brightness-110 active:scale-[0.98] ${focusRing}`}
                  >
                    <span>Browse Events & Forms</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </EmptyState>
              )}
            </section>

            <MyHackathonsPanel />
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSaved={handleProfileUpdated}
      />

      <AttendanceBadgeModal
        isOpen={qrBadgeEvent !== null}
        onClose={() => setQrBadgeEvent(null)}
        formId={qrBadgeEvent?.form_id ?? null}
        eventTitle={qrBadgeEvent?.title}
        registrantName={user.name}
      />
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-journey-bg px-4 text-journey-muted">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Loading user profile...</span>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}