// Script to fix and regenerate mock data with all 10 countries
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function fixAndRegenerateData() {
    console.log('🔧 Step 1: Applying country randomization fix...');

    // Read and execute the fix migration
    const migrationSQL = readFileSync(
        join(process.cwd(), 'supabase/migrations/025_fix_country_randomization.sql'),
        'utf-8'
    );

    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single();

    if (migrationError) {
        console.log('⚠️  Migration might have failed (this is okay if function already exists):', migrationError.message);
    } else {
        console.log('✅ Migration applied successfully!');
    }

    console.log('\n🗑️  Step 2: Clearing old analytics data...');

    const { error: deleteError } = await supabase
        .from('analytics_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('❌ Error clearing data:', deleteError);
    } else {
        console.log('✅ Old data cleared!');
    }

    console.log('\n🚀 Step 3: Generating new mock data with all 10 countries...');

    const { error: populateError } = await supabase.rpc('populate_mock_analytics_v3', {
        days_back: 14,
        events_per_day: 200
    });

    if (populateError) {
        console.error('❌ Error populating mock data:', populateError);
        process.exit(1);
    }

    console.log('✅ Mock data generated successfully!');

    console.log('\n📊 Step 4: Verifying country distribution...');

    const { data: countries, error: countryError } = await supabase
        .from('analytics_events')
        .select('country')
        .not('country', 'is', null);

    if (countryError) {
        console.error('❌ Error fetching countries:', countryError);
    } else {
        const uniqueCountries = [...new Set(countries?.map(e => e.country))].sort();
        console.log('✅ Unique countries in database:', uniqueCountries.length);
        console.log('🌍 Countries:', uniqueCountries);

        if (uniqueCountries.length === 10) {
            console.log('\n🎉 SUCCESS! All 10 countries are now in the database!');
        } else {
            console.log(`\n⚠️  Warning: Expected 10 countries, got ${uniqueCountries.length}`);
        }
    }
}

fixAndRegenerateData();
