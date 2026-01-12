"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import dynamic from "next/dynamic";
import { StoryGroup } from "@/types";
import { StoryCircle } from "./story-circle";
import { useViewedStories } from "@/hooks/use-viewed-stories";
import { useStoriesRealtime } from "@/hooks/use-stories-realtime";

// Lazy load StoryViewer - modal that is hidden by default, should NOT be in initial bundle
const StoryViewer = dynamic(() => import("./story-viewer").then(mod => ({ default: mod.StoryViewer })), {
  ssr: false
});

interface StoriesContainerProps {
  groups?: StoryGroup[];
  originalGroups?: StoryGroup[]; // Full unfiltered groups for memory checks
  socialLink?: string;
  modelName?: string;
  modelImage?: string;
  modelSlug?: string;
  isVerified?: boolean;
}

export function StoriesContainer({ groups, originalGroups, socialLink, modelName, modelImage, modelSlug, isVerified }: StoriesContainerProps) {
  // Real-time updates: Listen for new story uploads
  useStoriesRealtime();
  
  // Visual Memory: Track which stories have been viewed
  const { getFirstUnseenStoryIndex, hasUnseenStories } = useViewedStories();
  
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

  // Safety check: Return null if groups is undefined or empty
  // This allows the layout to collapse neatly when no stories are available
  if (!groups || groups.length === 0) {
    return null;
  }

  // Create a map of original groups for memory checks
  const originalGroupsMap = useMemo(() => {
    if (!originalGroups) return new Map<string, StoryGroup>();
    return new Map(originalGroups.map(g => [g.id, g]));
  }, [originalGroups]);

  // Separate pinned and feed groups for isolated navigation
  const pinnedGroups = useMemo(
    () => groups.filter((g) => g.is_pinned && g.stories && g.stories.length > 0),
    [groups]
  );
  const feedGroups = useMemo(
    () => groups.filter((g) => !g.is_pinned && g.stories && g.stories.length > 0),
    [groups]
  );

  // Find selected group based on URL param
  const selectedGroup = storyId
    ? groups.find((g) => g.id === storyId)
    : null;

  // Determine which list the active group belongs to and calculate neighbors
  const { nextGroupId, prevGroupId } = useMemo(() => {
    if (!selectedGroup) return { nextGroupId: undefined, prevGroupId: undefined };

    // Determine if this is a pinned or feed group
    const isPinned = selectedGroup.is_pinned;
    const relevantList = isPinned ? pinnedGroups : feedGroups;

    // Find current index in the relevant list
    const currentIndex = relevantList.findIndex((g) => g.id === selectedGroup.id);

    if (currentIndex === -1) {
      return { nextGroupId: undefined, prevGroupId: undefined };
    }

    // Calculate neighbors within the same list only
    const nextGroup = currentIndex < relevantList.length - 1 ? relevantList[currentIndex + 1] : undefined;
    const prevGroup = currentIndex > 0 ? relevantList[currentIndex - 1] : undefined;

    return {
      nextGroupId: nextGroup?.id,
      prevGroupId: prevGroup?.id,
    };
  }, [selectedGroup, pinnedGroups, feedGroups]);

  // Handle circle click - open story viewer (updates URL)
  const handleStoryClick = (groupId: string) => {
    // Find the original group (with all stories) to calculate starting index
    const originalGroup = originalGroupsMap.get(groupId);
    const group = groups?.find(g => g.id === groupId);
    const groupToUse = originalGroup || group;
    
    // Calculate starting index (resume from first unseen story)
    // Use original group's full stories array, not the filtered one
    const startIndex = groupToUse ? getFirstUnseenStoryIndex(groupToUse.stories || []) : 0;
    
    // Set both story ID and index
    setStoryId(groupId, { history: "replace" });
    setStoryIndexParam(startIndex > 0 ? String(startIndex) : null, { history: "replace" });
  };

  // Handle close viewer (removes URL params)
  const handleCloseViewer = () => {
    setStoryId(null, { history: "replace" });
    setStoryIndexParam(null, { history: "replace" });
  };

  // Handle navigation between groups (uses replace to avoid history pollution)
  const handleNavigate = (groupId: string) => {
    // Find the original group (with all stories) to calculate starting index
    const originalGroup = originalGroupsMap.get(groupId);
    const group = groups?.find(g => g.id === groupId);
    const groupToUse = originalGroup || group;
    
    // Calculate starting index for the new group
    // Use original group's full stories array, not the filtered one
    const startIndex = groupToUse ? getFirstUnseenStoryIndex(groupToUse.stories || []) : 0;
    
    // Set both story ID and index
    setStoryId(groupId, { history: "replace" });
    setStoryIndexParam(startIndex > 0 ? String(startIndex) : null, { history: "replace" });
  };

  return (
    <>
      {/* Mobile: Horizontal scrollable row - Glass panel wrapper */}
      {/* -mx-4 breaks out of parent's px-4 padding, w-[calc(100%+2rem)] compensates for full width */}
      <div className="lg:hidden w-[calc(100%+2rem)] overflow-x-auto scrollbar-hide -mx-4 bg-background/30 backdrop-blur-xl border-y border-white/10">
        <div className="flex gap-3 py-4 px-1">
          {groups.map((group, index) => {
            // Use original group (with all stories) for memory checks, filtered group for display
            const originalGroup = originalGroupsMap.get(group.id) || group;
            return (
              <div 
                key={group.id} 
                className={index === groups.length - 1 ? "pr-4" : ""}
              >
                <StoryCircle
                  group={group}
                  allStories={originalGroup.stories}
                  onClick={() => handleStoryClick(group.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Vertical list - Glass panel */}
      <div className="hidden lg:block lg:p-4 bg-background/30 backdrop-blur-xl rounded-2xl border border-white/10 mt-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Stories
        </h3>
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            // Use original group (with all stories) for memory checks, filtered group for display
            const originalGroup = originalGroupsMap.get(group.id) || group;
            return (
              <StoryCircle
                key={group.id}
                group={group}
                allStories={originalGroup.stories}
                onClick={() => handleStoryClick(group.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Story Viewer Modal - Render when URL param exists and group is found */}
      {storyId && selectedGroup && (() => {
        // Use original group (with all stories) for StoryViewer, not the filtered one
        const originalGroup = originalGroupsMap.get(selectedGroup.id) || selectedGroup;
        
        // Determine which list the selected group belongs to
        const isPinned = selectedGroup.is_pinned;
        const relevantList = isPinned ? pinnedGroups : feedGroups;
        
        // Find current index in the relevant list
        const currentIndex = relevantList.findIndex((g) => g.id === selectedGroup.id);
        
        // Get next and previous groups for preview
        const nextGroup = currentIndex >= 0 && currentIndex < relevantList.length - 1
          ? relevantList[currentIndex + 1]
          : null;
        const prevGroup = currentIndex > 0
          ? relevantList[currentIndex - 1]
          : null;
        
        // Get starting story index from URL or calculate fresh
        // If URL has index, use it (for resume on reopen)
        // Otherwise, calculate from first unseen story (for new opens)
        // Use the FULL stories array from the original group (not a truncated preview)
        const urlIndex = storyIndexParam ? parseInt(storyIndexParam, 10) : null;
        const calculatedIndex = getFirstUnseenStoryIndex(originalGroup.stories || []);
        const initialStoryIndex = urlIndex !== null && !isNaN(urlIndex) ? urlIndex : calculatedIndex;
        
        // Create preview data - use first story image from next/prev group (Instagram-style)
        return (
          <StoryViewer
            group={originalGroup}
            onClose={handleCloseViewer}
            socialLink={socialLink}
            modelName={modelName}
            modelImage={modelImage}
            modelSlug={modelSlug}
            isVerified={isVerified}
            nextGroupId={nextGroupId}
            prevGroupId={prevGroupId}
            onNavigate={handleNavigate}
            disableLongPress={true}
            initialStoryIndex={initialStoryIndex}
          />
        );
      })()}
    </>
  );
}
