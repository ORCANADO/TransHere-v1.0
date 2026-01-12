"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "transpot-viewed-story-ids";

/**
 * Custom hook to track "Viewed" individual stories using localStorage.
 * Handles Next.js hydration mismatch by loading from localStorage only on client mount.
 * Tracks individual story IDs to enable precise resume playback and group completion detection.
 */
export function useViewedStories() {
  // Start with empty array to avoid hydration mismatch
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage only after client mount (hydration safety)
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Handle migration from old formats
          if (Array.isArray(parsed)) {
            if (parsed.length > 0) {
              // Check if old format (ViewedStory[] with groupId)
              if (typeof parsed[0] === 'object' && 'groupId' in parsed[0]) {
                // Old format: can't recover individual story IDs, start fresh
                setViewedStoryIds([]);
                // Save new format
                localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
              } else if (typeof parsed[0] === 'string') {
                // New format: array of story IDs
                setViewedStoryIds(parsed);
              }
            } else {
              // Empty array
              setViewedStoryIds([]);
            }
          }
        }
      } catch (error) {
        // localStorage unavailable or corrupted data - fail silently
        console.warn("Failed to load viewed story IDs from localStorage:", error);
      }
    };

    loadFromStorage();
    setIsMounted(true);

    // Listen for storage changes (cross-tab/window sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
            setViewedStoryIds(parsed);
          }
        } catch (error) {
          console.warn("Failed to parse storage event:", error);
        }
      }
    };

    // Listen for custom event (same-window sync)
    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ viewedStoryIds: string[] }>;
      if (customEvent.detail?.viewedStoryIds) {
        setViewedStoryIds(customEvent.detail.viewedStoryIds);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("viewedStoryIdsUpdated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("viewedStoryIdsUpdated", handleCustomUpdate);
    };
  }, []);

  // Persist to localStorage whenever viewedStoryIds changes (after hydration)
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedStoryIds));
      // Dispatch custom event for same-window sync (storage event only works cross-tab)
      window.dispatchEvent(new CustomEvent("viewedStoryIdsUpdated", { 
        detail: { viewedStoryIds } 
      }));
    } catch (error) {
      // localStorage full or unavailable - fail silently
      console.warn("Failed to save viewed story IDs to localStorage:", error);
    }
  }, [viewedStoryIds, isMounted]);

  /**
   * Mark an individual story as viewed by its ID.
   */
  const markStoryAsViewed = useCallback((storyId: string) => {
    setViewedStoryIds((prev) => {
      // Avoid duplicates
      if (prev.includes(storyId)) {
        return prev;
      }
      return [...prev, storyId];
    });
  }, []);

  /**
   * Check if an individual story has been viewed.
   */
  const isStoryViewed = useCallback(
    (storyId: string): boolean => {
      if (!isMounted) return false;
      return viewedStoryIds.includes(storyId);
    },
    [isMounted, viewedStoryIds]
  );

  /**
   * Check if ALL stories in a group are viewed (Instagram behavior).
   * Returns false if not mounted, empty array, or any story is unviewed.
   */
  const isGroupFullyViewed = useCallback(
    (stories: Array<{ id: string }>): boolean => {
      if (!isMounted || stories.length === 0) return false;
      return stories.every((story) => viewedStoryIds.includes(story.id));
    },
    [isMounted, viewedStoryIds]
  );

  /**
   * Check if group has ANY unseen stories (inverse of fully viewed).
   * Returns true if not mounted or empty array (default to unseen).
   */
  const hasUnseenStories = useCallback(
    (stories: Array<{ id: string }>): boolean => {
      if (!isMounted || stories.length === 0) return true; // Default to unseen if not mounted
      return stories.some((story) => !viewedStoryIds.includes(story.id));
    },
    [isMounted, viewedStoryIds]
  );

  /**
   * Get index of oldest unseen story (for resume playback).
   * Returns 0 if all seen or none seen, otherwise returns first unseen index.
   * Stories are sorted oldest-to-newest in the array.
   */
  const getFirstUnseenStoryIndex = useCallback(
    (stories: Array<{ id: string }>): number => {
      if (!isMounted || stories.length === 0) return 0;
      const index = stories.findIndex((story) => !viewedStoryIds.includes(story.id));
      return index === -1 ? 0 : index; // If all seen, start from beginning
    },
    [isMounted, viewedStoryIds]
  );

  return {
    viewedStoryIds,
    isStoryViewed,
    markStoryAsViewed,
    isGroupFullyViewed,
    hasUnseenStories,
    getFirstUnseenStoryIndex,
  };
}
