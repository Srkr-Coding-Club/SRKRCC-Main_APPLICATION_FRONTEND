// Canonical public address of this site, for metadata, the sitemap and robots.txt.
// Set NEXT_PUBLIC_SITE_URL per environment; the fallback only applies when it is unset.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://srkrcc.com').replace(/\/$/, '');
