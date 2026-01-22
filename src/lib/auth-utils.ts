import { createClient } from '@/lib/supabase/server';
import type { AuthContext, UserRole } from '@/types/auth';

export async function getAuthContext(adminKey?: string): Promise<AuthContext | null> {
    const supabase = await createClient();

    // Check if using admin key (legacy support)
    if (adminKey === process.env.ADMIN_SECRET_KEY) {
        return {
            userRole: 'admin',
            organizationId: null,
            organizationName: null,
            isAdmin: true,
            canManageContent: true,
            canManageModels: true,
            canEditModelInfo: true,
        };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user is admin
    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (adminUser) {
        return {
            userRole: 'admin',
            organizationId: null,
            organizationName: null,
            isAdmin: true,
            canManageContent: true,
            canManageModels: true,
            canEditModelInfo: true,
        };
    }

    // Check organization membership
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select(`
      organization_id,
      role,
      organizations (
        id,
        name,
        slug
      )
    `)
        .eq('user_id', user.id)
        .single();

    if (orgUser && orgUser.organizations) {
        const orgs = orgUser.organizations as any;
        const org = Array.isArray(orgs) ? orgs[0] : orgs;
        return {
            userRole: 'organization',
            organizationId: org.id,
            organizationName: org.name,
            isAdmin: false,
            canManageContent: false,
            canManageModels: false,
            canEditModelInfo: true,
        };
    }

    return null;
}

export function validateOrganizationAccess(
    authContext: AuthContext,
    modelOrganizationId: string | null
): boolean {
    // Admins can access all models
    if (authContext.isAdmin) return true;

    // Organization users can only access their organization's models
    if (authContext.organizationId && modelOrganizationId) {
        return authContext.organizationId === modelOrganizationId;
    }

    return false;
}
