import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function refresh() {
    console.log('Refreshing views...');
    const { data, error } = await supabase.rpc('refresh_analytics_views');
    if (error) console.error('Error:', error);
    else console.log('Success:', data);
}

refresh();
