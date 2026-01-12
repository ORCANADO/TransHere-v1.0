"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import dynamic from "next/dynamic";
import { StoryGroup } from "@/types";
import { StoryCircle } from "./story-circle";
import { useViewedStories } from "@/hooks/use-viewed-stories";

// Lazy load StoryViewer - modal that is hidden by default, should NOT be in initial bundle
const StoryViewer = dynamic(() => import("./story-viewer").then(mod => ({ default: mod.StoryViewer })), {
  ssr: false
});

interface StoriesContainerProps {
  groups?: StoryGroup[];
  socialLink?: string;
  modelName?: string;
  modelImage?: string;
  modelSlug?: string;
  isVerified?: boolean;
}

export function StoriesContainer({ groups, socialLink, modelName, modelImage, modelSlug, isVerified }: StoriesContainerProps) {
  // Visual Memory: Track which stories have been viewed
  const { getFirstUnseenStoryIndex } = useViewedStories();
  
  // URL state management with nuqs - syncs with browser history
  // history: 'push' creates entries in browser history for back button support
  const [storyId, setStoryId] = useQueryState("story", {
    defaultValue: "",
    clearOnDefault: true,
    history: "push",
  });
  
  // Story index parameter for resume playback (si = story index)
  const [storyIndexParam, setStoryIndexParam] = useQueryState("si", {
    defaultValue: "",
    clearOnDefault: true,
    history: "push",
    parse: (value) => {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? "" : parsed.toString();
    },
    serialize: (value) => value,
  });
  
  // Parse story index from URL (defaults to 0 if not provided or invalid)
  const initialStoryIndexFromUrl = storyIndexParam ? parseInt(storyIndexParam, 10) : 0;

  // Safety check: Return null if groups is undefined or empty
  // This allows the layout to collapse neatly when no stories are available
  if (!groups || groups.length === 0) {
    return null;
  }

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
  // Calculate initial index and set both URL parameters
  const handleStoryClick = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    
    if (group) {
      // Sort stories chronologically (oldest first) to match StoryViewer
      const sortedStories = [...(group.stories || [])].sort((a, b) => {
        const dateA = new Date(a.posted_date || a.created_at);
        const dateB = new Date(b.posted_date || b.created_at);
        return dateA.getTime() - dateB.getTime();
      });
      const startIndex = getFirstUnseenStoryIndex(sortedStories);
      
      // Set both parameters with push for initial open (allows back button)
      setStoryId(groupId);
      setStoryIndexParam(startIndex.toString());
    } else {
      // Fallback if group not found
      setStoryId(groupId);
      setStoryIndexParam("0");
    }
  };

  // Handle close viewer (removes URL params)
  const handleCloseViewer = () => {
    setStoryId(null, { history: "replace" });
    setStoryIndexParam(null, { history: "replace" });
  };

  // Handle navigation between groups (uses replace to avoid history pollution)
  // Calculate and set initial index for the new group
  const handleNavigate = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    
    if (group) {
      // Sort stories chronologically (oldest first) to match StoryViewer
      const sortedStories = [...(group.stories || [])].sort((a, b) => {
        const dateA = new Date(a.posted_date || a.created_at);
        const dateB = new Date(b.posted_date || b.created_at);
        return dateA.getTime() - dateB.getTime();
      });
      const startIndex = getFirstUnseenStoryIndex(sortedStories);
      
      setStoryId(groupId, { history: "replace" });
      setStoryIndexParam(startIndex.toString(), { history: "replace" });
    } else {
      // Fallback if group not found
      setStoryId(groupId, { history: "replace" });
      setStoryIndexParam("0", { history: "replace" });
    }
  };

  return (
    <>
      {/* Mobile: Horizontal scrollable row - Glass panel wrapper */}
      {/* -mx-4 breaks out of parent's px-4 padding, w-[calc(100%+2rem)] compensates for full width */}
      <div className="lg:hidden w-[calc(100%+2rem)] overflow-x-auto scrollbar-hide -mx-4 bg-background/30 backdrop-blur-xl border-y border-white/10">
        <div className="flex gap-3 py-4 px-1">
          {groups.map((group, index) => (
            <div 
              key={group.id} 
              className={index === groups.length - 1 ? "pr-4" : ""}
            >
              <StoryCircle
                group={group}
                onClick={() => handleStoryClick(group.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Vertical list - Glass panel */}
      <div className="hidden lg:block lg:p-4 bg-background/30 backdrop-blur-xl rounded-2xl border border-white/10 mt-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Stories
        </h3>
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <StoryCircle
              key={group.id}
              group={group}
              onClick={() => handleStoryClick(group.id)}
            />
          ))}
        </div>
      </div>

      {/* Story Viewer Modal - Render when URL param exists and group is found */}
      {storyId && selectedGroup && (() => {
        // Use index from URL if valid, otherwise calculate from first unseen story
        // This allows resume-on-reopen within the same session
        let initialStoryIndex = initialStoryIndexFromUrl;
        
        // Validate index is within bounds
        if (initialStoryIndex < 0 || initialStoryIndex >= (selectedGroup.stories?.length || 0)) {
          // Recalculate if URL index is invalid
          // Use the FULL stories array from the group (not a truncated preview)
          // Stories are sorted chronologically (oldest first) in StoryViewer
          const sortedStories = [...(selectedGroup.stories || [])].sort((a, b) => {
            const dateA = new Date(a.posted_date || a.created_at);
            const dateB = new Date(b.posted_date || b.created_at);
            return dateA.getTime() - dateB.getTime();
          });
          initialStoryIndex = getFirstUnseenStoryIndex(sortedStories);
        }
        
        return (
          <StoryViewer
            group={selectedGroup}
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
