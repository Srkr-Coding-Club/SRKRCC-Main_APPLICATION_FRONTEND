/**
 * src/hooks/dmc/useDMCQuery.ts
 * Executes the dataset query and manages pagination/loading state.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { dmcApi } from '@/lib/dmc-api';
import type { DMCRecord, FilterClause, QueryResponse, SortClause } from '@/lib/types/dmc';

interface UseDMCQueryOptions {
  datasetId: string | null;
  pageSize?: number;
}

export function useDMCQuery({ datasetId, pageSize = 50 }: UseDMCQueryOptions) {
  const [records, setRecords] = useState<DMCRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable query params stored in ref so fetch can read latest without re-triggering
  const queryRef = useRef<{ search: string; sort: SortClause; filters: FilterClause[]; columns: string[] }>({
    search: '',
    sort: { field: 'created_at', direction: 'desc' },
    filters: [],
    columns: [],
  });

  const fetch = useCallback(async (
    targetPage: number,
    search: string,
    sort: SortClause,
    filters: FilterClause[],
    visibleColumns: string[],
  ) => {
    if (!datasetId) return;
    queryRef.current = { search, sort, filters, columns: visibleColumns };
    setLoading(true);
    setError(null);
    try {
      const res: QueryResponse = await dmcApi.query(datasetId, {
        page: targetPage,
        page_size: pageSize,
        search,
        sort,
        filters,
        columns: visibleColumns,
      });
      setRecords(res.records);
      setTotal(res.total);
      setPage(res.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [datasetId, pageSize]);

  const refetch = useCallback((targetPage?: number) => {
    const q = queryRef.current;
    return fetch(targetPage ?? page, q.search, q.sort, q.filters, q.columns);
  }, [fetch, page]);

  const reset = useCallback(() => {
    setRecords([]);
    setTotal(0);
    setPage(1);
    setError(null);
    queryRef.current = { search: '', sort: { field: 'created_at', direction: 'desc' }, filters: [], columns: [] };
  }, []);

  return {
    records,
    total,
    page,
    loading,
    error,
    setPage,
    fetch,
    refetch,
    reset,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
