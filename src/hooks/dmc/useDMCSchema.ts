/**
 * src/hooks/dmc/useDMCSchema.ts
 * Fetches schema (columns + filters) for the active dataset.
 * Re-fetches whenever datasetId changes.
 */

'use client';

import { useState, useEffect } from 'react';
import { dmcApi } from '@/lib/dmc-api';
import type { ColumnDefinition, FilterDefinition } from '@/lib/types/dmc';

export function useDMCSchema(datasetId: string | null) {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [filters, setFilters] = useState<FilterDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) {
      setColumns([]);
      setFilters([]);
      return;
    }
    setLoading(true);
    setError(null);
    dmcApi.getSchema(datasetId)
      .then(res => {
        setColumns(res.columns);
        setFilters(res.filters);
      })
      .catch(err => setError(err?.message ?? 'Failed to load schema'))
      .finally(() => setLoading(false));
  }, [datasetId]);

  return { columns, filters, loading, error };
}
