# E2E-INFRA — Playwright Infrastructure Setup

**Title:** Install Playwright, create config, auth helper, and mock handlers
**Status:** Not started
**Wave:** 1

---

## Objective

Establish the Playwright toolchain and shared infrastructure that all screen tests depend on:
1. Install `@playwright/test` and Chromium browser
2. Create `playwright.config.ts` at `frontend/`
3. Create `e2e/fixtures/auth.ts` — `injectAuth(page, role)` helper
4. Create `e2e/mocks/handlers.ts` — `installMocks(page)` with all 12 route interceptors
5. Update `package.json` scripts and `.gitignore`

## Primary Files

| File | Action |
|---|---|
| `package.json` | Add `@playwright/test` to `devDependencies`; add `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:e2e:report` scripts |
| `playwright.config.ts` | Create — single chromium project, `baseURL: http://localhost:3000`, `webServer: npm run dev`, `testDir: ./e2e`, `timeout: 30_000` |
| `e2e/fixtures/auth.ts` | Create — `injectAuth(page, role)` using `page.addInitScript()` to write `navavej.smartToken.v1` into sessionStorage before React initialises |
| `e2e/mocks/handlers.ts` | Create — `installMocks(page)` using `page.route()` for all 12 endpoints; exports all mock data constants |
| `.gitignore` | Add `playwright-report/` and `test-results/` |

## Key Implementation Details

### `auth.ts` — Token Encoding

Must match `src/shared/auth-context.tsx` exactly:
```typescript
// auth-context.tsx uses:
btoa(JSON.stringify(payload))

// Node.js equivalent in auth.ts:
Buffer.from(JSON.stringify(payload)).toString("base64")
```

Token shape (MockTokenPayload):
```typescript
{ sub, name, role, fhir_scopes, iat, exp, iss }
// iss: "https://auth.navavej.demo/realms/hospital"
// fhir_scopes: ["patient/*.read", "observation.read", "condition.read"]
```

### `handlers.ts` — Mock Data Requirements

Mock data must satisfy the TypeScript types the frontend expects. Key shapes:
- Patients list: `{ patient_id, patient_name, patient_token }[]`
- Recommendation: must include `overall_risk_level`, `ai_recommended_tier`, `reasoning_trace`, `resolved_package.name`, `add_ons[].item_code`, `add_ons[].priority_level`
- Monitoring snapshot: must include `total_api_calls_today` (rendered by LiveMetricsBar)
- Anomaly alerts: `{ alerts: [{ description, severity, alert_id, detected_at }] }`
- RBAC: `{ roles: [{ role_id, label, permissions }] }`

### `playwright.config.ts` — webServer

```typescript
webServer: {
  command: "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
}
```

`reuseExistingServer: !process.env.CI` lets developers keep `next dev` running during test development without Playwright restarting it.

## Verification

```bash
cd POC/v2/frontend
npm install --save-dev @playwright/test
npx playwright install chromium
npx playwright test --list   # should show 0 tests (no spec files yet)
```

## Depends On

Nothing — this is the foundation step.

## TOR Reference

All 4 criteria — infrastructure for all E2E coverage.
