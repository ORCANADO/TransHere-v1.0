"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  }, []);

  const toggleFavorite = (id: string) => {
    if (!isMounted) return;

    setFavorites((prev) => {
      const newFavorites = prev.includes(id)
        ? prev.filter((favId) => favId !== id)
        : [...prev, id];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        console.error("Error writing to localStorage:", error);
      }

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

