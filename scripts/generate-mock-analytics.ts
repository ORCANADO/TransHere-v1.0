/**
 * TRANSHERE v1.1 - Probabilistic Analytics Generator
 *
 * PURPOSE: Generate 50k+ realistic analytics events with proper distributions
 * EXECUTION: npx tsx scripts/generate-mock-analytics.ts
 *
 * DISTRIBUTIONS:
 * - Event Types: 80% page_view, 5% link_click, 15% story_view
 * - Countries: 40% US, 20% CO, 20% MX, 20% Other
 * - Daily Volume: 1500-4000 events (weekends +30%)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const DAYS_TO_GENERATE = 21;
const MIN_DAILY_EVENTS = 1500;
const MAX_DAILY_EVENTS = 4000;
const BATCH_SIZE = 1000;

// Geographic distribution (weighted)
const COUNTRY_WEIGHTS = [
  { country: 'US', city: 'Miami', weight: 0.15 },
  { country: 'US', city: 'Los Angeles', weight: 0.12 },
  { country: 'US', city: 'New York', weight: 0.08 },
  { country: 'US', city: 'Houston', weight: 0.05 },
  { country: 'CO', city: 'Medellín', weight: 0.10 },
  { country: 'CO', city: 'Bogotá', weight: 0.07 },
  { country: 'CO', city: 'Cali', weight: 0.03 },
  { country: 'MX', city: 'Mexico City', weight: 0.08 },
  { country: 'MX', city: 'Guadalajara', weight: 0.07 },
  { country: 'MX', city: 'Monterrey', weight: 0.05 },
  { country: 'BR', city: 'São Paulo', weight: 0.05 },
  { country: 'AR', city: 'Buenos Aires', weight: 0.04 },
  { country: 'ES', city: 'Madrid', weight: 0.03 },
  { country: 'CL', city: 'Santiago', weight: 0.03 },
  { country: 'PE', city: 'Lima', weight: 0.03 },
  { country: 'VE', city: 'Caracas', weight: 0.02 },
] as const;

// Event type distribution
const EVENT_TYPE_WEIGHTS = [
  { type: 'page_view' as const, weight: 0.80 },
  { type: 'story_view' as const, weight: 0.15 },
  { type: 'link_click' as const, weight: 0.05 },
];

// User agents for realism
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/17.0',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
];

// Referrer distribution
const REFERRERS = [
  'https://www.instagram.com/',
  'https://twitter.com/',
  'https://x.com/',
  'https://www.reddit.com/',
  null, // Direct traffic
  null,
  null,
];

interface Model {
  id: string;
  slug: string;
  name: string;
}

interface TrackingLink {
  id: string;
  model_id: string;
  source_id: string;
  subtag_id: string | null;
}

function weightedRandom<T extends { weight: number }>(items: readonly T[]): Omit<T, 'weight'> {
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

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTimestamp(date: Date): string {
  // Random time during the day, weighted toward evening hours (higher engagement)
  const hour = Math.random() < 0.6
    ? Math.floor(Math.random() * 6) + 18 // 6PM - midnight (60%)
    : Math.floor(Math.random() * 24);    // Any hour (40%)
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  const timestamp = new Date(date);
  timestamp.setHours(hour, minute, second, Math.floor(Math.random() * 1000));
  return timestamp.toISOString();
}

async function generateMockAnalytics() {
  console.log('📊 Starting analytics generation...\n');

  // Fetch models and tracking links
  console.log('1. Fetching models and tracking links...');
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('id, slug, name');

  if (modelsError || !models?.length) {
    throw new Error(`No models found: ${modelsError?.message}`);
  }
  console.log(`   ✓ Found ${models.length} models`);

  const { data: trackingLinks, error: linksError } = await supabase
    .from('tracking_links')
    .select('id, model_id, source_id, subtag_id')
    .eq('is_active', true);

  if (linksError) {
    throw new Error(`Failed to fetch tracking links: ${linksError.message}`);
  }
  console.log(`   ✓ Found ${trackingLinks?.length || 0} tracking links`);

  // Build model -> tracking links map
  const modelLinksMap = new Map<string, TrackingLink[]>();
  (trackingLinks || []).forEach(link => {
    const existing = modelLinksMap.get(link.model_id!) || [];
    existing.push(link as TrackingLink);
    modelLinksMap.set(link.model_id!, existing);
  });

  // Generate events
  console.log('\n2. Generating events...');
  const allEvents: any[] = [];
  let totalViews = 0;
  let totalClicks = 0;
  let totalStoryViews = 0;

  const today = new Date();

  for (let dayOffset = DAYS_TO_GENERATE; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // Weekend boost
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseVolume = Math.floor(
      Math.random() * (MAX_DAILY_EVENTS - MIN_DAILY_EVENTS) + MIN_DAILY_EVENTS
    );
    const dailyVolume = isWeekend
      ? Math.floor(baseVolume * 1.3)
      : baseVolume;

    for (let i = 0; i < dailyVolume; i++) {
      const model = randomElement(models);
      const geo = weightedRandom(COUNTRY_WEIGHTS);
      const eventTypeData = weightedRandom(EVENT_TYPE_WEIGHTS);
      const eventType = eventTypeData.type;

      // Get tracking link for this model (if available)
      const modelLinks = modelLinksMap.get(model.id) || [];
      const useTrackingLink = modelLinks.length > 0 && Math.random() < 0.6; // 60% attributed
      const trackingLink = useTrackingLink ? randomElement(modelLinks) : null;

      const event = {
        id: randomUUID(),
        event_type: eventType,
        model_id: model.id,
        model_slug: model.slug,
        tracking_link_id: trackingLink?.id || null,
        source_id: trackingLink?.source_id || null,
        subtag_id: trackingLink?.subtag_id || null,
        is_tracking_visit: !!trackingLink,
        page_path: eventType === 'story_view'
          ? `/?story=${randomUUID().slice(0, 8)}`
          : `/model/${model.slug}`,
        country: geo.country,
        city: geo.city,
        referrer: randomElement(REFERRERS),
        user_agent: randomElement(USER_AGENTS),
        created_at: generateTimestamp(date),
      };

      allEvents.push(event);

      // Track stats
      if (eventType === 'page_view') totalViews++;
      else if (eventType === 'link_click') totalClicks++;
      else if (eventType === 'story_view') totalStoryViews++;
    }

    if ((DAYS_TO_GENERATE - dayOffset + 1) % 7 === 0) {
      console.log(`   Day ${DAYS_TO_GENERATE - dayOffset + 1}/${DAYS_TO_GENERATE + 1}: ${dailyVolume} events`);
    }
  }

  console.log(`\n   Total events generated: ${allEvents.length.toLocaleString()}`);
  console.log(`   - Page Views: ${totalViews.toLocaleString()} (${((totalViews/allEvents.length)*100).toFixed(1)}%)`);
  console.log(`   - Story Views: ${totalStoryViews.toLocaleString()} (${((totalStoryViews/allEvents.length)*100).toFixed(1)}%)`);
  console.log(`   - Link Clicks: ${totalClicks.toLocaleString()} (${((totalClicks/allEvents.length)*100).toFixed(1)}%)`);

  // Batch insert
  console.log('\n3. Inserting events in batches...');
  let inserted = 0;

  for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
    const batch = allEvents.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('analytics_events')
      .insert(batch);

    if (error) {
      console.error(`   ⚠ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed: ${error.message}`);
    } else {
      inserted += batch.length;
    }

    // Progress update every 10 batches
    if ((Math.floor(i/BATCH_SIZE) + 1) % 10 === 0) {
      console.log(`   Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allEvents.length/BATCH_SIZE)}: ${inserted.toLocaleString()} inserted`);
    }
  }

  // Also update tracking_links click counts to reflect generated data
  console.log('\n4. Syncing tracking_links click counts...');
  const clickCounts = new Map<string, number>();
  allEvents.filter(e => e.event_type === 'link_click' && e.tracking_link_id).forEach(e => {
    clickCounts.set(e.tracking_link_id, (clickCounts.get(e.tracking_link_id) || 0) + 1);
  });

  for (const [linkId, count] of clickCounts.entries()) {
    await supabase
      .from('tracking_links')
      .update({ click_count: count })
      .eq('id', linkId);
  }

  console.log(`\n✅ Analytics generation complete!`);
  console.log(`   Inserted: ${inserted.toLocaleString()} events`);
  console.log(`   Click Rate: ${((totalClicks/totalViews)*100).toFixed(2)}% (target: <5%)`);

  return { totalEvents: inserted, totalViews, totalClicks, totalStoryViews };
}

generateMockAnalytics().catch(console.error);