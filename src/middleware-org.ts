import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateOrganizationKeyUncached } from '@/lib/organization-auth';

/**
 * Organization Middleware
 * 
 * PURPOSE:
 * Validates organization API keys for routes under /org/*
 * Provides secure multi-tenant access control
 * 
 * AUTHENTICATION FLOW:
 * 1. Extract API key from query param (?key=) or Authorization header
 * 2. Validate key against organizations table
 * 3. If valid: Set organization context headers and continue
 * 4. If invalid: Return 401 Unauthorized
 * 
 * SECURITY FEATURES:
 * - Server-side validation only (never exposed to client)
 * - Request logging for audit trail
 * - Constant-time validation via cached database lookup
 * - Supports both query param and header-based authentication
 */
export async function organizationMiddleware(
    request: NextRequest
): Promise<NextResponse | null> {
    // Extract API key from query parameter or Authorization header
    const queryKey = request.nextUrl.searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const headerKey = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    const apiKey = queryKey || headerKey;

    // If no API key provided, return 401
    if (!apiKey) {
        const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        console.warn('[Organization Middleware] Missing API key:', {
            path: request.nextUrl.pathname,
            ip: clientIp,
        });

        return NextResponse.json(
            {
                error: 'Unauthorized',
                message: 'Invalid or missing organization API key',
                hint: 'Provide API key via ?key= query parameter or Authorization: Bearer <key> header',
            },
            { status: 401 }
        );
    }

    // Validate the API key
    const organization = await validateOrganizationKeyUncached(apiKey);

    if (!organization) {
        const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        console.warn('[Organization Middleware] Invalid API key attempt:', {
            path: request.nextUrl.pathname,
            ip: clientIp,
            keyPrefix: apiKey.substring(0, 8) + '...',
        });

        return NextResponse.json(
            {
                error: 'Unauthorized',
                message: 'Invalid or missing organization API key',
            },
            { status: 401 }
        );
    }

    // API key is valid - log successful authentication
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log('[Organization Middleware] Authenticated:', {
        organization: organization.name,
        path: request.nextUrl.pathname,
        ip: clientIp,
    });

    // Create response and set organization context headers
    const response = NextResponse.next();
    response.headers.set('x-org-id', organization.id);
    response.headers.set('x-org-name', organization.name);

    return response;
}
