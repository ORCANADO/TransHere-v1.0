'use client';

import { useState, useEffect, useRef } from 'react';
import { ModelCard } from "./model-card";
import { Model } from "@/types";
import { Language, translateTags } from "@/lib/i18n";

// 3 rows on mobile (2-col grid) = 6 cards — covers viewport + small buffer
const INITIAL_CARDS = 6;
// Load 6 more cards each time the user scrolls near the bottom
const LOAD_MORE_COUNT = 6;

interface ModelFeedProps {
  models: (Model & { isOnline?: boolean })[];
  feedType?: 'near' | 'new' | 'favorites';
  buttons: {
    chat: string;
    unlock: string;
  };
  language: Language;
}

export function ModelFeed({ models, feedType, buttons, language }: ModelFeedProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_CARDS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when models array changes (e.g., feed switch)
  useEffect(() => {
    setVisibleCount(INITIAL_CARDS);
  }, [models]);

  // IntersectionObserver to progressively load more cards as user scrolls
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, models.length));
        }
      },
      { rootMargin: '300px' } // Start loading 300px before sentinel is visible
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [models.length, visibleCount]);

  // Show empty state for favorites feed
  if (feedType === 'favorites' && models.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-center">
          No favorites yet
        </p>
      </div>
    );
  }

  const visibleModels = models.slice(0, visibleCount);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleModels.map((model: Model & { isOnline?: boolean }, index: number) => {
          const translatedTags = translateTags(model.tags, language);
          return (
            <ModelCard
              key={model.id}
              name={model.name}
              image={model.image_url}
              tags={translatedTags}
              slug={model.slug || model.id}
              priority={index < 2}
              isOnline={model.isOnline}
              is_verified={model.is_verified}
              is_new={model.is_new}
              buttons={buttons}
            />
          );
        })}
      </div>
      {/* Sentinel element — triggers loading more cards when scrolled into view */}
      {visibleCount < models.length && (
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      )}
    </>
  );
}
