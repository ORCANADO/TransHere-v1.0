'use client';

import { useState, useCallback } from 'react';

export interface UseModelSelectionReturn {
    selectedIds: string[];
    toggleModel: (id: string) => void;
    selectMultiple: (ids: string[]) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
}

export function useModelSelection(initialIds: string[] = []): UseModelSelectionReturn {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

    const toggleModel = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }, []);

    const selectMultiple = useCallback((ids: string[]) => {
        setSelectedIds(ids);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const isSelected = useCallback(
        (id: string) => selectedIds.includes(id),
        [selectedIds]
    );

    return {
        selectedIds,
        toggleModel,
        selectMultiple,
        clearSelection,
        isSelected,
    };
}
