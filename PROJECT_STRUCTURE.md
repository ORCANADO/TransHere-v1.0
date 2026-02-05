# PROJECT_STRUCTURE.md

## Project: TransHere v1.1

```
version_1.0/
├── .cursorrules                    # AI coding assistant constitution
├── .env.local                      # Environment variables
├── .github/                        # GitHub workflows
├── Brand_Identity.md               # Brand guidelines
├── Project_Log.md                  # Development log
├── README.md                       # Project readme
├── VERIFICATION_REPORT.md          # Deployment verification
├── docs/                           # Documentation
│   ├── ghost-link-verification.md
│   ├── organization-admin-guide.md
│   ├── organization-deployment-guide.md
│   ├── organization-security.md
│   ├── organization-testing-checklist.md
│   └── organization-user-guide.md
├── public/                         # Static assets
│   ├── page-logo.svg
│   ├── page-name.svg
│   ├── verified-badge.svg
│   └── robots.txt
├── scripts/                        # Utility scripts
│   ├── populate-mock-data.ts
│   ├── refresh-analytics-views.ts
│   ├── regenerate-mock-data.ts
│   └── verify-deployment.ts
├── src/                            # Source code
│   ├── app/                        # Next.js App Router
│   │   ├── [slug]/                 # Bridge page (dynamic)
│   │   ├── actions/                # Server actions
│   │   ├── admin/                  # Admin dashboard
│   │   │   ├── debug/              # Diagnostic tools
│   │   │   │   └── live-pulse/     # Real-time event inspector
│   │   ├── api/                    # API routes
│   │   │   ├── admin/
│   │   │   │   ├── live-pulse/     # Real-time session counter API
│   │   │   │   └── tracking-links/
│   │   │   │       └── [linkId]/
│   │   │   │           └── analytics/  # Per-link daily analytics API
│   │   ├── go/                     # Tracking redirects
│   │   ├── model/                  # Model profile pages
│   │   ├── org/                    # Organization dashboard
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page
│   ├── components/                 # React components
│   │   ├── admin/                  # Admin components
│   │   │   ├── live-pulse-indicator.tsx # Real-time session UI
│   │   │   └── tracking-link-analytics-panel.tsx # Per-link analytics panel
│   │   ├── features/               # Feature components
│   │   ├── layout/                 # Layout components
│   │   ├── org/                    # Org dashboard components
│   │   └── ui/                     # Shadcn/UI primitives
│   ├── data/                       # Static data / mock data
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-admin-theme.ts
│   │   ├── use-analytics.ts
│   │   ├── use-favorites.ts
│   │   ├── use-share.ts
│   │   ├── use-viewed-models.ts
│   │   └── use-viewed-stories.ts
│   ├── lib/                        # Utilities & configs
│   │   ├── supabase/               # Supabase client
│   │   ├── api-permissions.ts
│   │   ├── bot-detection.ts
│   │   ├── cloudflare-image-loader.ts # Custom image loader for CF Image Resizing
│   │   ├── i18n.ts
│   │   ├── organization-auth.ts
│   │   ├── r2-utils.ts
│   │   ├── tracking-cache.ts
│   │   ├── url-obfuscation.ts
│   │   └── utils.ts
│   ├── types/                      # TypeScript definitions
│   │   ├── index.ts
│   │   ├── analytics.ts
│   │   ├── organization.ts
│   │   └── tracking.ts
│   └── middleware.ts               # Next.js middleware
├── supabase/                       # Database
│   └── migrations/                 # SQL migrations (32 files)
├── tests/                          # Test files
├── next.config.ts                  # Next.js config
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── version_1,1.md                  # Version specs
└── wrangler.toml                   # Cloudflare config
```

---

## Dev4Dev Logic Summaries

### Core System Architecture
- **Framework:** Next.js 15 (App Router) with Cloudflare Pages deployment
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Storage:** Cloudflare R2 (multi-bucket: `trans-image-directory`, `stories`)
- **State:** URL-based state via nuqs, localStorage for client persistence

### Key Logic Flows
1. **Tracking System:** `/go/[trackingSlug]` → cached link lookup → attribution logging → redirect
2. **Ghost Links:** Server-side URL encoding (Base64 + `TH_` prefix) → client-side decoding for bot protection
3. **Analytics:** Non-blocking logging via Next.js `after()`, materialized views for high-volume queries, and real-time "Live Pulse" monitoring (60s window).
4. **Debug Bypass:** Secure human-simulation via `?th_debug=human` (bypasses bot detection for verification).
5. **Stories:** 7-day decay filter, chain snapshot navigation, story-level view tracking
6. **Visual Memory:** localStorage-based viewed state with cross-tab sync via custom events
7. **Per-Link Analytics:** TrackingLinkManager expand → `/api/admin/tracking-links/[linkId]/analytics` → `analytics_daily_stats` by traffic_source → recharts AreaChart

### Authentication Boundaries
- **Public:** No auth required for model/story viewing
- **Admin:** Query param `?key=` for legacy admin dashboard
- **Organization:** API key + org ID authentication for org dashboards

### High-Dependency File Summaries

> **Note:** No `// @vibe-critical` annotations found in codebase. These summaries cover the highest-dependency infrastructure files identified via import analysis.

#### `src/lib/supabase/service.ts` — Service Role Client
```
PURPOSE:  Privileged DB client bypassing ALL RLS policies
SECURITY: Server-side ONLY, never import in client components
PATTERN:  createServiceClient() → auth-disabled Supabase client
ENV VARS: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
USE CASE: Org API key validation, admin ops, privileged queries
EDGE:     Compatible with Cloudflare Pages
```

#### `src/lib/organization-auth.ts` — Org Auth & Data Access
```
PURPOSE:  Multi-tenant authentication + data isolation
PATTERN:  API key → validateOrganizationKey() → set_organization_context() RPC → RLS-filtered queries
CACHE:    validateOrganizationKey: 5min TTL | getOrganizationModels: 1min TTL
SECURITY: Uses service role client, sets RLS context per-org
FUNCTIONS:
  - validateOrganizationKeyUncached() → middleware (no cache)
  - validateOrganizationKey() → server components (cached)
  - getOrganizationModels() → models + gallery + stories
  - getOrganizationAnalytics() → real-time aggregations (no cache)
```

#### `src/lib/tracking-cache.ts` — Tracking Link Resolution
```
PURPOSE:  High-performance tracking link lookups with caching
PATTERN:  modelSlug + trackingSlug → getTrackingLinkCached() → CachedTrackingLink
CACHE:    1-hour TTL via unstable_cache, tag: "tracking-links"
FLOW:     lookupTrackingLink() → { found, data, redirect_url }
INVALIDATE: invalidateTrackingLinkCache() → revalidateTag('tracking-links')
INACTIVE:   is_archived=true or is_active=false → redirect without tracking
```

#### `src/components/admin/analytics-dashboard.tsx` — Dual Analytics Component
```
PURPOSE:  Centralized analytics data fetching with dual data sources (filtered + unfiltered)
PATTERN:  Unified filter state → fetchData() → adaptedData → onDataLoaded() callback
PROPS:    adminKey, endpoint, onDataLoaded, mode, header, embedded, selectedModelSlugs
DATA:     Maps raw API results to DashboardData with both filtered stats and allModelMetrics
FLOW:     Conditional sidebar rendering + external model selection sync + dual data propagation.
          Uses DashboardContainer with dynamic layout (sidebar presence affects grid).
```

#### `src/middleware.ts` — Edge Gateway
```
PURPOSE:  Bot detection + security headers + org auth routing
PHASES:
  1. Org routes (/org/*) → organizationMiddleware() → API key validation
  2. All routes → crawler detection via UA regex
  3. Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
CRAWLER:  Pattern match → x-is-crawler header | cf-verified-bot → whitelist
MATCHER:  Excludes static assets, images, API routes
```

---

## Context Breadcrumbs

### Recent Development Focus (v1.1 - v1.3)
```
Phase 6.0   → Tracking & Analytics System
Phase 6.1   → Admin Design System (Solar Spectrum)
Phase 6.2   → Analytics Dashboard Stabilization
Phase 6.3   → Filter Intelligence & DatePicker
Phase 6.4   → Tracking Link Management
Phase 6.5   → Admin UI Overhaul
Phase 6.6   → Materialized Views & High-Volume Analytics
Phase 6.8   → Ghost Link System (URL Obfuscation)
Phase 6.10  → Bridge Page Implementation
Phase 6.11  → Performance Optimization (PreconnectHints)
Phase 6.12  → Nebula Dashboard Refactor (Unified Layout Engine)
Phase 6.13  → Unified Dashboard Improvements & Layout Fixes
Phase 6.14  → Embedded Analytics Architecture & State Flow Integration
Phase 6.15  → Enhanced Dashboard API & Sidebar Integration
Phase 6.16  → Dual Analytics System Implementation
Phase 6.17  → Materialized View Refresh & Data Verification
Phase 6.18  → Dashboard Data Display & Selection Fixes
Phase 6.20  → Safari Popup Blocker Fix (Direct Link Protocol)
Phase 6.21  → Mobile Gallery Rendering Fix (Flex-Shrink Implementation)
Phase 6.22  → Admin Brand Purge & Liquid Glass Sync
Phase 7.0   → Lighthouse Performance Optimization (Model Profile: 71→89, Home: 53→94)
Phase 7.1   → Subtag Management, Auth Unification & Per-Link Analytics
Phase 7.2   → Tracking Link UX (Preview URL Button & Delete Confirmation)
```

### Active Constraints
- Edge Runtime required for all API routes (Cloudflare Pages)
- No-login philosophy for visitors (localStorage only)
- Mobile-first (375px), then responsive to desktop (1024px+)
- "Zero Cost" stack focus (free tier limits)

### Key Config Files
- `.cursorrules` → AI assistant rules & project constitution
- `next.config.ts` → Edge runtime, Cloudflare Image Resizing loader, optimized breakpoints
- `src/lib/cloudflare-image-loader.ts` → Custom image loader for `/cdn-cgi/image/` resizing
- `src/middleware.ts` → Geolocation, crawler detection, security headers
- `src/lib/i18n.ts` → Lightweight English/Spanish dictionary

### Database Schema Highlights
- `models` → Core model profiles with gallery, stories, verification
- `tracking_links` + `tracking_sources` + `tracking_subtags` → Attribution system
- `analytics_events` → Raw event logs
- `analytics_daily_stats` / `analytics_hourly_stats` → Materialized views
- `story_groups` + `stories` → Instagram-style story system

### Performance Architecture (Phase 7.0)

| Component | Optimization | Impact |
|-----------|-------------|--------|
| `cloudflare-image-loader.ts` | Custom `/cdn-cgi/image/` loader with `format=auto,onerror=redirect` | Replaces broken `/_next/image` on CF Pages |
| `model-feed.tsx` | Progressive rendering: 6 initial cards + IntersectionObserver | Saves 400-900 KiB on initial load |
| `model-card.tsx` | `quality={55}`, `priority` only for first 2 cards | ~30% smaller images, faster LCP |
| `story-circle.tsx` | `priority={false}`, `quality={50}` | No bandwidth competition with LCP |
| `feed-manager.tsx` | SSR renders models (not empty array) for 'near'/'new' feeds | Eliminates CLS, enables fast LCP |
| `globals.css` | `:root` uses dark-mode values (not light) | Eliminates white flash (FOUC) |
| `next.config.ts` | Custom loader + optimized `deviceSizes`/`imageSizes` breakpoints | Right-sized images for all viewports |
| Cloudflare Cache Rule | `/cdn-cgi/image/*` → Edge TTL 30d, Browser TTL 7d | Cached image delivery |

### High-Dependency Files (Cross-Reference)

| File | Dependents | See Also |
|------|------------|----------|
| `src/lib/supabase/service.ts` | 8+ API routes, org-auth, r2-utils | `organization-auth.ts`, `api-permissions.ts` |
| `src/middleware.ts` | All non-static routes | `middleware-org.ts`, `bot-detection.ts` |
| `src/lib/organization-auth.ts` | Org dashboard, org API routes | `supabase/service.ts`, `types/organization.ts` |
| `src/lib/cloudflare-image-loader.ts` | All Next.js Image components | `next.config.ts`, `utils.ts` (getImageUrl) |

**See Also Notes:**
- **Supabase Service Client:** Required by any operation bypassing RLS. If modifying auth flow, check all consumers.
- **Middleware:** Entry point for all page requests. Changes affect crawler detection, security headers, org routing.
- **Organization Auth:** Central multi-tenancy logic. Changes require testing across org dashboard + API routes.

### Archived Logs (Context Gateway)

| Archive File | Date Range | Phases |
|--------------|------------|--------|
| [`archive_2025-12_2026-01_phases-1-5.md`](logs/archive/archive_2025-12_2026-01_phases-1-5.md) | Dec 2025 - Jan 11, 2026 | 1-5.12 |

**Active Log:** `Project_Log.md` (root) — Phase 6+ (Tracking & Analytics onward)

> **Auto-Archive Rule:** When `Project_Log.md` exceeds 10KB, oldest phases move to `/logs/archive/`. See `.cursorrules` Section 6 for full protocol.
