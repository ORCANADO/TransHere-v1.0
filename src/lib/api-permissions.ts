import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, validateOrganizationAccess } from './auth-utils';
import { validateOrganizationKey } from './organization-auth';
import type { AuthContext } from '@/types/auth';

export interface PermissionCheckResult {
    authorized: boolean;
    authContext: AuthContext | null;
    error?: string;
}

export async function checkAdminPermission(
    request: NextRequest,
    adminKey?: string
): Promise<PermissionCheckResult> {
    // Check admin key first (legacy support)
    const keyFromUrl = request.nextUrl.searchParams.get('key');
    const effectiveKey = adminKey || keyFromUrl;

    if (!effectiveKey) {
        // Check authenticated user
        const authContext = await getAuthContext();

        if (!authContext) {
            return {
                authorized: false,
                authContext: null,
                error: 'Unauthorized: No valid authentication',
            };
        }

        return {
            authorized: true,
            authContext,
        };
    }

    // Check against global admin keys
    const globalAdminKeys = [
        process.env.ADMIN_SECRET_KEY,
        process.env.ADMIN_KEY
    ].filter(Boolean);

    if (globalAdminKeys.includes(effectiveKey)) {
        return {
            authorized: true,
            authContext: {
                userRole: 'admin',
                organizationId: null,
                organizationName: null,
                isAdmin: true,
                canManageContent: true,
                canManageModels: true,
                canEditModelInfo: true,
            },
        };
    }

    // Check organization API key
    const organization = await validateOrganizationKey(effectiveKey);
    if (organization) {
        return {
            authorized: true,
            authContext: {
                userRole: 'organization',
                organizationId: organization.id,
                organizationName: organization.name,
                isAdmin: false,
                canManageContent: false,
                canManageModels: false,
                canEditModelInfo: true,
            },
        };
    }

    return {
        authorized: false,
        authContext: null,
        error: 'Unauthorized: Invalid API key',
    };
}

export async function checkContentManagementPermission(
    request: NextRequest,
    adminKey?: string
): Promise<PermissionCheckResult> {
    const result = await checkAdminPermission(request, adminKey);

    if (!result.authorized || !result.authContext) {
        return result;
    }

    // Check if user can manage content (gallery, stories, etc.)
    if (!result.authContext.canManageContent) {
        return {
            authorized: false,
            authContext: result.authContext,
            error: 'Forbidden: Content management requires admin access',
        };
    }

    return result;
}

export async function checkModelAccess(
    request: NextRequest,
    modelOrganizationId: string | null,
    adminKey?: string
): Promise<PermissionCheckResult> {
    const result = await checkAdminPermission(request, adminKey);

    if (!result.authorized || !result.authContext) {
        return result;
    }

    // Admins can access all models
    if (result.authContext.isAdmin) {
        return result;
    }

    // Organization users can only access their organization's models
    if (!validateOrganizationAccess(result.authContext, modelOrganizationId)) {
        return {
            authorized: false,
            authContext: result.authContext,
            error: 'Forbidden: Model does not belong to your organization',
        };
    }

    return result;
}

export function createErrorResponse(error: string, status: number = 403) {
    return NextResponse.json({ success: false, error }, { status });
}
