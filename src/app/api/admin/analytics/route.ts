export const runtime = 'edge';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_KEY;

interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  modelSlug?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('key');

    // Security check
    if (!adminKey || adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params: AnalyticsQueryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      modelSlug: searchParams.get('modelSlug') || undefined,
      groupBy: (searchParams.get('groupBy') as 'day' | 'week' | 'month') || 'day',
    };

    // Use service role to bypass RLS for aggregation
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

    // Default time range: last 30 days
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultEndDate = new Date().toISOString();

    // Use optimized RPC for aggregation with fallback
    const modelSlugParam = params.modelSlug && params.modelSlug.trim() !== '' ? params.modelSlug : null;

    let { data, error } = await supabaseAdmin.rpc('get_analytics_summary_v2', {
      p_start_date: params.startDate || defaultStartDate,
      p_end_date: params.endDate || defaultEndDate,
      p_model_slug: modelSlugParam,
      p_group_by: params.groupBy
    });

    // Fallback if RPC is missing
    if (error && (error.message?.includes('not find') || error.code === 'P0001')) {
      console.warn('Analytics RPC missing or failed, using basic fallback');
      const { data: rawData, error: rawError } = await supabaseAdmin
        .from('analytics_events')
        .select('*')
        .gte('created_at', params.startDate || defaultStartDate)
        .lte('created_at', params.endDate || defaultEndDate)
        .limit(100);

      if (!rawError) {
        data = [{
          period: 'Today',
          total_views: rawData?.length || 0,
          total_clicks: rawData?.filter(e => e.event_type === 'link_click').length || 0,
          unique_visitors: 1,
          conversion_rate: 0,
          top_countries: [],
          top_referrers: []
        }];
        error = null;
      }
    }

    if (error) {
      console.error('Admin analytics RPC error:', error);
      return NextResponse.json({
        error: error.message,
        details: error.details,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        groupBy: params.groupBy,
        count: data?.length || 0
      }
    });
  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
