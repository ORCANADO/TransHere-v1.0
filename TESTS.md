# TESTS — TransHere

**Type:** testing contract | **Linked:** SPEC.md, STACK.md | **Coverage target:** 40% codebase / 90% critical paths

**Claude Code:** This defines what "tested" means. Before marking ANY task as complete in TASKS.md, verify it meets these requirements. A task is not complete until its tests pass.

---

## 1. Testing Strategy: Pragmatic Critical Paths

TransHere is a production-deployed solo-dev project. The testing strategy optimizes for **maximum bug prevention per hour of dev time**, not comprehensive coverage.

**What we test:** Business logic that, if broken, silently corrupts data or kills conversions.
**What we skip:** UI rendering, component styling, visual layouts — these are caught by manual inspection.

### Testing Tiers

| Tier        | Required?   | Framework | Scope                                                  | Run Command                  |
| ----------- | ----------- | --------- | ------------------------------------------------------ | ---------------------------- |
| Unit        | Yes         | Vitest    | Pure functions, utilities, validation, detection logic | `npm run test:unit`          |
| Integration | Yes         | Vitest    | API routes, database queries (mocked Supabase)         | `npm run test:integration`   |
| E2E         | No (future) | —         | Full user flows                                        | Deferred to future milestone |

**Run all:** `npm test`
**Coverage:** `npm run test:coverage`

---

## 2. Testing Rules

### Always:

- Write the failing test first when fixing a bug (TDD for bugfixes)
- Mock all Supabase calls — tests must run offline and deterministically
- Mock R2/external services — never hit real cloud storage in tests
- Use descriptive test names that read as behavior specs:
  - `"should detect redditbot as a crawler"`
  - `"should decode a TH_-prefixed encoded URL back to the original"`
  - `"should return 401 when admin key is missing"`
- Include at least one happy path AND one error path per function

### Never:

- Skip a failing test with `.skip()` — fix it or log it in DECISION_LOG.md
- Write tests that depend on execution order or shared mutable state
- Test implementation details (internal variable names, private methods)
- Hardcode secrets or real URLs in test files — use fixtures
- Write component rendering tests — ROI is too low for a solo dev

---

## 3. Coverage Requirements

| Scope                               | Minimum | Notes                                                    |
| ----------------------------------- | ------- | -------------------------------------------------------- |
| `src/lib/bot-detection.ts`          | 95%     | Security-critical — false negatives corrupt analytics    |
| `src/lib/url-obfuscation.ts`        | 95%     | Conversion-critical — broken ghost links = broken CTAs   |
| `src/lib/tracking-cache.ts`         | 80%     | Attribution-critical — broken tracking = blind analytics |
| `src/lib/i18n.ts`                   | 90%     | Pure functions, easy to test                             |
| `src/lib/utils.ts` (getImageUrl)    | 80%     | Image URLs must resolve correctly                        |
| `src/app/api/admin/dashboard/`      | 70%     | Core analytics endpoint                                  |
| `src/app/api/admin/tracking-links/` | 70%     | Tracking CRUD lifecycle                                  |
| Other API routes                    | 50%     | Auth checks + happy path                                 |
| Components                          | 0%      | Tested manually — skip for now                           |
| Hooks                               | 0%      | localStorage-dependent, hard to test — skip for now      |

---

## 4. Test File Conventions

```
src/
├── lib/
│   ├── bot-detection.ts
│   ├── url-obfuscation.ts
│   ├── tracking-cache.ts
│   ├── i18n.ts
│   ├── utils.ts
│   └── __tests__/
│       ├── bot-detection.test.ts       ← Unit: crawler patterns
│       ├── url-obfuscation.test.ts     ← Unit: encode/decode
│       ├── tracking-cache.test.ts      ← Unit: cache resolution
│       ├── i18n.test.ts                ← Unit: language detection
│       └── utils.test.ts              ← Unit: URL construction
├── app/
│   └── api/
│       └── admin/
│           └── dashboard/
│               └── __tests__/
│                   └── route.test.ts   ← Integration: dashboard API
tests/
├── fixtures/
│   ├── mock-models.json                ← Shared model data
│   ├── mock-analytics.json             ← Analytics event samples
│   └── mock-tracking.json              ← Tracking link samples
└── helpers/
    ├── supabase-mock.ts                ← Supabase client mock factory
    └── request-helpers.ts              ← API route test utilities
```

**Naming convention:**

- Unit/integration: `[source-file].test.ts` in `__tests__/` next to source
- Fixtures: descriptive JSON files in `tests/fixtures/`
- Helpers: shared test utilities in `tests/helpers/`

---

## 5. Task-to-Test Mapping

_Claude Code populates this as tasks are completed. Each row links a TASKS.md entry to its test evidence._

| Task | Description                             | Test File(s)                                          | Type        | Status |
| ---- | --------------------------------------- | ----------------------------------------------------- | ----------- | ------ |
| 8.1  | R2 upload from production               | Manual: upload image from production admin dashboard  | Manual      | [x]    |
| 10.1 | Vitest configuration + placeholder test | `src/__tests__/placeholder.test.ts`                   | Unit        | [ ]    |
| 10.2 | Bot detection tests                     | `src/lib/__tests__/bot-detection.test.ts`             | Unit        | [ ]    |
| 10.3 | URL obfuscation tests                   | `src/lib/__tests__/url-obfuscation.test.ts`           | Unit        | [ ]    |
| 10.4 | i18n tests                              | `src/lib/__tests__/i18n.test.ts`                      | Unit        | [ ]    |
| 10.5 | Dashboard API integration tests         | `src/app/api/admin/dashboard/__tests__/route.test.ts` | Integration | [ ]    |

---

## 6. Critical Path Test Scenarios

### Bot Detection (`src/lib/bot-detection.ts`)

| Scenario                            | Input                          | Expected    | Priority |
| ----------------------------------- | ------------------------------ | ----------- | -------- |
| Known crawler — Googlebot           | `"Googlebot/2.1"`              | `true`      | HIGH     |
| Known crawler — facebookexternalhit | `"facebookexternalhit/1.1"`    | `true`      | HIGH     |
| Known crawler — redditbot           | `"redditbot"`                  | `true`      | HIGH     |
| Known crawler — twitterbot          | `"Twitterbot/1.0"`             | `true`      | HIGH     |
| Real browser — Chrome mobile        | `"Mozilla/5.0 ... Chrome/120"` | `false`     | HIGH     |
| Real browser — Safari iOS           | `"Mozilla/5.0 ... Safari/604"` | `false`     | HIGH     |
| Edge case — empty string            | `""`                           | `false`     | MEDIUM   |
| Edge case — undefined               | `undefined`                    | `false`     | MEDIUM   |
| Cloudflare verified bot             | Header: `cf-verified-bot`      | Whitelisted | MEDIUM   |

### URL Obfuscation (`src/lib/url-obfuscation.ts`)

| Scenario                  | Input                                       | Expected                           | Priority |
| ------------------------- | ------------------------------------------- | ---------------------------------- | -------- |
| Roundtrip encode/decode   | `"https://onlyfans.com/model"`              | Same URL after decode(encode(url)) | HIGH     |
| TH\_ prefix present       | Encoded result                              | Starts with `TH_`                  | HIGH     |
| Invalid encoded string    | `"not_a_valid_string"`                      | Graceful failure / empty string    | HIGH     |
| Empty input               | `""`                                        | Handled without crash              | MEDIUM   |
| Special characters in URL | `"https://fansly.com/model?ref=abc&id=123"` | Correct roundtrip                  | MEDIUM   |

### Dashboard API (`/api/admin/dashboard`)

| Scenario                      | Input                                        | Expected                      | Priority |
| ----------------------------- | -------------------------------------------- | ----------------------------- | -------- |
| Valid request, default period | `?key=VALID&period=7days`                    | 200 + DashboardResponse shape | HIGH     |
| Missing auth key              | No key param                                 | 401                           | HIGH     |
| Invalid auth key              | `?key=WRONG`                                 | 401                           | HIGH     |
| Filter by model               | `?key=VALID&modelSlugs[]=model-a`            | Filtered results              | MEDIUM   |
| Empty results                 | Valid filters, no matching data              | 200 + zero stats              | MEDIUM   |
| Custom date range             | `?key=VALID&period=custom&start=...&end=...` | Filtered by date              | MEDIUM   |

---

## 7. Pre-Milestone Checklist

_Run through before marking any milestone as complete._

- [ ] All unit tests pass: `npm run test:unit`
- [ ] All integration tests pass: `npm run test:integration`
- [ ] No `.skip()` or `.only()` in test files
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] Task-to-test mapping (Section 5) is up to date
