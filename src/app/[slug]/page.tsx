import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { getProfileBySlug } from '@/lib/supabase/queries'
import BridgeAirlock from '@/components/features/bridge-airlock'
import { PreconnectHints } from '@/components/features/preconnect-hints'

interface PageProps {
    params: Promise<{ slug: string }>
}

export const runtime = 'edge'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const profile = await getProfileBySlug(slug)

    if (!profile) {
        return {
            title: 'Profile Not Found | TransHere',
            robots: { index: false, follow: false },
        }
    }

    return {
        title: `${profile.name} | Social Hub`,
        description: 'Exclusive Content & Verified Links. Age-restricted content.',
        robots: {
            index: false,
            follow: false,
            googleBot: {
                index: false,
                follow: false,
                'max-image-preview': 'none',
                'max-snippet': -1,
            },
        },
        openGraph: {
            title: `${profile.name} | TransHere`,
            description: 'View exclusive content from verified creators.',
            type: 'profile',
            images: profile.image_url ? [{ url: profile.image_url }] : [],
        },
    }
}

export default async function BridgePage({ params }: PageProps) {
    const { slug } = await params

    const profile = await getProfileBySlug(slug)

    if (!profile) {
        notFound()
    }

    // === STEALTH TELEMETRY: Capture headers BEFORE after() ===
    // Headers must be read synchronously before the response is sent
    const headersList = await headers()

    const telemetryData = {
        // Core identifiers
        slug: slug,
        modelId: profile.id || null,

        // Bot detection (set by middleware in Phase 1)
        isCrawler: headersList.get('x-is-crawler') === 'true',

        // User identification (privacy-conscious)
        userAgent: headersList.get('user-agent') || 'unknown',
        ip: headersList.get('cf-connecting-ip') ||
            headersList.get('x-forwarded-for')?.split(',')[0] ||
            'unknown',

        // Geolocation (from Cloudflare)
        country: headersList.get('cf-ipcountry') ||
            headersList.get('x-user-country') ||
            'unknown',
        city: headersList.get('cf-ipcity') ||
            headersList.get('x-user-city') ||
            'unknown',

        // Traffic source
        referrer: headersList.get('referer') || 'direct',

        // Timestamp
        timestamp: new Date().toISOString(),
    }

    const destinationUrl = profile.social_link || 'https://onlyfans.com'
    const encodedDestination = Buffer.from(destinationUrl).toString('base64')

    // === NON-BLOCKING ANALYTICS: Fires AFTER response is sent ===
    after(async () => {
        // BOT FILTERING: Skip analytics for crawlers
        if (telemetryData.isCrawler) {
            console.log(`[Analytics] Skipped crawler: ${telemetryData.userAgent.substring(0, 50)}...`)
            return
        }

        try {
            // Log to Supabase analytics table
            const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/analytics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'bridge_view',
                    modelId: telemetryData.modelId,
                    modelSlug: telemetryData.slug,
                    pagePath: `/${telemetryData.slug}`,
                    country: telemetryData.country,
                    city: telemetryData.city,
                    userAgent: telemetryData.userAgent,
                    ip: telemetryData.ip,
                    referrer: telemetryData.referrer,
                    timestamp: telemetryData.timestamp,
                }),
            })

            if (!response.ok) {
                console.error(`[Analytics] Failed to log: ${response.status}`)
            }
        } catch (error) {
            // Silently fail - analytics should never break the page
            console.error('[Analytics] Error:', error)
        }
    })

    return (
        <main className="min-h-screen bg-background">
            <PreconnectHints priority={true} />
            <BridgeAirlock
                encodedDestination={encodedDestination}
                profileName={profile.name}
                avatarUrl={profile.image_url}
            />
        </main>
    )
}
