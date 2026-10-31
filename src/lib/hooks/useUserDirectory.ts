'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiErrorMessage } from '@/lib/api/hackathons';
import {
  directoryApi, fromSearchParams, toQuery,
  type DirectoryFilters, type DirectoryPage, type DirectoryScope, type DirectorySummary,
} from '@/lib/userDirectory';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The directory's state: the filters live in the page address (so a filtered view survives a refresh and can be shared),
 * the list and the numbers come from the server one page at a time, and only the newest answer is ever shown.
 */
export function useUserDirectory(scope: DirectoryScope) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Keyed on the text of the address, so the filters (and the request they trigger) change only when the address does.
  const address = searchParams?.toString() ?? '';
  const filters = useMemo(() => fromSearchParams(new URLSearchParams(address)), [address]);

  const [page, setPage] = useState<DirectoryPage | null>(null);
  const [summary, setSummary] = useState<DirectorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(filters.q);

  const apply = useCallback((patch: Partial<DirectoryFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const query = toQuery(next, 'users');
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  // Typing is debounced into the address; the box itself updates at once.
  useEffect(() => { setSearchText(filters.q); }, [filters.q]);
  useEffect(() => {
    if (searchText.trim() === filters.q) return undefined;
    const timer = window.setTimeout(() => apply({ q: searchText.trim() }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, filters.q, apply]);

  const newest = useRef(0);
  const load = useCallback(() => {
    const mine = ++newest.current;
    setLoading(true);
    Promise.all([directoryApi.list(filters, scope), directoryApi.summary(scope)])
      .then(([rows, counts]) => {
        if (mine !== newest.current) return;
        setPage(rows);
        setSummary(counts);
        setError('');
      })
      .catch((err) => { if (mine === newest.current) setError(apiErrorMessage(err, 'Could not load the directory.')); })
      .finally(() => { if (mine === newest.current) setLoading(false); });
  }, [filters, scope]);

  useEffect(() => { load(); }, [load]);

  return { filters, apply, clear: () => router.replace(pathname, { scroll: false }), searchText, setSearchText, page, summary, loading, error, reload: load };
}
