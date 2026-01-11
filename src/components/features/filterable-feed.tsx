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
      {/* Category Pills for Tag Filtering - Sticky with floating glass pills and iOS 26 glass border */}
      {!isFavorites && (
        <div className="sticky top-[96px] z-40 -mx-2 px-2 py-2">
          {/* iOS 26 Glass Border Container - Subtle glass with visible border like iOS 26 */}
          <div 
            className="rounded-2xl backdrop-blur-[2px]"
            style={{
              background: 'rgba(255, 255, 255, 0.005)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03), inset 0 0.5px 0 rgba(255, 255, 255, 0.06)'
            }}
          >
            <CategoryPills
              tags={topTags}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
            />
          </div>
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
