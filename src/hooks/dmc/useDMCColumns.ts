/**
 * src/hooks/dmc/useDMCColumns.ts
 * Manages visible column selection state.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDefinition } from '@/lib/types/dmc';

export function useDMCColumns(allColumns: ColumnDefinition[]) {
  // Keyed set of visible column keys
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Reset to defaults when column schema changes
  useEffect(() => {
    const defaults = new Set(
      allColumns.filter(c => c.visible_by_default).map(c => c.key)
    );
    setVisibleKeys(defaults);
  }, [allColumns]);

  const visibleColumns = useMemo(
    () => allColumns.filter(c => visibleKeys.has(c.key)),
    [allColumns, visibleKeys]
  );

  const toggleColumn = useCallback((key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setVisibleKeys(new Set(allColumns.map(c => c.key)));
  }, [allColumns]);

  const resetToDefaults = useCallback(() => {
    setVisibleKeys(new Set(allColumns.filter(c => c.visible_by_default).map(c => c.key)));
  }, [allColumns]);

  return {
    visibleKeys,
    visibleColumns,
    toggleColumn,
    showAll,
    resetToDefaults,
    isVisible: (key: string) => visibleKeys.has(key),
  };
}
