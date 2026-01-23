export interface TelemetryData {
    slug: string
    modelId: string | null
    isCrawler: boolean
    userAgent: string
    ip: string
    country: string
    city: string
    referrer: string
    timestamp: string
}

export function captureTelemetry(
    slug: string,
    modelId: string | null,
    headersList: Headers,
    debugBypass: boolean = false
): TelemetryData {
    return {
        slug,
        modelId,
        isCrawler: debugBypass ? false : headersList.get('x-is-crawler') === 'true',
        userAgent: headersList.get('user-agent') || 'unknown',
        ip: headersList.get('cf-connecting-ip') ||
            headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            'unknown',
        country: headersList.get('cf-ipcountry') ||
            headersList.get('x-user-country') ||
            'unknown',
        city: headersList.get('cf-ipcity') ||
            headersList.get('x-user-city') ||
            'unknown',
        referrer: headersList.get('referer') || 'direct',
        timestamp: new Date().toISOString(),
    }
}

const IS_DEV = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

export async function logBridgeView(
    telemetry: TelemetryData,
    siteUrl: string
): Promise<void> {
    // BOT FILTERING: Skip analytics for crawlers
    if (telemetry.isCrawler) {
        if (IS_DEV) console.log(`[StealthLogger:DEV] Skipped crawler: ${telemetry.userAgent.substring(0, 50)}...`);
        return;
    }

    if (IS_DEV) {
        console.log('[StealthLogger:DEV] Initiating telemetry send...');
        console.log('[StealthLogger:DEV] Payload:', JSON.stringify({
            eventType: 'bridge_view',
            modelSlug: telemetry.slug,
            country: telemetry.country,
        }, null, 2));
    }

    try {
        const response = await fetch(`${siteUrl}/api/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'bridge_view',
                modelId: telemetry.modelId,
                modelSlug: telemetry.slug,
                pagePath: `/${telemetry.slug}`,
                country: telemetry.country,
                city: telemetry.city,
                userAgent: telemetry.userAgent,
                ip: telemetry.ip,
                referrer: telemetry.referrer,
                timestamp: telemetry.timestamp,
            }),
        });

        if (!response.ok) {
            console.error(`[StealthLogger] Failed: HTTP ${response.status}`);
            if (IS_DEV) {
                const errorBody = await response.text();
                console.error('[StealthLogger:DEV] Error body:', errorBody);
            }
        } else {
            if (IS_DEV) console.log(`[StealthLogger:DEV] ✅ Success for /${telemetry.slug}`);
        }
    } catch (error) {
        console.error('[StealthLogger] Network error:', error);
    }
}

/**
 * Fire-and-forget client-side analytics using sendBeacon.
 * Safe to call immediately before navigation - browser guarantees delivery.
 */
export function beaconTrack(
    eventType: string,
    modelSlug: string,
    additionalData?: Record<string, unknown>
): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
        // Fallback for old browsers: use fetch with keepalive
        if (typeof fetch !== 'undefined') {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType,
                    modelSlug,
                    timestamp: new Date().toISOString(),
                    ...additionalData,
                }),
                keepalive: true, // Ensures request completes even after navigation
            }).catch(() => { }) // Silent fail
            return true
        }
        return false
    }

    const payload = JSON.stringify({
        eventType,
        modelSlug,
        timestamp: new Date().toISOString(),
        ...additionalData,
    })

    return navigator.sendBeacon('/api/analytics', payload)
}
