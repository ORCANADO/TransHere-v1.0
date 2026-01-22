# Project: Transhere Unified Analytics & Filter Restoration
## Vision: "Nebula 2.0"
Architect a high-performance, unified dashboard system where the Global Admin and Organization dashboards share an identical UI DNA: a sticky top-tier multi-filter bar and a "Nebula-style" left-slide sidebar for multi-model selection. This migration eliminates client-side data stitching in favor of Materialized View APIs to resolve the "0 views" bug and ensure cross-role data parity.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS v4, Shadcn/UI, Lucide Icons.
- **State:** `nuqs` (URL Search Params) for global filter persistence.
- **Analytics:** Supabase Materialized Views (`analytics_daily_stats`, `analytics_hourly_stats`).
- **Performance:** Server-side aggregation via specialized API routes.

## The .cursorrules (Refined)
- **Data Integrity:** NEVER query `analytics_events` directly for dashboard stats. [cite_start]ALWAYS use the `/api/admin/dashboard` or `/api/org/analytics` endpoints which leverage materialized views[cite: 107].
- **UI Consistency:** Both dashboards MUST use the `DashboardContainer` layout with the `SidebarModelList` on the left.
- **Multi-Select Protocol:** Model selection MUST support `modelSlugs[]` as an array in the URL and API payload.
- [cite_start]**Hydration Safety:** Use `mounted` state checks for all components accessing `localStorage` or URL params to prevent Next.js 15 hydration errors[cite: 123].

## Phase-by-Phase Implementation Plan

### Phase 1: The UI DNA Sync & Shared Primitives
**Goal:** Extract and standardize the "Nebula" layout components.
- **Refactor `DashboardFiltersBar`:** Ensure it correctly handles and displays the "Country" and "Source" dropdowns using `availableCountries` and `availableSources` from the API response.
- **Standardize `SidebarModelList`:** Update the sidebar to handle "Multi-Select" by default. Ensure it emits `onModelToggle` events that update the URL `modelSlugs[]` array.
- **Update Types:** Ensure `DashboardFilters` in `src/types/charts.ts` includes `modelSlugs: string[]`, `countries: string[]`, and `sources: string[]`.

### Phase 2: Admin Dashboard Refactor (Nebula Restoration)
**Goal:** Fix the "0 data" bug and restore filters.
- **File:** `src/app/admin/admin-dashboard-content.tsx`.
- **Logic:** Replace the raw Supabase `analytics_events` fetch with a call to `/api/admin/dashboard`.
- **Wiring:** Pass the current `filters` state to the API call as query parameters. 
- **Layout:** Wrap the content in `DashboardContainer`. Restore the missing `DashboardFiltersBar` and `SidebarModelList`.
- **Fix:** Map the `aggregated` stats from the API to the `StatCard` and `AnalyticsChart` components.

### Phase 3: Organization Dashboard Refactor (Unified Vibe)
**Goal:** Bring the "Nebula" sidebar and multi-select to Org users.
- **File:** `src/components/org/organization-dashboard.tsx`.
- **Logic:** Inject the `SidebarModelList` into the left panel of the `DashboardContainer`.
- **Security:** Ensure the `SidebarModelList` only displays models belonging to the current `orgId`.
- **Multi-select:** Update the model filter logic to allow multiple model selection (comparison mode).
- **API Parity:** Ensure the `GET` request to `/api/org/analytics` supports the same `modelSlugs[]` and `sources[]` filtering as the Admin API.

### Phase 4: Data Validation & Polishing
**Goal:** Final verification of the "Magic Moments."
- **Verification:** Confirm that selecting "Instagram" in the Source filter instantly updates the view/click totals for all selected models.
- **Empty States:** Replace "0" with "No events found for this filter" if the API returns a success but empty dataset.
- [cite_start]**Theme Sync:** Ensure `useAdminTheme` is active in both views for consistent light/dark mode behavior [cite: 232-244].

## API Structure (Target Signature)
Both endpoints (`/api/admin/dashboard` and `/api/org/analytics`) must accept and respond with:
- **Request:** `GET ?period=...&modelSlugs[]=...&countries[]=...&sources[]={json_array}`
- **Response:** ```json
  {
    "stats": { "totalViews": number, "totalClicks": number, "ctr": number },
    "availableCountries": string[],
    "availableSources": { name: string, icon: string }[],
    "chartData": [ { "date": string, "views": number, "clicks": number } ]
  }

