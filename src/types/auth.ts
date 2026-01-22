export type UserRole = 'admin' | 'organization';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface OrganizationUser {
    id: string;
    user_id: string;
    organization_id: string;
    role: 'owner' | 'admin' | 'member';
    created_at: string;
}

export interface AuthContext {
    userRole: UserRole;
    organizationId: string | null;
    organizationName: string | null;
    isAdmin: boolean;
    canManageContent: boolean; // gallery, stories, pinned blocks
    canManageModels: boolean; // create, delete models
    canEditModelInfo: boolean; // basic info only
}

export interface DashboardPermissions {
    showGalleryTab: boolean;
    showStoriesTab: boolean;
    showPinnedTab: boolean;
    showAnalyticsTab: boolean;
    canUploadMedia: boolean;
    canDeleteMedia: boolean;
    canDeleteModel: boolean;
    canCreateModel: boolean;
    canEditBasicInfo: boolean;
}

export function getPermissions(userRole: UserRole): DashboardPermissions {
    if (userRole === 'admin') {
        return {
            showGalleryTab: true,
            showStoriesTab: true,
            showPinnedTab: true,
            showAnalyticsTab: true,
            canUploadMedia: true,
            canDeleteMedia: true,
            canDeleteModel: true,
            canCreateModel: true,
            canEditBasicInfo: true,
        };
    }

    // Organization role - restricted permissions
    return {
        showGalleryTab: false,
        showStoriesTab: false,
        showPinnedTab: false,
        showAnalyticsTab: true, // Can view analytics for their models
        canUploadMedia: false,
        canDeleteMedia: false,
        canDeleteModel: false,
        canCreateModel: false,
        canEditBasicInfo: true, // Can only edit basic model info
    };
}
