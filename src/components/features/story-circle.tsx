"use client";

import Image from "next/image";
import { StoryGroup } from "@/types";
import { cn, getImageUrl } from "@/lib/utils";
import { useViewedStories } from "@/hooks/use-viewed-stories";

interface StoryCircleProps {
  group: StoryGroup;
  onClick: () => void;
  index?: number;
}

export function StoryCircle({ group, onClick, index }: StoryCircleProps) {
  const { hasUnseenStories } = useViewedStories();
  const coverUrl = getImageUrl(group.cover_url);
  const displayTitle = group.title || "Recent";
  
  // For recent (non-pinned) groups, check if ALL stories have been seen
  // For pinned groups, always show as "viewed" (gray ring) since they don't have the seen dynamic
  const isGroupViewed = group.is_pinned ? true : !hasUnseenStories(group.stories || []);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 hover:scale-105 active:scale-95 transition-all duration-300"
      aria-label={`View ${displayTitle} stories`}
    >
      {/* Ring Container - iOS Glass style with Visual Memory */}
      <div
        className={cn(
          "w-[76px] h-[76px] rounded-full p-[2.5px] transition-all duration-300 shadow-lg",
          // Viewed stories: Glass gray ring
          isGroupViewed && "bg-white/20 shadow-black/20",
          // Unviewed + Recent (not pinned): Electric Emerald to Rich Gold gradient with glow
          !isGroupViewed && "bg-gradient-to-tr from-[#00FF85] via-[#D4AF37] to-[#7A27FF] shadow-[0_0_15px_rgba(0,255,133,0.4)]"
        )}
      >
        {/* Glass border container */}
        <div className="w-full h-full rounded-full p-[2px] bg-background/90 backdrop-blur-sm">
          {/* Image Circle with glass overlay */}
          <div className="relative w-full h-full rounded-full overflow-hidden bg-card backdrop-blur-sm border border-white/10">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={displayTitle}
                fill
                className="w-full h-full object-cover rounded-full"
                sizes="72px"
                priority={index !== undefined && index < 5}
                placeholder="empty"
                quality={60}
              />
            ) : (
              // Fallback gradient: Cyber Violet to Electric Emerald with glass effect
              <div className="w-full h-full bg-gradient-to-br from-[#7A27FF] to-[#00FF85] flex items-center justify-center rounded-full">
                <span className="text-white text-xl font-bold drop-shadow-lg">
                  {displayTitle.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title Text - Glass pill */}
      <span className="text-xs text-center w-20 truncate text-foreground/80 px-2 py-0.5 rounded-full bg-white/5 backdrop-blur-sm">
        {displayTitle}
      </span>
    </button>
  );
}
