import { fetchApi } from './api-client';
import { FeatureFlag } from './types';

/**
 * Single source of truth for "is this module enabled" — used by the Navbar,
 * the homepage module rail, and the gated route pages (hackathons/iconcoders/
 * codequest). Fails open: a missing key or an offline backend defaults to
 * enabled, matching this app's existing offline-tolerance convention rather
 * than hiding site sections whenever the backend is unreachable.
 */
export async function getModuleFlags(): Promise<Record<string, boolean>> {
  try {
    const flags = await fetchApi<FeatureFlag[]>('/feature-flags/');
    return Object.fromEntries(flags.map((f) => [f.key, f.is_enabled]));
  } catch {
    return {};
  }
}

export async function isModuleEnabled(key: string): Promise<boolean> {
  const map = await getModuleFlags();
  return map[key] ?? true;
}
