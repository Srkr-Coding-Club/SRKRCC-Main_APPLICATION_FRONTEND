import React from 'react';

/** "RK" for Ravi Kumar; falls back to the username, then the email. */
export function initialsOf(user: { first_name?: string; last_name?: string; username?: string; email?: string } | null | undefined): string {
  if (!user) return '?';
  const words = [user.first_name, user.last_name].filter(Boolean) as string[];
  const source = words.length ? words : [user.username || user.email?.split('@')[0] || '?'];
  return source.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

/** A round brand-gradient badge with the person's initials. */
export function Avatar({ user, size = 36 }: { user: Parameters<typeof initialsOf>[0]; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B2E3B] to-[#FF7A00] font-bold text-white"
    >
      {initialsOf(user)}
    </span>
  );
}
