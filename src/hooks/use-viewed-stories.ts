"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "transpot-viewed-stories";

/**
 * Custom hook to track "Viewed" story groups using localStorage.
 * Handles Next.js hydration mismatch by loading from localStorage only on client mount.
 */
export function useViewedStories() {
  // Start with empty array to avoid hydration mismatch
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage only after client mount (hydration safety)
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setViewedIds(parsed);
          }
        }
      } catch (error) {
        // localStorage unavailable or corrupted data - fail silently
        console.warn("Failed to load viewed stories from localStorage:", error);
      }
    };

    loadFromStorage();
    setIsHydrated(true);

    // Listen for storage changes (cross-tab/window sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setViewedIds(parsed);
          }
        } catch (error) {
          console.warn("Failed to parse storage event:", error);
        }
      }
    };

    // Listen for custom event (same-window sync)
    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ viewedIds: string[] }>;
      if (customEvent.detail?.viewedIds) {
        setViewedIds(customEvent.detail.viewedIds);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("viewedStoriesUpdated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("viewedStoriesUpdated", handleCustomUpdate);
    };
  }, []);

  // Persist to localStorage whenever viewedIds changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedIds));
      // Dispatch custom event for same-window sync (storage event only works cross-tab)
      window.dispatchEvent(new CustomEvent("viewedStoriesUpdated", { 
        detail: { viewedIds } 
      }));
    } catch (error) {
      // localStorage full or unavailable - fail silently
      console.warn("Failed to save viewed stories to localStorage:", error);
    }
  }, [viewedIds, isHydrated]);

  /**
   * Mark a story group as viewed. Only adds if not already present.
   */
  const markAsViewed = useCallback((id: string) => {
    setViewedIds((prev) => {
      if (prev.includes(id)) {
        return prev; // Already viewed, no change
      }
      return [...prev, id];
    });
  }, []);

  /**
   * Check if a story group has been viewed.
   */
  const isViewed = useCallback(
    (id: string): boolean => {
      return viewedIds.includes(id);
    },
    [viewedIds]
  );

  return {
    viewedIds,
    markAsViewed,
    isViewed,
    isHydrated, // Expose hydration state for conditional rendering if needed
  };
}
