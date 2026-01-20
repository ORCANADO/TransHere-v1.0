'use client'

import { useEffect } from 'react'

const isBot = (): boolean => {
    if (typeof navigator === 'undefined') return true

    const botPatterns = [
        /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
        /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
        /whatsapp/i, /telegrambot/i, /discordbot/i,
        /googlebot/i, /bingbot/i, /yandex/i, /baiduspider/i,
        /bytespider/i, /gptbot/i,
    ]

    const ua = navigator.userAgent
    return botPatterns.some(pattern => pattern.test(ua))
}

const PRECONNECT_DOMAINS = [
    'https://onlyfans.com',
    'https://www.onlyfans.com',
    'https://fansly.com',
    'https://www.fansly.com',
]

interface PreconnectHintsProps {
    priority?: boolean  // If true, use 'preconnect', else 'dns-prefetch'
}

export default function PreconnectHints({ priority = true }: PreconnectHintsProps) {
    useEffect(() => {
        // Skip for bots/crawlers
        if (isBot()) {
            console.log('[PreconnectHints] Skipped for bot user agent')
            return
        }

        // Skip if already injected
        if (document.querySelector('link[data-preconnect-hints]')) {
            return
        }

        // Inject preconnect links into <head>
        const fragment = document.createDocumentFragment()

        PRECONNECT_DOMAINS.forEach((domain) => {
            // Preconnect link (DNS + TCP + TLS)
            const preconnect = document.createElement('link')
            preconnect.rel = priority ? 'preconnect' : 'dns-prefetch'
            preconnect.href = domain
            preconnect.crossOrigin = 'anonymous'
            preconnect.setAttribute('data-preconnect-hints', 'true')
            fragment.appendChild(preconnect)
        })

        document.head.appendChild(fragment)

        console.log(`[PreconnectHints] Injected ${PRECONNECT_DOMAINS.length} preconnect hints`)

        // Cleanup on unmount (optional, links are harmless)
        return () => {
            document.querySelectorAll('link[data-preconnect-hints]').forEach(el => el.remove())
        }
    }, [priority])

    // Render nothing - this component only has side effects
    return null
}

export { PreconnectHints }
