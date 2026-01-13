import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge";

const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

export async function POST(request: Request) {
  try {
    // Security check
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || key !== ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { model_id, group_id, is_pinned, title, cover_url, media_url, media_type, duration } = body;

    if (!model_id || !media_url) {
      return NextResponse.json(
        { error: "Missing required fields: model_id and media_url" },
        { status: 400 }
      );
    }

    // Ensure media_url and cover_url are relative paths only (strip full URLs)
    // If a full URL is provided, extract just the path portion
    const normalizePath = (url: string): string => {
      if (!url) return url;
      // If it's already a relative path (no http/https), return as-is
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url;
      }
      // If it's a full URL, extract the path after the domain
      try {
        const urlObj = new URL(url);
        // Remove leading slash from pathname
        return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
      } catch {
        // If URL parsing fails, try to extract path manually
        const match = url.match(/https?:\/\/[^\/]+\/(.+)$/);
        return match ? match[1] : url;
      }
    };

    media_url = normalizePath(media_url);
    cover_url = cover_url ? normalizePath(cover_url) : media_url;

    // Log for debugging
    console.log("Story upload data:", {
      model_id,
      media_url,
      cover_url,
      original_media_url: body.media_url,
      original_cover_url: body.cover_url,
    });

    // Create admin client with service_role key (bypasses RLS)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let groupId: string;

    // If group_id is provided, use it directly (for pinned blocks)
    if (group_id) {
      // Verify the group exists and belongs to this model
      const { data: group, error: groupError } = await supabaseAdmin
        .from("story_groups")
        .select("id")
        .eq("id", group_id)
        .eq("model_id", model_id)
        .single();

      if (groupError || !group) {
        return NextResponse.json(
          { error: "Invalid group_id or group does not belong to this model" },
          { status: 400 }
        );
      }

      groupId = group.id;

      // Update the group's cover_url if a new one was provided
      if (cover_url) {
        const { error: updateError } = await supabaseAdmin
          .from("story_groups")
          .update({ cover_url })
          .eq("id", groupId);
        
        if (updateError) {
          console.warn("Warning: Failed to update cover_url on existing group:", updateError);
        }
      }
    } else {
      // Original logic: Check if a matching story group already exists
      const { data: existingGroup } = await supabaseAdmin
        .from("story_groups")
        .select("id")
        .eq("model_id", model_id)
        .eq("is_pinned", is_pinned)
        .maybeSingle();

      if (existingGroup) {
        groupId = existingGroup.id;
        
        // Update the group's cover_url if a new one was provided
        if (cover_url) {
          const { error: updateError } = await supabaseAdmin
            .from("story_groups")
            .update({ cover_url })
            .eq("id", groupId);
          
          if (updateError) {
            console.warn("Warning: Failed to update cover_url on existing group:", updateError);
          }
        }
      } else {
        // Create new story group
        const { data: newGroup, error: groupError } = await supabaseAdmin
          .from("story_groups")
          .insert({
            model_id,
            is_pinned: is_pinned || false,
            title: title || (is_pinned ? "Pinned" : null),
            cover_url: cover_url || media_url,
          })
          .select("id")
          .single();

        if (groupError) {
          console.error("Error creating story group:", groupError);
          return NextResponse.json(
            { error: "Failed to create story group", details: groupError.message },
            { status: 500 }
          );
        }
        groupId = newGroup.id;
      }
    }

    // Insert the story with explicit posted_date for reliable chronological ordering
    const { data: story, error: storyError } = await supabaseAdmin
      .from("stories")
      .insert({
        group_id: groupId,
        media_url,
        media_type: media_type || "image",
        duration: duration || 5,
        posted_date: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (storyError) {
      console.error("Error creating story:", storyError);
      return NextResponse.json(
        { error: "Failed to create story", details: storyError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      group_id: groupId,
      story_id: story.id,
    });
  } catch (error) {
    console.error("Admin stories API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
