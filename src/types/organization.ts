import type { Model } from './index';

/**
 * Organization entity from the database
 */
export interface Organization {
    id: string;
    name: string;
    api_key: string;
    created_at: string;
    updated_at: string;
}

/**
 * Aggregated analytics data for an organization
 */
export interface OrganizationAnalytics {
    organization: Organization;
    models: Model[];
    totalViews: number;
    totalClicks: number;
    ctr: number;
    topModels: Array<{
        model: Model;
        views: number;
        clicks: number;
    }>;
    countryBreakdown: Array<{
        country: string;
        views: number;
        clicks: number;
    }>;
}
