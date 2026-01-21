import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { after } from 'next/server';

export const runtime = 'edge';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const headersList = await headers();
    const supabase = await createClient();

    // 1. Find the tracking link
    // Note: We use the expanded schema with destination_url
    const { data: link, error } = await supabase
        .from('tracking_links')
        .select('*, model:models(slug)')
        .eq('slug', slug)
        .eq('is_active', true)
        .is('is_archived', false)
        .single();

    if (error || !link) {
        return new NextResponse('Tracking link not found or inactive', { status: 404 });
    }

    // 2. Determine destination
    let destinationUrl = link.destination_url;

    // Fallback to internal model page if no destination_url provided
    if (!destinationUrl && link.model?.slug) {
        const internalUrl = new URL(`/model/${link.model.slug}`, request.url);
        internalUrl.searchParams.set('ref', slug);
        destinationUrl = internalUrl.toString();
    }

    if (!destinationUrl) {
        return new NextResponse('Destination URL not configured', { status: 400 });
    }

    // 3. Log the click asynchronously using after() to not block the redirect
    after(async () => {
        try {
            // Get visitor info
            const ip = headersList.get('x-forwarded-for') || 'unknown';
            const userAgent = headersList.get('user-agent') || 'unknown';
            const referrer = headersList.get('referer') || headersList.get('referrer') || 'direct';

            // Cloudflare Geolocation headers (available in Edge runtime)
            const country = headersList.get('cf-ipcountry') || 'unknown';
            const city = headersList.get('cf-ipcity') || 'unknown';

            // Log to tracking_link_clicks table
            await supabase.from('tracking_link_clicks').insert({
                tracking_link_id: link.id,
                ip_address: ip.split(',')[0], // Get first IP in case of proxy
                user_agent: userAgent,
                referrer: referrer,
                country: country,
                city: city
            });

            // Increment click count on the link itself
            // This uses the function we updated in migration 028
            await supabase.rpc('increment_tracking_link_clicks', { link_id: link.id });

            console.log(`[Tracking] Logged click for ${slug} from ${country}`);
        } catch (err) {
            console.error('[Tracking] Error logging click:', err);
        }
    });

    // 4. Perform the redirect
    return NextResponse.redirect(destinationUrl, 307);
}
