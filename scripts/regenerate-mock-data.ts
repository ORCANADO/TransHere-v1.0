// Script to regenerate mock data after applying the fix
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function regenerateData() {
    console.log('🗑️  Step 1: Clearing old analytics data...');

    const { error: deleteError } = await supabase
        .from('analytics_events')
        .delete()
        .gte('created_at', '2000-01-01');

    if (deleteError) {
        console.error('❌ Error clearing data:', deleteError);
        process.exit(1);
    }

    const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
        console.error(`❌ Data not cleared! ${count} records still exist.`);
        process.exit(1);
    }

    console.log('✅ Old data cleared!');

    console.log('\n🚀 Step 2: Generating new mock data with all 10 countries...');

    const { error: populateError } = await supabase.rpc('populate_mock_analytics_v3', {
        days_back: 14,
        events_per_day: 500
    });

    if (populateError) {
        console.error('❌ Error populating mock data:', populateError);
        process.exit(1);
    }

    console.log('✅ Mock data generated successfully!');

    console.log('\n📊 Step 3: Verifying country distribution...');

    const { data: countries, error: countryError } = await supabase
        .from('analytics_events')
        .select('country')
        .not('country', 'is', null)
        .limit(10000);

    if (countryError) {
        console.error('❌ Error fetching countries:', countryError);
    } else {
        const counts: Record<string, number> = {};
        countries?.forEach(r => counts[r.country] = (counts[r.country] || 0) + 1);
        const uniqueCountries = Object.keys(counts).sort();
        console.log('✅ Unique countries in database:', uniqueCountries.length);
        console.log('🌍 Distribution:', counts);

        if (uniqueCountries.length >= 8) {
            console.log('\n🎉 SUCCESS! Country distribution looks good!');
        } else {
            console.log(`\n⚠️  Warning: Expected ~10 countries, got ${uniqueCountries.length}`);
            console.log('💡 You may need to apply migration 025_fix_country_randomization.sql in Supabase SQL Editor');
        }
    }
}

regenerateData();
