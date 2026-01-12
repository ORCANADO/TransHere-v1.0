"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to listen for new story uploads and refresh the page automatically
 * Uses Supabase Realtime subscriptions (free tier) to detect INSERT events
 * on stories and story_groups tables
 */
export function useStoriesRealtime() {
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const supabase = createClient();

    // Subscribe to story_groups table changes (new groups created)
    const storyGroupsChannel = supabase
      .channel("story-groups-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "story_groups",
        },
        (payload) => {
          console.log("New story group created:", payload.new);
          // Refresh the page to show new stories
          router.refresh();
        }
      )
      .subscribe();

    // Subscribe to stories table changes (new stories added)
    const storiesChannel = supabase
      .channel("stories-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stories",
        },
        (payload) => {
          console.log("New story added:", payload.new);
          // Refresh the page to show new stories
          router.refresh();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(storyGroupsChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, [router]);
}
