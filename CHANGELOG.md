# CHANGELOG — TransHere

All notable changes to this project are documented here.

Format: [Semantic Versioning](https://semver.org/) with date and phase reference.

---

## [1.0.0] — 2026-01 (Phases 1–5.12)

### Added

- Model directory with responsive feed, category filtering, geolocation header
- Model profile pages with split-layout (mobile carousel / desktop stack)
- Instagram-style story system (7-day decay, pinned groups, chain navigation, deep linking)
- Visual memory system (viewed profiles grayscale→color, viewed stories ring color)
- Favorites via localStorage (no-login philosophy)
- Internationalization (EN/ES) with geolocation-based language detection
- Dark Mode Luxury branding (Midnight Spectrum palette)
- Cloudflare Pages deployment with R2 multi-bucket storage

## [1.1.0] — 2026-01 (Phases 6.0–6.22)

### Added

- Full tracking & attribution system (sources, subtags, tracking links per model)
- Admin dashboard with analytics (views, clicks, CTR, charts)
- Admin content management (gallery, stories, model editing)
- Organization multi-tenancy (API key auth, org-scoped dashboards)
- Materialized views for high-volume analytics (400k+ events)
- Ghost link URL obfuscation (bot protection for external URLs)
- Bridge/airlock pages with bot detection
- Real-time Live Pulse monitoring
- iOS 26 Liquid Glass admin design system (Solar Spectrum light mode)
- Nebula unified dashboard layout engine
- Per-tracking-link analytics with inline charts

### Fixed

- Safari popup blocker — converted CTAs to direct `<a>` tags
- Mobile gallery black screen — flex-shrink-0 fix
- Dashboard "0 views" bug — switched to materialized view APIs
- Hydration mismatches — mounted state checks on localStorage components

## [1.2.0] — 2026-02 (Phases 7.0–7.3)

### Added

- Cloudflare Image Resizing (custom loader, `/cdn-cgi/image/`)
- Progressive rendering (6 initial cards, IntersectionObserver)
- Per-link analytics API and inline panel
- Subtag management and dashboard subtag filtering
- Admin auth unification (dual key support across 6 routes)
- Reddit compliance (OG tags, bot detection, content filter safety)
- Preview URL button and delete confirmation in tracking manager

### Improved

- Lighthouse: Home page 53 → 94, Model profile 71 → 89
- Image quality tuning: cards 55, circles 50, gallery 75
- SSR rendering: FeedManager renders models during SSR (eliminates CLS)
- CSS: `:root` dark-mode defaults (eliminates white flash)

---

## [Unreleased]

### Planned

- Fix: R2 uploads in production (Edge Runtime DOMParser issue)
- Fix: Dashboard click tracking (views show, clicks don't)
- Fix: Visual/layout bugs
- Content pipeline automation
- Test suite foundation (Vitest unit + integration)

---

_New entries go under [Unreleased] until a version is tagged._
