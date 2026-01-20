import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { after } from 'next/server'
import { getProfileBySlug } from '@/lib/supabase/queries'
import BridgeAirlock from '@/components/features/bridge-airlock'

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

    const destinationUrl = profile.social_link || 'https://onlyfans.com'
    const encodedDestination = Buffer.from(destinationUrl).toString('base64')

    after(async () => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/analytics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'bridge_view',
                    modelSlug: slug,
                    pagePath: `/${slug}`,
                    timestamp: new Date().toISOString(),
                }),
            })
        } catch (error) {
            console.error('[BridgePage] Analytics error:', error)
        }
    })

    return (
        <main className="min-h-screen bg-background">
            <BridgeAirlock
                encodedDestination={encodedDestination}
                profileName={profile.name}
                avatarUrl={profile.image_url}
            />
        </main>
    )
}
