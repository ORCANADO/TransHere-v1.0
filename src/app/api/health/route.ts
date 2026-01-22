export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: {
        database: { status: 'ok' | 'error'; latency?: number; error?: string };
        analytics: { status: 'ok' | 'error'; recordCount?: number; error?: string };
    };
}

export async function GET() {
    const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
            database: { status: 'ok' },
            analytics: { status: 'ok' }
        }
    };

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Check database connectivity & latency
    const dbStart = Date.now();
    try {
        const { error } = await supabase
            .from('models')
            .select('id')
            .limit(1);

        health.checks.database.latency = Date.now() - dbStart;

        if (error) {
            health.checks.database.status = 'error';
            health.checks.database.error = error.message;
            health.status = 'degraded';
        }
    } catch (error) {
        health.checks.database.status = 'error';
        health.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
        health.status = 'unhealthy';
    }

    // 2. Check analytics data ingestion (last 24h)
    try {
        const { count, error } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        health.checks.analytics.recordCount = count || 0;

        if (error) {
            health.checks.analytics.status = 'error';
            health.checks.analytics.error = error.message;
            if (health.status === 'healthy') health.status = 'degraded';
        }
    } catch (error) {
        health.checks.analytics.status = 'error';
        health.checks.analytics.error = error instanceof Error ? error.message : 'Unknown error';
        if (health.status === 'healthy') health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
}
