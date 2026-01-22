
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log('Checking tracking_links columns...');
    const { data, error } = await supabase
        .from('tracking_links')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching tracking_links:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No data in tracking_links to infer columns.');
    }

    console.log('Checking if RPC functions exist...');
    // This is a trick to check if function exists by calling it with invalid params
    const { error: rpcError } = await supabase.rpc('get_analytics_summary_v2', {});
    console.log('RPC check result:', rpcError ? rpcError.message : 'Existed (but failed params)');
}

checkSchema();
