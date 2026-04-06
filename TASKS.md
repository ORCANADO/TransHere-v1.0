# TASKS — TransHere

**Type:** execution roadmap | **Status:** active | **Linked:** SPEC.md, TESTS.md

**Claude Code:** This is your execution roadmap. Follow these rules:

1. **Work sequentially.** Only work on the first unchecked `[ ]` item. Do not skip ahead.
2. **A task is not complete until:**
   - Implementation works as described
   - Tests pass (per TESTS.md contract, when applicable)
   - `npm run lint && npm run build` pass
   - Task checkbox is marked `[x]`
3. **Do not modify task descriptions.** Only change `[ ]` → `[x]`.
4. **If blocked:** check claude-mem and DECISION_LOG.md for solutions. If still blocked, stop and explain the blocker to the human.

---

## Completed Milestones (v1.0 — Phases 1–7.3)

All phases through 7.3 are complete. See `Project_log.md` and `version_1,1.md` for full history. Summary:

- [x] Phase 1–4: Core directory (feed, profiles, gallery, deployment)
- [x] Phase 4.5–4.97: Stories system, category filtering, hybrid video, visual memory
- [x] Phase 5–5.12: Dark Mode Luxury branding, rebranding to TransHere
- [x] Phase 6–6.22: Tracking/analytics, admin dashboard, materialized views, ghost links, org multi-tenancy, Nebula dashboard, Liquid Glass design
- [x] Phase 7.0–7.3: Lighthouse optimization (Home 94, Profile 89), per-link analytics, Reddit compliance

---

## Milestone 8: Critical Bug Fixes

**Goal:** Fix production-blocking bugs that prevent core admin workflows and accurate analytics.
**Acceptance:** Admin can upload content from production, dashboard shows both views AND clicks, layout bugs resolved.
**SPEC ref:** Section 2 (Admin Content Upload flow), Section 5 (Admin API routes)

- [ ] **8.1** — Diagnose R2 upload failure in production. The upload flow (`/api/upload` and `/api/upload/proxy`) uses AWS SDK which requires DOMParser — unavailable in Cloudflare Edge Runtime. Investigate alternatives: (a) Cloudflare Workers R2 binding API instead of AWS SDK, (b) Cloudflare R2 direct upload with presigned URLs generated differently, (c) a dedicated upload worker outside of Next.js. Document findings in DECISION_LOG.md before implementing.
  - **Files:** `src/app/api/upload/route.ts`, `src/app/api/upload/proxy/route.ts`, `src/lib/r2-utils.ts`
  - **Verify:** Upload an image from production admin dashboard (not localhost)

- [ ] **8.2** — Fix admin dashboard not showing clicks to OnlyFans/Fansly. Investigate whether: (a) click events are not being logged at all (check `log-tracking-event.ts` and bridge-airlock click handlers), (b) events are logged but with wrong `event_type` (should be `link_click`), (c) materialized views don't aggregate click events properly, (d) dashboard API filters out clicks. Trace the full flow from CTA click → analytics_events → materialized views → dashboard API → StatCard display.
  - **Files:** `src/app/actions/log-tracking-event.ts`, `src/components/features/bridge-airlock.tsx`, `src/components/features/bridge-protector.tsx`, `src/app/api/admin/dashboard/route.ts`, `src/components/admin/stat-card.tsx`
  - **Verify:** Click a model's CTA, wait for materialized view refresh, confirm click appears in admin dashboard

- [ ] **8.3** — Audit and fix visual/layout bugs. Identify specific issues by reviewing the current production deployment across mobile (375px) and desktop (1024px+). Document each bug found, then fix in priority order. Focus on: model feed layout, profile page split view, story viewer rendering, gallery carousel alignment.
  - **Verify:** Visual inspection across mobile and desktop breakpoints

---

## Milestone 9: Content Pipeline Automation

**Goal:** Reduce manual effort for content uploads and management.
**Acceptance:** Content upload workflow has fewer manual steps than current process.
**SPEC ref:** Section 2 (Admin Content Upload flow)

- [ ] **9.1** — After Task 8.1 resolves cloud uploads, audit the full content pipeline: how does a new model go from "photos on disk" to "live on TransHere"? Document each manual step and identify the highest-friction bottleneck. Log findings in DECISION_LOG.md.
  - **Verify:** Written audit document with time-per-step estimates

- [ ] **9.2** — Implement the highest-impact automation identified in 9.1. This could be: batch upload support in gallery manager, automatic WebP conversion on upload, drag-and-drop reordering, or bulk story creation. Choose the one that saves the most time per content update.
  - **Verify:** Measure time for a typical content update before/after

- [ ] **9.3** — Add image optimization to the upload pipeline. Currently images must be pre-optimized locally with sharp. Evaluate adding server-side conversion to WebP during upload (if Edge Runtime supports it) or client-side conversion before upload.
  - **Verify:** Upload a raw JPEG → confirm it's served as optimized WebP

---

## Milestone 10: Test Foundation

**Goal:** Establish test infrastructure and cover critical business logic.
**Acceptance:** `npm test` runs and passes. Critical paths have unit test coverage.
**SPEC ref:** Section 6 (Test Plan Targets)

- [ ] **10.1** — Configure Vitest properly. Create `vitest.config.ts` with path aliases matching tsconfig (`@/*` → `./src/*`). Add `test:unit` and `test:integration` scripts to package.json. Create a single placeholder test that passes.
  - **Files:** `vitest.config.ts`, `package.json`
  - **Verify:** `npm run test:unit` passes

- [ ] **10.2** — Write unit tests for `src/lib/bot-detection.ts`. Cover: known crawler patterns (Googlebot, facebookexternalhit, redditbot), non-bot user agents, edge cases (empty string, undefined), Cloudflare verified bot whitelist.
  - **Files:** `src/lib/__tests__/bot-detection.test.ts`
  - **Verify:** `npm run test:unit` passes with all bot detection tests green

- [ ] **10.3** — Write unit tests for `src/lib/url-obfuscation.ts`. Cover: encode/decode roundtrip, TH\_ prefix validation, invalid input handling, Base64 edge cases.
  - **Files:** `src/lib/__tests__/url-obfuscation.test.ts`
  - **Verify:** `npm run test:unit` passes

- [ ] **10.4** — Write unit tests for `src/lib/i18n.ts`. Cover: language detection from country code, dictionary key lookup for EN and ES, fallback behavior for unknown languages.
  - **Files:** `src/lib/__tests__/i18n.test.ts`
  - **Verify:** `npm run test:unit` passes

- [ ] **10.5** — Write integration tests for `/api/admin/dashboard` route. Mock Supabase client. Cover: valid request with filters, empty results, period filtering (7d, 30d, custom), auth rejection with invalid key.
  - **Files:** `src/app/api/admin/dashboard/__tests__/route.test.ts`, `tests/helpers/supabase-mock.ts`
  - **Verify:** `npm run test:integration` passes

---

## Future Considerations (not in current roadmap)

- [ ] Fan subscription model — paywall to unlock premium model profiles
- [ ] Organization self-service onboarding — external agency management
- [ ] pnpm migration — revisit if project becomes monorepo
- [ ] E2E tests with Playwright — after unit/integration coverage is stable
- [ ] Automated materialized view refresh — cron job or Supabase scheduled function
- [ ] PWA support — offline model browsing, push notifications
- [ ] A/B testing framework for CTA copy/placement
- [ ] CDN cache invalidation automation after content updates

---

## Progress Tracker

| Milestone                       | Tasks | Done | Status      |
| ------------------------------- | ----- | ---- | ----------- |
| M1–M7: v1.0 Phases 1–7.3        | ~100+ | All  | Complete    |
| M8: Critical Bug Fixes          | 3     | 0    | Not started |
| M9: Content Pipeline Automation | 3     | 0    | Not started |
| M10: Test Foundation            | 5     | 0    | Not started |
