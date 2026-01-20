"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
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
  encodedDestination?: string;
  isCrawler?: boolean;
  modelName?: string;
  modelImage?: string;
  modelSlug?: string;
  modelId?: string;
  isVerified?: boolean;
}

export function StoriesContainer({ groups, encodedDestination, isCrawler, modelName, modelImage, modelSlug, modelId, isVerified }: StoriesContainerProps) {
  // Visual Memory: Track which stories have been viewed
  const { getFirstUnseenStoryIndex, hasUnseenStories } = useViewedStories();

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

  // Split recent (non-pinned) groups into seen/unseen chains
  const recentGroups = useMemo(
    () => groups.filter((g) => !g.is_pinned && g.stories && g.stories.length > 0),
    [groups]
  );

  const unseenGroups = useMemo(() => {
    return recentGroups.filter((g) => hasUnseenStories(g.stories || []));
  }, [recentGroups, hasUnseenStories]);

  const seenGroups = useMemo(() => {
    return recentGroups.filter((g) => !hasUnseenStories(g.stories || []));
  }, [recentGroups, hasUnseenStories]);

  // Find selected group based on URL param
  const selectedGroup = storyId
    ? groups.find((g) => g.id === storyId)
    : null;

  // Store chain neighbors at open time to prevent dynamic changes mid-viewing
  const [activeChainNeighbors, setActiveChainNeighbors] = useState<{
    prevGroupId: string | null;
    nextGroupId: string | null;
  } | null>(null);

  // Calculate neighbors for a group based on its chain membership
  const getNeighborsForGroup = useCallback((groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { prevGroupId: null, nextGroupId: null };

    // Pinned groups navigate among pinned only (existing behavior)
    if (group.is_pinned) {
      const indexInPinned = pinnedGroups.findIndex((g) => g.id === groupId);
      if (indexInPinned === -1) {
        return { prevGroupId: null, nextGroupId: null };
      }
      return {
        prevGroupId: indexInPinned > 0 ? pinnedGroups[indexInPinned - 1].id : null,
        nextGroupId: indexInPinned < pinnedGroups.length - 1 ? pinnedGroups[indexInPinned + 1].id : null,
      };
    }

    // Recent groups navigate within their seen/unseen chain
    const isUnseen = hasUnseenStories(group.stories || []);
    const chain = isUnseen ? unseenGroups : seenGroups;
    const indexInChain = chain.findIndex((g) => g.id === groupId);

    if (indexInChain === -1) {
      return { prevGroupId: null, nextGroupId: null };
    }

    return {
      prevGroupId: indexInChain > 0 ? chain[indexInChain - 1].id : null,
      nextGroupId: indexInChain < chain.length - 1 ? chain[indexInChain + 1].id : null,
    };
  }, [groups, pinnedGroups, unseenGroups, seenGroups, hasUnseenStories]);

  // Set chain neighbors when storyId changes (e.g., direct link or navigation)
  useEffect(() => {
    if (storyId && selectedGroup) {
      const neighbors = getNeighborsForGroup(storyId);
      setActiveChainNeighbors(neighbors);
    } else if (!storyId) {
      setActiveChainNeighbors(null);
    }
  }, [storyId, selectedGroup, getNeighborsForGroup]);

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

      // Calculate and store chain neighbors at open time
      const neighbors = getNeighborsForGroup(groupId);
      setActiveChainNeighbors(neighbors);

      // Set both parameters with push for initial open (allows back button)
      setStoryId(groupId);
      setStoryIndexParam(startIndex.toString());
    } else {
      // Fallback if group not found
      setActiveChainNeighbors({ prevGroupId: null, nextGroupId: null });
      setStoryId(groupId);
      setStoryIndexParam("0");
    }
  };

  // Handle close viewer (removes URL params and clears chain neighbors)
  const handleCloseViewer = () => {
    setActiveChainNeighbors(null);
    setStoryId(null, { history: "replace" });
    setStoryIndexParam(null, { history: "replace" });
  };

  // Handle navigation between groups (uses replace to avoid history pollution)
  // Calculate and set initial index for the new group
  // Note: Neighbors remain from the original chain (stored at open time)
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

      // Update neighbors for the new group (still within same chain)
      const neighbors = getNeighborsForGroup(groupId);
      setActiveChainNeighbors(neighbors);

      setStoryId(groupId, { history: "replace" });
      setStoryIndexParam(startIndex.toString(), { history: "replace" });
    } else {
      // Fallback if group not found
      setActiveChainNeighbors({ prevGroupId: null, nextGroupId: null });
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
                index={index}
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
            encodedDestination={encodedDestination}
            isCrawler={isCrawler}
            modelName={modelName}
            modelImage={modelImage}
            modelSlug={modelSlug}
            modelId={modelId}
            isVerified={isVerified}
            nextGroupId={activeChainNeighbors?.nextGroupId ?? undefined}
            prevGroupId={activeChainNeighbors?.prevGroupId ?? undefined}
            onNavigate={handleNavigate}
            disableLongPress={true}
            initialStoryIndex={initialStoryIndex}
          />
        );
      })()}
    </>
  );
}
