const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verify() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Testing get_analytics_summary_v2...');
    const { data, error } = await supabase.rpc('get_analytics_summary_v2', {
        p_start_date: '2025-12-22',
        p_end_date: '2026-01-21',
        p_group_by: 'day'
    });

    if (error) {
        console.error('RPC Error:', error);
    } else if (!data) {
        console.log('No data returned.');
    } else {
        console.log('RPC worked, data length:', data.length);
        console.log('First 2 periods:', JSON.stringify(data.slice(0, 2), null, 2));
    }
}

verify();
