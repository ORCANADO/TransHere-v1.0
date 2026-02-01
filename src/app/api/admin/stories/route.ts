import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkContentManagementPermission, createErrorResponse } from '@/lib/api-permissions';

export const runtime = "edge";

const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

export async function POST(request: NextRequest) {
  try {
    // Check content management permission
    const permCheck = await checkContentManagementPermission(request);
    if (!permCheck.authorized || !permCheck.authContext) {
      return createErrorResponse(permCheck.error || 'Unauthorized', 403);
    }

    const body = await request.json();
    let { model_id, group_id, is_pinned, title, cover_url, media_url, poster_url, media_type, duration } = body;

    // Organization security check: ensure model belongs to user's organization
    if (permCheck.authContext.userRole === 'organization' && permCheck.authContext.organizationId) {
      const { data: model } = await createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
        .from('models')
        .select('organization_id')
        .eq('id', model_id)
        .single();

      if (!model || model.organization_id !== permCheck.authContext.organizationId) {
        return createErrorResponse('Forbidden: Model does not belong to your organization', 403);
      }
    }

    if (!model_id || !media_url) {
      return NextResponse.json(
        { error: "Missing required fields: model_id and media_url" },
        { status: 400 }
      );
    }

    // Ensure media_url, cover_url, and poster_url are relative paths only
    const normalizePath = (url: string): string => {
      if (!url) return url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url;
      }
      try {
        const urlObj = new URL(url);
        return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
      } catch {
        const match = url.match(/https?:\/\/[^\/]+\/(.+)$/);
        return match ? match[1] : url;
      }
    };

    media_url = normalizePath(media_url);
    cover_url = cover_url ? normalizePath(cover_url) : media_url;
    poster_url = poster_url ? normalizePath(poster_url) : null;

    // Log for debugging
    console.log("Story upload data:", {
      model_id,
      media_url,
      cover_url,
      poster_url,
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
      // Use .limit(1) instead of .maybeSingle() to handle models with multiple groups
      const { data: existingGroups } = await supabaseAdmin
        .from("story_groups")
        .select("id")
        .eq("model_id", model_id)
        .eq("is_pinned", is_pinned || false)
        .order("created_at", { ascending: false })
        .limit(1);

      const existingGroup = existingGroups?.[0] || null;

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
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
