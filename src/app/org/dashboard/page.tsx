import { redirect } from 'next/navigation';
import { DashboardContainer } from '@/components/admin/dashboard-container';
import { getAuthContext } from '@/lib/auth-utils';

export const runtime = 'edge';

interface OrganizationDashboardProps {
    searchParams: Promise<{ key?: string }>;
}

export default async function OrganizationDashboard({ searchParams }: OrganizationDashboardProps) {
    const { key } = await searchParams;

    // Get authentication context
    const authContext = await getAuthContext(key);

    // Redirect if not authenticated
    if (!authContext) {
        redirect('/');
    }

    // Only allow organization users (admins should use /admin)
    if (authContext.userRole !== 'organization') {
        redirect('/admin?key=' + (key || ''));
    }

    return (
        <DashboardContainer
            adminKey={key || ''}
            authContext={authContext}
        />
    );
}
