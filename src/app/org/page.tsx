import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { OrganizationDashboard } from '@/components/org/organization-dashboard';

export const runtime = 'edge';
import {
    validateOrganizationKey,
    getOrganizationModels,
    getOrganizationAnalytics,
} from '@/lib/organization-auth';

interface PageProps {
    searchParams: Promise<{
        key?: string;
        startDate?: string;
        endDate?: string;
    }>;
}

/**
 * Organization Dashboard Page (Server Component)
 * 
 * Validates API key and fetches organization-specific data.
 * Redirects to /org/unauthorized if validation fails.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const params = await searchParams;
    const apiKey = params.key;

    if (!apiKey) {
        return {
            title: 'Organization Dashboard | TransHere',
            description: 'Analytics dashboard for organizations',
            robots: 'noindex, nofollow',
        };
    }

    const organization = await validateOrganizationKey(apiKey);

    if (!organization) {
        return {
            title: 'Access Denied | TransHere',
            description: 'Invalid organization API key',
            robots: 'noindex, nofollow',
        };
    }

    return {
        title: `${organization.name} - Analytics Dashboard | TransHere`,
        description: `Private analytics dashboard for ${organization.name}`,
        robots: 'noindex, nofollow',
    };
}

export default async function OrganizationPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const apiKey = params.key;

    // Redirect if no API key provided
    if (!apiKey) {
        redirect('/org/unauthorized');
    }

    // Validate API key
    const organization = await validateOrganizationKey(apiKey);

    if (!organization) {
        redirect('/org/unauthorized');
    }

    // Parse date range (default: last 30 days)
    const endDate = params.endDate
        ? new Date(params.endDate)
        : new Date();

    const startDate = params.startDate
        ? new Date(params.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Validate date range (max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    const dateRange = endDate.getTime() - startDate.getTime();

    if (dateRange > maxRange) {
        // If range exceeds 1 year, adjust start date
        startDate.setTime(endDate.getTime() - maxRange);
    }

    // Ensure start date is not in the future
    if (startDate > endDate) {
        redirect('/org/unauthorized');
    }

    // Fetch organization data
    const [models, analytics] = await Promise.all([
        getOrganizationModels(organization.id),
        getOrganizationAnalytics(organization.id, startDate, endDate),
    ]);

    return (
        <OrganizationDashboard
            organization={organization}
            models={models}
            analytics={analytics}
            apiKey={apiKey}
            startDate={startDate.toISOString().split('T')[0]}
            endDate={endDate.toISOString().split('T')[0]}
        />
    );
}
