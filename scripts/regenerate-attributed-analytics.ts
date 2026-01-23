/**
 * TRANSHERE v1.1 - Attributed Analytics Generator
 * 
 * PURPOSE: Generate analytics events WITH proper source attribution
 * EXECUTION: npx tsx scripts/regenerate-attributed-analytics.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const DAYS_TO_GENERATE = 21;
const EVENTS_PER_DAY = 3000;
const BATCH_SIZE = 1000;

// Source distribution (must match tracking_sources table)
const SOURCE_DISTRIBUTION = [
    { name: 'Instagram', weight: 0.35 },
    { name: 'X', weight: 0.25 },
    { name: 'Reddit', weight: 0.15 },
    { name: 'Model Directory', weight: 0.10 },
    { name: null, weight: 0.15 }, // Organic (no tracking link)
];

// Country distribution
const COUNTRIES = [
    { country: 'US', city: 'Miami', weight: 0.20 },
    { country: 'US', city: 'Los Angeles', weight: 0.10 },
    { country: 'US', city: 'New York', weight: 0.10 },
    { country: 'CO', city: 'Medellín', weight: 0.15 },
    { country: 'CO', city: 'Bogotá', weight: 0.05 },
    { country: 'MX', city: 'Mexico City', weight: 0.10 },
    { country: 'MX', city: 'Guadalajara', weight: 0.10 },
    { country: 'BR', city: 'São Paulo', weight: 0.08 },
    { country: 'AR', city: 'Buenos Aires', weight: 0.07 },
    { country: 'ES', city: 'Madrid', weight: 0.05 },
];

function weightedRandom<T extends { weight: number }>(items: T[]): Omit<T, 'weight'> {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
        random -= item.weight;
        if (random <= 0) {
            const { weight, ...rest } = item;
            return rest as Omit<T, 'weight'>;
        }
    }

    const { weight, ...last } = items[items.length - 1];
    return last as Omit<T, 'weight'>;
}

async function regenerateAttributedAnalytics() {
    console.log('🚀 Regenerating Attributed Analytics\n');

    // Step 1: Clear existing events
    console.log('1. Clearing existing analytics_events...');
    const { error: deleteError } = await supabase
        .from('analytics_events')
        .delete()
        .gte('created_at', '2020-01-01');

    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
    console.log('   ✓ Cleared');

    // Step 2: Fetch models
    console.log('\n2. Fetching models...');
    const { data: models, error: modelsError } = await supabase
        .from('models')
        .select('id, slug');

    if (modelsError || !models?.length) {
        throw new Error('No models found');
    }
    console.log(`   ✓ Found ${models.length} models`);

    // Step 3: Fetch tracking links with source info
    console.log('\n3. Fetching tracking links...');
    const { data: trackingLinks, error: linksError } = await supabase
        .from('tracking_links')
        .select(`
      id,
      model_id,
      source_id,
      tracking_sources:source_id(name)
    `)
        .eq('is_active', true);

    if (linksError) {
        console.warn('   ⚠ No tracking links found, will generate organic-only data');
    }
    console.log(`   ✓ Found ${trackingLinks?.length || 0} tracking links`);

    // Build model -> source -> link mapping
    type LinkInfo = { id: string; source_id: string; source_name: string };
    const modelSourceLinks = new Map<string, Map<string, LinkInfo[]>>();

    (trackingLinks || []).forEach((link: any) => {
        const sourceName = link.tracking_sources?.name || 'Unknown';

        if (!modelSourceLinks.has(link.model_id)) {
            modelSourceLinks.set(link.model_id, new Map());
        }

        const sourceMap = modelSourceLinks.get(link.model_id)!;
        if (!sourceMap.has(sourceName)) {
            sourceMap.set(sourceName, []);
        }

        sourceMap.get(sourceName)!.push({
            id: link.id,
            source_id: link.source_id,
            source_name: sourceName,
        });
    });

    // Step 4: Generate events
    console.log('\n4. Generating events...');
    const events: any[] = [];
    const today = new Date();

    for (let dayOffset = DAYS_TO_GENERATE; dayOffset >= 0; dayOffset--) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);

        // Weekend boost
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const dayEvents = isWeekend ? Math.floor(EVENTS_PER_DAY * 1.3) : EVENTS_PER_DAY;

        for (let i = 0; i < dayEvents; i++) {
            const model = models[Math.floor(Math.random() * models.length)];
            const geo = weightedRandom(COUNTRIES);
            const sourceData = weightedRandom(SOURCE_DISTRIBUTION);

            // Determine event type (80% views, 5% clicks, 15% story views)
            const rand = Math.random();
            const eventType = rand < 0.80 ? 'page_view' : rand < 0.85 ? 'link_click' : 'story_view';

            // Find tracking link for this model + source combination
            let trackingLinkId: string | null = null;
            let sourceId: string | null = null;

            if (sourceData.name) {
                const modelLinks = modelSourceLinks.get(model.id);
                if (modelLinks) {
                    const sourceLinks = modelLinks.get(sourceData.name);
                    if (sourceLinks && sourceLinks.length > 0) {
                        const link = sourceLinks[Math.floor(Math.random() * sourceLinks.length)];
                        trackingLinkId = link.id;
                        sourceId = link.source_id;
                    }
                }
            }

            // Generate timestamp
            const hour = Math.random() < 0.6
                ? Math.floor(Math.random() * 6) + 18
                : Math.floor(Math.random() * 24);
            const timestamp = new Date(date);
            timestamp.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

            events.push({
                id: randomUUID(),
                event_type: eventType,
                model_id: model.id,
                model_slug: model.slug,
                tracking_link_id: trackingLinkId,
                source_id: sourceId,
                subtag_id: null,
                is_tracking_visit: !!trackingLinkId,
                page_path: `/model/${model.slug}`,
                country: geo.country,
                city: geo.city,
                referrer: trackingLinkId ? `https://${sourceData.name?.toLowerCase()}.com/` : null,
                user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
                created_at: timestamp.toISOString(),
            });
        }
    }

    console.log(`   ✓ Generated ${events.length.toLocaleString()} events`);

    // Step 5: Batch insert
    console.log('\n5. Inserting events...');
    let inserted = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('analytics_events').insert(batch);

        if (error) {
            console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE)} failed: ${error.message}`);
        } else {
            inserted += batch.length;
        }

        if ((Math.floor(i / BATCH_SIZE) + 1) % 20 === 0) {
            console.log(`   Progress: ${inserted.toLocaleString()} / ${events.length.toLocaleString()}`);
        }
    }

    // Step 6: Verify attribution
    console.log('\n6. Verifying attribution...');
    const { data: verification } = await supabase
        .from('analytics_events')
        .select('source_id, tracking_link_id')
        .limit(10000);

    const withSource = verification?.filter(e => e.source_id !== null).length || 0;
    const withLink = verification?.filter(e => e.tracking_link_id !== null).length || 0;
    const total = verification?.length || 0;

    console.log(`   • Events with source_id: ${withSource} (${((withSource / total) * 100).toFixed(1)}%)`);
    console.log(`   • Events with tracking_link: ${withLink} (${((withLink / total) * 100).toFixed(1)}%)`);

    console.log('\n✅ Complete! Now run: npx tsx scripts/refresh-analytics-views.ts');
}

regenerateAttributedAnalytics().catch(console.error);
