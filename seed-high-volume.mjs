import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'BR', 'CA', 'AU', 'JP', 'ES', 'IT'];
const EVENT_TYPES = ['page_view', 'link_click'];

async function getModels() {
    const { data } = await supabase.from('models').select('id, slug');
    return data || [];
}

async function getTrackingLinks() {
    const { data } = await supabase.from('tracking_links').select('id');
    return data || [];
}

async function seedHighVolume() {
    console.log('🚀 Starting high-volume seed (100,000 records)...');
    const models = await getModels();
    const trackingLinks = await getTrackingLinks();

    if (models.length === 0) {
        console.error('❌ No models found to seed against.');
        return;
    }

    const batchSize = 1000;
    const totalRecords = 200000;
    const totalBatches = totalRecords / batchSize;

    const now = new Date();

    for (let b = 0; b < totalBatches; b++) {
        const events = [];
        for (let i = 0; i < batchSize; i++) {
            // Random date in Jan 2026 (since that's our main partition)
            const day = Math.floor(Math.random() * 19) + 1; // Jan 1 to Jan 19 inclusive
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const date = new Date(`2026-01-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`);

            const model = models[Math.floor(Math.random() * models.length)];
            // 70% chance of a tracking link, 30% organic (null)
            const hasTracking = Math.random() > 0.3 && trackingLinks.length > 0;
            const tLinkId = hasTracking ? trackingLinks[Math.floor(Math.random() * trackingLinks.length)].id : null;

            events.push({
                event_type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
                model_id: model.id,
                model_slug: model.slug,
                country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
                tracking_link_id: tLinkId,
                created_at: date.toISOString(),
            });
        }

        const { error } = await supabase.from('analytics_events').insert(events);
        if (error) {
            console.error(`❌ Error in batch ${b}:`, error.message);
            break;
        }

        if (b % 10 === 0) {
            console.log(`📦 Inserted ${((b + 1) * batchSize).toLocaleString()} records...`);
        }
    }

    console.log('✅ High-volume seed complete!');
}

seedHighVolume().catch(console.error);
