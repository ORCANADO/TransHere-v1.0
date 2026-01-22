import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { ModelFormData, ModelWithCounts } from '@/types/admin';
import { checkAdminPermission, createErrorResponse } from '@/lib/api-permissions';

export const runtime = 'edge';

// GET - List all models with counts
export async function GET(request: NextRequest) {
  // Check admin permission
  const permCheck = await checkAdminPermission(request);
  if (!permCheck.authorized) {
    return createErrorResponse(permCheck.error || 'Unauthorized', 403);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const organizationId = url.searchParams.get('organization_id');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Build base query
  let query = supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by organization for non-admin users
  if (permCheck.authContext?.userRole === 'organization' && permCheck.authContext.organizationId) {
    query = query.eq('organization_id', permCheck.authContext.organizationId);
  } else if (organizationId) {
    // Admin can filter by specific organization
    query = query.eq('organization_id', organizationId);
  }

  if (search) {
    // Use or() with ilike for case-insensitive search on name or slug
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data: models, error } = await query;

  if (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!models || models.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  // Get counts for each model
  const modelsWithCounts: ModelWithCounts[] = await Promise.all(
    models.map(async (model: any) => {
      // Get gallery count
      const { count: galleryCount } = await supabase
        .from('gallery_items')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.id);

      // Get story count (count stories in all groups for this model)
      const { data: storyGroups } = await supabase
        .from('story_groups')
        .select('id')
        .eq('model_id', model.id);

      let storyCount = 0;
      if (storyGroups && storyGroups.length > 0) {
        const groupIds = storyGroups.map(g => g.id);
        const { count: storiesCount } = await supabase
          .from('stories')
          .select('*', { count: 'exact', head: true })
          .in('group_id', groupIds);
        storyCount = storiesCount || 0;
      }

      return {
        id: model.id,
        name: model.name,
        slug: model.slug,
        image_url: model.image_url,
        bio: model.bio,
        bio_es: model.bio_es,
        is_verified: model.is_verified || false,
        is_new: model.is_new || false,
        is_pinned: model.is_pinned || false,
        social_link: model.social_link,
        tags: model.tags || [],
        organization_id: model.organization_id,
        created_at: model.created_at,
        updated_at: model.updated_at,
        gallery_count: galleryCount || 0,
        story_count: storyCount,
      };
    })
  );

  return NextResponse.json({ success: true, data: modelsWithCounts });
}

// POST - Create new model
export async function POST(request: NextRequest) {
  // Check admin permission
  const permCheck = await checkAdminPermission(request);
  if (!permCheck.authorized || !permCheck.authContext) {
    return createErrorResponse(permCheck.error || 'Unauthorized', 403);
  }

  // Only admins can create models by default, or if we want to allow orgs?
  // For now, let's stick to the permissions defined in auth-utils/api-permissions
  if (!permCheck.authContext.canManageModels) {
    return createErrorResponse('Forbidden: You do not have permission to create models', 403);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const body: ModelFormData = await request.json();

    // Generate slug from name if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // For organization users, force their organization_id
    const finalOrganizationId = permCheck.authContext.userRole === 'organization'
      ? permCheck.authContext.organizationId
      : body.organization_id;

    const { data, error } = await supabase
      .from('models')
      .insert({
        name: body.name,
        slug,
        bio: body.bio,
        bio_es: body.bio_es || null,
        tags: body.tags,
        social_link: body.social_link,
        image_url: body.image_url,
        is_verified: body.is_verified || false,
        is_new: body.is_new !== undefined ? body.is_new : true,
        is_pinned: body.is_pinned || false,
        organization_id: finalOrganizationId
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Invalid request'
    }, { status: 400 });
  }
}
