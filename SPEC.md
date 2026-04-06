# SPEC — TransHere

**Version:** 1.0 (retroactive) | **Linked:** PRD.md, STACK.md | **Status:** locked

**Claude Code:** Read this before implementing any task. It defines architecture, component interactions, file structure, and data flows. If your implementation contradicts this file, stop and log a DECISION_LOG.md entry before proceeding. Deviations require human approval.

---

## 1. System Architecture

### Overview

TransHere is a server-side rendered Next.js 15 application deployed on Cloudflare Pages (Edge Runtime). It uses Supabase PostgreSQL for persistence, Cloudflare R2 for media storage, and materialized views for high-volume analytics aggregation. The system serves three distinct user roles through separate route groups: visitors (public), admin (single operator), and organizations (multi-tenant API key auth).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ CDN Cache │  │ Image Resize │  │   Cloudflare Pages        │ │
│  │ (30d/7d) │  │ /cdn-cgi/    │  │   (Next.js 15 Edge)       │ │
│  └──────────┘  └──────────────┘  │                           │ │
│                                   │  ┌─────────────────────┐ │ │
│                                   │  │    Middleware        │ │ │
│                                   │  │  - Bot detection     │ │ │
│                                   │  │  - Org auth          │ │ │
│                                   │  │  - Security headers  │ │ │
│                                   │  └────────┬────────────┘ │ │
│                                   │           │              │ │
│                                   │  ┌────────▼────────────┐ │ │
│                                   │  │  App Router         │ │ │
│                                   │  │  - Server Components│ │ │
│                                   │  │  - API Routes (Edge)│ │ │
│                                   │  │  - Server Actions   │ │ │
│                                   │  └────────┬────────────┘ │ │
│                                   └───────────┼──────────────┘ │
└───────────────────────────────────────────────┼────────────────┘
                                                │
                    ┌───────────────────────────┼──────────────┐
                    │                           │              │
              ┌─────▼──────┐           ┌───────▼──────┐  ┌────▼────┐
              │  Supabase   │           │ Cloudflare   │  │ External│
              │  PostgreSQL │           │ R2 Storage   │  │ OF/Fans │
              │             │           │              │  │ (redir) │
              │ - models    │           │ - images     │  └─────────┘
              │ - analytics │           │ - stories    │
              │ - tracking  │           │ - gallery    │
              │ - orgs      │           └──────────────┘
              │ - mat.views │
              └─────────────┘
```

### Component Responsibilities

| Component                           | Responsibility                                        | Runs On         |
| ----------------------------------- | ----------------------------------------------------- | --------------- |
| Middleware (`src/middleware.ts`)    | Bot detection, security headers, org route auth       | Cloudflare Edge |
| Server Components (pages)           | SSR model feeds, profiles, metadata generation        | Cloudflare Edge |
| Client Components (features)        | Stories, galleries, visual memory, favorites, filters | Browser         |
| API Routes (`src/app/api/`)         | Admin CRUD, analytics aggregation, tracking, uploads  | Cloudflare Edge |
| Server Actions (`src/app/actions/`) | Tracking event logging (non-blocking via `after()`)   | Cloudflare Edge |
| Supabase PostgreSQL                 | Data persistence, RLS, materialized views, triggers   | Supabase Cloud  |
| Cloudflare R2                       | Media storage (images, videos, story assets)          | Cloudflare Edge |
| Cloudflare Image Resizing           | On-the-fly image optimization via `/cdn-cgi/image/`   | Cloudflare Edge |

---

## 2. Component Interaction Map

### Data Flow: Visitor Conversion (Primary Path)

```
X/Twitter Tracking Link (/go/[slug])
  │
  │ 1. Middleware: bot detection, security headers
  │ 2. Route: resolve tracking link via cache (1h TTL)
  │
  ▼
Tracking Resolution (src/lib/tracking-cache.ts)
  │
  │ 3. Log attribution event via after() (non-blocking)
  │ 4. Redirect to /model/[slug]
  │
  ▼
Model Profile Page (Server Component)
  │
  │ 5. Fetch model data from Supabase (anon key)
  │ 6. Generate OG/Twitter metadata (SSR)
  │ 7. Render profile: gallery, stories, CTA buttons
  │
  ▼
Client-Side Interaction (Browser)
  │
  │ 8. Ghost link: decode destination URL client-side
  │ 9. Visual memory: mark profile as viewed (localStorage)
  │ 10. User clicks CTA → <a> tag → OnlyFans/Fansly (new tab)
  │ 11. Conversion event logged via Server Action
  │
  ▼
External Platform (OnlyFans / Fansly)
```

### Data Flow: Admin Analytics

```
Admin opens /admin?key=ADMIN_KEY
  │
  │ 1. Client validates key against ADMIN_KEYS env array
  │ 2. Analytics tab loads AnalyticsDashboard component
  │
  ▼
AnalyticsDashboard (Client Component)
  │
  │ 3. Fetches /api/admin/dashboard with filter params
  │    (period, modelSlugs[], countries[], sources[])
  │
  ▼
Dashboard API Route (Edge)
  │
  │ 4. Queries analytics_daily_stats OR analytics_hourly_stats
  │    (materialized views, NOT raw analytics_events)
  │ 5. Single-pass aggregation: stats + countries + sources + chart
  │ 6. Parallel fetch: filtered data + unfiltered allModelMetrics
  │
  ▼
Response → Client
  │
  │ 7. StatCards display views, clicks, CTR
  │ 8. AnalyticsChart renders time-series data (Recharts)
  │ 9. SidebarModelList shows all-model metrics (unfiltered)
  │ 10. DashboardFiltersBar enables filter refinement
```

### Data Flow: Story System

```
Home Page (/) — Server Component
  │
  │ 1. Fetch story_groups with nested stories from Supabase
  │ 2. Filter: only unpinned groups with stories < 7 days old
  │ 3. Pass to HomeStoriesBar (Client Component)
  │
  ▼
HomeStoriesBar (Client)
  │
  │ 4. Sort: unseen stories first (via useViewedStories hook)
  │ 5. Render StoryCircle per model (gradient ring = unseen, gray = seen)
  │ 6. User taps circle → StoryViewer opens (React Portal)
  │
  ▼
StoryViewer (Client, Portal → #story-portal)
  │
  │ 7. body.story-open → #main-content gets backdrop blur
  │ 8. Auto-advance with progress bar
  │ 9. Mark each story as viewed (useViewedStories)
  │ 10. Chain navigation: unseen stories stay in unseen chain (snapshot)
  │ 11. "Respond" → Copy & Go pattern → external link + clipboard
  │ 12. URL state: ?story=UUID&si=INDEX (deep linking, resume)
```

### Data Flow: Admin Content Upload

```
Admin opens Gallery/Story Manager
  │
  │ 1. Select model from sidebar
  │ 2. Choose upload type (image/video)
  │
  ▼
Upload Flow (CURRENT: localhost only)
  │
  │ 3. Client sends file to /api/upload or /api/upload/proxy
  │ 4. Route generates presigned URL for R2 bucket
  │ 5. Client uploads directly to R2 presigned URL
  │ 6. Route creates gallery_items/stories record in Supabase
  │
  ▼
KNOWN BUG: Step 4-5 fails in production
  │ Edge Runtime lacks DOMParser required by AWS SDK
  │ Upload works in local dev (Node.js runtime) but not on Cloudflare
```

---

## 3. Data Models

### Core Types (src/types/)

```typescript
// src/types/index.ts
interface Model {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  social_link: string; // OnlyFans/Fansly URL
  bio?: string;
  bio_es?: string; // Spanish translation
  tags: string[];
  is_verified: boolean;
  is_new: boolean;
  is_pinned: boolean;
  organization_id?: string; // FK → organizations.id
  created_at: string;
}

interface GalleryItem {
  id: string;
  model_id: string;
  media_url: string;
  media_type: "image" | "video";
  poster_url?: string; // Video thumbnail
  width?: number;
  height?: number;
  sort_order: number;
  created_at: string;
}

interface StoryGroup {
  id: string;
  model_id: string;
  title?: string;
  cover_url: string;
  is_pinned: boolean;
  sort_order: number;
  stories: Story[];
}

interface Story {
  id: string;
  group_id: string;
  media_url: string;
  media_type: "image" | "video";
  duration?: number;
  sort_order: number;
  posted_date: string;
}
```

```typescript
// src/types/tracking.ts
interface TrackingSource {
  id: string;
  name: string; // "Instagram", "X", "Reddit"
  slug: string;
  icon?: string;
  is_custom: boolean;
}

interface TrackingLink {
  id: string;
  model_id: string;
  source_id: string;
  subtag_id?: string;
  slug: string;
  click_count: number;
  is_active: boolean;
  is_archived: boolean;
  preview_url?: string;
  created_at: string;
}

type AnalyticsEventType =
  | "page_view"
  | "link_click"
  | "conversion"
  | "story_view"
  | "bridge_view";

interface AnalyticsPayload {
  event_type: AnalyticsEventType;
  model_id?: string;
  model_slug?: string;
  tracking_link_id?: string;
  page_path: string;
  country?: string;
  city?: string;
  referrer?: string;
  user_agent?: string;
}
```

```typescript
// src/types/organization.ts
interface Organization {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}
```

### Database Schema (Key Tables)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   models     │◄───┐│  gallery_items   │     │  story_groups    │
├──────────────┤    │├──────────────────┤     ├──────────────────┤
│ id (PK)      │    ││ id (PK)          │     │ id (PK)          │
│ slug (UQ)    │    ││ model_id (FK)────┘     │ model_id (FK)────┘
│ name         │    │ media_url              │ title
│ social_link  │    │ media_type             │ is_pinned
│ org_id (FK)──┼──┐ │ sort_order             │ sort_order
└──────────────┘  │ └──────────────────┘     └────────┬─────────┘
                  │                                    │
┌──────────────┐  │  ┌──────────────────┐     ┌───────▼─────────┐
│organizations │◄─┘  │ tracking_links   │     │    stories      │
├──────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)      │     │ id (PK)          │     │ id (PK)         │
│ name         │     │ model_id (FK)────┘     │ group_id (FK)───┘
│ api_key (UQ) │     │ source_id (FK)───┐     │ media_url
└──────────────┘     │ subtag_id (FK)   │     │ media_type
                     │ slug (UQ)        │     │ sort_order
                     │ click_count      │     └─────────────────┘
                     │ is_archived      │
                     └──────────────────┘
                                        │
┌──────────────────┐  ┌────────────────┐│  ┌─────────────────────┐
│analytics_events  │  │traffic_sources ││  │ tracking_subtags    │
│(partitioned)     │  ├────────────────┤│  ├─────────────────────┤
├──────────────────┤  │ id (PK)        │◄┘ │ id (PK)             │
│ id (PK)          │  │ name           │    │ source_id (FK)──────┘
│ event_type       │  │ slug (UQ)      │    │ name
│ model_id         │  │ is_custom      │    │ slug
│ tracking_link_id │  └────────────────┘    └─────────────────────┘
│ country          │
│ city             │     ┌───────────────────────────────┐
│ referrer         │     │ analytics_daily_stats (MATVIEW)│
│ user_agent       │     │ analytics_hourly_stats(MATVIEW)│
│ created_at       │     │ (aggregated from above)       │
└──────────────────┘     └───────────────────────────────┘
```

---

## 4. File-Level Architecture

### Directory Structure

```
version_1.0/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root: fonts, theme, NuqsAdapter, portals
│   │   ├── page.tsx                  # Home feed (Server Component, force-dynamic)
│   │   ├── globals.css               # Design tokens, animations, custom utilities
│   │   ├── [slug]/page.tsx           # Bridge/airlock page (bot protection)
│   │   ├── model/[slug]/page.tsx     # Model profile (SSR + metadata)
│   │   ├── go/[slug]/page.tsx        # Tracking link redirect
│   │   ├── admin/                    # Admin dashboard (client-side)
│   │   │   ├── page.tsx              # Main admin page
│   │   │   ├── components/           # Admin-specific components
│   │   │   └── debug/live-pulse/     # Real-time monitoring tool
│   │   ├── org/                      # Organization routes
│   │   │   ├── [orgId]/              # Org-specific pages
│   │   │   └── unauthorized/         # Auth failure page
│   │   ├── api/                      # API routes (33 total, all Edge)
│   │   │   ├── admin/                # Admin CRUD + analytics
│   │   │   ├── org/                  # Organization endpoints
│   │   │   ├── track/[id]/           # Tracking event handler
│   │   │   ├── upload/               # R2 file upload
│   │   │   ├── analytics/            # Public analytics
│   │   │   └── health/               # Health check
│   │   ├── actions/                  # Server Actions
│   │   └── styles/                   # Admin-specific CSS
│   ├── components/
│   │   ├── admin/ (28 files)         # Dashboard, charts, editors, managers
│   │   ├── features/ (15 files)      # Feed, stories, gallery, tracking
│   │   ├── layout/ (3 files)         # Headers, navigation
│   │   ├── org/ (6 files)            # Organization UI
│   │   └── ui/ (22 files)            # Shadcn/UI primitives
│   ├── hooks/ (9 files)              # State management hooks
│   ├── lib/                          # Utilities
│   │   ├── supabase/ (4 files)       # DB clients (browser, server, service, queries)
│   │   ├── organization-auth.ts      # Multi-tenant auth + caching
│   │   ├── bot-detection.ts          # Crawler pattern matching
│   │   ├── tracking-cache.ts         # Tracking link resolution cache
│   │   ├── url-obfuscation.ts        # Ghost link encode/decode
│   │   ├── cloudflare-image-loader.ts # Custom image optimization
│   │   ├── r2-utils.ts               # R2 storage operations
│   │   ├── i18n.ts                   # EN/ES dictionary
│   │   └── utils.ts                  # General utilities
│   ├── types/ (8 files)              # TypeScript interfaces
│   ├── middleware.ts                  # Bot detection + security + org routing
│   └── middleware-org.ts              # Organization auth middleware
├── supabase/migrations/ (31 files)   # Database schema evolution
├── scripts/                          # Utility scripts
├── docs/                             # Organization guides
├── public/                           # Static assets (SVG logos, robots.txt)
├── next.config.ts                    # Custom image loader, Cloudflare settings
├── wrangler.toml                     # Cloudflare Pages deployment config
└── [Gold Standard docs]              # PRD, SOUL, SPEC, STACK, etc.
```

---

## 5. API Specification

### Public Routes

| Endpoint          | Method | Input              | Output                 | Auth       | Side Effects            |
| ----------------- | ------ | ------------------ | ---------------------- | ---------- | ----------------------- |
| `/api/health`     | GET    | —                  | `{ status: "ok" }`     | None       | —                       |
| `/api/analytics`  | POST   | `AnalyticsPayload` | `{ success: boolean }` | Admin keys | Writes analytics_events |
| `/api/track/[id]` | GET    | Tracking link ID   | 302 redirect           | None       | Logs click event        |

### Admin Routes (require ADMIN_KEY or ADMIN_SECRET_KEY)

| Endpoint                                       | Method     | Input                                           | Output                       | Side Effects                 |
| ---------------------------------------------- | ---------- | ----------------------------------------------- | ---------------------------- | ---------------------------- |
| `/api/admin/dashboard`                         | GET        | `?period=&modelSlugs[]=&countries[]=&sources[]` | `DashboardResponse`          | —                            |
| `/api/admin/live-pulse`                        | GET        | —                                               | `{ activeSessions: number }` | —                            |
| `/api/admin/models`                            | GET/POST   | Model data                                      | Model[] / Model              | CRUD operations              |
| `/api/admin/models/[id]`                       | PUT/DELETE | Model data                                      | Model                        | Update/delete                |
| `/api/admin/gallery`                           | GET/POST   | Gallery item data                               | GalleryItem[]                | R2 + Supabase                |
| `/api/admin/stories`                           | GET/POST   | Story data                                      | Story[]                      | R2 + Supabase                |
| `/api/admin/tracking-links`                    | GET/POST   | Link data                                       | TrackingLink[]               | —                            |
| `/api/admin/tracking-links/[linkId]/analytics` | GET        | `?period=`                                      | Daily stats + chart          | —                            |
| `/api/admin/tracking-sources`                  | GET/POST   | Source data                                     | TrackingSource[]             | —                            |
| `/api/admin/refresh-views`                     | POST       | —                                               | `{ success: boolean }`       | Refreshes materialized views |

### Organization Routes (require API key via query param or Bearer token)

| Endpoint                    | Method   | Input     | Output               | Side Effects |
| --------------------------- | -------- | --------- | -------------------- | ------------ |
| `/api/org/analytics`        | GET      | Filters   | Org-scoped analytics | —            |
| `/api/org/[orgId]/models`   | GET      | —         | Org's models         | —            |
| `/api/org/[orgId]/tracking` | GET/POST | Link data | Org's tracking links | —            |

### Error Handling Strategy

| Error Type           | HTTP Status | Response Shape                       | Recovery                |
| -------------------- | ----------- | ------------------------------------ | ----------------------- |
| Validation error     | 400         | `{ error: string }`                  | Fix request parameters  |
| Auth failure (admin) | 401         | `{ error: "Unauthorized" }`          | Provide valid ADMIN_KEY |
| Auth failure (org)   | 401         | `{ error: string, details: string }` | Provide valid API key   |
| Not found            | 404         | `{ error: "Not found" }`             | Check resource exists   |
| Internal error       | 500         | `{ error: string }`                  | Check server logs       |

---

## 6. Test Plan Targets

### Unit Test Targets

- [ ] Bot detection patterns (`src/lib/bot-detection.ts`) — all 50+ crawler patterns
- [ ] URL obfuscation encode/decode (`src/lib/url-obfuscation.ts`)
- [ ] Tracking link resolution (`src/lib/tracking-cache.ts`)
- [ ] i18n language mapping (`src/lib/i18n.ts`)
- [ ] Image URL construction (`src/lib/utils.ts` → `getImageUrl()`)

### Integration Test Targets

- [ ] `/api/admin/dashboard` — filter combinations, materialized view queries
- [ ] `/api/admin/tracking-links` — CRUD lifecycle
- [ ] `/api/track/[id]` — click attribution logging
- [ ] Organization auth middleware — valid/invalid/missing key scenarios

### Edge Cases to Cover

- [ ] Analytics with zero events (empty dashboard state)
- [ ] Tracking link with archived/inactive status
- [ ] Bot vs human detection edge cases (Cloudflare verified bots)
- [ ] Concurrent rapid clicks (deduplication trigger)
- [ ] Supabase 1000-row pagination boundary
