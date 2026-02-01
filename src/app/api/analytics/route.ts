import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ✅ CRITICAL: This tells Cloudflare to run this on the Edge
export const runtime = 'edge';

// Admin key for authentication (matches frontend)
const ADMIN_KEY = process.env.ADMIN_KEY;

// Max retries for database insertions
const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

async function recordEventWithRetry(
  supabase: any,
  eventData: any,
  retries = 0
): Promise<boolean> {
  try {
    const { error } = await supabase.from('analytics_events').insert(eventData);
    if (error) throw error;
    return true;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      // Exponential backoff or simple delay
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return recordEventWithRetry(supabase, eventData, retries + 1);
    }
    console.error(`[Analytics] Failed to record event after ${MAX_RETRIES} retries:`, error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // 1. Handle both JSON and plain text (sendBeacon default)
    const contentType = request.headers.get('content-type') || ''
    let body: any

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // sendBeacon or ping attribute sends as text/plain or similar
      const text = await request.text()
      try {
        body = text === 'PING' ? {} : JSON.parse(text)
      } catch (e) {
        body = {}
      }
    }

    // 2. Merge data from query parameters (crucial for native 'ping' attribute)
    const { searchParams } = new URL(request.url)
    const queryData: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryData[key] = value
    })

    const payload = { ...body, ...queryData }

    const {
      modelId,
      eventType,
      modelSlug,
      pagePath
    } = payload;

    // Validate required fields (eventType is required)
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
    const country = (countryHeader && countryHeader.length === 2) ? countryHeader.toUpperCase() : null;

    // Extract additional headers
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // Get page path from request or body
    const currentPagePath = pagePath || new URL(request.url).pathname;

    // Use direct Supabase client for Edge compatibility
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

    const eventData = {
      model_id: modelId || null,
      event_type: eventType,
      model_slug: modelSlug || null,
      page_path: currentPagePath,
      city: city,
      country: country,
      referrer: referrer,
      user_agent: userAgent,
    };

    // Use retry logic for reliability
    const success = await recordEventWithRetry(supabase, eventData);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Database insertion failed after retries' },
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
