# STACK — TransHere

**Type:** tech stack manifest | **Status:** locked | **Last updated:** 2026-04-06

**Claude Code:** This is the single source of truth for all technology choices. Before installing any dependency or choosing any tool, check this file first. During execution, this file is immutable — changes require a DECISION_LOG.md entry + human approval.

---

## 1. Runtime & Infrastructure

| Layer           | Technology       | Version      | Rationale                                                                                                                                    |
| --------------- | ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime         | Node.js          | 18+          | LTS stability, Cloudflare Pages compatibility                                                                                                |
| Package Manager | npm              | 10.x         | Established in project; pnpm migration evaluated and deferred (single-package project, Cloudflare build compatibility risk > marginal gains) |
| Language        | TypeScript       | 5.x (strict) | Non-negotiable per tech-context.md                                                                                                           |
| Framework       | Next.js          | 15.5.2       | App Router, Edge Runtime, Server Components, `after()` API                                                                                   |
| Hosting         | Cloudflare Pages | —            | Unlimited bandwidth, zero egress, global CDN, Edge Runtime                                                                                   |
| CDN             | Cloudflare       | —            | Native integration with Pages + R2 + Image Resizing                                                                                          |
| Database        | Supabase         | —            | PostgreSQL with RLS, materialized views, free tier                                                                                           |
| Storage         | Cloudflare R2    | —            | S3-compatible, zero egress fees, multi-bucket                                                                                                |
| Source Control  | Git + GitHub     | —            | SSH keys configured on both machines                                                                                                         |

### Build & Deploy Pipeline

```bash
npm run build      # Next.js build
npm run pages:build # @cloudflare/next-on-pages compilation
npm run deploy     # wrangler pages deploy
```

---

## 2. Core Dependencies

| Package                       | Version        | Purpose               | Why This Over Alternatives                                                                                                       |
| ----------------------------- | -------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| next                          | 15.5.2         | Full-stack framework  | App Router + Edge Runtime + Server Components + `after()` for non-blocking telemetry. Vercel/Remix lack Cloudflare Pages parity. |
| react / react-dom             | 19.2.3         | UI rendering          | Required by Next.js 15. React 19 enables Server Components and improved Suspense.                                                |
| @supabase/supabase-js         | 2.89.0         | Database client       | First-class PostgreSQL, RLS, real-time — free tier generous enough for this scale.                                               |
| @supabase/ssr                 | 0.8.0          | Server-side Supabase  | SSR-safe client creation for Next.js Server Components.                                                                          |
| @aws-sdk/client-s3            | 3.965.0        | R2 storage operations | S3-compatible API for Cloudflare R2. Required for presigned URLs and direct uploads.                                             |
| @aws-sdk/s3-request-presigner | 3.965.0        | Presigned upload URLs | Enables client-side direct-to-R2 uploads without proxying through server.                                                        |
| nuqs                          | 2.8.6          | URL state management  | Type-safe URL search params. Replaces useState for global filter state. Enables shareable/bookmarkable filter URLs.              |
| next-themes                   | 0.4.6          | Theme management      | Dark mode forcing + admin theme toggle. Lightweight, SSR-safe.                                                                   |
| recharts                      | 3.6.0          | Analytics charts      | React-native charting. Simpler API than Chart.js/D3. Supports responsive containers.                                             |
| framer-motion                 | 12.0.0-alpha.1 | Animations            | Alpha required for React 19 compatibility. Production-stable for our use cases (page transitions, story animations).             |
| embla-carousel-react          | 8.0.0          | Gallery carousel      | Lightweight, touch-friendly. Better mobile UX than Swiper (smaller bundle).                                                      |
| lucide-react                  | 0.562.0        | Icons                 | Tree-shakeable SVG icons. Consistent with Shadcn/UI ecosystem.                                                                   |
| class-variance-authority      | 0.7.1          | Component variants    | Type-safe variant system for Shadcn/UI components.                                                                               |
| clsx                          | 2.1.1          | Class concatenation   | Tiny utility for conditional class names.                                                                                        |
| tailwind-merge                | 3.4.0          | Tailwind dedup        | Merges conflicting Tailwind classes. Required by Shadcn/UI `cn()` utility.                                                       |
| dotenv                        | 17.2.3         | Env vars              | Script-level env loading (not needed at runtime — Next.js handles it).                                                           |

### Radix UI Primitives (via Shadcn/UI)

| Package                     | Purpose                                |
| --------------------------- | -------------------------------------- |
| @radix-ui/react-checkbox    | Accessible checkbox (admin filters)    |
| @radix-ui/react-dialog      | Modal dialogs (editors, confirmations) |
| @radix-ui/react-collapsible | Collapsible sections (admin sidebar)   |
| @radix-ui/react-popover     | Popovers (date picker, dropdowns)      |
| @radix-ui/react-switch      | Toggle switches (admin settings)       |

---

## 3. Dev Dependencies

| Package                   | Version | Purpose                                                |
| ------------------------- | ------- | ------------------------------------------------------ |
| typescript                | 5.x     | Type checking (strict mode)                            |
| @cloudflare/next-on-pages | 1.13.16 | Compiles Next.js for Cloudflare Pages Edge Runtime     |
| @tailwindcss/postcss      | 4.x     | Tailwind CSS v4 PostCSS integration                    |
| tailwindcss               | 4.x     | CSS-first configuration (@theme directive)             |
| eslint                    | 9.x     | Linting (flat config)                                  |
| eslint-config-next        | 15.5.2  | Next.js-specific ESLint rules                          |
| vitest                    | 4.0.17  | Unit + integration testing (configured, tests pending) |
| @vitest/ui                | 4.0.17  | Vitest browser UI                                      |
| @types/node               | 20.x    | Node.js type definitions                               |
| @types/react              | 19.x    | React type definitions                                 |
| @types/react-dom          | 19.x    | React DOM type definitions                             |

---

## 4. Infrastructure & External Services

| Service        | Provider         | Auth Method                                  | Purpose                                     | Cost                |
| -------------- | ---------------- | -------------------------------------------- | ------------------------------------------- | ------------------- |
| PostgreSQL     | Supabase         | Anon key (public) + Service role key (admin) | Data persistence, RLS, materialized views   | Free tier           |
| Object Storage | Cloudflare R2    | AWS S3 access key                            | Media hosting (2 buckets: images + stories) | Free tier (10GB)    |
| Edge Hosting   | Cloudflare Pages | Wrangler CLI                                 | Application hosting with global CDN         | Free tier           |
| Image Resizing | Cloudflare       | URL convention (`/cdn-cgi/image/`)           | On-the-fly image optimization               | Included with Pages |
| DNS            | Cloudflare       | —                                            | Domain management, cache rules              | Free tier           |

### Environment Variables

```shell
# .env.local (gitignored)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anon key for public reads (public)
SUPABASE_SERVICE_ROLE_KEY=          # Service role — SERVER ONLY, bypasses RLS

# Cloudflare R2
R2_ACCESS_KEY_ID=                   # S3-compatible access key
R2_SECRET_ACCESS_KEY=               # S3-compatible secret
R2_ACCOUNT_ID=                      # Cloudflare account ID
R2_BUCKET_NAME=                     # Primary bucket (trans-image-directory)
R2_STORIES_BUCKET_NAME=             # Stories bucket
NEXT_PUBLIC_R2_DOMAIN=              # Pages domain for images (public)
NEXT_PUBLIC_R2_STORIES_DOMAIN=      # Pages domain for stories (public)
NEXT_PUBLIC_R2_PUBLIC_URL=          # R2 public URL (public)

# Admin
ADMIN_KEY=                          # Primary admin dashboard key
ADMIN_SECRET_KEY=                   # Secondary admin key (dual-key pattern)

# Optional
DATABASE_URL=                       # Direct PostgreSQL connection string
ALLOW_DEBUG_TRACKING=               # Enable ?th_debug=human bypass
NEXT_PUBLIC_SITE_URL=               # Site URL (localhost:3000 for dev)
```

---

## 5. Rejected Alternatives

| Technology         | Rejected In Favor Of    | Specific Reason                                                                                                                                                                                                                                                |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm               | npm (keep current)      | Single-package project — pnpm's workspace/strict isolation advantages don't apply. Cloudflare Pages builds default to npm. Migration risk (broken deploys) outweighs marginal disk savings for a stable production app. Revisit if project becomes a monorepo. |
| Vercel             | Cloudflare Pages        | Zero egress fees (critical for R2 media serving). Unlimited bandwidth on free tier. Native R2/Image Resizing integration. Edge Runtime consistency.                                                                                                            |
| PlanetScale / Neon | Supabase PostgreSQL     | Supabase provides RLS, real-time, and a table editor UI for manual data management. Free tier is sufficient. Service role key pattern enables clean admin/public separation.                                                                                   |
| Prisma             | Direct Supabase client  | Prisma ORM adds ~2MB to bundle and doesn't support Edge Runtime well. Direct Supabase queries are simpler for this schema complexity.                                                                                                                          |
| Chart.js / D3      | Recharts                | Recharts has a React-native API (JSX components). Chart.js requires imperative canvas manipulation. D3 is overkill for time-series analytics.                                                                                                                  |
| Swiper             | Embla Carousel          | Swiper is 60KB+ gzipped. Embla is ~8KB with better touch physics for mobile galleries.                                                                                                                                                                         |
| next-i18next       | Custom i18n.ts          | Only 2 languages (EN/ES) with <100 strings. A full i18n library adds unnecessary complexity and bundle size. 50-line dictionary file is sufficient.                                                                                                            |
| Jest               | Vitest                  | Slower TypeScript support, heavier ESM configuration. Vitest is faster and natively supports TypeScript + ESM.                                                                                                                                                 |
| Husky              | None (no git hooks yet) | Project currently has no pre-commit hooks. When needed, evaluate simple-git-hooks (lighter than Husky).                                                                                                                                                        |
| Tailwind CSS v3    | Tailwind CSS v4         | v4's CSS-first config (@theme directive in globals.css) eliminates tailwind.config.js. Cleaner, more maintainable.                                                                                                                                             |
| React Query / SWR  | Raw fetch + nuqs        | Admin dashboard has simple fetch patterns. URL state via nuqs handles caching/sharing. Adding a data-fetching library is unnecessary overhead.                                                                                                                 |

---

## 6. Lock Policy

| Status           | Meaning                                                   |
| ---------------- | --------------------------------------------------------- |
| `draft`          | Brainstorming agent may freely modify during planning     |
| `locked`         | No changes without human approval + DECISION_LOG.md entry |
| `pending_review` | Agent proposed a change; awaiting human decision          |

**Current status: `locked`**

### Upgrade Policy

- **Patch versions** (x.x.PATCH): upgrade freely, run tests after
- **Minor versions** (x.MINOR.x): upgrade with caution, check changelog for breaking changes
- **Major versions** (MAJOR.x.x): requires DECISION_LOG.md entry + human approval
- **Framer Motion:** Currently on alpha (12.0.0-alpha.1). Monitor for stable release. Upgrade when React 19-compatible stable version ships.

---

## 7. Dependency Budget

- **Max production dependencies:** 25 (currently at ~20 — healthy margin)
- **Justification threshold:** Before adding any dependency, ask: "Can this be done in <50 lines of code without it?" If yes, don't add the dependency.
- **Storage consciousness:** 256GB machines. Avoid bloated dependencies. Current node_modules is manageable but monitor growth.
- **Edge compatibility:** Every new dependency must work in Cloudflare Pages Edge Runtime. No Node.js-specific APIs (fs, path, child_process, etc.).
