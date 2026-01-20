# Ghost Link Implementation Verification

This guide outlines the mandatory checks and manual testing scenarios to verify the "Ghost Link" security system for TransHere.vip.

## Build Verification
- [ ] `npm run build` completes without errors
- [ ] No TypeScript type errors
- [ ] No unused imports warnings

## File Changes Verification
- [ ] `src/lib/url-obfuscation.ts` created and contains `encodeDestination`/`decodeDestination`
- [ ] `src/components/features/bridge-protector.tsx` created and handles crawler blocking
- [ ] `src/app/model/[slug]/page.tsx` updated to use `BridgeProtector` and encode URLs
- [ ] `src/components/features/profile-gallery.tsx` updated to handle internal VIP teaser obfuscation

## Manual Testing Scenarios

### Test 1: Normal User Flow (Chrome DevTools)
1. Open Chrome DevTools → Network tab.
2. Navigate to a model profile page.
3. View Page Source (`Ctrl+U` or `Cmd+Option+U`).
4. Search for "onlyfans.com" or "fansly.com".
5. **EXPECTED**: URL should NOT appear in source. Look for `TH_` prefixed Base64 strings instead.

### Test 2: Click Behavior
1. Navigate to model profile.
2. Click the main "Chat with Me" button.
3. **EXPECTED**: New tab opens with the OnlyFans/Fansly profile.
4. Check analytics in Supabase → `analytics_events` table.
5. **EXPECTED**: Event with type `chat_click` (mapped to `click_social` in `useAnalytics`) is recorded.

### Test 3: Crawler User-Agent Simulation
1. Open Chrome DevTools → Network conditions.
2. Set User-Agent to: `Mozilla/5.0 (compatible; Googlebot/2.1)` or `facebookexternalhit/1.1`.
3. Refresh the model profile page.
4. Click the "Chat" button.
5. **EXPECTED**: Button does nothing (no new tab).
6. View Page Source.
7. **EXPECTED**: No decoded URL visible anywhere.

### Test 4: x-is-crawler Header Simulation
1. Use a tool like ModHeader extension.
2. Add header: `x-is-crawler: 1`.
3. Refresh model profile.
4. Inspect the button element.
5. **EXPECTED**: `data-blocked="true"` attribute present.
6. Button text should show "View Profile" (generic).

### Test 5: Missing Social Link
1. Find/create a model with no `social_link` in database.
2. Navigate to their profile.
3. **EXPECTED**: Button handles empty link gracefully (inert or hidden).

### Test 6: Hydration Verification
1. Disable JavaScript in browser.
2. Navigate to model profile.
3. **EXPECTED**: Button visible but non-functional.
4. Enable JavaScript.
5. **EXPECTED**: Button becomes functional after hydrate.

### Test 7: Mobile Verification
1. Open Chrome DevTools → Device emulation (iPhone 12).
2. Navigate to model profile.
3. Test all button clicks including fixed bottom and gallery teasers.
4. **EXPECTED**: Same behavior as desktop.

### Test 8: Analytics Tracking Verification
1. Perform clicks as a normal user.
2. Perform clicks as a simulated crawler.
3. Check database entries in `analytics_events`.
4. **EXPECTED**:
   - Normal clicks: `eventType` includes 'click_social' or 'click_content'.
   - Crawler clicks: Verify tracking logic (should ideally log the block or ignore).

## Emergency Rollback

If issues are discovered in production:

1. Revert to previous `ChatButton` implementation:
   - Remove `BridgeProtector` imports.
   - Restore original `ChatButton` with `href` prop.
   - Remove `isCrawler` detection logic from `ModelPage`.

2. Git commands:
```bash
git revert HEAD~1  # Revert the latest integration commit
git push origin main
```

3. Cloudflare Pages will auto-deploy the reverted code.
