"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import dynamic from "next/dynamic";
import { Model, StoryGroup } from "@/types";
import { StoryCircle } from "./story-circle";
import { cn } from "@/lib/utils";
import { useViewedStories } from "@/hooks/use-viewed-stories";
import { useStoriesRealtime } from "@/hooks/use-stories-realtime";

// Lazy load StoryViewer - modal that is hidden by default, should NOT be in initial bundle
const StoryViewer = dynamic(() => import("./story-viewer").then(mod => ({ default: mod.StoryViewer })), {
  ssr: false
});

interface HomeStoriesBarProps {
  models: Model[];
}

export function HomeStoriesBar({ models }: HomeStoriesBarProps) {
  // Real-time updates: Listen for new story uploads
  useStoriesRealtime();
  
  // Read current feed from URL - only show on 'near' feed
  const [feed] = useQueryState("feed", { defaultValue: "near" });
  
  // Visual Memory: Track which stories have been viewed
  const { hasUnseenStories, getFirstUnseenStoryIndex } = useViewedStories();
  
  // URL state management with nuqs - syncs with browser history
  // Use 'replace' to avoid polluting browser history (per .cursorrules)
  const [storyId, setStoryId] = useQueryState("story", {
    defaultValue: "",
    clearOnDefault: true,
    history: "replace",
  });
  
  // Story index parameter for resume playback
  const [storyIndexParam, setStoryIndexParam] = useQueryState("si", {
    defaultValue: "",
    clearOnDefault: true,
    history: "replace",
  });

  // Only render on 'near' feed
  if (feed !== "near") {
    return null;
  }

  // Find the selected model and group based on URL param
  // Format: storyId = "modelId:groupId" or just "groupId" if we can infer model
  const selectedModel = storyId
    ? models.find((model) => {
        // Check if any of this model's story groups match the storyId
        return model.story_groups?.some((group) => group.id === storyId);
      })
    : null;

  const selectedGroup = storyId && selectedModel
    ? selectedModel.story_groups?.find((group) => group.id === storyId)
    : null;

  // Handle circle click - open story viewer with recent group
  const handleRecentGroupClick = (groupId: string) => {
    // Find the group to calculate starting index
    const group = models
      .flatMap(m => m.story_groups || [])
      .find(g => g.id === groupId);
    
    // Calculate starting index (resume from first unseen story)
    const startIndex = group ? getFirstUnseenStoryIndex(group.stories || []) : 0;
    
    // Set both story ID and index
    setStoryId(groupId, { history: "replace" });
    setStoryIndexParam(startIndex > 0 ? String(startIndex) : null, { history: "replace" });
  };

  // Handle close viewer (removes URL params)
  const handleCloseViewer = () => {
    setStoryId(null, { history: "replace" });
    setStoryIndexParam(null, { history: "replace" });
  };

  // Filter models with recent groups and extract the recent group
  // Use useMemo to recalculate when models or viewedStoryIds change
  const modelsWithRecentGroups = useMemo(() => {
    return models
      .map((model) => {
        // Find the specific recent (unpinned) group with stories
        const recentGroup = model.story_groups?.find(
          (g) => !g.is_pinned && g.stories && g.stories.length > 0
        );

        // Return null if no recent group found
        if (!recentGroup) {
          return null;
        }

        // Get the most recent story for the preview
        const sortedStories = [...(recentGroup.stories || [])].sort((a, b) => {
          const dateA = new Date(a.posted_date || a.created_at);
          const dateB = new Date(b.posted_date || b.created_at);
          return dateB.getTime() - dateA.getTime(); // Newest first
        });
        const latestStory = sortedStories[0];
        const latestStoryDate = latestStory ? new Date(latestStory.posted_date || latestStory.created_at) : new Date(0);
        
        // For cover: use media_url only if it's an image, for videos use group's cover_url (poster)
        const latestStoryMedia = latestStory?.media_type === 'video' 
          ? null  // Don't use video URL as cover
          : latestStory?.media_url;

        // Create display group with proper cover fallback:
        // 1. Use the most recent IMAGE story's media (like Instagram)
        // 2. Fall back to group's cover_url (which is poster for videos)
        // 3. Fall back to model's profile image (last resort)
        const displayGroup: StoryGroup = {
          ...recentGroup,
          title: model.name, // Show model name, not "Recent"
          cover_url: latestStoryMedia || recentGroup.cover_url || model.image_url || '',
        };

        // Check if this story group has unseen stories (Visual Memory)
        const hasUnseen = hasUnseenStories(recentGroup.stories || []);

        return { model, recentGroup, displayGroup, latestStoryDate, hasUnseen };
      })
      .filter((item): item is { model: Model; recentGroup: StoryGroup; displayGroup: StoryGroup; latestStoryDate: Date; hasUnseen: boolean } => item !== null)
      // Instagram-style sorting: Groups with unseen stories first, then fully viewed. Within each group, sort by newest first
      .sort((a, b) => {
        // Primary sort: Groups with unseen stories come first
        if (a.hasUnseen !== b.hasUnseen) {
          return a.hasUnseen ? -1 : 1; // Unseen (true) comes before fully viewed (false)
        }
        // Secondary sort: Newest first within same unseen status
        return b.latestStoryDate.getTime() - a.latestStoryDate.getTime();
      });
  }, [models, hasUnseenStories]);

  // Don't render if no models with recent groups
  if (modelsWithRecentGroups.length === 0) {
    return null;
  }

  // Playlist Logic: Create array of all recent groups for navigation
  const allRecentGroups = modelsWithRecentGroups.map(({ recentGroup, model }) => ({
    id: recentGroup.id,
    model,
    group: recentGroup,
  }));

  // Find current position in playlist
  const activeIndex = storyId 
    ? allRecentGroups.findIndex((item) => item.id === storyId)
    : -1;

  // Calculate neighbor group IDs for navigation
  const nextGroupId = activeIndex >= 0 && activeIndex < allRecentGroups.length - 1
    ? allRecentGroups[activeIndex + 1]?.id
    : undefined;

  const prevGroupId = activeIndex > 0
    ? allRecentGroups[activeIndex - 1]?.id
    : undefined;

  // Handler for navigating between models' stories
  // Use 'replace' history to avoid creating multiple back button entries
  const handleNavigate = (id: string) => {
    // Find the group to calculate starting index
    const group = models
      .flatMap(m => m.story_groups || [])
      .find(g => g.id === id);
    
    // Calculate starting index for the new group
    const startIndex = group ? getFirstUnseenStoryIndex(group.stories || []) : 0;
    
    // Set both story ID and index
    setStoryId(id, { history: 'replace' });
    setStoryIndexParam(startIndex > 0 ? String(startIndex) : null, { history: 'replace' });
  };

  return (
    <>
      {/* Horizontal Scrollable Container - fully transparent, no background bar */}
      <div className="w-full overflow-x-auto scrollbar-hide bg-transparent backdrop-blur-none relative">
        <div className="flex gap-3 py-4 px-1">
          {modelsWithRecentGroups.map(({ model, recentGroup, displayGroup }, index) => (
            <div
              key={model.id}
              className={cn(
                "flex-shrink-0",
                index === modelsWithRecentGroups.length - 1 && "pr-4"
              )}
            >
              <StoryCircle
                group={displayGroup}
                onClick={() => handleRecentGroupClick(recentGroup.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal - Render when URL param exists and group is found */}
      {storyId && selectedGroup && selectedModel && (() => {
        // Get starting story index from URL or calculate fresh
        // If URL has index, use it (for resume on reopen)
        // Otherwise, calculate from first unseen story (for new opens)
        const urlIndex = storyIndexParam ? parseInt(storyIndexParam, 10) : null;
        const calculatedIndex = getFirstUnseenStoryIndex(selectedGroup.stories || []);
        const startIndex = urlIndex !== null && !isNaN(urlIndex) ? urlIndex : calculatedIndex;
        
        return (
          <StoryViewer
            group={selectedGroup}
            onClose={handleCloseViewer}
            socialLink={selectedModel.social_link}
            modelName={selectedModel.name}
            modelImage={selectedModel.image_url}
            modelSlug={selectedModel.slug}
            isVerified={selectedModel.is_verified}
            nextGroupId={nextGroupId}
            prevGroupId={prevGroupId}
            onNavigate={handleNavigate}
            initialStoryIndex={startIndex}
          />
        );
      })()}
    </>
  );
}
