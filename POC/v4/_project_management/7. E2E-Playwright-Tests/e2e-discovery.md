# E2E Playwright Tests — Discovery
> **Date:** 2026-03-20 · **Source:** Full audit of `POC/v2/frontend/src/` (screens, auth, API layer)

## Current Test Coverage State

| Layer | Tool | Files | What's Covered |
|---|---|---|---|
| Unit / Component | Vitest + RTL | 9 test files | PII masking, auth guards, risk gauge logic, patient search, sidebar aria |
| Integration (backend) | pytest | 22+ test files | FastAPI routes, orchestrator, clinical workflow |
| **E2E browser** | **None** | **0 files** | **Nothing** |

## Gap: No E2E Browser Tests

The complete absence of E2E tests means the following scenarios are **untested**:

| Scenario | Risk |
|---|---|
| Auth redirect: unauthenticated user navigating to `/` is sent to `/login` | Medium — auth guard is simple but untested in real browser |
| Login → Authorize flow stores token and redirects | High — `signIn()` sets sessionStorage then calls `router.replace("/")`; Vitest mocks `useRouter` |
| Patient selection triggers recommendation fetch and renders result | High — most critical demo path, never exercised E2E |
| Privacy mode toggle hides all PII fields across the page | Medium — privacy mode is context-wide; unit tests only check individual components |
| AI/Rules mode toggle → re-fetch with `isRuleBasedForced: true` | Medium — toggle state managed in parent component, not testable in isolation |
| "Confirm Strategy" button calls `recordDecision` and transitions to approved state | High — approval is a POC demo moment |
| Trend & Timeline screen loads 6 biomarker charts | Medium — recharts rendering not testable in jsdom |
| Access Monitoring: admin sees full dashboard, physician sees "Access Denied" | High — role gate lives in `access-monitoring/page.tsx`, logic is simple but untested |
| Tab switching on Access Monitoring (Role Management / Mapping Tool / Master Data) | Low — standard React state, but validates render |

## Screens and Routes Inventoried

| Route | Component | Auth Required | Role Gate |
|---|---|---|---|
| `/login` | `LoginPage` | No | No |
| `/` | `page.tsx` + `PatientList` + `RecommendationPanel` | Yes | No (all roles) |
| `/trend-timeline` | `TrendTimelineScreen` | Yes | No (all roles) |
| `/access-monitoring` | `AccessMonitoringPage` + `AccessMonitoringScreen` | Yes | `admin` or `dpo` only |
| `/audit` | `AuditPage` | Yes | Redirects to `/access-monitoring` |

## Auth Mechanism (Verified from Source)

- **Storage key:** `navavej.smartToken.v1` (sessionStorage)
- **Encoding:** `btoa(JSON.stringify(payload))` — reversible base64 of a plain JSON object (no HMAC)
- **Personas available on login page:**

| Index | Label | role | sub |
|---|---|---|---|
| 0 | Dr. Ananya Sharma (Physician) | physician | usr-physician-00001 |
| 1 | Nurse Somying Srisuk (Nurse) | nurse | usr-nurse-00001 |
| 2 | Wanchai Thongchai (DPO Officer) | dpo | usr-dpo-00001 |
| 3 | System Admin | admin | usr-admin-00001 |

- **Auth guard:** `AuthProvider` calls `router.replace("/login")` when token is `null` (after initial load)
- **Deny button:** resets `selectedPersona` to 0, does NOT navigate — user stays on `/login`

## API Endpoints (All Intercepted by Mocks)

| Method | URL | Consumer |
|---|---|---|
| GET | `http://localhost:8000/api/v1/patients` | Patient directory |
| POST | `http://localhost:8000/api/recommend` | Recommendation (LLM — must mock) |
| POST | `http://localhost:8000/api/v1/clinical/approve` | Confirm Strategy |
| GET | `http://localhost:8000/api/timeline/{token}` | Trend & Timeline |
| GET | `http://localhost:8000/api/biomarker-trends/{token}` | Trend & Timeline |
| GET | `http://localhost:8000/api/screening-gaps/{token}` | Trend & Timeline |
| GET | `http://localhost:8000/api/monitoring-snapshot` | Access Monitoring |
| GET | `http://localhost:8000/api/anomaly-alerts` | Access Monitoring |
| GET | `http://localhost:8000/api/audit-logs` | Access Monitoring |
| GET | `http://localhost:8000/api/rbac` | Access Monitoring |
| GET | `http://localhost:8000/api/mapping-codes` | Access Monitoring |
| GET | `http://localhost:8000/api/master-programs` | Access Monitoring |

Backend is FastAPI (Uvicorn, port 8000). `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000/api`. All routes mocked with `page.route("**/api/**", ...)` patterns so tests are backend-independent.

## Access Monitoring Internal Structure

- Role check: `if (role !== "admin" && role !== "dpo")` → renders "Access Denied" heading
- `AccessMonitoringScreen` tabs: `"Role Management"`, `"Mapping Tool"`, `"Master Data"` (uppercase CSS via Tailwind, DOM text is mixed case)
- All 6 data fetches fire in parallel in `loadScreen()` on mount

## Files That Need to Be Created

| File | Purpose |
|---|---|
| `frontend/playwright.config.ts` | Playwright root config |
| `frontend/e2e/fixtures/auth.ts` | `injectAuth(page, role)` helper |
| `frontend/e2e/mocks/handlers.ts` | `installMocks(page)` — all route interceptors + mock data |
| `frontend/e2e/login.spec.ts` | Login screen tests |
| `frontend/e2e/dashboard.spec.ts` | Dashboard screen tests |
| `frontend/e2e/trend-timeline.spec.ts` | Trend & Timeline tests |
| `frontend/e2e/access-monitoring.spec.ts` | Access Monitoring tests |

## Existing Files That Are Modified

| File | Change |
|---|---|
| `frontend/package.json` | Add `@playwright/test` devDep + 4 `test:e2e*` scripts |
| `frontend/.gitignore` | Add `playwright-report/` and `test-results/` |