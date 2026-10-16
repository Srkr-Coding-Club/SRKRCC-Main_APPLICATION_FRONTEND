import { useCallback, useEffect, useRef, useState } from 'react';
import { College, fetchColleges } from '@/lib/colleges';

type SearchStatus = 'idle' | 'loading' | 'loadingMore' | 'error';

/**
 * Paged college lookup. A new `query` restarts from page 1 and aborts whatever
 * was in flight, so a slow response for an old query can never overwrite the
 * results of the one the member is looking at now.
 */
export function useCollegeSearch(query: string, enabled: boolean) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const nextPageRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (page: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus(page === 1 ? 'loading' : 'loadingMore');

    try {
      const data = await fetchColleges({ query, page }, controller.signal);
      setColleges((previous) => {
        if (page === 1) return data.results;
        const seen = new Set(previous.map((college) => college.id));
        return [...previous, ...data.results.filter((college) => !seen.has(college.id))];
      });
      setHasMore(Boolean(data.next));
      nextPageRef.current = page + 1;
      setStatus('idle');
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setStatus('error');
    }
  }, [query]);

  useEffect(() => {
    if (!enabled) return;
    setColleges([]);
    setHasMore(false);
    nextPageRef.current = 1;
    loadPage(1);
    return () => abortRef.current?.abort();
  }, [enabled, loadPage]);

  const loadMore = useCallback(() => {
    if (status !== 'idle' || !hasMore) return;
    loadPage(nextPageRef.current);
  }, [status, hasMore, loadPage]);

  const retry = useCallback(() => loadPage(nextPageRef.current), [loadPage]);

  return { colleges, hasMore, status, loadMore, retry };
}
