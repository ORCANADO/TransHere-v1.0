import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service Role Supabase Client
 * 
 * CRITICAL SECURITY WARNING:
 * This client uses the service_role key which bypasses ALL Row Level Security (RLS) policies.
 * It should ONLY be used in server-side code (API routes, Server Components, Server Actions).
 * NEVER expose this client or the service_role key to the client bundle.
 * 
 * Use cases:
 * - Organization API key validation
 * - Admin operations that require bypassing RLS
 * - Privileged database queries
 * 
 * Edge-compatible for Cloudflare Pages deployment.
 */
export function createServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
        );
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
