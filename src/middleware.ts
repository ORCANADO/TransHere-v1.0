import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Phase 1: The Sentry - Bot Detection & Security Headers
 * 
 * Identifies social media crawlers and sets security policies at the edge.
 * Runs before all Server Components to enable conditional rendering logic.
 */
export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();

  // Extract User-Agent
  const userAgent = request.headers.get('user-agent') || '';

  // Comprehensive crawler detection pattern
  const crawlerPattern = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegram|snapchat|tiktok|bytespider|prerender|lighthouse|gtmetrix|pingdom/i;

  // Default to not a crawler
  let isCrawler = false;

  // Test User-Agent against pattern
  if (crawlerPattern.test(userAgent)) {
    isCrawler = true;
  }

  // Cloudflare reverse DNS verification - whitelist legitimate crawlers
  const cfVerifiedBot = request.headers.get('cf-verified-bot');

  // If Cloudflare verified this as a legitimate bot (Google, Bing), do NOT tag as crawler
  if (cfVerifiedBot) {
    isCrawler = false;
  }

  // Set custom header for downstream Server Components to detect crawlers
  if (isCrawler) {
    response.headers.set('x-is-crawler', '1');
  }

  // Security headers (applied to all responses)
  // Prevents clickjacking: site cannot be embedded in iframes on untrusted origins
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Prevents MIME type sniffing attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Strict referrer policy: only send origin on cross-origin requests
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// Matcher configuration: run middleware on all routes EXCEPT static assets and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (SEO file)
     * - *.webp, *.jpg, *.jpeg, *.png, *.gif, *.svg (static images)
     * - /api/* (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:webp|jpg|jpeg|png|gif|svg|ico)$|api).*)',
  ],
};
