# DECISION LOG — TransHere

**Purpose:** Record architectural decisions, trade-offs, and deviations from plan. Every entry should be understandable 6 months from now without additional context.

**Format:** Each entry includes: Date, Decision, Context, Alternatives Considered, Outcome.

---

## DL-001: Zero-Cost Stack Architecture

**Date:** 2025-12-XX (Phase 1)
**Decision:** Use exclusively free-tier services: Cloudflare Pages (hosting), Cloudflare R2 (storage), Supabase free tier (database).
**Context:** Solo developer project with no revenue model in v1. Must minimize fixed costs while supporting potential viral traffic spikes.
**Alternatives:** Vercel (bandwidth limits on free tier), AWS S3 (egress fees), PlanetScale (connection limits).
**Outcome:** Zero monthly cost. Cloudflare's unlimited bandwidth + R2's zero egress handled traffic without issues.

---

## DL-002: No-Login Philosophy

**Date:** 2025-12-XX (Phase 1)
**Decision:** Visitors never create accounts. All client-side state (favorites, viewed models, viewed stories) stored in localStorage.
**Context:** Target audience (X/Twitter traffic) has near-zero patience for signup flows. Every friction point reduces conversion. Authentication adds complexity without revenue benefit in v1.
**Alternatives:** Optional accounts for favorites sync, anonymous session tokens.
**Outcome:** Zero signup friction. localStorage works well for the single-device, single-session use case. Cross-device sync deferred to v2+ if needed.

---

## DL-003: Dark Mode Forced (Midnight Spectrum)

**Date:** 2026-01 (Phase 5)
**Decision:** Force dark theme globally (`forcedTheme="dark"`). No user toggle for visitor-facing pages. Light mode only available in admin dashboard.
**Context:** Brand identity ("Dark Mode Luxury") requires consistent dark aesthetic. The target audience browses at night. Dark mode also eliminates FOUC by matching `:root` CSS defaults.
**Alternatives:** User-toggleable theme, system-preference detection.
**Outcome:** Consistent brand experience. FOUC eliminated. Admin gets a separate Solar Spectrum light mode for extended dashboard use.

---

## DL-004: Materialized Views for Analytics

**Date:** 2026-01 (Phase 6.6)
**Decision:** Create `analytics_daily_stats` and `analytics_hourly_stats` materialized views instead of querying raw `analytics_events` for dashboards.
**Context:** Raw analytics table exceeded 400k+ events. Dashboard queries were hitting Supabase's 1000-row limit and taking >2s. Needed sub-500ms analytics for admin UX.
**Alternatives:** Paginated raw queries (complex, still slow), separate analytics database (over-engineered), real-time aggregation (expensive).
**Outcome:** Sub-500ms dashboard queries. Manual refresh via RPC + script. Trade-off: data is up to 1 refresh cycle stale.

---

## DL-005: Ghost Link URL Obfuscation

**Date:** 2026-01 (Phase 6.8)
**Decision:** Encode external destination URLs (OnlyFans/Fansly) server-side using Base64 + `TH_` prefix. Decode client-side only after human interaction.
**Context:** Social media crawlers (Reddit, Twitter, Facebook) were scraping destination URLs from HTML, potentially triggering platform content filters. Ghost links ensure raw URLs never appear in SSR output.
**Alternatives:** JavaScript-only redirects (blocked by Safari ITP), server-side redirects (still exposes URL in redirect chain), obfuscated query params (easily parsed by crawlers).
**Outcome:** Crawlers see inert buttons. Humans get decoded links on click. Safari-safe via direct `<a>` tags with decoded `href`.

---

## DL-006: Safari ITP — Direct `<a>` Tags for CTAs

**Date:** 2026-01 (Phase 6.20)
**Decision:** All conversion buttons (Chat with Me, Unlock VIP Content, Respond to Story) must use direct `<a>` tags, never `window.open` or `window.location.href`.
**Context:** Safari's Intelligent Tracking Prevention blocks programmatic navigation from async handlers on "gateway" pages. Users clicking CTA → `window.open()` → blocked popup. This killed conversions for Safari/iOS users (~40% of traffic).
**Alternatives:** `navigator.sendBeacon` + `window.location` (still blocked in some Safari versions), intermediary page (adds friction).
**Outcome:** 100% conversion button reliability across all browsers. Trade-off: slightly less control over click tracking timing (use `sendBeacon` for non-blocking telemetry).

---

## DL-007: Rebranding from TranSpot to TransHere

**Date:** 2026-01 (Phase 5.12)
**Decision:** Rename the product from "TranSpot" to "TransHere."
**Context:** "TranSpot" brand identity research (Brand_Identity.md) envisioned a dating app. The actual product is a directory/conversion tool. "TransHere" better communicates "find trans models here" without dating app connotations.
**Alternatives:** Keep "TranSpot" (confusing product positioning), "TransDirectory" (too clinical), "TransNow" (too aggressive).
**Outcome:** Cleaner brand alignment with actual product function.

---

## DL-008: npm Over pnpm (Evaluated 2026-04)

**Date:** 2026-04-06
**Decision:** Keep npm as package manager. Do not migrate to pnpm.
**Context:** User's global standard is pnpm, but this is a mature, deployed single-package project. Evaluated migration trade-offs.
**Alternatives:** pnpm (strict isolation, smaller node_modules, faster installs).
**Reason for rejection:** (1) Single-package project — pnpm's workspace/strict isolation advantages don't apply. (2) Cloudflare Pages builds default to npm — migration risks broken deployments. (3) Disk savings ~30-40% on node_modules but not hitting storage limits. (4) Install speed difference ~2-5s — negligible for solo dev. Risk/reward ratio is bad.
**Revisit when:** Project becomes a monorepo or storage becomes a bottleneck.

---

## DL-009: Pragmatic Test Strategy (Evaluated 2026-04)

**Date:** 2026-04-06
**Decision:** Test critical business logic only (unit + integration). Skip component/UI tests and E2E.
**Context:** Solo dev on a production conversion tool. Vitest configured but zero tests exist. Need maximum bug prevention per hour of dev time.
**Coverage targets:** 40% codebase, 90% critical paths (bot detection, URL obfuscation, tracking, dashboard API).
**Alternatives:** Comprehensive testing (unit + integration + component + E2E) — estimated 3-4x more dev time for diminishing returns on a solo project.
**Outcome:** Focused test suite covering the code paths where silent failures cause the most damage (analytics corruption, broken conversions, security bypasses).

---

## DL-010: Edge Runtime Upload Limitation (Known Issue)

**Date:** 2026-02 (discovered during production deployment)
**Decision:** Accept that R2 uploads only work from localhost until a proper fix is implemented.
**Context:** AWS SDK's S3 client uses `DOMParser` internally, which is unavailable in Cloudflare Pages Edge Runtime. Upload routes work in local development (Node.js runtime) but fail in production.
**Alternatives under evaluation:** (1) Cloudflare Workers R2 binding API (native, no AWS SDK needed), (2) Presigned URLs generated via a separate Cloudflare Worker, (3) Client-side direct-to-R2 upload.
**Outcome:** Blocking bug. Tracked as Task 8.1 in TASKS.md.

---

## DL-011: Edge-Compatible R2 Upload Signer (Task 8.1 Fix)

**Date:** 2026-04-12
**Decision:** Replace `@aws-sdk/s3-request-presigner` and `@aws-sdk/client-s3` in upload routes with a custom S3 Signature V4 signer (`src/lib/r2-signer.ts`) using Web Crypto API (`crypto.subtle`).
**Context:** DL-010 identified that AWS SDK depends on `DOMParser`, unavailable in Cloudflare Edge Runtime. Upload routes (`/api/upload` and `/api/upload/proxy`) worked on localhost (Node.js) but crashed in production. This blocked all content uploads from the hosted admin dashboard.
**Alternatives considered:**

1. **Cloudflare Workers R2 binding API** — Requires a separate Cloudflare Worker deployment outside Next.js. Adds infrastructure complexity and a second deployment target.
2. **Separate upload Worker** — Same infrastructure complexity. Would also need CORS configuration between the admin UI and the Worker.
3. **Client-side direct-to-R2** — Requires exposing R2 credentials or a token endpoint. CORS on R2 buckets is finicky and hard to debug.
4. **(Chosen) Custom S3 Sig V4 signer** — ~200 lines of pure Web Crypto code. Zero new dependencies. Drop-in replacement for the two AWS SDK functions we actually used (`getSignedUrl` and S3 `PutObject`). Works in any runtime with `crypto.subtle`.
   **Outcome:** Both upload routes now use `r2-signer.ts`. AWS SDK packages (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) are still in `package.json` for delete operations in `r2-utils.ts` — those can be migrated separately if they also fail in Edge Runtime.

---

_Add new entries below. Use DL-XXX format with incrementing numbers._
