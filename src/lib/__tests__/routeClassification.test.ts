import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { isPrivateRoute } from '../emailVerification';

/**
 * Every page of the site is either PRIVATE (a blocked person sees the verify screen instead) or on this list of
 * PUBLIC pages. Adding a page without deciding fails this test, so the two lists cannot drift apart silently.
 * (The server enforces the same rules whatever the website draws.)
 */
const PUBLIC_PAGES = new Set([
  '/', '/403', '/about', '/blogs', '/career', '/codequest', '/codequest/batch-schedule', '/events', '/events/[slug]',
  '/forms', '/forms/[slug]', '/hackathons', '/hackathons/[slug]', '/iconcoders', '/login', '/signup',
  '/account/setup-password', '/account/verify-email', '/account/verify-email/not-me', '/certificates/verify/[code]',
]);

function pages(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pages(full, found);
    else if (entry === 'page.tsx') found.push(full);
  }
  return found;
}

const appDir = join(process.cwd(), 'src', 'app');
const routes = pages(appDir)
  .map((file) => '/' + relative(appDir, file).split(sep).slice(0, -1).join('/'))
  .map((route) => (route === '/' ? '/' : route.replace(/\/$/, '')))
  .sort();

describe('every page is classified as public or private', () => {
  it('finds the site\'s pages', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(routes).toContain('/account/verify-email');
  });

  it.each(routes)('%s', (route) => {
    const sample = route.replace(/\[[^\]]+\]/g, 'sample');
    const isPrivate = isPrivateRoute(sample);
    const isPublic = PUBLIC_PAGES.has(route);
    expect(isPrivate !== isPublic, `${route} must be exactly one of private (isPrivateRoute) or public (PUBLIC_PAGES)`).toBe(true);
  });

  it('lists no page that no longer exists', () => {
    const stale = Array.from(PUBLIC_PAGES).filter((route) => !routes.includes(route));
    expect(stale).toEqual([]);
  });
});
