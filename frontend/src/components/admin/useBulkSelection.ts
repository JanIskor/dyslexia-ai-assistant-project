'use client';

import { useCallback, useMemo, useState } from 'react';

export function useBulkSelection(allIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIdSet = useMemo(() => new Set(allIds), [allIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((currentSelectedIds) =>
      currentSelectedIds.includes(id)
        ? currentSelectedIds.filter((currentId) => currentId !== id)
        : [...currentSelectedIds, id],
    );
  }, []);

  const replaceSelection = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const removeMissingSelections = useCallback(() => {
    setSelectedIds((currentSelectedIds) =>
      currentSelectedIds.every((currentId) => allIdSet.has(currentId))
        ? currentSelectedIds
        : currentSelectedIds.filter((currentId) => allIdSet.has(currentId)),
    );
  }, [allIdSet]);

  return {
    selectedIds,
    selectedIdSet,
    selectedCount: selectedIds.length,
    clearSelection,
    toggleSelection,
    replaceSelection,
    removeMissingSelections,
  };
}
