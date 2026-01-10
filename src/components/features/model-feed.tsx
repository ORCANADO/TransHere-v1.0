import { ModelCard } from "./model-card";
import { Model } from "@/types";
import { Language, translateTags } from "@/lib/i18n";

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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {models.map((model: Model & { isOnline?: boolean }, index: number) => {
        const translatedTags = translateTags(model.tags, language);
        return (
          <ModelCard
            key={model.id}
            name={model.name}
            image={model.image_url}
            tags={translatedTags}
            slug={model.slug || model.id}
            priority={index < 4}
            isOnline={model.isOnline}
            is_verified={model.is_verified}
            is_new={model.is_new}
            buttons={buttons}
          />
        );
      })}
    </div>
  );
}

