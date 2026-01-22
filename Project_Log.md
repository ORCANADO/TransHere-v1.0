# Implementation Log - Version 1.0

## Phase 1: Scaffolding (Completed [Current Date])
- **Node.js**: Installed fresh LTS version on Windows x64.
- **Project Path**: C:\Users\Camilo Windows\Desktop\version_1.0
- **Shadcn/UI**: The `shadcn-ui` package is deprecated. We successfully used `npx shadcn@latest init`.
- **Cloudflare**: We deliberately SKIPPED `@cloudflare/next-on-pages` to avoid conflicts with Next.js 15 App Router. We will address deployment adapters in Phase 4.
- **Cursor Setup**: Installed "Cursor User Setup x64" and enabled the `cursor` terminal command.
- **Vibe Check**: PASSED. The AI correctly identified the `useEffect` requirement for the "Fake Online Status" feature to prevent hydration errors.
- **Database Schema**: Generated 001_create_models_table.sql. Verified RLS policies (Public Read / Service Write) and performance indexes.
-**Analytics Decision**: Added 002_create_analytics_table.sql to track views/clicks using a privacy-focused "Lightweight" strategy (no cookies, just events + IP geo).

## Phase 2 Prep: Dependency & Compatibility Lockdown.
1.**Tailwind v4 Confirmation:** “ Verified project is using CSS-first configuration (@import 'tailwindcss';). Legacy config files removed.”
2.**Next.js 15 Compatibility:** “Installed nuqs@latest. Added <NuqsAdapter> to app/layout.tsx.”
3.**React 19 Compatibility:** "Locked dependency to framer-motion@12.0.0-alpha.1 to resolve peer dependency conflicts."
4.**Utility Strategy:** "Defined @utility scrollbar-hidden in globals.css."

### [30/12/25] - Environment Stabilization & Component Grid
- **PowerShell Execution Policy Error:** Encountered `Files\nodejs\npm.ps1 cannot be loaded...`.
  - *Root Cause:* Windows restricted script execution for the current user.
  - *Solution:* Executed `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- **Missing Binary Error:** Encountered `'next' is not recognized...` after environment updates.
  - *Solution:* performed `npm install` to restore missing binaries in `node_modules`.
- **Port Decision:** Verified Port 3000 is functional after policy fixes. Reverted `package.json` to standard configuration.
- **Component Factory (Phase 2):**
  - Created `StatusIndicator` (Client-side random logic).
  - Created `ModelCard` (Shadcn + R2 images).
  - Created `CategoryPills` (Sticky horizontal scroll).
  - Created `ModelFeed` (Responsive Grid 2x-4x).
  - Injected `MOCK_MODELS` into `src/app/page.tsx` for visual verification.

### [30/12/25] - Feature Completion & Environment Reset
- **Profile View Integration:**
  - Created dynamic route `src/app/model/[slug]/page.tsx`.
  - Implemented the "Money Button" with sticky positioning and pulse animation.
  - Wrapped `ModelCard` in `next/link` for seamless navigation.

- **Favorites System:**
  - Created `useFavorites` hook using `localStorage`.
  - Implemented hydration-safe logic (empty state -> read storage on mount).
  - Added "Heart" icon to `ModelCard` with event propagation stopping (clicking heart doesn't open profile).

- **Environment Migration (The "Clean Slate"):**
  - Successfully cloned the repository to a fresh folder to resolve persistent Windows permission/binary corruption.
  - Verified `npm run dev` functionality on the fresh install.

- **Strategic Addition (Tinder-Style Gallery):**
  - Decision: Upgrade Profile View from static image to swipeable Carousel to increase engagement.
  - Requirement: Database schema update (Single `image_url` -> Array `gallery_urls`).
  - UX Goal: "End Card" CTA to drive traffic to the Money Button.

#  Version 1.1 Planning & Research Completed

## Project Decisions
- Selected 'TranSpot' as the project name.
- Adopted nuqs for client-side navigation state to prevent page jumps.
- Implemented Cloudflare Middleware for zero-cost geolocation.

## [02/01/26] - Version 1.1 "Trust & Scarcity" Implementation
- **Core UI Upgrade:**
  - Implemented `FixedHeader` with live geolocation data (Cloudflare Headers).
  - Deployed `ScarcityBlock` to limit visibility and drive curiosity.
  - Refactored `ModelCard` to support `is_verified` and `is_new` badges.
- **Profile Experience:**
  - Added "Glassmorphism" `ProfileHeader` (Trust Anchor) to the model page.
  - Integrated "Money Button" with pulse animation for high CTR.
- **Architecture Fixes:**
  - Moved `middleware.ts` to `src/` to resolve Next.js 15 pathing issues.
  - Added `<NuqsAdapter>` to `layout.tsx` to fix search param hydration.
- **Status:** UI is 100% complete. Logic is 80% complete (running on Mock Data).

## [02/01/26] - Logic & Analytics Complete
- **Data Integration:** - Switched `page.tsx` and `model/[slug]/page.tsx` from Mock Data to Real Supabase Data.
  - Implemented `slug` based routing for SEO-friendly URLs.
- **Analytics Engine:**
  - Created Server Action `logEvent` to write to `analytics_events` securely.
  - Built `useAnalytics` hook to auto-track Page Views and Money Button Clicks.
- **Components:**
  - Refactored `ChatButton` to handle click tracking before redirection.
  - Created `ModelViewTracker` to handle `useEffect` view counting without making the whole page client-side.
- **Status:** Application is fully functional locally. Ready for Cloudflare Deployment.


[07/01/26] - Production Infrastructure & Gallery Core
- **Infrastructure Update:**
  - Downgraded to **Next.js 15** to ensure stability with Cloudflare edge runtime.
  - Successfully deployed to **Cloudflare Pages** (Production Environment).
- **Asset Pipeline:**
  - Implemented **Cloudflare R2** storage with a directory-based structure (`[model-name]/`).
  - Created a custom Node.js script (`scripts/bulk-convert.js`) for local **WebP conversion** before upload.
- **Critical Fixes:**
  - **Gallery Logic:** Fixed `ProfileGallery.tsx` URL construction to handle R2 domains correctly.
  - **Pagination:** Implemented state-based pagination dots for the image slider.
- **Current Status:** Live in production. Images loading. Gallery functional but requires UX smoothing (magnetic snap) and desktop constraints.

[07/01/26] - UX Physics & Gallery Stabilization
- **Gallery Mechanics Fixed:**
  - Solved the "Free Scroll" vs "Snap" conflict.
  - Implemented "Tinder-style" magnetic snapping for image slides.
  - **Key Learning:** Verified fixes on Localhost first; Cloudflare caching can sometimes mask immediate CSS updates.
- **Desktop Experience:**
  - Added Glassmorphism Left/Right navigation arrows (Visible only on Desktop).
  - Validated responsive behavior (Hidden on Mobile).
- **Current Focus:** Moving to Desktop Layout Constraints (Phase 4.5).

[07/01/26] - Desktop Experience Refactor
- **Architectural Shift:** Moved from "Mobile Constraint" (App Shell) to "Split Screen" layout (Sticky Left Info / Scrollable Right Feed).
- **Hybrid Gallery Engine:**
  - **Mobile:** Embla Carousel with Magnetic Snap (Tinder-style).
  - **Desktop:** Infinite Vertical Scroll (E-commerce/Instagram style).
- **Laptop Optimization:**
  - Enforced `max-w-4xl` (approx. 900px) grid width.
  - Aligned with "Twitter/X" desktop standards to ensure images fit perfectly on 13" MacBook screens without excessive scrolling.
- **Status:** Desktop and Mobile views are now distinct, premium experiences optimized for their respective input methods (Touch vs. Mouse).

[07/01/26] - Internationalization (i18n) & Geolocation Refinement
- **Zero-Friction i18n Engine:**
  - Implemented automatic language detection using Cloudflare's `cf-ipcountry` header.
  - Created a lightweight dictionary (`src/lib/i18n.ts`) for instant English/Spanish switching.
  - **Logic:** Users in Spanish-speaking countries (CO, MX, ES, etc.) automatically see Spanish UI; others see English.
- **Content Localization:**
  - **Tags:** Added auto-translation map (e.g., 'Blonde' -> 'Rubia').
  - **Biographies:** Added optional `bio_es` column to Supabase. The frontend intelligently falls back to English if no Spanish bio exists.
- **Geolocation:** Fixed header parsing in Middleware to robustly detect City/Country even when headers vary (e.g., `cf-ipcity` vs `x-vercel-ip-city`).

[07/01/26] - Conversion Engine & Logic Finalization
- **Interaction Wiring:**
  - Connected "Chat" and "Unlock" buttons to real `social_link` from Supabase.
  - Implemented `trackClick` analytics events for all external navigation.
- **Dynamic UX Logic:**
  - Implemented "Verified Status" text switching:
    - Verified models show: "Chat with Me" (Personal/Direct).
    - Unverified models show: "Chat with [Name]" (Third-party/Directory).
  - Integrated with i18n system for full English/Spanish support of these dynamic strings.
- **Milestone:** All functional requirements for Version 1.1 (Phase 4) are complete.

## [2026-01-08] - Stories Schema Implementation
- Created `007_create_stories_schema.sql` migration.
- Implemented `story_groups` and `stories` tables in Supabase.
- Configured RLS (Row Level Security) for public read access.
- Verified foreign key relationship with `models` table.

## [2026-01-09] - Stories Feature Complete & Deployed
- **Frontend Core:**
  - Implemented `StoryCircle` (Gradient rings for recent, Gray for pinned) and `StoryViewer` with `nuqs` URL state synchronization.
  - Refactored `StoriesContainer` to support "Back Button" navigation (History Stack Logic).
- **Admin System:**
  - Built **Secret Admin Dashboard** (`/admin?key=...`) to replace manual DB entry.
  - Implemented secure R2 Presigned URL Uploads.
  - Added Real-time Analytics Dashboard to the Admin panel.
- **Infrastructure & Stability:**
  - Configured Multi-Bucket R2 Strategy (`trans-image-directory` for models, `stories` for stories) with independent CORS policies.
  - **Critical Fix:** Enforced `export const runtime = 'edge'` for AWS SDK API routes to resolve Cloudflare build errors.
- **Mobile Polish:**
  - Implemented "Swipe-to-Close" physics (Translate + Scale).
  - Blocked native Context Menus (Right-click/Hold) to prevent image saving.
  - Added `touch-action: none` to prevent "Pull-to-Refresh" conflicts.
- **Logic:**
  - "7-Day Decay": Auto-filtering of old stories server-side.
  - "Dynamic Covers": Recent group circle shows the latest story's media.
  - "Chronological Sort": Recent stories play Oldest → Newest.
- **Status:** DEPLOYED & LIVE.

## [2026-01-09] - Phase 4.95: Main Feed Stories & Navigation Polish
- **Main Feed Integration:**
  - Implemented `HomeStoriesBar` to display active stories on the landing page (`/`).
  - **Database Automation:** Created `on_story_created` trigger (Postgres) to automatically update `last_story_added_at` on the `models` table.
  - **Logic:** Enforced strict filtering so ONLY unpinned ("Recent") stories trigger the home page bump. Pinned stories (e.g., "Trips") do not affect sorting.
- **Advanced Navigation (The "Instagram" Feel):**
  - **Inter-Model Chaining:** `StoryViewer` now accepts `nextGroupId` and `prevGroupId` to allow swiping directly from one model's story to the next model.
  - **Back Button Fix:** Implemented `history: 'replace'` in `nuqs` state updates during internal navigation to prevent history stack pollution.
  - **Verified Badges:** Added blue checkmarks to the Story Viewer header for verified models.
- **Status:** All Story features (Profile, Home, Admin, Navigation) are DEPLOYED & LIVE.

## [2026-01-09] - Feature: Viral Loop & Deep Linking Integration
**Status:** Complete

### Implementation:
- **New Hook:** Created `src/hooks/use-share.ts` with two core functions:
  - `share(options)`: Attempts native `navigator.share`, falls back to clipboard with visual feedback.
  - `copyAndGo(deepLink, externalUrl)`: Optimistically copies deep link + opens external tab simultaneously.
- **Profile Header:** Added Share button (mobile) using `Share2` icon with `Check` icon on success.
- **Story Viewer Overhaul:**
  - Replaced single "Send Message" button with split Action Bar:
    - **Left:** Round glassmorphism Share button (triggers native share or clipboard).
    - **Right:** Pink gradient "Respond to Story" pill CTA (triggers Copy & Go).
  - Added centered **Micro-Toast** ("Link Copied!") with `Link2` icon for 2-second confirmation.
- **Deep Linking:** All story URLs now include `?story=UUID` parameter for instant sharing/pasting.

### Decisions:
1. **Architecture:** Utilizing `nuqs` URL state as the source of truth for all sharing actions (no database calls needed for sharing).
2. **UX Pivot:** Changed "Send Message" button to "Respond to Story".
3. **Interaction:** Adopted "Copy & Go" pattern for the main CTA. The risk of clipboard write failure is outweighed by the conversion benefit when it works (90%+ support).
4. **UI Layout:** Split Action Bar in Stories (Share Icon + Primary CTA).

### Bug Fixes (2026-01-09):
- **Edge Runtime Compatibility:** Created `ProfileHeaderClient` wrapper component to handle `next/dynamic` with `ssr: false` in Client Component context. Server Components cannot use `ssr: false` directly.
- **Deep Link URL Fix:** Updated `StoryViewer.getCurrentStoryUrl()` to always construct model profile URLs (`/model/{slug}?story={groupId}`) instead of using `window.location.href`. This ensures deep links work correctly regardless of where the story was opened (home page vs profile page).
- **Story ID Fix:** Changed deep link parameter from `currentStory.id` to `group.id` to match `HomeStoriesBar` and `StoriesContainer` lookup logic.

### UX Enhancements (2026-01-09):
- **Perception Delay:** Added optional `delay` parameter to `copyAndGo()` function in `useShare` hook. Story Viewer uses 800ms delay to ensure the "Link Copied!" toast is visible before tab switch.
- **Enhanced Toast:** Upgraded micro-toast message to "Link Copied! Opening..." with high z-index (`z-[200]`) for visibility.

### Deferred Features:
- **History Injection (`useLandingHistory`):** Attempted to implement browser history manipulation for deep links (inject parent path so Back button navigates to home instead of closing tab). Feature deferred to future version due to conflicts with Next.js App Router's internal history management. The hook exists in `src/hooks/use-landing-history.ts` but is not currently used.

## [2026-01-09] - Phase 4.96: Category Filtering & Story Animation Overhaul
**Status:** Complete

### Category Pills Restoration:
- **Component Refactor:** Updated `CategoryPills` to accept controlled props (`selectedTag`, `onSelectTag`) instead of managing internal state.
- **Frequency Algorithm:** Implemented tag popularity sorting - top 15 most-used tags displayed (calculated server-side in `page.tsx`).
- **FilterableFeed Wrapper:** Created new client component to bridge Server Component data with client-side filtering state.
- **Conditional Visibility:** CategoryPills hidden on "Favorites" feed (logic in `FilterableFeed`).
- **Styling:** Selected pills use `bg-pink-500 text-white`; unselected use glassmorphism (`bg-white/10`).

### Story Viewer Animation System:
- **Dual Animation State:** Added `animationType` state (`'story'` | `'model'`) to differentiate transition types.
- **Navigation Helpers:**
  - `handleNextModel()` / `handlePrevModel()`: Set `animationType('model')` before navigating.
  - `handleNextStory()` / `handlePrevStory()`: Set `animationType('story')` before transitioning.
- **Tap vs Swipe Logic:**
  - **Tap:** Tries story navigation first, falls back to model navigation.
  - **Swipe:** Immediately jumps to next/prev model (skips remaining stories).
- **Animation Classes:**
  - Story transitions: `animate-in fade-in zoom-in-95 duration-300`
  - Model transitions: `animate-in slide-in-from-right-full duration-500 ease-out`
- **React Key:** Added `key={${group.id}-${currentStoryIndex}}` to force re-render on transitions.

### Stories Container Navigation Isolation:
- **Filter Logic:** Separated groups into `pinnedGroups` and `feedGroups` arrays.
- **Neighbor Calculation:** `nextGroupId` / `prevGroupId` now calculated from the **same list only**.
- **Result:** Swiping on a pinned story (e.g., "Trips") navigates to other pinned stories, not feed stories.

## [2026-01-10] - Phase 4.97: Hybrid Video Support (Stories & Gallery)
**Status:** Complete

### Story Video Enhancements:
- **Hybrid Video Strategy:** All video uploads now require both `.webm` (performance) and `.mp4` (compatibility) files.
- **Admin Dashboard Upgrade:** Added "Video Mode" toggle with 3 file inputs (MP4, WebM, Poster).
- **Upload Logic:** Single timestamp for all batch files; explicit `Content-Type` headers for each file.
- **Story Viewer:** Updated to render `<video>` with dual `<source>` elements (WebM priority, MP4 fallback).
- **Bug Fixes:**
  - Fixed poster image display by updating `cover_url` on existing groups.
  - Fixed story sorting to show chronological order (oldest to newest in playback).

### Gallery Architecture Overhaul:
- **Database Migration:** Created `gallery_items` table (`011_create_gallery_items.sql`) with:
  - `media_url`, `media_type`, `poster_url`, `width`, `height`, `sort_order`
  - RLS policies for public read, admin write
  - Migration script for existing `gallery_urls` data
- **API Route:** Created `/api/admin/gallery` for gallery item insertions.
- **Type System:** Added `GalleryItem` interface, deprecated `gallery_urls` on `Model` interface.
- **ProfileGallery Refactor:**
  - Changed props from `images: string[]` to `items: GalleryItem[]`.
  - Added `VideoPlayer` component with Intersection Observer.
  - Video behavior: Auto-play when 50% visible, pause/reset when not visible.
  - Loop infinitely, muted, no controls (TikTok/Instagram style).
  - Fallback logic: `gallery_items` → `gallery_urls` → `image_url`.
- **Admin Dashboard:** Added "Gallery Manager" tab for video/image uploads.

### Environment & Deployment:
- **URL Helper:** Centralized URL construction via `getImageUrl()` to prevent double `https://` errors.
- **next.config.ts:** Added `*.pages.dev` to `remotePatterns` for Cloudflare Pages domains.
- **Multi-Bucket R2:** Verified separate domains for models (`NEXT_PUBLIC_R2_DOMAIN`) and stories (`NEXT_PUBLIC_STORIES_DOMAIN`).

## [2026-01-10] - Phase 4.98: Performance Optimization & Gallery Migration Finalization
**Status:** Complete

### Performance Optimizations:
- **Lazy Loading Implementation:**
  - Lazy loaded `StoryViewer` component with `ssr: false` (modal hidden by default, not in initial bundle).
  - Lazy loaded `ProfileGallery` component with loading state (below-the-fold content).
  - Applied to both `StoriesContainer` and `HomeStoriesBar` for consistency.
  - **Impact:** Reduced initial JavaScript bundle size, faster page load times, improved Core Web Vitals.

- **Image Configuration Optimization:**
  - Added `formats: ['image/avif', 'image/webp']` to `next.config.ts` for automatic format optimization.
  - Added `minimumCacheTTL: 31536000` (1 year) to align with R2 caching strategy.
  - **Impact:** AVIF format can be 50% smaller than WebP, reducing bandwidth and improving LCP scores.

- **R2 Upload Caching:**
  - Added `Cache-Control: public, max-age=31536000, immutable` header to all R2 PUT requests in admin dashboard.
  - **Rationale:** Files are timestamped and never change, enabling aggressive CDN/browser caching for instant repeat views.

### Gallery Migration Finalization:
- **Database Migration:** Created `012_drop_legacy_gallery.sql` to remove `gallery_urls` column from `models` table.
- **Code Cleanup:**
  - Removed `gallery_urls` from `Model` interface in `src/types/index.ts`.
  - Removed `gallery_urls` from all Supabase queries in `page.tsx` and `model/[slug]/page.tsx`.
  - Updated fallback logic to use only `gallery_items` → `image_url` (removed legacy `gallery_urls` step).
  - Removed `gallery_urls` from mock data in `src/data/mock-models.ts`.
  - **Status:** Codebase fully migrated to `gallery_items` table. Migration ready to apply.

## [2026-01-10] - Phase 4.99: Locked VIP Teaser (Conversion Optimization)
**Status:** Complete

### Locked VIP Teaser Implementation:
- **Feature:** Last gallery item transformed into a "Locked VIP Teaser" to improve conversion rates.
- **Visual Design:**
  - Blurred image/video background (reduced blur for images: 11px base, 19px hover; videos: 19px base, 13px hover).
  - Gradient overlay (from-black/80 via-black/50 to-black/30) for text readability.
  - Lock icon in glassmorphism circle with backdrop blur.
  - "Want to see more?" headline and "Unlock exclusive content" subtitle.
  - Pink gradient "Unlock VIP Content" button.
- **Architecture:**
  - Removed separate end-card; last gallery item IS the conversion card.
  - Click handler redirects to model's social link (OnlyFans/Fansly) with analytics tracking.
  - Works for both images and videos with appropriate blur effects.
  - Added `redirectUrl` prop to `ProfileGallery` for flexible redirect targeting.
- **UX Impact:** Creates urgency and curiosity while maintaining visual preview of locked content.

## [2026-01-10] - Phase 5: Dark Mode Luxury Rebranding
**Status:** Complete

### Brand Identity Implementation:
- **Color Palette Overhaul:**
  - Background: `#050A14` (Obsidian Navy)
  - Primary: `#00FF85` (Electric Emerald)
  - Accent/Gold: `#D4AF37` (Rich Gold)
  - Secondary: `#7A27FF` (Cyber Violet)
  - Card/Surface: `#0A1221` (Deep Charcoal Navy)
  - Muted/Foreground: `#94A3B8`
- **Typography System:**
  - Headlines: Playfair Display (serif) - Editorial luxury feel
  - Body: Montserrat (sans-serif) - Modern, legible
  - Global heading styles (h1-h4) default to serif with `tracking-tight` and `font-weight: 500`
- **Custom Utility Classes:**
  - `.glass-panel`: Backdrop blur with subtle white overlay
  - `.gold-glow`: Subtle shadow using Rich Gold
  - `.emerald-button`: High-contrast CTA with Electric Emerald background
  - `.emerald-glow`: Neon glow effect for primary actions
- **Component Refactoring:**
  - `ModelCard`: Monochrome-first aesthetic (85% → 80% grayscale for unviewed)
  - `ChatButton`: Glass-Gold style with Electric Emerald primary
  - `FixedHeader`: Enhanced backdrop blur (xl) with metallic border
  - `StoryViewer`: Dark Mode Luxury with Electric Emerald CTAs and Rich Gold accents
  - `CategoryPills`: Electric Emerald active state
  - `ProfileGallery`: Frosted glass overlay for locked VIP teaser

### Story Viewer Blur Effect Fix:
- **Problem:** Background blur was not working correctly; story content was being blurred.
- **Solution:** Implemented React Portal architecture:
  - Added `#main-content` wrapper in `layout.tsx` (gets blurred)
  - Added `#story-portal` sibling (StoryViewer renders here via portal)
  - StoryViewer uses `createPortal` to render outside blur scope
  - CSS targets `body.story-open #main-content` for targeted blur
- **Result:** Instagram-style frosted glass effect with blurred background and clear story overlay.

## [2026-01-10] - Phase 5.1: Visual Memory Feature
**Status:** Complete

### Visual Memory Implementation:
- **New Hook:** Created `useViewedModels` hook (`src/hooks/use-viewed-models.ts`):
  - Tracks viewed profiles in localStorage (`transpot-viewed-models` key)
  - Hydration-safe: Loads from localStorage only after client mount
  - Functions: `markAsViewed(id)`, `isViewed(id)`, `viewedIds` array
- **ModelCard Visual Memory:**
  - Unviewed cards: 80% grayscale + vignette overlay (86% opacity dark edges)
  - Viewed cards: Full color (grayscale-0) + no vignette
  - Hover on unviewed: Smooth 500ms transition to full color
  - Vignette: Radial gradient (transparent center → 86% black edges) for "unseen" signal
- **UX Impact:** Users can visually distinguish between profiles they've already explored and new discoveries, creating a "memory" system without authentication.

## [2026-01-10] - Phase 5.2: Story Visual Memory & Real-Time Sync
**Status:** Complete

### Story Visual Memory:
- **New Hook:** Created `useViewedStories` hook (`src/hooks/use-viewed-stories.ts`):
  - Tracks viewed story groups in localStorage (`transpot-viewed-stories` key)
  - Hydration-safe: Loads from localStorage only after client mount
  - Functions: `markAsViewed(id)`, `isViewed(id)`, `viewedIds` array
- **StoryCircle Visual States:**
  - Unviewed stories: Electric Emerald → Gold → Violet gradient ring
  - Viewed stories: Gray ring (`bg-muted-foreground/40`)
  - 300ms transition for smooth visual feedback
- **Instagram-Style Story Sorting:**
  - Primary sort: Unviewed stories appear first (left side of bar)
  - Secondary sort: Within each group, newest stories first
  - Viewed stories automatically move to end when viewed
  - Implemented in `HomeStoriesBar` component

### Real-Time Synchronization:
- **Cross-Component Sync:** Both `useFavorites` and `useViewedStories` hooks now support real-time synchronization:
  - Custom event system for same-window sync (`favoritesUpdated`, `viewedStoriesUpdated`)
  - Native `storage` event listener for cross-tab/window sync
  - All hook instances automatically update when any instance changes state
- **UX Impact:**
  - Favorites appear in Favorites feed immediately without page reload
  - Story positions update automatically when viewed (moves to end)
  - Works across multiple browser tabs/windows

## [2026-01-10] - Phase 5.3: Category Pills Glassmorphism Refinement
**Status:** Complete

### Category Pills UI Enhancement:
- **Floating Glass Pills:** Refactored category pills to be individual floating glassmorphism elements (no background bar)
- **iOS 26 Glass Container:** Added subtle glass border container around pills with iOS 26-style aesthetic:
  - Extremely subtle backdrop blur (`backdrop-blur-[2px]`)
  - Minimal background opacity (`rgba(255, 255, 255, 0.005)`)
  - Visible border (`rgba(255, 255, 255, 0.12)`) for elegant definition
  - Soft shadows with inset highlight for depth
- **Border Removal:** Removed borders from inactive pills to match ChatButton style
- **Text Shadow:** Added subtle dark text shadow to white text for readability on bright backgrounds
- **Horizontal Extension:** Extended container slightly beyond content area to make left/right borders visible
- **Transparency:** Made all container elements fully transparent to eliminate visible lines
- **HomeStoriesBar:** Removed background bar and blur effects for fully transparent stories container

## [2026-01-10] - Phase 5.4: ModelCard Visual Overhaul & Verified Badge System
**Status:** Complete

### ModelCard Visual Redesign:
- **Icon System Update:**
  - Replaced Heart icon with Star icon for favorites throughout the app
  - Updated favorites feed navigation icon from Heart to Star
  - Favorite button converted to pill shape (top-left) matching "New" tag height
- **Verified Badge System:**
  - Replaced BadgeCheck icon with custom verified badge SVG (`/verified-badge.svg`)
  - Applied custom badge to ModelCard, Profile Page, and StoryViewer
  - Badge features blue-to-purple gradient with white checkmark (scalloped star design)
- **Layout Improvements:**
  - Centered model name with verified badge inline
  - Tags limited to 3 max with bullet separators (•)
  - Tags left-aligned (first tag always visible, never cut off)
  - Added pill-shaped container for tags with iOS 26-style right fade effect
  - Enhanced bottom vignette gradient for better text readability on bright photos
- **Badge Positioning:**
  - Combined "New" badge with online status dot (top-right)
  - "New" badge extends horizontally with online dot inside on the right
  - Favorite star pill positioned at top-left, same vertical level as "New" badge
  - Both badges use `py-1` and `text-xs` for consistent sizing

### Component Updates:
- **ModelCard:** Complete visual overhaul with new badge system and layout
- **FixedHeader:** Favorites feed icon changed from Heart to Star
- **Model Profile Page:** Added "New" badge with online dot combination
- **StoryViewer:** Updated to use custom verified badge SVG

## [2026-01-10] - Phase 5.5: Category Pills iOS 26 Redesign & Separator Lines
**Status:** Complete

### Category Pills Container Redesign:
- **Horizontal Bar Style:**
  - Converted from rounded container to full-width horizontal bar
  - Container height set to 56px with invisible background (100% transparent)
  - All container divs made 100% invisible (no background, border, or shadow)
  - Pills positioned with 8px left padding offset
- **iOS 26 Glass Effect:**
  - Active pills use subtle glass effect (`bg-[#7A27FF]/30` or `bg-[#00FF85]/30`) instead of solid colors
  - Inactive pills have floating glass effect with `border-white/20`
  - Removed shadows from inactive pills to eliminate background interference
  - All pills maintain backdrop-blur-xl for glassmorphism
- **Vertical Alignment:**
  - Pills vertically centered in 56px container with 2px bottom offset
  - Padding: 18px top, 14px bottom for perfect alignment

### Separator Lines Implementation:
- **Header Separator:** Added `border-b border-white/10` to FixedHeader
- **Stories-Pills Separator:** 376px wide line between HomeStoriesBar and CategoryPills
- **Pills-Cards Separator:** 348px wide line (smaller opacity `border-white/5`) between pills and model cards
- **Model Cards Spacing:** Added 16px top margin to FeedManager wrapper

### Technical Details:
- **FilterableFeed:** Full-width invisible container with 56px height
- **CategoryPills:** Simplified structure, removed unnecessary wrappers
- **Horizontal Scrolling:** Maintained with `overflow-x-auto scrollbar-hide`
- **Feed State Colors:** Dynamic active pill colors (Emerald for 'near', Violet for 'new')

## [2026-01-10] - Phase 5.6: StoryViewer Instagram-Style Behavior
**Status:** Complete

### Instagram-Style StoryViewer Refactor:
- **Progress Tracking System:**
  - Replaced CSS-only progress bars with JavaScript interval-based tracking (16ms updates, ~60fps)
  - Progress freezes at exact position when paused (doesn't reset to 0)
  - Added `progress`, `storyStartTime`, `pausedProgress` state variables
  - Created `pauseStory()` and `resumeStory()` helper functions for consistent progress capture
- **UI Hiding on Long Press:**
  - Long press now hides all UI elements (header, progress bars, action bar) for immersive viewing
  - Added `isUIHidden` state with 200ms fade transitions
  - Reduced long press timer from 200ms to 150ms for snappier feel
  - UI automatically restores on release with smooth fade-in
- **Share Integration:**
  - `handleShare` now pauses story while share sheet is open
  - Automatically resumes after share completes (success or cancel)
- **Removed Elements:**
  - Removed pause icon overlay (glassmorphism pause indicator) for cleaner Instagram-style experience
- **Touch & Keyboard Improvements:**
  - Updated drag handlers to use pause/resume helpers for consistent progress tracking
  - Keyboard spacebar handler uses pause/resume functions
  - Touch handlers properly restore UI on release
- **Navigation System:**
  - **Tap/Click Navigation:** Stories within same group navigate via tap (left/right tap zones)
  - **Swipe Navigation:** Horizontal swipe navigates between story blocks/groups (Instagram mobile web style)
  - **Vertical Swipe:** Vertical swipe down closes story instantly (no animation)
  - **No Horizontal Animation:** Removed all 3D cube animations for instant navigation between groups
  - Navigation is now instant and clean, matching Instagram's mobile web behavior

### Deferred Features:
- **Rounded Corners (Future Implementation):**
  - Instagram-style rounded corners (`borderRadius: 1.75rem`) deferred to future version
  - Implementation attempted but encountered cross-device/viewport compatibility issues
  - Will be revisited with a more robust approach in a future update

## [2026-01-11] - Phase 5.7: StoryViewer Model Profile Optimization & Bug Fixes
**Status:** Complete

### Model Profile Story Customization:
- **Long Press Disabled:** Added `disableLongPress` prop to `StoryViewer` component
  - Model profile stories: Long press does nothing (no pause, no UI hiding)
  - Main layout stories: Long press pause works as before
  - Prevents accidental UI hiding in model profile context
- **Doubled Story Duration:** Story duration automatically doubled in model profile
  - Base duration: `currentStory?.duration || 5` seconds
  - Model profile: `baseDuration * 2` (10 seconds default)
  - Main layout: Unchanged (5 seconds default)
  - Rationale: Since pause is disabled, longer duration compensates for viewing time
- **Share Button Enhancement:** Share button in model profile now auto-copies URL to clipboard
  - Model profile: Copies story URL to clipboard and shows "Link Copied!" toast
  - Main layout: Uses native share sheet with pause/resume (unchanged)
  - Toast notification: 2-second display with Electric Emerald styling

### Bug Fixes:
- **Duplicate Progress Bars:** Fixed duplicate/fake loading bars appearing during transitions
  - Added `key` prop to progress bars container based on `group.id`
  - Added `key` prop to header container based on `group.id`
  - Ensures React properly replaces elements when group changes
  - Prevents visual artifacts during model-to-model navigation
- **UI Hiding on Navigation:** Fixed UI elements hiding when navigating between stories/models
  - Cleared long press timer in all navigation handlers (`handleNextStory`, `handlePrevStory`, `handleNextModel`, `handlePrevModel`)
  - Added immediate timer clearing in `onPointerUp` handlers
  - Added timer ID tracking to prevent race conditions
  - Timer callback now checks if it's still active before executing
  - Always resets `isUIHidden` to `false` when clearing timer
  - Fixed mobile-specific issue where timer could fire after touch release
- **Progress Bar Memory:** Fixed progress bar resetting to beginning when resuming from pause
  - Separated progress reset logic into separate `useEffect` for story changes only
  - Progress no longer resets when resuming from pause
  - `pausedProgress` is preserved and used correctly to calculate resume position
  - Progress only resets when navigating to a new story, not when resuming

### Technical Implementation:
- **Timer Race Condition Prevention:**
  - Added `longPressTimerId` ref to track active timer ID
  - Timer callback checks if it's still the active timer before executing
  - Prevents stale timer callbacks from hiding UI
- **Touch Duration Tracking:**
  - Added `touchStartTime` ref to detect quick taps (< 150ms)
  - Ensures UI stays visible for quick taps on mobile
- **State Management:**
  - All navigation handlers now clear timers and reset UI state immediately
  - Progress state properly preserved during pause/resume cycles
  - Consistent behavior across desktop and mobile platforms

## [2026-01-11] - Phase 5.8: Desktop Model Profile Layout Optimization
**Status:** Complete

### Desktop Layout Refinements:
- **Fixed Container Architecture:**
  - Model info panel: Fixed height container with internal vertical scrolling only
  - Stories block: Fixed height container with internal scrolling, bottom border always visible
  - Gallery block: Fixed height with vertical scrolling
  - Prevents page-level scrolling, all scrolling contained within panels
- **Sticky Elements:**
  - Model name, verified badge, and online dot: Sticky at top of scrollable content
  - Chat button: Sticky at bottom of model info panel
  - Both elements remain visible during scrolling
- **Visual Improvements:**
  - Reduced model name font size by 10% on desktop (`lg:text-[1.6875rem]`)
  - Category pills: Moved 8px to the right, removed neon glow effect
  - Separator lines: Extended to full width on desktop (stories-pills and pills-cards)
  - Stories block: Centered "STORIES" heading text
  - Model name layout: "New" tag appears below name; online dot inline for non-new profiles
- **Chat Button Desktop Optimization:**
  - Extended horizontally by 10% (`lg:scale-x-[1.1]`)
  - Reduced font size by 30% on desktop (`lg:text-sm`)
  - Reduced vertical height by 15% on desktop (`lg:h-[47.6px]`)
  - Removed neon glow effect on desktop (kept for mobile)
  - Minimal horizontal padding (`lg:px-3`) for larger button
  - Text always displays on one line (`whitespace-nowrap`)
- **Header Logo Centering:**
  - Desktop: Logo centered in header
  - Mobile: Logo remains left-aligned (unchanged)
- **ModelCard Hover Effect:**
  - Replaced golden top border with subtle emerald glow surrounding entire card
  - Emerald border (`border-[#00FF85]/30`) with layered shadow glow
  - Creates premium hover feedback without distracting golden line
- **Locked VIP Teaser Blur Reduction:**
  - Reduced backdrop blur from `backdrop-blur-xl` (24px) to `backdrop-blur-md` (12px)
  - Reduced background opacity from 70% to 40%
  - Softened gradient vignette for better content preview
  - Enhanced text shadows for readability against lighter background
  - Users can now see model's shape and colors through the blur (enticing teaser effect)

## [2026-01-11] - Phase 5.9: Story Progress Bar Visibility Fix
**Status:** Complete

### Progress Bar Visibility Logic:
- **Main Layout:** Progress bars always visible, even for single-story blocks
  - Rationale: Provides visual feedback and consistency in main feed
  - Condition: `!disableLongPress` (main layout context)
- **Model Profile:** Progress bars hidden for single-story blocks, visible for multiple stories
  - Rationale: Reduces UI clutter when only one story exists
  - Condition: `disableLongPress && stories.length > 1` (model profile with multiple stories)
- **Implementation:**
  - Updated condition: `{(!disableLongPress || stories.length > 1) && (...)}`
  - Ensures main layout always shows progress bars regardless of story count
  - Model profile only shows progress bars when multiple stories exist

## [2026-01-11] - Phase 5.10: Instagram-Style Story View Tracking
**Status:** Complete

### Story-Level View Tracking:
- **Architecture Change:** Migrated from group-level tracking to individual story-level tracking
- **Storage Key:** Changed from `'transpot-viewed-stories'` to `'transpot-viewed-story-ids'`
- **Hook Functions:**
  - `markStoryAsViewed(storyId)` - Mark individual story as viewed
  - `isStoryViewed(storyId)` - Check if individual story was viewed
  - `hasUnseenStories(stories[])` - Check if group has any unseen stories
  - `isGroupFullyViewed(stories[])` - Check if all stories in group are viewed
  - `getFirstUnseenStoryIndex(stories[])` - Get resume index (oldest unseen)

### Visual Behavior:
- **Gradient Ring:** Group has at least one unseen story (appears in sorted position: left)
- **Gray Ring:** All stories in group have been viewed (sorted position: right)
- **Pinned Groups:** Always show gray ring (pinned stories don't have seen/unseen dynamic)

### Resume Playback:
- Stories resume from oldest unseen story, not from beginning
- If all stories seen, playback starts from index 0
- Works consistently across main layout and model profile
- URL state includes `?story=GROUP_ID&si=INDEX` for persistence across navigation

### Cross-Component Sync:
- Same localStorage key used everywhere
- Real-time sync via custom events (`viewedStoryIdsUpdated`) + storage events
- Viewing story on model profile updates main layout instantly
- No manual refresh required for state consistency

### Component Updates:
- **StoryViewer:** Marks stories as viewed when displayed, accepts `initialStoryIndex` prop
- **StoryCircle:** Uses `hasUnseenStories` to determine ring color
- **HomeStoriesBar:** Sorts by unseen status, calculates and passes initial index
- **StoriesContainer:** Calculates initial index for model profile stories

## [2026-01-11] - Phase 5.11: Story Chain Navigation Fix
**Status:** Complete

### Problem:
- When navigating between unseen story groups, the system was jumping to seen groups instead of staying within the unseen chain
- Chain arrays (`unseenGroups`, `seenGroups`) were recalculating in real-time as stories were viewed, causing groups to disappear from chains mid-navigation

### Solution - Chain Snapshot Mechanism:
- **Snapshot at Open Time:** When a story viewer opens, the chain group IDs are snapshotted into `activeChainGroupIds` state
- **Navigation Uses Snapshot:** All neighbor calculations during navigation use the snapshot instead of current chain state
- **Chain Isolation:** Users stay within the same chain (unseen or seen) throughout their navigation session, even if groups change status
- **useEffect Protection:** The `useEffect` that recalculates neighbors only runs on initial open (when `activeChainGroupIds` is null), preventing it from overwriting snapshot-based neighbors during navigation

### Implementation Details:
- `getNeighborsForGroup` accepts optional `chainGroupIds` parameter for snapshot-based lookup
- `handleNavigate` uses `activeChainGroupIds` snapshot to find neighbors
- Snapshot is cleared when viewer closes, allowing fresh calculation on next open
- Ensures consistent navigation experience: 3 unseen models → navigate through all 3 unseen models in sequence

## [2026-01-XX] - Phase 5.12: Brand Rebranding & UI Polish (Version 1.0 Final)
**Status:** Complete

### Brand Identity Update:
- **Rebranding:** Changed from "TranSpot" to "TransHere" across all components and metadata
- **Color Scheme:** 
  - "Trans" in Cyber Violet (`#7A27FF`)
  - "Here" in Green Emerald (`#00FF85`)
- **Logo Integration:** Added pulsing page logo (`Page-logo.svg`) to header, replacing MapPin icon
- **Logo Animation:** Implemented `logo-pulse` keyframe animation (scales 1x to 1.3x) to indicate proximity
- **Logo Size:** Increased minimum size by 50% (12px to 18px) for better visibility

### Profile Header Refinements:
- **Mobile Header:**
  - Back button: Brighter violet (`#B794F6`) for better readability with glass effect
  - Share button: Green Emerald (`#00FF85`)
  - Both buttons: Glassmorphism pills with shadows for text/icon readability
- **Desktop Header:** Brand name encapsulated in glassmorphism pill with dark opaque background
- **Gradient Overlay:** Added smooth dark obsidian gradient below header to prevent content hiding

### Conversion Card Optimization:
- **Typography:** Changed from serif (Playfair Display) to sans-serif (Montserrat) for better readability
- **Content Simplification:** Removed redundant "Unlock exclusive content" subtitle (button already conveys this)
- **Visual Enhancements:**
  - Added rich gold borders (`border-2 border-[#D4AF37]/40`) to lock icon circle and conversion button
  - Enhanced shadows for better readability on bright backgrounds
  - Reduced blur by 20% (`backdrop-blur-md` → `backdrop-blur-[10px]`, `backdrop-blur-lg` → `backdrop-blur-[13px]`, `backdrop-blur-xl` → `backdrop-blur-[19px]`) for better content visibility
  - Added layered black shadows to lock icon, heading text, and button for depth and readability

### Files Modified:
- `src/app/layout.tsx`: Updated page title metadata
- `src/app/model/[slug]/page.tsx`: Brand name, gradient overlay, padding adjustments
- `src/components/features/profile-gallery.tsx`: Conversion card typography, borders, shadows, blur reduction
- `src/components/features/story-viewer.tsx`: Brand name in share title
- `src/components/layout/fixed-header.tsx`: Brand name, logo integration, pulsing animation
- `src/components/layout/profile-header.tsx`: Brand name, button colors, glassmorphism styling
- `src/components/layout/profile-header-client.tsx`: Brand name, button colors, glassmorphism styling
- `src/app/globals.css`: Added `logo-pulse` keyframe animation

### [Current Date] - Analytics Dashboard Enhancement
- **Database Schema Update:**
  - Created migration `014_add_analytics_fields.sql` to add missing fields:
    - `model_slug`: Direct filtering without joins
    - `page_path`: URL path tracking
    - `referrer`: HTTP referrer header
    - `user_agent`: Device/browser tracking
  - Added indexes for performance: `model_slug`, `page_path`, `country`, `event_type`
- **API Route Enhancement (`src/app/api/analytics/route.ts`):**
  - Updated to accept and store all required fields (`modelSlug`, `pagePath`)
  - Extracts `referrer` and `user_agent` from request headers
  - Uses middleware headers (`x-user-country`, `x-user-city`) with Cloudflare/Vercel fallbacks
  - Made `modelId` optional to support home page views
- **Analytics Hook Update (`src/hooks/use-analytics.ts`):**
  - Refactored to accept `AnalyticsParams` object with `modelId`, `modelSlug`, `pagePath`
  - Uses `usePathname()` for automatic page path detection
  - Memoized `sendEvent` with `useCallback` for performance
  - Updated `trackView` and `trackClick` to accept optional params
- **Component Updates:**
  - `ModelViewTracker`: Now accepts and passes `modelSlug` prop
  - `ChatButton`: Now accepts and passes `modelSlug` prop
  - `ProfileGallery`: Now accepts and passes `modelSlug` prop
  - Model page (`src/app/model/[slug]/page.tsx`): Passes `modelSlug={slug}` to all components
- **TypeScript Types:**
  - Updated `AnalyticsEvent` interface in `src/types/analytics.ts` to include all new fields
  - All fields are nullable to support backward compatibility

### [Current Date] - Admin Dashboard Enhancements & iOS 26 Date Picker
- **Pinned Blocks Management:**
  - Added ability to upload stories directly to pinned blocks via "Add story" button
  - Implemented cover photo upload functionality for pinned blocks (hover to change)
  - Added drag-and-drop reordering for stories within pinned blocks
  - Added drag-and-drop reordering for pinned blocks themselves (vertical)
  - Created migration `016_add_stories_sort_order.sql` to support story ordering
  - Created API endpoint `/api/admin/stories/reorder` for story reordering
  - Updated `PinnedBlocksManager` component with full drag-and-drop support
  - Stories API now accepts optional `group_id` parameter for direct story assignment

- **Analytics Dashboard Custom Date Range:**
  - Added "Custom Range" option to time period filter
  - Implemented custom date range selection with start and end dates
  - Updated `TimePeriod` type to include `'custom'` option
  - Modified dashboard API to accept `startDate` and `endDate` query parameters
  - Added validation message when custom dates are not selected

- **iOS 26 Style Date Picker Component:**
  - Created custom `DatePicker` component (`src/components/ui/date-picker.tsx`)
  - Implemented glassmorphism styling with backdrop blur
  - Used Midnight Spectrum color palette (Electric Emerald for selected dates)
  - Added smooth animations and transitions
  - Features: month/year navigation, "Today" and "Clear" buttons
  - Fixed timezone issues by using local date formatting instead of UTC
  - Replaced native HTML date inputs in analytics dashboard with custom picker

- **UI/UX Improvements:**
  - Updated model profile photos in admin dashboard to circular shape
  - Added profile pictures to analytics dashboard model cards
  - Updated verified badge styling to match main page
  - Added gray border around model profile pictures in dev dashboard
  - Enhanced checkbox styling in ModelBasicInfo to match iOS 26 aesthetic

### [Current Date] - R2 File Deletion & Cleanup System
**Status:** Complete

- **R2 Utility Functions:**
  - Created `src/lib/r2-utils.ts` with centralized R2 deletion utilities
  - Functions: `deleteFromR2`, `deleteMultipleFromR2`, `deleteModelFolder`, `extractKeyFromUrl`
  - Helper functions: `getStoryMediaKeys`, `getGalleryItemMediaKeys` (bucket-aware)
  - Supports both `R2_ENDPOINT` and `R2_ACCOUNT_ID` environment variable patterns
  - Automatic WebM variant detection for video files

- **API Route Updates:**
  - **Gallery Delete API:** Now deletes associated R2 files (images, videos, posters) from correct bucket
  - **Story Delete API:** Deletes story media files including WebM variants and posters
  - **Story Group Delete API:** Cascading deletion of all stories and their R2 files
  - **Model Delete API:** Complete cleanup of all associated content (gallery items, stories, story groups) from both R2 buckets
  - All deletion APIs include comprehensive error handling and logging

- **Upload Route Enhancement:**
  - Added `bucket` parameter to support routing to correct bucket
  - Gallery items now upload to `trans-image-directory` bucket (models bucket)
  - Stories continue to use `stories` bucket
  - Automatic bucket detection based on upload type

- **Admin Dashboard Updates:**
  - Gallery Manager: Updated to use `models` bucket for gallery uploads
  - Admin Dashboard: Updated `uploadFileToR2` to support bucket parameter
  - Gallery uploads now use model-slug paths (e.g., `valentina-aguirre/timestamp-file.webp`)
[2026-01-19] - Phase 6.6: High-Volume Analytics (v1.2) - Materialized Views & Stat Sync
**Status:** Complete

- **Infrastructure Scaling:**
    - Transitioned from raw event querying to **Materialized Views** for high-volume performance.
    - Created `analytics_daily_stats` and `analytics_hourly_stats` for optimized sub-second queries.
    - Implemented a **Materialized View Refresh System** (`refresh_analytics_views` RPC) with manual UI trigger and status logging.

## [2026-01-20] - Phase 6.11: Performance Optimization & Stealth Analytics (v1.3)
**Status:** Complete

- **Preconnect hints:** Created `PreconnectHints` client component to inject early DNS/TLS handshakes for OnlyFans/Fansly domains, reducing perceived navigation latency by 100-300ms.
- **Stealth Logger:** Created `src/lib/stealth-logger.ts` for non-blocking telemetry capture and logging, specifically designed to bypass access restrictions within Next.js `after()` callbacks.
- **Bridge Page Integration:** Implementation of the `after()` API in `src/app/[slug]/page.tsx` for zero-latency logging, ensuring analytics never block the user's redirection flow.
- **Enhanced Bot Filtering:** Merged and expanded bot detection patterns (ByteSpider, GPTBot) to preserve analytics integrity.

- **Dashboard Synchronization Engine:**
    - **Single-Source Truth:** Completely refactored the dashboard API to derive *all* breakdowns (Traffic Sources, Countries, Sidebar) from the core filtered dataset. This eliminates discrepancies between "Total Views" and the sum of source cards.
    - **Source Mapping Fix:** Implemented mapping from Source Names (e.g., "Instagram") to Link UUIDs in the API, resolving the "No data found" filter bug.
    - **Country Filter Stability:** Fixed a parameter naming mismatch (`country` vs `countries`) between the frontend and API.

- **Granularity & Performance:**
    - Added **Hourly Resolution** for "Today" and "Last Hour" filters using dedicated hourly views.
    - Verified sub-500ms query performance with **400,000+ records**.
    - Fixed source grouping to consolidate multiple individual tracking links into unified platform buckets (Instagram, X, etc.).

[2026-01-16] - Phase 6.5: Admin Dashboard UI Overhaul & Metric Color Standardization
**Status:** Complete

- **Admin Dashboard UI Refresh:**
    - Fully implemented the **iOS 26 Liquid Glass aesthetic** for Light Mode.
    - Optimized StatCards, breakdown sections, and tables with sophisticated glassmorphism effects (backdrop blur, saturation, and subtle specular highlights).
    - Unified the "Midnight Spectrum" (Dark) and "Solar Spectrum" (Light) palettes for a premium, theme-agnostic experience.

### [2026-01-19] - Analytics Performance Optimization (Materialized Views)
- **Database Migration:** Created `026_analytics_materialized_views.sql` to pre-aggregate analytics data (Daily, Hourly, Model, Country, Source).
- **Goal:** Sub-500ms dashboard queries for 1M+ monthly events.
- **Implementation:**
    - `analytics_daily_stats`: Aggregates views/clicks by date, model, country, source.
    - `analytics_hourly_stats`: 7-day hourly window for real-time charts.
    - `analytics_source_summary`: Pre-calculated totals for traffic sources.
    - `analytics_model_summary`: CTR and performance metrics per model.
    - `analytics_country_summary`: Geographic distribution stats.

### [2026-01-19] - Analytics Refresh Automation Architecture (v1.1.9)
- **Database Migration:** Created `027_analytics_refresh_system.sql`.
- **System Configuration:** Introduced `system_config` table to track global settings and last refresh metadata.
- **Refresh Engine:**
    - `refresh_analytics_views()`: Atomic function that refreshes all materialized views concurrently with error recovery.
    - `analytics_refresh_needed()`: Intelligent threshold check for automated refresh triggers.
- **Permissions:** Secured functions with `SECURITY DEFINER` and appropriate role-based execution grants.

- **Metric Color Standardization:**
    - Established a definitive color coding for key metrics: **Views = Apple Blue (#007AFF)** and **Clicks = Apple Purple (#AF52DE)**.
    - Applied this scheme consistently across all dashboard components, including Chart lines, StatCard values, Sidebar indicators, and breakdown pills.
    - Updated all iconography and text labels to match this visual hierarchy, improving data readability at a glance.
- **Theme Engine Refinement:**
    - Replaced the legacy Sidebar theme switch with a clean, segmented iOS-style `ThemeToggle`.
    - Fixed a critical CSS specificity bug in `admin-theme.css` that was blocking custom metric colors in light mode.
    - Transitioned to an inheritance-based default coloring system, allowing Tailwind's functional classes to correctly override themes.
- **Layout Improvements:**
    - Standardized loader spinners and button selection states to use the core brand blue (`#007AFF`).
    - Standardized "Clear all" buttons and refresh indicators for a cohesive "pro" interface feel.
    - Verified all changes via browser subagent in both Light and Dark modes to ensure perfect visual fidelity.

- **Status:** v1.1.9 Admin UI is 100% complete and verified. Ready for Phase 7 implementation.
- **Responsive Redesign (Mobile-First):**
    - Refactored `AdminSidebar` to use an overlay mode on mobile with a frosted glass backdrop.
    - Added a hamburger menu toggle in the main dashboard header for small viewports.
    - Guaranteed main content stability on desktop when toggling the sidebar.
- **Accessibility & Keyboard Navigation:**
    - Implemented `Cmd/Ctrl + K` to focus the model search.
    - Implemented `Cmd/Ctrl + \` to toggle the sidebar.
    - Standardized `Escape` key behavior to close editors, modals, and managers.
    - Added high-visibility focus rings to all interactive sidebar elements.
- **Model Management & Safety:**
    - Relocated model deletion to a dedicated "Danger Zone" in the Model Editor.
    - Implemented an `AlertDialog` confirmation with an explicit warning about permanent data loss.
    - Simplified the sidebar by removing low-value legacy actions (Quick Upload, direct Delete).
- **Visual Polish:**
    - Integrated "Liquid Glass" effects into `StatCard` components.
    - Applied subtle `scale-up` animations on hover for sidebar model items.
    - Ensured consistent theme persistence (Solar Spectrum) across all sub-components.

### [2026-01-16] - Documentation Finalization & Codebase Sync
- Updated `README.md` to reflect the current state of Admin v1.1.
- Synchronized all local changes with the remote Git repository.
  - Enhanced card interactions with 3D lift transforms on hover.
- **Component Modernization:**
  - Refactored `DatePicker` to be fully theme-aware with premium glassmorphism styling.
  - Optimized filter icons with `z-index` and standardized color classes for light mode visibility.
- **Persistence & Synchronization:**
  - Integrated `useAdminTheme` hook into the main admin layout to ensure theme preferences persist across refreshes.
  - Verified cross-tab/refresh synchronization of theme states.
  - **Analytics Refresh FIX:** Updated `/api/admin/refresh-views` to correctly use `ADMIN_KEY` from environment variables and implemented a robust fallback mechanism in the PostgreSQL refresh function to handle initial population of materialized views.
- **Documentation:**
  - Updated `version_1,1.md` and `.cursorrules` with the new Admin Design System standards.


- **Bucket Detection Logic:**
  - Smart bucket detection based on URL domain or path pattern
  - Handles legacy gallery items that may be in `stories` bucket
  - New gallery items automatically go to `models` bucket
  - Deletion works for files in either bucket

### [2026-01-13] - Production Upload Limitation (Known Issue)
**Status:** Workaround Implemented

- **Issue:** Production uploads via `/api/upload/proxy` encounter "DOMParser is not defined" errors in Edge runtime
  - AWS SDK attempts to parse XML error responses using DOMParser
  - DOMParser is not available in Cloudflare Edge runtime environment
  - Multiple attempts to resolve: Buffer → Uint8Array, presigned URL + fetch, error handling improvements
  - Root cause: AWS SDK v3 XML deserialization requires DOMParser in Edge runtime

- **Current Workaround:**
  - **Content uploads must be performed from localhost** (`npm run dev`)
  - Admin dashboard upload functionality works correctly in local development environment
  - Production site (`transhere.vip`) uploads are disabled until issue is resolved

- **Deferred to Future Version:**
  - Implement native R2 REST API upload (bypass AWS SDK entirely)
  - Or migrate to Node.js runtime for upload endpoints (if Cloudflare supports it)
  - Or use alternative upload method (direct client-side presigned URL uploads with proper CORS)

- **Impact:**
  - Content management (stories, gallery items) must be done locally
  - All other production features work correctly
  - File deletion and cleanup utilities work in production

### Version 1.0 Status:
**✅ OFFICIALLY COMPLETE - READY FOR GLOBAL DEPLOYMENT**

All planned features implemented, tested, and polished. The platform is production-ready with:
- Complete brand identity (TransHere)
- Optimized conversion funnel
- Instagram-style story system
- Visual memory features
- Real-time synchronization
- Mobile-first responsive design
- Zero-cost infrastructure (Cloudflare Pages + R2)
- Enhanced analytics tracking with comprehensive field logging
- Full-featured admin dashboard with drag-and-drop management
- iOS 26 style UI components with glassmorphism effects
- **Complete R2 file lifecycle management (upload, delete, cleanup)**

## [2026-01-15] - Phase 6: Tracking & Analytics Upgrade (v1.1)
**Status:** Complete

- **Type Definitions:** Unified tracking interfaces in `src/types/tracking.ts` and exported via barrel.
- **Bot Detection:** Created `src/lib/bot-detection.ts` for filtering crawler traffic.
- **Caching Layer:** Implemented `src/lib/tracking-cache.ts` using Next.js 15 `unstable_cache`.
- **Server Actions:** Created `logTrackingEvent` and `incrementTrackingLinkClicks` for non-blocking analytics.
- **Route Handler:** Implemented `/model/[slug]/[trackingSlug]/route.ts` with Edge Runtime and `after()` callback.
  - *Verification Note:* Discovered `after()` does not trigger in Edge runtime on localhost. System verified by temporarily switching to Node runtime locally.
- **Bot Filtering:** Validated that HEAD requests are skipped while GET requests are logged in the partitioned table.
- **Architecture:** Standardized 1-hour TTL for tracking links and 307 redirects for method preservation.
### [Current Date] - Advanced Analytics Dashboard & Visualization Upgrade
**Status:** Complete

- **Analytics Visualization Engine:**
  - **New Chart Components:**
    - `ComparisonChart`: Interactive area chart for visual traffic comparison (Current vs Previous period).
    - `ModelComparisonChart`: Multi-line chart for comparing performance across multiple models simultaneously.
    - Features: Custom tooltips with percentage deltas, dynamic color assignment, metric toggles (Views/Clicks).
  - **Chart Architecture:** Built on `recharts` with a custom Type system (`src/types/charts.ts`) and unified color palette.

- **Unified Dashboard Filtering System:**
  - **Component:** `DashboardFiltersBar` providing centralized control.
  - **Capabilities:**
    - **Time Period:** Presets (7d, 30d, 90d) + Custom Date Range (via iOS 26 DatePicker).
    - **Traffic Source:** Deep filtering by Source and Subtags.
    - **Country:** Dropdown with search support.
    - **Model Selection:** Multi-select interface with search and avatar visualization.

- **Dashboard Integration (`AnalyticsDashboard`):**
  - **Dynamic Layout:** Automatically switches between Single-View (ComparisonChart) and Multi-View (ModelComparisonChart) based on selection.
  - **Interactive Elements:**
    - Clickable Stat Cards for instant metric focus.
    - Clickable Source/Country cards to apply filters.
    - Selectable Model Cards for quick comparison.
  - **Real-Time Data:** Auto-refreshing data fetcher with optimistic UI updates.

- **API Optimization:**
  - **Performance:** Replaced complex SQL joins with efficient in-memory mapping to resolve `500 Internal Server Error` on Supabase joins.
  - **Data Generation:** Added server-side logic (`generateModelComparisonData`) to process multi-dimensional analytics datasets.

### [2026-01-15] - Phase 6.2: Dashboard Stability & Data Scaling (v1.1.6)
**Status:** Complete

- **Data Integrity Fixes:**
  - **Resolved "Vanishing Data" Bug:** Identified that Supabase PostgREST defaults to 1000 rows. Dashboard was fetching only the first 1000 events. Implemented **recursive pagination (chunked fetching)** in the API to support datasets up to 10k+ events, ensuring full visibility of large traffic periods. Switch to `DESC` ordering was also maintained to prioritize recent data.
  - **Traffic Attribution Fixed:** Corrected the database relation name in the API fetch (`tracking_subtags`) which was causing all traffic sources to appear as "Unknown".
  - **UTC Standardization:** Standardized all date-range calculations to strict UTC to ensure consistency between frontend filters and database storage.
- **UI/UX Robustness:**
  - **Chart Layout Fix:** Resolved Recharts dimension errors (-1 width/height) by enforcing `min-height` on parent containers.
  - **StatCard Scalability:** Added shorthand formatting (K/M) for large numbers to handle thousands/millions of events comfortably.
- **Mock Data Excellence:**
  - Created `023_comprehensive_mock_data.sql` to generate a realistic mix of Organic and Tracking Link traffic.
  - Verified 100% accurate attribution in the dashboard across Countries, Sources, and Models.
- **Verification:**
  - Created `check-all-tables.ts` utility to audit database state independently of the API.
  - Verified 10k event processing capacity locally.

## [2026-01-15] - Filter Logic & DatePicker "Portal" Stabilization
**Status:** Complete (Phase 6.3)

- **DatePicker "Portal" Refactor:**
  - **The Problem:** The calendar popup was getting hidden behind other dashboard elements and cut off by container boundaries.
  - **The Fix:** Implemented `react-dom/createPortal` to render the calendar at the body level.
  - **Smart Logic:** Added viewport detection to automatically flip the calendar above the button if space is limited (preventing off-screen rendering).
  - **Timezone Fix:** Resolved a bug where the selected date appeared "one day early" by standardizing on local date parsing instead of UTC strings.

- **Dashboard Filter Improvements:**
  - **Atomic Updates:** Fixed a bug where clicking time period presets did nothing. The issue was multiple rapid state updates causing race conditions; consolidated into a single atomic update.
  - **UX Streamlining:** Processed user request to make custom date inputs always visible. You no longer need to click "Custom Range" to see the date pickers; they are now a permanent part of the time period menu.
  - **UI/UX Polish:** Added `stopPropagation` and `cursor-pointer` to filter buttons to ensure reliable interactions inside liquid-glass containers.

- **Database & Data Integrity:**
  - **Country Bug Fixed:** Discovered a logic error in the SQL mock data generator (`025_fix_country_randomization.sql`) where an array indexing error limited results to only AU/BR.
  - **API Extraction:** Updated the dashboard API to return unique countries sorted by recency, ensuring the dashboard accurately reflects the latest traffic trends even with large historical datasets.
  - **Verification:** Re-generated 7,000+ events and verified perfect distribution across all 10 countries (US, GB, CA, AU, DE, FR, ES, MX, CO, BR).
[2026-01-16] - Tracking Link Management Integration (Phase 6)
**Status:** Complete

#### Core Implementation:
- **Tracking Link System:**
  - Implemented `/api/admin/tracking-links` and `/api/admin/tracking-links/[linkId]` routes.
  - Features: Automated slug generation (`c1`, `c2`, etc.), campaign source attribution, and subtag support.
  - Implemented soft-delete (archival) logic to preserve historical data.
- **Traffic Source Management:**
  - Created `/api/admin/tracking-sources` API for managing global and custom traffic sources.
  - Implemented automatic slug generation for custom sources.
- **UI & Dashboard Integration:**
  - Integrated `TrackingLinkManager` modal into the active admin dashboard (`src/app/admin/page.tsx`).
  - Added a dedicated "Tracking Links" tab with model-level management cards.
  - Enhanced the `TrackingLinkManager` with "Copy to Clipboard" feedback and immersive glassmorphism styling.
- **Subtag Creation Flow**: Integrated real-time subtag creation within the `TrackingLinkManager` modal with granular attribution explanation.
- **Admin Light Mode Synchronization**: Refactored `TrackingLinkManager` to use semantic theme tokens (`bg-card`, `text-foreground`), ensuring full Light Mode support.

#### Technical Fixes & Stability (v1.1.10):
- **Dashboard API**: Fixed "Unknown" traffic sources issue by correcting the table name from `traffic_sources` to `tracking_sources` in the dashboard route.
- **Subtag API**: 
    - Resolved 500 error by switching to the Service Role client to bypass RLS.
    - Added automatic slug generation from subtag names to prevent database constraint violations.
- **Tracking Link Manager**: 
    - Implemented safe hostname extraction for `preview_url` to prevent "Invalid URL" runtime crashes.
    - Updated list view colors for 100% legibility in both light and dark modes.
- **Git Sync**: Completed final synchronization of v1.1 features.

### [2026-01-16] - Phase 6.6: Gallery Video Upload & Management Improvements
**Status:** Complete

- **Gallery Video Upload Modal:**
    - Replaced the previous upload file picker with a refined **Video Upload Modal**.
    - **Dual File Input:** Added separate, validated fields for **MP4/MOV** (Main) and **WebM** (Optimized) files.
    - **Validation:** Enforced mandatory MP4/MOV + WebM pair requirement to ensure cross-platform compatibility and optimal performance.
    - **UX Improvement:** Eliminated user confusion about selecting multiple files simultaneously.

- **Custom Delete Confirmation:**
    - Replaced the erratic native `window.confirm` dialog with a stable **React Delete Modal**.
    - Fixed issues where the confirmation menu would auto-close on some devices.
    - Provides a consistent, detailed warning ("This action cannot be undone") before deletion.

- **Robust Error Handling:**
    - **API Safety:** Updated `ModelEditor` to safely handle non-JSON responses (e.g., 404 HTML pages) gracefully.
    - **Logging:** Implemented detailed console logging for API fetch errors to aid in debugging.

## [2024-01-16] Cloudflare Deployment Fix - Edge Runtime Configuration

### Fixed
- **Cloudflare Pages Deployment Error:**
    - Resolved build failure caused by unconfigured API routes on Cloudflare Pages.
    - **Edge Runtime:** Added `export const runtime = 'edge';` to the following API routes to ensure compatibility with Cloudflare's Edge network:
        - `src/app/api/admin/tracking-links/[linkId]/route.ts`
        - `src/app/api/admin/tracking-links/route.ts`
        - `src/app/api/admin/tracking-sources/[sourceId]/route.ts`
        - `src/app/api/admin/tracking-sources/route.ts`

### [2026-01-18] - Phase 7.1: Multi-file Video Story Upload & UI Refinement
**Status:** Complete

- **Mandatory 3-File Video Story Workflow:**
    - Refactored `StoryManager` and `PinnedBlocksManager` to require exactly three files for video stories: **MP4**, **WebM**, and **WebP** (preview).
    - Implemented a dedicated "Liquid Glass" upload modal to handle the 3-file selection with clear visual validation (check icons).
    - Ensures 100% format cross-compatibility and instant playback feedback via the WebP poster.
- **API & Database Enhancements:**
    - Updated `POST /api/admin/stories` to accept and normalize `poster_url`.
    - Integrated `poster_url` into the video player logic for better initial load experience.
- **Upload Reliability:**
    - Standardized all story and block uploads to use the `/api/upload/proxy` endpoint.
    - Added model-slug based pathing and timestamped filenames for better R2 organization and cache busting.
- **Admin UI Polish:**
    - Optimized the "Add to Recent" trigger in `StoryManager` to intelligently switch between file input (images) and modal trigger (videos).
    - Refactored `PinnedBlocksManager` state management to resolve dragging and ordering conflicts introduced during the shift.
    - Applied consistent "Liquid Glass" styling across all new upload components.

### [2026-01-20] - Phase 1: The Sentry - Edge Middleware Implementation
**Status:** Complete

- **Crawler Detection Engine:**
    - Deployed a case-insensitive regex engine matching 15+ social media scrapers and performance tools (Instagram, TikTok, X, Lighthouse, GTmetrix).
    - Implemented **Legitimate Crawler Whitelisting** using the `cf-verified-bot` header, allowing search engines (Googlebot, Bingbot) to bypass restrictions via Cloudflare's verified reverse DNS system.
- **Server-Side Communication:**
    - Implemented the `x-is-crawler: '1'` custom header for downstream Server Components, enabling conditional rendering for bots vs. real users.
- **Global Site Hardening:**
    - Applied a suite of essential security headers to all responses:
        - `X-Frame-Options: SAMEORIGIN` (Clickjacking protection while preserving social previews).
        - `X-Content-Type-Options: nosniff` (MIME sniffing prevention).
        - `Referrer-Policy: strict-origin-when-cross-origin` (Enhanced privacy).
- **Performance Matching:**
    - Optimized the middleware `matcher` with an advanced negative lookahead regex.
    - Explicitly bypassed execution for static assets (`.webp`, `.jpg`, etc.), API routes, and system files (`robots.txt`, `favicon.ico`) to minimize edge execution costs.
- **Verification:**
    - Successfully validated the implementation via `npm run build` and finalized manual testing procedures.

### [2026-01-20] - Phase 2 & 3: The Ghost Link System - Implementation & Integration
**Status:** Complete

- **URL Obfuscation Library:**
    - Implemented a secure encoding/decoding utility (`src/lib/url-obfuscation.ts`) using Base64 with custom `TH_` prefix.
    - Prevented raw destination exposure in HTML source code.
- **BridgeProtector Component:**
    - Created a specialized client component (`src/components/features/bridge-protector.tsx`) for secure redirection.
    - Implemented dual-state rendering: "View Profile" (bot-facing) vs. "Chat with Me" (user-facing).
    - Integrated with `useAnalytics` for high-fidelity conversion tracking.
- **Full-Site Integration:**
    - Refactored `ModelPage` (`src/app/model/[slug]/page.tsx`) to detect crawler status and pass encoded links.
    - Refactored `ProfileGallery` (`src/components/features/profile-gallery.tsx`) to internalize Ghost Link logic for locked VIP teasers.
- **Documentation & Quality Assurance:**
    - Created a comprehensive manual testing guide (`docs/ghost-link-verification.md`) for production verification.
    - Successfully verified the complete system with a full production build on the Edge runtime.

### [2026-01-20] - Phase 6.9: Story Viewer Integration (Ghost Link System)
**Status:** Complete

- **Story Viewer Security:**
    - Extended URL obfuscation to the "Respond to Story" CTA in `StoryViewer.tsx`.
    - Implemented hydration-safe link decoding to prevent hydration mismatches.
    - Added crawler-aware UI logic: renders "Premium Content" (disabled) for bots vs. "Respond to Story" (functional) for humans.
- **Component Chain Updates:**
    - Updated `StoriesContainer` and `HomeStoriesBar` to propagate crawler status and encoded links.
    - Wired up `page.tsx` (Home & Model) to provide necessary security context.
- **Verification:**
    - Validated all flows via manual testing scenarios (`docs/ghost-link-verification.md`).
    - Successfully built for Edge runtime with strict TypeScript compliance.

### [2026-01-20] - Phase 6.10: Bridge Page Implementation (The Airlock)
**Status:** Complete

- **Additional Security Layer:**
    - Implemented a dedicated "Airlock" page (`/{slug}`) that sits between the user and the destination.
    - Requires explicit user interaction (click) to decode and reveal the final URL.
- **Improved UX/Trust:**
    - Provides a "Trust Signal" with avatar glow effect and branding before leaving the site.
    - Ensures 100% of traffic is real human interaction (no bots can pass the airlock).
- **Core Components:**
    - `getProfileBySlug` (Supabase query) for efficient data fetching.
    - `BridgeAirlock` (Client Component) for secure decoding and "Copy & Go" functionality.
- **Verification:**
    - Verified proper hydration, SEO meta-tag masking, and analytics logging.
    - Confirmed Cloudflare Pages compatibility with Edge Runtime configuration.

### [2026-01-20] - Phase 6.11: Performance Optimization (Preconnect Hints)
**Status:** Complete

- **Latency Reduction:**
    - Implemented `PreconnectHints` component to initiate early DNS lookup, TCP connection, and TLS handshake for OnlyFans and Fansly domains.
    - Saves 100-300ms of perceived latency during the "Airlock" transition.
- **Resource Efficiency:**
    - Integrated bot detection logic to prevent unnecessary preconnections for crawlers.
    - Uses `dns-prefetch` fallback for high-priority resource constraints.
- **Integration:**
    - Seamlessly added to the Bridge Page (`/[slug]`) to prime connections while users read the verification message.
### [2026-01-20] - Phase 6.12: Organization Dashboard Enhancements (v1.2)
**Status:** Complete

- **Dashboard Intelligence:**
    - Integrated `DashboardFiltersBar` for advanced data slicing (7d/30d/90d, Country, Traffic Sources, Model Selection).
    - Implemented a dual-metric comparison system (Views vs. Clicks) for time-series charts.
    - Added a multi-model comparison view that automatically activates when multiple models are selected in filters.
- **Model Detail Side Panel:**
    - Developed a premium glassmorphism slide panel for per-model deep dives.
    - Features instant performance summaries (Views, Clicks, CTR), model-specific trend charts, and geographic reach breakdown.
    - Integrated with `OrganizationModelCard` for seamless drill-down interaction.
- **Theme & Aesthetics:**
    - Integrated `ThemeToggle` and `useAdminTheme` for full Light/Dark mode parity with the admin dashboard.
    - Enhanced component aesthetics with subtle glassmorphism borders and professional loading skeleton states.
- **Backend & API:**
    - Created `/api/org/analytics` route with robust filter parsing and optimized Supabase queries.
    - Implemented secure API key authentication based on organization domain/profile ownership.
- **Bug Fixes:**
    - Resolved `unstable_cache` issues in middleware and addressed multiple TypeScript type collisions across the analytics stack.

[21/01/26] - Organization Tracking Links & Analytics
- **Feature Addition: Organization-Scoped Tracking Links**
  - Implemented a complete tracking link management system within the organization dashboard.
  - **Database Migration**: `028_expand_tracking_links_for_organizations.sql` adds `organization_id`, `destination_url`, and creates a `tracking_link_clicks` table for detailed attribution.
  - **Security**: Strict RLS policies ensure organizations can only manage their own links.
  - **API**: Updated GET/POST/PATCH/DELETE routes to use `createServiceClient` for safe administrative actions (bypassing RLS for specific authorized flows).

- **Dashboard Integration**
  - **New Tab**: Added "Tracking Links" navigation to `src/app/org/[orgId]/page.tsx`.
  - **UI Manager**: Created `TrackingLinksManager` with:
    - Real-time click stats.
    - Automatic slug generation.
    - Copy-to-clipboard functionality.
    - Direct action buttons (Edit, View, Delete) replacing the complex dropdown menu.

- **Redirect System**
  - **Performance**: Utilized Next.js 15 `after()` API to log clicks asynchronously, ensuring non-blocking redirects.
  - **Geolocation**: Integrated Cloudflare Edge headers for country/city tracking.
  - **Route**: `src/app/go/[slug]/route.ts` handles redirects with Model fallbacks.

- **Quality Assurance**
  - **Verification**: Verified full CRUD lifecycle via API and UI testing.
  - **Fixes**: Resolved build errors in `OrgModelsTable` and authentication issues in API routes.

[22/01/26] - Dashboard Container Component (Nebula Grid Structure)
- **Component Creation**: Implemented `dashboard-container.tsx` to enforce the "Nebula" grid layout structure.
- **Architecture**: Unified layout wrapper that accepts `sidebar`, `filters`, and `children` props.
- **Desktop Layout**: CSS Grid `grid-cols-[280px_1fr]` with sticky sidebar and scrollable content area, 24px gap.
- **Mobile Layout**: Single column with slide-over drawer (300ms ease-out transition), hamburger menu button in filter bar, backdrop overlay (200ms fade).
- **Filter Bar**: Sticky positioned below sidebar header with `z-index: 40`, full width of main content area.
- **Responsive Design**: Matches existing admin dashboard aesthetic using `bg-background` and glassmorphism styling.
- **Export**: Added to `src/components/admin/index.ts` barrel export for easy importing.

[22/01/26] - Dashboard Filter Bar Upgrade (Multi-Select Support)
- **Component Extraction**: Created new `dashboard-filters-bar.tsx` component with Radix Popover dropdowns.
- **Country Multi-Select**: Implemented checkbox list with "Select All"/"Clear" actions, max height with scroll.
- **Source Multi-Select**: Added icon-enhanced dropdown for traffic sources (direct, instagram, twitter, onlyfans, fansly).
- **Glassmorphism Styling**: Applied consistent glassmorphism effects with backdrop blur and glass borders.
- **URL Sync Integration**: Connected to existing analytics dashboard with proper `onFiltersChange` callback.
- **Popover Positioning**: Bottom-start alignment with 8px offset, proper z-index stacking.
- **Build Verification**: Confirmed successful compilation and integration with existing codebase.

[22/01/26] - Organization Dashboard Nebula Integration
- **Component Migration**: Successfully integrated Organization Dashboard with shared "Nebula" primitives.
- **Layout Architecture**: Replaced custom layout with `DashboardContainer` component featuring left-sidebar model selection.
- **Security Implementation**: Added organization-scoped model filtering to ensure only organization-owned models appear in sidebar.
- **Filter State Upgrade**: Updated filter structure to match Admin dashboard (`modelSlugs[]`, `countries[]`, `sources[]` arrays).
- **Visual Parity**: Achieved identical UI/UX experience between Admin and Organization dashboards.
- **API Compatibility**: Frontend now sends JSON array parameters (`modelSlugs=["slug1"]&countries=["US"]&sources=["instagram"]`).

[22/01/26] - Organization Analytics API Enhancement
- **Parameter Parsing**: Added JSON array support for `modelSlugs`, `countries`, and `sources` parameters with backward compatibility.
- **Security Verification**: Implemented explicit organization ownership validation - rejects requests for models not belonging to the authenticated organization.
- **Response Enhancement**: Properly typed `availableSources` with required `AggregatedTrafficSourceOption[]` interface including `value` and `icon` properties.
- **API Parity**: Organization Analytics API now accepts identical filter parameters as Admin API, ensuring complete feature parity.
- **Build Success**: All changes compile successfully with no TypeScript errors, ready for production deployment.
