import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);

  // 1. Try standard Cloudflare header
  // 2. Try Vercel/Next compatibility header
  // 3. Fallback to 'Unknown'
  let city = request.headers.get('cf-ipcity') || request.headers.get('x-vercel-ip-city') || 'Unknown';

  // Decode URI components in case the city has special chars (e.g. São Paulo)
  try {
    city = decodeURIComponent(city);
  } catch (e) {
    // Keep original if decode fails
  }

  // Force Dev Fallback
  if (city === 'Unknown' && process.env.NODE_ENV === 'development') {
    city = 'Miami';
  }

  // Extract Country
  let country = request.headers.get('cf-ipcountry') || 'XX';

  // Dev Fallback: Set to 'US' for English testing (or 'CO' for Spanish testing)
  if (country === 'XX' && process.env.NODE_ENV === 'development') {
    country = 'US'; // Change to 'CO' to test Spanish
  }

  // Inject standardized headers
  requestHeaders.set('x-user-city', city);
  requestHeaders.set('x-user-country', country);

  // Log for debugging (Check Cloudflare Logs)
  console.log(`Middleware Geo: ${city}, Country: ${country}`);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // Match all routes except API, static assets, and images
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

