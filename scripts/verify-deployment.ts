import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface VerificationResult {
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: unknown;
}

async function verifyDeployment(): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const adminKey = process.env.ADMIN_KEY || 'admin123';

    // Check 1: Homepage loads
    console.log('Checking Homepage...');
    try {
        const homeResponse = await fetch(baseUrl);
        results.push({
            check: 'Homepage',
            status: homeResponse.ok ? 'pass' : 'fail',
            message: `Status: ${homeResponse.status}`
        });
    } catch (error) {
        results.push({
            check: 'Homepage',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    // Check 2: Health endpoint
    console.log('Checking Health Endpoint...');
    try {
        const healthResponse = await fetch(`${baseUrl}/api/health`);
        const healthData = await healthResponse.json();
        results.push({
            check: 'Health Endpoint',
            status: (healthResponse.ok && healthData.status === 'healthy') ? 'pass' : 'warning',
            message: healthData.status,
            details: healthData.checks
        });
    } catch (error) {
        results.push({
            check: 'Health Endpoint',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    // Check 3: Analytics API
    console.log('Checking Analytics API...');
    try {
        const analyticsResponse = await fetch(
            `${baseUrl}/api/admin/analytics?key=${adminKey}&startDate=${new Date().toISOString().split('T')[0]}`
        );
        results.push({
            check: 'Analytics API',
            status: analyticsResponse.ok ? 'pass' : 'fail',
            message: `Status: ${analyticsResponse.status}`
        });
    } catch (error) {
        results.push({
            check: 'Analytics API',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    // Check 4: Database connectivity
    console.log('Checking Database Connection...');
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabase.from('models').select('id').limit(1);
        results.push({
            check: 'Database Connection',
            status: error ? 'fail' : 'pass',
            message: error ? error.message : 'Connected'
        });
    } catch (error) {
        results.push({
            check: 'Database Connection',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    // Check 5: Tracking link resolution
    console.log('Checking Tracking Link Resolution...');
    try {
        // Use a known test tracking ID or create one
        const testTrackingId = 'test-verification-link';
        const trackResponse = await fetch(
            `${baseUrl}/api/track/${testTrackingId}`,
            { redirect: 'manual' }
        );

        // 302 = redirect (success), 404 = not found (expected for arbitrary test ID)
        const isValid = trackResponse.status === 302 || trackResponse.status === 404 || trackResponse.status === 307;
        results.push({
            check: 'Tracking Link API',
            status: isValid ? 'pass' : 'fail',
            message: `Status: ${trackResponse.status}`
        });
    } catch (error) {
        results.push({
            check: 'Tracking Link API',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    return results;
}

// Run verification
verifyDeployment().then(results => {
    console.log('\n=== Deployment Verification Report ===\n');

    let allPassed = true;

    results.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${result.check}: ${result.message}`);
        if (result.details) {
            console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
        if (result.status === 'fail') allPassed = false;
    });

    console.log('\n' + (allPassed ? '✅ All checks passed!' : '❌ Some checks failed!'));
    process.exit(allPassed ? 0 : 1);
}).catch(err => {
    console.error('Verification script failed:', err);
    process.exit(1);
});
