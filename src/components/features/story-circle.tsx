"use client";

import Image from "next/image";
import { StoryGroup } from "@/types";
import { cn, getImageUrl } from "@/lib/utils";

interface StoryCircleProps {
  group: StoryGroup;
  onClick: () => void;
}

export function StoryCircle({ group, onClick }: StoryCircleProps) {
  const coverUrl = getImageUrl(group.cover_url);
  const displayTitle = group.title || "Recent";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
      aria-label={`View ${displayTitle} stories`}
    >
      {/* Ring Container - Nocturnal Palette */}
      <div
        className={cn(
          "w-[72px] h-[72px] rounded-full p-[2px]",
          // Gradient ring for Recent (not pinned): Electric Emerald to Rich Gold
          !group.is_pinned && "bg-gradient-to-tr from-[#00FF85] via-[#D4AF37] to-[#7A27FF]",
          // Muted ring for Pinned stories
          group.is_pinned && "bg-muted-foreground/40"
        )}
      >
        {/* Border container with background bleed-through */}
        <div className="w-full h-full rounded-full p-[2px] bg-background">
          {/* Image Circle */}
          <div className="relative w-full h-full rounded-full overflow-hidden bg-muted">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={displayTitle}
                fill
                className="w-full h-full object-cover rounded-full"
                sizes="72px"
                unoptimized
              />
            ) : (
              // Fallback gradient: Cyber Violet to Electric Emerald
              <div className="w-full h-full bg-gradient-to-br from-[#7A27FF] to-[#00FF85] flex items-center justify-center rounded-full">
                <span className="text-white text-xl font-bold">
                  {displayTitle.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title Text */}
      <span className="text-xs text-center w-20 truncate text-muted-foreground">
        {displayTitle}
      </span>
    </button>
  );
}
