"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error reading from localStorage:", error);
      }
    };

    setIsMounted(true);
    loadFromStorage();
    // Set initial load flag to false after a microtask to ensure state is set first
    setTimeout(() => setIsInitialLoad(false), 0);

    // Listen for storage changes (cross-tab/window sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
          }
        } catch (error) {
          console.error("Failed to parse storage event:", error);
        }
      }
    };

    // Listen for custom event (same-window sync)
    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ favorites: string[] }>;
      if (customEvent.detail?.favorites) {
        setFavorites(customEvent.detail.favorites);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("favoritesUpdated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("favoritesUpdated", handleCustomUpdate);
    };
  }, []);

  // Persist to localStorage and dispatch event whenever favorites changes (after initial load)
  useEffect(() => {
    if (!isMounted || isInitialLoad) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      // Dispatch custom event for same-window sync (storage event only works cross-tab)
      window.dispatchEvent(new CustomEvent("favoritesUpdated", { 
        detail: { favorites } 
      }));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }, [favorites, isMounted, isInitialLoad]);

  const toggleFavorite = (id: string) => {
    if (!isMounted) return;

    setFavorites((prev) => {
      const newFavorites = prev.includes(id)
        ? prev.filter((favId) => favId !== id)
        : [...prev, id];

      // State update will trigger useEffect to sync localStorage and dispatch event
      return newFavorites;
    });
  };

  const isFavorite = (id: string) => {
    if (!isMounted) return false;
    return favorites.includes(id);
  };

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    isMounted,
  };
}

