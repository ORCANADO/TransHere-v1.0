'use client';

import { useState } from 'react';
import { useQueryState } from 'nuqs';
import { CategoryPills } from './category-pills';
import { FeedManager } from './feed-manager';
import { Model } from '@/types';
import { Language } from '@/lib/i18n';

interface FilterableFeedProps {
  models: Model[];
  topTags: string[];
  userCity: string;
  language: Language;
  buttons: {
    chat: string;
    unlock: string;
  };
}

export function FilterableFeed({ models, topTags, userCity, language, buttons }: FilterableFeedProps) {
  const [feed] = useQueryState('feed', { defaultValue: 'near' });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const isFavorites = feed === 'favorites';

  // Filter models by selected tag (skip filtering for favorites)
  const filteredModels = selectedTag && !isFavorites
    ? models.filter(m => m.tags?.includes(selectedTag))
    : models;

  return (
    <>
      {/* Category Pills for Tag Filtering - Hidden for favorites */}
      {!isFavorites && (
        <div className="mb-2">
          <CategoryPills
            tags={topTags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />
        </div>
      )}

      {/* Show empty state or feed */}
      {filteredModels.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No models found in this category
        </p>
      ) : (
        <FeedManager
          models={filteredModels}
          userCity={userCity}
          language={language}
          buttons={buttons}
        />
      )}
    </>
  );
}
