/**
 * src/hooks/dmc/useDMCCatalog.ts
 * Fetches the dataset catalog (sidebar source of truth).
 */

'use client';

import { useState, useEffect } from 'react';
import { dmcApi } from '@/lib/dmc-api';
import type { DatasetDefinition } from '@/lib/types/dmc';

export interface GroupedDatasets {
  [group: string]: DatasetDefinition[];
}

export function useDMCCatalog() {
  const [datasets, setDatasets] = useState<DatasetDefinition[]>([]);
  const [grouped, setGrouped] = useState<GroupedDatasets>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dmcApi.getCatalog()
      .then(res => {
        setDatasets(res.datasets);
        const g: GroupedDatasets = {};
        for (const d of res.datasets) {
          if (!g[d.group]) g[d.group] = [];
          g[d.group].push(d);
        }
        setGrouped(g);
      })
      .catch(err => setError(err?.message ?? 'Failed to load datasets'))
      .finally(() => setLoading(false));
  }, []);

  return { datasets, grouped, loading, error };
}
