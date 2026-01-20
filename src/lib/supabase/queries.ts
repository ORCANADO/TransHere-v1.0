import { createClient } from '@/lib/supabase/client'

export interface BridgeProfile {
    slug: string
    name: string
    image_url: string
    social_link: string | null
    is_verified: boolean
}

export async function getProfileBySlug(slug: string): Promise<BridgeProfile | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('models')
        .select('slug, name, image_url, social_link, is_verified')
        .eq('slug', slug)
        .single()

    if (error || !data) {
        console.error('[getProfileBySlug] Error:', error?.message || 'Profile not found')
        return null
    }

    return data as BridgeProfile
}
