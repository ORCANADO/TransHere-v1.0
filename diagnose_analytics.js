const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('--- DATABASE DIAGNOSIS ---');

    // 1. Check if materialized view exists and has data
    const { count, error: countError } = await supabase
        .from('analytics_dashboard_summary_mv')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error checking MV count:', countError.message);
    } else {
        console.log('Materialized View Row Count:', count);
    }

    // 2. Check the date range in the MV
    const { data: rangeData, error: rangeError } = await supabase
        .from('analytics_dashboard_summary_mv')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    if (rangeError) {
        console.error('Error checking date range:', rangeError.message);
    } else if (rangeData && rangeData.length > 0) {
        console.log('Latest date in MV:', rangeData[0].date);
    } else {
        console.log('No data in MV.');
    }

    // 3. Test the RPC with the latest fixed name
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_analytics_summary_v2', {
        p_start_date: '2025-12-22',
        p_end_date: '2026-01-22',
        p_group_by: 'day'
    });

    if (rpcError) {
        console.error('RPC Execution Error:', rpcError.message);
        if (rpcError.details) console.error('Details:', rpcError.details);
    } else if (rpcData) {
        console.log('RPC return success. Rows:', rpcData.length);
        if (rpcData.length > 0) {
            console.log('First row sample:', JSON.stringify(rpcData[0], null, 2));
        }
    } else {
        console.log('RPC returned no data (null/undefined).');
    }

    // 4. Check if we need to refresh
    const { data: events, error: eventError } = await supabase
        .from('analytics_events')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (events && events.length > 0) {
        console.log('Latest event in analytics_events:', events[0].created_at);
    }
}

diagnose();
