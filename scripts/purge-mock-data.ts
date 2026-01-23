/**
 * TRANSHERE v1.1 - Mock Data Purge Utility
 *
 * PURPOSE: Safely wipe analytics data while preserving structural entities
 * EXECUTION: npx tsx scripts/purge-mock-data.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function purgeMockData() {
  console.log('🧹 Starting mock data purge...\n');

  // Step 1: Truncate analytics_events (CASCADE not needed - no FK references TO it)
  console.log('1. Truncating analytics_events...');
  const { error: eventsError } = await supabase.rpc('truncate_analytics_events');
  // Fallback if RPC doesn't exist - use raw SQL via REST
  if (eventsError) {
    const { error } = await supabase.from('analytics_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Failed to clear analytics_events: ${error.message}`);
  }
  console.log('   ✓ analytics_events cleared');

  // Step 2: Truncate tracking_link_clicks
  console.log('2. Truncating tracking_link_clicks...');
  const { error: clicksError } = await supabase
    .from('tracking_link_clicks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (clicksError) throw new Error(`Failed to clear tracking_link_clicks: ${clicksError.message}`);
  console.log('   ✓ tracking_link_clicks cleared');

  // Step 3: Reset click_count on all tracking_links
  console.log('3. Resetting click_count on tracking_links...');
  const { error: resetError } = await supabase
    .from('tracking_links')
    .update({ click_count: 0 })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (resetError) throw new Error(`Failed to reset click_count: ${resetError.message}`);
  console.log('   ✓ tracking_links.click_count reset to 0');

  // Step 4: Verify models and organizations are intact
  console.log('4. Verifying entity preservation...');
  const { count: modelCount } = await supabase
    .from('models')
    .select('*', { count: 'exact', head: true });
  const { count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });
  console.log(`   ✓ Models preserved: ${modelCount}`);
  console.log(`   ✓ Organizations preserved: ${orgCount}`);

  console.log('\n✅ Purge complete. Database ready for fresh mock data.\n');
}

purgeMockData().catch(console.error);