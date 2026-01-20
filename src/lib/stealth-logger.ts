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
    headersList: Headers
): TelemetryData {
    return {
        slug,
        modelId,
        isCrawler: headersList.get('x-is-crawler') === 'true',
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

export async function logBridgeView(
    telemetry: TelemetryData,
    siteUrl: string
): Promise<void> {
    // BOT FILTERING: Skip analytics for crawlers
    if (telemetry.isCrawler) {
        console.log(`[StealthLogger] Skipped crawler: ${telemetry.userAgent.substring(0, 50)}...`)
        return
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
        })

        if (!response.ok) {
            console.error(`[StealthLogger] Failed: HTTP ${response.status}`)
        } else {
            console.log(`[StealthLogger] Logged bridge_view for /${telemetry.slug}`)
        }
    } catch (error) {
        // Silently fail - analytics should never break the page
        console.error('[StealthLogger] Error:', error)
    }
}
