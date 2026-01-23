/**
 * TRANSHERE v1.1 - Source Attribution Diagnostic
 * 
 * PURPOSE: Identify why source filters return 0 results
 * EXECUTION: npx tsx scripts/diagnose-source-attribution.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseAttribution() {
    console.log('🔍 TRANSHERE Source Attribution Diagnostic\n');
    console.log('='.repeat(60) + '\n');

    // 1. Check tracking_sources table
    console.log('1️⃣  TRACKING SOURCES TABLE:');
    const { data: sources, error: sourcesError } = await supabase
        .from('tracking_sources')
        .select('id, name, slug');

    if (sourcesError) {
        console.error('   ❌ Error:', sourcesError.message);
    } else {
        console.log('   Found:', sources?.length || 0, 'sources');
        sources?.forEach(s => {
            console.log(`   • ID: ${s.id.slice(0, 8)}... | Name: "${s.name}" | Slug: "${s.slug}"`);
        });
    }

    // 2. Check tracking_links table
    console.log('\n2️⃣  TRACKING LINKS TABLE:');
    const { data: links, error: linksError } = await supabase
        .from('tracking_links')
        .select('id, source_id, model_id, slug')
        .limit(20);

    if (linksError) {
        console.error('   ❌ Error:', linksError.message);
    } else {
        console.log('   Found:', links?.length || 0, 'links (showing first 20)');

        // Group by source_id
        const bySource = new Map<string, number>();
        links?.forEach(l => {
            const count = bySource.get(l.source_id) || 0;
            bySource.set(l.source_id, count + 1);
        });

        console.log('   Links per source_id:');
        bySource.forEach((count, sourceId) => {
            const sourceName = sources?.find(s => s.id === sourceId)?.name || 'Unknown';
            console.log(`   • ${sourceName}: ${count} links`);
        });
    }

    // 3. Check analytics_events.source_id distribution
    console.log('\n3️⃣  ANALYTICS_EVENTS SOURCE DISTRIBUTION:');
    const { data: eventSources, error: eventsError } = await supabase
        .from('analytics_events')
        .select('source_id, tracking_link_id')
        .limit(10000);

    if (eventsError) {
        console.error('   ❌ Error:', eventsError.message);
    } else {
        const sourceIdCounts = new Map<string | null, number>();
        const trackingLinkCounts = new Map<string | null, number>();

        eventSources?.forEach(e => {
            sourceIdCounts.set(e.source_id, (sourceIdCounts.get(e.source_id) || 0) + 1);
            trackingLinkCounts.set(e.tracking_link_id, (trackingLinkCounts.get(e.tracking_link_id) || 0) + 1);
        });

        console.log('   Events by source_id:');
        sourceIdCounts.forEach((count, sourceId) => {
            const sourceName = sourceId ? sources?.find(s => s.id === sourceId)?.name : 'NULL';
            console.log(`   • ${sourceName || sourceId?.slice(0, 8) || 'NULL'}: ${count.toLocaleString()} events`);
        });

        console.log('\n   Events by tracking_link_id:');
        const nullCount = trackingLinkCounts.get(null) || 0;
        const nonNullCount = (eventSources?.length || 0) - nullCount;
        console.log(`   • NULL (organic): ${nullCount.toLocaleString()} events`);
        console.log(`   • With tracking_link: ${nonNullCount.toLocaleString()} events`);
    }

    // 4. Check analytics_daily_stats.traffic_source values
    console.log('\n4️⃣  ANALYTICS_DAILY_STATS TRAFFIC_SOURCE VALUES:');
    const { data: dailyStats, error: dailyError } = await supabase
        .from('analytics_daily_stats')
        .select('traffic_source')
        .limit(5000);

    if (dailyError) {
        console.error('   ❌ Error:', dailyError.message);
    } else {
        const trafficSourceCounts = new Map<string, number>();
        dailyStats?.forEach(d => {
            trafficSourceCounts.set(d.traffic_source, (trafficSourceCounts.get(d.traffic_source) || 0) + 1);
        });

        console.log('   Unique traffic_source values:', trafficSourceCounts.size);
        console.log('   Top 10 values:');
        Array.from(trafficSourceCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([value, count]) => {
                // Check if it's a UUID or a slug
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
                const label = isUUID
                    ? `UUID: ${value.slice(0, 8)}...`
                    : `Slug: "${value}"`;
                console.log(`   • ${label}: ${count} rows`);
            });
    }

    // 5. Test the exact filter resolution logic
    console.log('\n5️⃣  FILTER RESOLUTION TEST:');
    console.log('   Testing: "Instagram" filter');

    // Simulate what the API does
    const sourceIdToName = new Map<string, string>();
    sources?.forEach(s => sourceIdToName.set(s.id, s.name));

    const nameToLinkIds = new Map<string, string[]>();
    links?.forEach(link => {
        const name = sourceIdToName.get(link.source_id) || 'Unknown';
        const ids = nameToLinkIds.get(name) || [];
        ids.push(link.id);
        nameToLinkIds.set(name, ids);
    });

    // Test lookups
    const testNames = ['Instagram', 'instagram', 'X', 'Twitter/X', 'Direct', 'direct'];
    testNames.forEach(name => {
        const ids = nameToLinkIds.get(name) || [];
        const status = ids.length > 0 ? '✓' : '✗';
        console.log(`   ${status} "${name}" → ${ids.length} tracking link IDs`);
    });

    // 6. Recommendation
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60));

    const hasNullSourceIds = eventSources?.some(e => e.source_id === null);
    const hasTrackingLinks = links && links.length > 0;
    const trafficSourceIsUUID = dailyStats?.some(d =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.traffic_source)
    );

    if (!hasTrackingLinks) {
        console.log('⚠️  No tracking links exist! Mock data cannot be attributed to sources.');
        console.log('   → Run: npx tsx scripts/setup-tracking-entities.ts');
    }

    if (hasNullSourceIds) {
        console.log('⚠️  Many events have NULL source_id. Check mock data generator.');
    }

    if (trafficSourceIsUUID) {
        console.log('✓  traffic_source contains UUIDs (tracking_link_id format)');
        console.log('   → API must map source names to tracking_link_ids');
    } else {
        console.log('⚠️  traffic_source may contain slugs or unexpected values');
        console.log('   → Check materialized view definition');
    }
}

diagnoseAttribution().catch(console.error);
