import { fetchApi } from '@/lib/api-client';
import { Announcement } from '@/lib/types';
import AnnouncementBannerClient from './AnnouncementBannerClient';

/**
 * Server Component — fetches active announcements (the backend's public GET
 * already filters to is_active=True for anonymous/non-admin callers, same
 * pattern as Event/Hackathon visibility filtering) and hands them to the
 * client component that handles per-viewer dismiss state. Fails silently to
 * an empty banner on a slow/offline backend, same as the other landing-page
 * sections that fetch server-side (e.g. getEvents() in src/app/events/page.tsx)
 * — an announcement banner is the last thing that should block the homepage.
 */
export default async function AnnouncementBanner() {
  let announcements: Announcement[] = [];
  try {
    announcements = (await fetchApi<Announcement[]>('/announcements/')) || [];
  } catch {
    announcements = [];
  }

  if (announcements.length === 0) return null;

  return <AnnouncementBannerClient announcements={announcements} />;
}
