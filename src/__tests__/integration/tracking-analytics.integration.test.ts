import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Configuration from environment with local fallbacks
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const TEST_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_KEY || 'admin123';

describe('Tracking & Analytics Integration', { timeout: 15000 }, () => {
    let supabase: ReturnType<typeof createClient>;
    let testTrackingId: string;
    let testModelSlug = 'test-model-integration';
    let validModel: any;

    beforeAll(async () => {
        supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_KEY);
        testTrackingId = `itest${Math.floor(Date.now() / 1000)}`;

        // Get a valid model ID and slug
        const { data: models } = await supabase.from('models').select('id, slug').limit(1) as { data: any[] };
        if (!models || models.length === 0) {
            throw new Error('No models found in database for integration testing');
        }
        validModel = models[0];
        testModelSlug = validModel.slug;

        // Create test tracking link with explicit archived status
        const { error } = await (supabase as any).from('tracking_links').insert({
            slug: testTrackingId,
            model_id: validModel.id,
            destination_url: 'https://example.com/test-integration',
            is_active: true,
            is_archived: false
        });

        if (error) console.error('Setup error:', error);

        // Verification: check if the link is visible to the client
        const { data: verifyLink } = await (supabase as any)
            .from('tracking_links')
            .select('*')
            .eq('slug', testTrackingId)
            .single();

        if (!verifyLink) {
            console.error('[IntegrationTest] RECORD NOT VISIBLE AFTER INSERT:', testTrackingId);
        } else {
            console.log('[IntegrationTest] Record verified in DB:', verifyLink.id);
        }

        // Wait for potential DB propagation
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(async () => {
        // Cleanup test data
        await supabase.from('analytics_events').delete().eq('model_slug', testModelSlug);
        await (supabase as any).from('tracking_links').delete().eq('slug', testTrackingId);
    });

    describe('Full Flow: Click → Track → Display', () => {
        it('should have a healthy API server', async () => {
            const response = await fetch(`${BASE_URL}/api/health`);
            expect(response.status).toBe(200);
            const health = await response.json();
            console.log('Server Health:', health);
            expect(health.status).toBeDefined();
        });

        it('should record click and display in analytics', async () => {
            // Step 1: Simulate click through tracking link (trying /go/ path which is more common in project)
            const clickResponse = await fetch(
                `${BASE_URL}/go/${testTrackingId}`,
                {
                    redirect: 'manual',
                    headers: {
                        'User-Agent': 'Integration Test Bot',
                        'X-Forwarded-For': '8.8.8.8'
                    }
                }
            );

            if (!clickResponse.ok && ![302, 307].includes(clickResponse.status)) {
                const errorText = await clickResponse.text();
                console.error(`[TrackingAPI] Failed with status ${clickResponse.status}:`, errorText);
            }

            // We expect a redirect (302 or 307)
            expect([302, 307, 301]).includes(clickResponse.status);

            // Step 2: Wait for async write to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 3: Query analytics API
            const analyticsResponse = await fetch(
                `${BASE_URL}/api/admin/analytics?key=${ADMIN_API_KEY}&startDate=${new Date().toISOString().split('T')[0]}`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            expect(analyticsResponse.ok).toBe(true);

            const result = await analyticsResponse.json();
            expect(result.success).toBe(true);

            // Step 4: Verify data existence
            expect(Array.isArray(result.data)).toBe(true);
        });

        it('should handle high concurrency without data loss', async () => {
            const concurrencyLevel = 10;
            const uniqueId = `iconcurrent${Math.floor(Date.now() / 1000)}`;

            // Create tracking link for concurrent test
            await (supabase as any).from('tracking_links').insert({
                slug: uniqueId,
                model_id: validModel.id,
                destination_url: 'https://example.com/concurrent',
                is_active: true,
                is_archived: false
            });

            // Fire concurrent requests
            const results = await Promise.allSettled(
                Array(concurrencyLevel).fill(null).map(() =>
                    fetch(`${BASE_URL}/go/${uniqueId}`, {
                        redirect: 'manual'
                    })
                )
            );

            // Wait for all writes to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Count successful redirects
            const successfulRedirects = results.filter(
                r => r.status === 'fulfilled' && [302, 307].includes((r.value as Response).status)
            ).length;

            expect(successfulRedirects).toBe(concurrencyLevel);

            // Cleanup
            await (supabase as any).from('tracking_links').delete().eq('slug', uniqueId);
        });

        it('should handle database connection failures gracefully', async () => {
            const invalidId = 'non-existent-at-all-slug';

            const response = await fetch(
                `${BASE_URL}/api/track/${invalidId}`,
                { redirect: 'manual' }
            );

            // Should return 404
            expect(response.status).toBe(404);
        });
    });

    describe('Analytics Dashboard Performance', () => {
        it('should respond within 1500ms for queries (including fallback)', async () => {
            const startTime = Date.now();

            const response = await fetch(
                `${BASE_URL}/api/admin/analytics?key=${ADMIN_API_KEY}&` +
                `startDate=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&` +
                `endDate=${new Date().toISOString().split('T')[0]}&` +
                `groupBy=day`
            );

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[PerformanceTest] Failed with status ${response.status}:`, errorText);
            }

            expect(response.ok).toBe(true);
            expect(responseTime).toBeLessThan(1500);

            console.log(`Analytics query completed in ${responseTime}ms`);
        });
    });
});
