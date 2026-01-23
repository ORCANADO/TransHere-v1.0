/**
 * TRANSHERE v1.1 - Analytics View Refresh
 * 
 * PURPOSE: Refresh materialized views after data injection
 * EXECUTION: npx tsx scripts/refresh-analytics-views.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// Use environment variables for Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function refreshAnalyticsViews() {
    console.log('🔄 Refreshing analytics materialized views...\n');
    const startTime = Date.now();

    try {
        // Step 1: Refresh via RPC
        console.log('1. Calling refresh_analytics_views RPC...');
        const { data, error } = await supabase.rpc('refresh_analytics_views');

        if (error) {
            // Fallback: Manual refresh commands
            console.log('   ⚠ RPC failed, attempting manual refresh...');

            // Note: These may need to be run directly in Supabase SQL editor
            // if the client doesn't have permission
            throw new Error(`RPC failed: ${error.message}. Run manual SQL refresh.`);
        }

        console.log('   ✓ Views refreshed successfully');

        // Step 2: Update system_config timestamp
        console.log('\n2. Updating refresh timestamp...');
        const { error: configError } = await supabase
            .from('system_config')
            .upsert({
                key: 'analytics_last_refresh',
                value: {
                    timestamp: new Date().toISOString(),
                    duration_ms: Date.now() - startTime,
                    status: 'success',
                },
            }, { onConflict: 'key' });

        if (configError) {
            console.log(`   ⚠ Failed to update timestamp: ${configError.message}`);
        } else {
            console.log('   ✓ Timestamp updated');
        }

        // Step 3: Verify view data
        console.log('\n3. Verifying materialized view data...');

        const { count: dailyCount, error: dailyError } = await supabase
            .from('analytics_daily_stats')
            .select('*', { count: 'exact', head: true });

        if (dailyError) console.error('Error fetching daily stats:', dailyError.message);

        const { count: hourlyCount, error: hourlyError } = await supabase
            .from('analytics_hourly_stats')
            .select('*', { count: 'exact', head: true });

        if (hourlyError) console.error('Error fetching hourly stats:', hourlyError.message);

        console.log(`   ✓ analytics_daily_stats: ${dailyCount} rows`);
        console.log(`   ✓ analytics_hourly_stats: ${hourlyCount} rows`);

        // Step 4: Verify totals match
        console.log('\n4. Verifying data integrity...');

        // Total raw events in the last 365 days (matching daily stats range)
        const { count: rawTotal, error: rawError } = await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

        if (rawError) console.error('Error fetching raw events:', rawError.message);

        // Fetch all rows from daily stats using pagination
        let allDailyTotals: any[] = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        console.log(`   Fetching all rows from analytics_daily_stats in chunks of ${PAGE_SIZE}...`);
        while (hasMore) {
            const { data, error } = await supabase
                .from('analytics_daily_stats')
                .select('views, clicks, total_events')
                .range(from, from + PAGE_SIZE - 1);

            if (error) {
                console.error('Error fetching daily totals:', error.message);
                hasMore = false;
                break;
            }

            if (data && data.length > 0) {
                allDailyTotals = [...allDailyTotals, ...data];
                from += PAGE_SIZE;
                if (data.length < PAGE_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        const dailyViews = allDailyTotals.reduce((sum, r) => sum + (r.views || 0), 0);
        const dailyClicks = allDailyTotals.reduce((sum, r) => sum + (r.clicks || 0), 0);
        const dailyTotalEventsColumn = allDailyTotals.reduce((sum, r) => sum + (r.total_events || 0), 0);

        console.log(`   Raw events (last 365d): ${rawTotal}`);
        console.log(`   Daily stats (total rows: ${allDailyTotals.length})`);
        console.log(`     Views: ${dailyViews}, Clicks: ${dailyClicks}, Sum: ${dailyViews + dailyClicks}`);
        console.log(`     total_events column sum: ${dailyTotalEventsColumn}`);

        if (rawTotal === dailyTotalEventsColumn) {
            console.log('   ✅ Data integrity check passed: View total matches raw events.');
        } else {
            console.log('   ⚠ Data integrity check: Count mismatch.');
            console.log(`     Difference: ${Math.abs((rawTotal || 0) - dailyTotalEventsColumn)}`);
        }

        const duration = Date.now() - startTime;
        console.log(`\n✅ Refresh complete in ${duration}ms`);

    } catch (err) {
        console.error('❌ Refresh failed:', err);

        // Provide manual SQL fallback
        console.log('\n📋 Manual SQL (run in Supabase SQL Editor):');
        console.log('---');
        console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_stats;');
        console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_hourly_stats;');
        console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_source_summary;');
        console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_model_summary;');
        console.log('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_country_summary;');
        console.log('---');
    }
}

refreshAnalyticsViews().catch(console.error);
