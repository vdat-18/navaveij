# E2E Playwright Tests — Plan
> **Date:** 2026-03-20 · **Total Test Areas:** 5 (INFRA + 4 screens) · **Source Findings:** `e2e-discovery.md`

## Planning Principles

1. **Auth via `addInitScript`, not storageState** — sessionStorage is not persisted by `context.storageState()`; tokens are injected before each navigation using `page.addInitScript()`
2. **All API routes mocked** — `POST /api/recommend` calls an LLM; determinism requires `page.route()` interception. All 12 backend endpoints are mocked in `e2e/mocks/handlers.ts`
3. **Login screen tests use clean session** — `test.use({ storageState: { cookies: [], origins: [] } })` prevents auth state from prior tests affecting login spec
4. **One Playwright project, single Chromium browser** — the app is desktop-only; no mobile viewports needed for the POC demo
5. **Backend not required at runtime** — all routes mocked; `reuseExistingServer: true` in dev avoids double-starting `next dev`

## Target End State

After all test areas are implemented:
- `npm run test:e2e` executes ~20 tests across 4 spec files with zero failures
- Login, Dashboard, Trend & Timeline, and Access Monitoring screens are each covered by ≥4 tests
- Role-based access (admin sees full dashboard, physician sees "Access Denied") is verified E2E
- All tests run in <30 seconds total (mocked API, no LLM calls)

## Execution Order

| Step | Area | Description | Gate |
|---|---|---|---|
| 1 | **E2E-INFRA** | Install Playwright, create config, auth helper, mock handlers | `npx playwright test --list` shows test files |
| 2 | **E2E-1** | Login screen spec | 5 tests pass |
| 3 | **E2E-2** | Dashboard spec | 7 tests pass |
| 4 | **E2E-3** | Trend & Timeline spec | 6 tests pass |
| 5 | **E2E-4** | Access Monitoring spec | 7 tests pass |
| **GATE** | — | `npm run test:e2e` — all pass | Full green run |

## Test Area Summary

| Area | Spec File | Role(s) | Key Scenarios |
|---|---|---|---|
| E2E-INFRA | (infra only) | — | Config, helpers, mocks |
| E2E-1 | `e2e/login.spec.ts` | none (clean session) | Personas, FHIR scopes, Deny, Authorize, unauthenticated redirect |
| E2E-2 | `e2e/dashboard.spec.ts` | physician | Patient list, recommendation load, add-ons, reasoning trace, privacy toggle, AI/Rules toggle, Confirm Strategy |
| E2E-3 | `e2e/trend-timeline.spec.ts` | physician | Biomarker charts, time range selector, clinical timeline events, back link |
| E2E-4 | `e2e/access-monitoring.spec.ts` | admin + physician | Admin sees full dashboard, physician sees Access Denied, metrics, anomalies, audit log, tab switching |

## File Map

```
POC/v2/frontend/
  playwright.config.ts              ← Wave 1 (INFRA)
  package.json                      ← Wave 1 (INFRA) — add dep + scripts
  .gitignore                        ← Wave 1 (INFRA) — add report dirs
  e2e/
    fixtures/
      auth.ts                       ← Wave 1 (INFRA)
    mocks/
      handlers.ts                   ← Wave 1 (INFRA)
    login.spec.ts                   ← Wave 2 (E2E-1)
    dashboard.spec.ts               ← Wave 2 (E2E-2)
    trend-timeline.spec.ts          ← Wave 2 (E2E-3)
    access-monitoring.spec.ts       ← Wave 2 (E2E-4)
```

## Risk Register

| Risk | Mitigation |
|---|---|
| `page.route()` glob patterns don't match Axios request URLs | Use `"**/api/**"` patterns with specific suffixes; verify with `--headed` debug run |
| `addInitScript` token is stale (expired) causing auth guard redirect | `makeToken()` always sets `exp = now + 3600`; timestamp is fresh on each test run |
| `recharts` renders `<canvas>` or SVG that Playwright can't introspect by text | Test for section headings ("FBS", "HbA1c") not chart internals; recharts renders SVG with accessible text |
| Access Monitoring loads 6 parallel fetches; some may resolve after assertions | Use `await expect(...).toBeVisible({ timeout: 10_000 })` for data-dependent assertions |
| `next dev` startup time exceeds Playwright `webServer.timeout` | Set `timeout: 60_000` in `webServer` config; increase if needed |
