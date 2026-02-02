'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { useFavorites } from '@/hooks/use-favorites';
import { ModelFeed } from './model-feed';
import { Model } from '@/types';
import { Language } from '@/lib/i18n';

interface FeedManagerProps {
  models: Model[];
  userCity: string;
  language: Language;
  buttons: {
    chat: string;
    unlock: string;
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FeedManager({ models, userCity, language, buttons }: FeedManagerProps) {
  const [feed] = useQueryState('feed', { defaultValue: 'near' });
  const { favorites, isMounted } = useFavorites();

  // Initialize with deterministic state to prevent hydration mismatch
  const [enrichedModels, setEnrichedModels] = useState<Array<Model & { isOnline?: boolean }>>(
    models.map((model: Model) => ({
      ...model,
      isOnline: false, // Start with false for SSR/client match
    }))
  );

  // Randomize after hydration (client-side only)
  useEffect(() => {
    // Step 1: Enrichment - Assign random isOnline status (40% chance of being online)
    const randomized = models.map((model: Model) => ({
      ...model,
      isOnline: Math.random() > 0.6, // 40% chance of being online
    }));
    setEnrichedModels(randomized);
  }, [models]);

  // Step 2: Filter based on feed type
  // NOTE: For 'near' and 'new' feeds, render during SSR (isOnline defaults to false).
  // The useEffect above will enrich with random isOnline and trigger a re-render.
  // Only 'favorites' must wait for localStorage (isMounted).
  const filteredModels = useMemo(() => {
    if (feed === 'favorites') {
      if (!isMounted) return [];
      return shuffleArray(enrichedModels.filter(m => favorites.includes(m.slug || m.id)));
    }

    if (feed === 'new') {
      return enrichedModels.filter(m => m.is_new === true);
    }

    // 'near' feed — render immediately, shuffle happens via useEffect enrichment
    return enrichedModels;
  }, [feed, enrichedModels, favorites, isMounted]);

  return <ModelFeed models={filteredModels} feedType={(feed as 'near' | 'new' | 'favorites') || 'near'} buttons={buttons} language={language} />;
}

