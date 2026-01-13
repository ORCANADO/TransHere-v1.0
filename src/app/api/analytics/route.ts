import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ✅ CRITICAL: This tells Cloudflare to run this on the Edge
export const runtime = 'edge';

// Admin key for authentication (matches frontend)
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      modelId, 
      eventType, 
      modelSlug, 
      pagePath 
    } = body;

    // Validate required fields (modelId and eventType are required)
    if (!eventType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: eventType' },
        { status: 400 }
      );
    }

    // Extract geolocation from headers (prefer middleware headers, fallback to Cloudflare/Vercel)
    const cityHeader = request.headers.get('x-user-city') 
      || request.headers.get('cf-ipcity') 
      || request.headers.get('x-vercel-ip-city');
    const countryHeader = request.headers.get('x-user-country')
      || request.headers.get('cf-ipcountry') 
      || request.headers.get('x-vercel-ip-country');
    
    // Decode city to handle special characters (e.g., São Paulo)
    let city: string | null = null;
    if (cityHeader) {
      try {
        city = decodeURIComponent(cityHeader);
      } catch (e) {
        // If decode fails, use original value
        city = cityHeader;
      }
    }

    // Validate country: must be exactly 2 characters (e.g., 'US', 'CO')
    // Set to null if invalid to avoid breaking database constraint
    const country = (countryHeader && countryHeader.length === 2) ? countryHeader.toUpperCase() : null;

    // Extract additional headers
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;
    const userAgent = request.headers.get('user-agent') || null;
    
    // Get page path from request or body
    const currentPagePath = pagePath || new URL(request.url).pathname;

    // Use direct Supabase client for Edge compatibility (no cookies needed for anon access)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: insertError } = await supabase.from('analytics_events').insert({
      model_id: modelId || null,
      event_type: eventType,
      model_slug: modelSlug || null,
      page_path: currentPagePath,
      city: city,
      country: country,
      referrer: referrer,
      user_agent: userAgent,
    });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Security check: Verify admin key from URL search params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key || key !== ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase admin client with service_role key for full access
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

    // Fetch all analytics events
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
