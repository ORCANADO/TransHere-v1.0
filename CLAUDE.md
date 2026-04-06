# CLAUDE.md — TransHere

## Identity

You are the execution agent for **TransHere**, a mobile-first model directory converting X/Twitter traffic to OnlyFans/Fansly subscriptions. Follow TASKS.md sequentially. The human reviews at milestone boundaries.

## Session Start

Read files in this order before acting:

1. SOUL.md — operating principles (never changes)
2. This file — project-specific rules
3. TASKS.md — find your next unchecked task
4. SPEC.md — understand how to implement it
5. STACK.md — verify approved technologies

## Before Every Task

1. Read the task description in TASKS.md
2. Read the relevant SPEC.md section (listed in the task's milestone)
3. Check DECISION_LOG.md for prior decisions in this area
4. Check STACK.md before installing ANY dependency
5. Query claude-mem for cross-project solutions if the problem feels familiar

## After Every Task

1. Run: `npm run lint && npm run build`
2. Run: `npm test` (when test suite exists)
3. All must pass before marking the task `[x]`
4. Update TESTS.md Section 5 (task-to-test mapping) when applicable
5. If you made an architectural decision, log it in DECISION_LOG.md
6. Mark the checkbox in TASKS.md: `[ ]` → `[x]`

## Rules

- NEVER install a dependency not in STACK.md without asking the human
- NEVER skip tests — every task has associated tests per TESTS.md
- NEVER modify files outside the current task's scope
- NEVER modify SOUL.md, PRD.md, or SPEC.md (these are immutable during execution)
- If stuck after 3 attempts, stop and explain the blocker — don't keep trying
- Check claude-mem for cross-project patterns before inventing new solutions

## Project-Specific Context

**What this project does:** High-performance model directory that converts X/Twitter traffic to OnlyFans/Fansly subscriptions, with zero-friction UX, Instagram-style stories, granular tracking/attribution, and an admin dashboard for content management.

**Key constraints:**

- TypeScript strict mode — no `any` without justification
- Cloudflare Pages Edge Runtime — all API routes must use Web APIs only (no Node.js fs, path, etc.)
- Zero-cost stack — free tiers only (Supabase, Cloudflare Pages, R2)
- Mobile-first — 375px primary target, then scale up
- No-Login Philosophy — visitors never create accounts
- Safari ITP — all conversion CTAs use `<a>` tags, never `window.open`
- Dark mode forced — Midnight Spectrum palette is immutable

**Stack highlights:**

- Framework: Next.js 15.5.2 (App Router, Edge Runtime)
- Database: Supabase PostgreSQL with RLS + materialized views
- Storage: Cloudflare R2 (multi-bucket: images + stories)
- State: nuqs (URL params) + localStorage hooks
- Styling: Tailwind CSS v4 + Shadcn/UI
- Analytics: Materialized views (`analytics_daily_stats`, `analytics_hourly_stats`)
- Testing: Vitest (configured, building out coverage)

## Critical Patterns

### Data Fetching

- **NEVER** query `analytics_events` directly for dashboard stats. Always use materialized views.
- **Server Components** for initial data (SSR, SEO). **Client Components** for interactivity.
- **Supabase anon key** for public reads. **Service role key** for admin writes (server-only).
- **Recursive pagination** for queries that may exceed Supabase's 1000-row limit.

### Analytics & Tracking

- Events use `page_view`, `link_click`, `conversion`, `story_view`, `bridge_view` types.
- Non-blocking logging via Next.js `after()` API.
- Admin routes accept both `ADMIN_KEY` and `ADMIN_SECRET_KEY` via `ADMIN_KEYS` array pattern.
- Source filtering maps human names (e.g., "Instagram") to tracking link UUIDs via `sourceMap`.

### Hydration Safety

- All components using `localStorage` or URL params MUST use `mounted` state check pattern.
- React hooks MUST be called before any conditional `return null` guards.
- `:root` CSS vars in `globals.css` use dark-mode values to prevent white flash (FOUC).

### Ghost Links & Conversion

- External URLs encoded server-side with `encodeDestination()` (Base64 + `TH_` prefix).
- Decoded client-side only — raw URLs never appear in SSR HTML.
- ALL conversion CTAs use direct `<a>` tags (Safari ITP blocks `window.open` from async handlers).

### Stories System

- URL state: `?story=UUID&si=INDEX` for deep linking and resume.
- Navigation uses `history: 'replace'` to avoid polluting browser history.
- Chain snapshot at open time — navigation stays within the same seen/unseen chain.
- Story viewer renders via React Portal to `#story-portal` (outside blur scope).
- `last_story_added_at` updated by Postgres trigger only — never manually.

### Image Optimization

- Custom Cloudflare Image Resizing loader: `src/lib/cloudflare-image-loader.ts`
- URL format: `/cdn-cgi/image/width=X,quality=Y,format=auto,fit=cover,onerror=redirect/<SOURCE>`
- Quality: model cards `55`, story circles `50`, profile gallery `75`
- Priority: only first 2 model cards get `priority={true}`
- Progressive rendering: 6 initial cards, IntersectionObserver for rest

### Admin Dashboard

- Brand-neutral: no "TransHere" logos in admin UI
- Dual theme: Obsidian Frost (dark) + Solar Spectrum (light) via `useAdminTheme`
- iOS 26 Liquid Glass aesthetic: glassmorphism, multi-layer shadows
- Dual data: filtered analytics (main) + unfiltered all-model metrics (sidebar)

## Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Next.js production build
npm run pages:build  # Cloudflare Pages compilation
npm run deploy       # Build + deploy to Cloudflare Pages
npm run lint         # ESLint
npm test             # Run all tests (Vitest)
npm run test:unit    # Unit tests only (when configured)
npm run test:integration  # Integration tests only (when configured)
```

## Environment

- Admin dashboard: `/admin?key=YOUR_ADMIN_KEY`
- Org dashboard: `/org/[orgId]?key=ORG_API_KEY`
- Debug tracking: append `?th_debug=human` (requires `ALLOW_DEBUG_TRACKING=true`)
- Live pulse monitor: `/admin/debug/live-pulse?key=YOUR_ADMIN_KEY`

## File Quick Reference

| Area            | Key Files                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Home feed       | `src/app/page.tsx`, `src/components/features/feed-manager.tsx`, `src/components/features/model-feed.tsx`                  |
| Model profile   | `src/app/model/[slug]/page.tsx`, `src/components/features/profile-gallery.tsx`                                            |
| Stories         | `src/components/features/story-viewer.tsx`, `src/components/features/story-circle.tsx`, `src/hooks/use-viewed-stories.ts` |
| Tracking        | `src/lib/tracking-cache.ts`, `src/app/go/[slug]/page.tsx`, `src/app/actions/log-tracking-event.ts`                        |
| Ghost links     | `src/lib/url-obfuscation.ts`, `src/components/features/bridge-protector.tsx`                                              |
| Bot detection   | `src/lib/bot-detection.ts`, `src/middleware.ts`                                                                           |
| Admin analytics | `src/components/admin/analytics-dashboard.tsx`, `src/app/api/admin/dashboard/route.ts`                                    |
| Admin content   | `src/components/admin/gallery-manager.tsx`, `src/components/admin/story-manager.tsx`                                      |
| Uploads         | `src/app/api/upload/route.ts`, `src/lib/r2-utils.ts`                                                                      |
| Org auth        | `src/lib/organization-auth.ts`, `src/middleware-org.ts`                                                                   |
| Image loader    | `src/lib/cloudflare-image-loader.ts`, `next.config.ts`                                                                    |
| Design tokens   | `src/app/globals.css`                                                                                                     |
| Types           | `src/types/index.ts`, `src/types/tracking.ts`, `src/types/analytics-aggregated.ts`                                        |
