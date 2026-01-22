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
    const { model_id, media_url, media_type, poster_url, width, height } = body;

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

    if (!model_id || !media_url || !media_type) {
      return NextResponse.json(
        { error: "Missing required fields: model_id, media_url, and media_type" },
        { status: 400 }
      );
    }

    // Validate media_type
    if (media_type !== 'image' && media_type !== 'video') {
      return NextResponse.json(
        { error: "media_type must be 'image' or 'video'" },
        { status: 400 }
      );
    }

    // Normalize path (strip full URLs if provided)
    const normalizePath = (url: string | null): string | null => {
      if (!url) return null;
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

    const normalizedMediaUrl = normalizePath(media_url) || media_url;
    const normalizedPosterUrl = poster_url ? normalizePath(poster_url) : null;

    // Log for debugging
    console.log("Gallery upload data:", {
      model_id,
      media_url: normalizedMediaUrl,
      media_type,
      poster_url: normalizedPosterUrl,
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

    // Get the current max sort_order for this model
    const { data: existingItems } = await supabaseAdmin
      .from("gallery_items")
      .select("sort_order")
      .eq("model_id", model_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existingItems && existingItems.length > 0
      ? existingItems[0].sort_order + 1
      : 0;

    // Insert the gallery item
    const { data: galleryItem, error: insertError } = await supabaseAdmin
      .from("gallery_items")
      .insert({
        model_id,
        media_url: normalizedMediaUrl,
        media_type,
        poster_url: normalizedPosterUrl,
        width: width || null,
        height: height || null,
        sort_order: nextSortOrder,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting gallery item:", insertError);
      return NextResponse.json(
        { error: "Failed to insert gallery item", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gallery_item_id: galleryItem.id,
      sort_order: nextSortOrder,
    });
  } catch (error) {
    console.error("Admin gallery API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
