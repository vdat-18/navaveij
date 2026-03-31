# E2E-4 — Access Monitoring Screen

**Title:** E2E tests for the `/access-monitoring` admin/DPO dashboard — RBAC gate, live metrics, audit log, tabs
**Status:** Not started
**Wave:** 2

---

## Objective

Verify two role scenarios: (1) admin sees the full Access Monitoring dashboard including live metrics, anomaly alerts, audit log, and all three governance tabs; (2) physician sees the "Access Denied" page with a Return to Dashboard link.

## Spec File

`frontend/e2e/access-monitoring.spec.ts`

## Setup

Two separate `describe` blocks, each with their own `injectAuth` role:

**Admin tests:** `await injectAuth(page, "admin")`
**Physician denial tests:** `await injectAuth(page, "physician")`

Both use `await installMocks(page)` and `await page.goto("/access-monitoring")`.

## Test Cases

### Admin Role

| # | Test Name | What It Checks |
|---|---|---|
| A-1 | Renders "Access Monitoring" heading | `<h1>` with "Access Monitoring" text |
| A-2 | Live metrics bar shows `total_api_calls_today` | Value `142` from `MOCK_MONITORING` visible |
| A-3 | Anomaly alert panel shows mocked alert | "Unusual bulk export from nurse account" visible |
| A-4 | Audit log shows mocked entry | "usr-physician-00001" visible in audit log table |
| A-5 | Three governance tabs visible and default shows RBAC roles | "Role Management" active; "Physician" and "Admin" role labels visible |
| A-6 | Mapping Tool tab shows ICD-E11 | Click "Mapping Tool" → "ICD-E11" and "Type 2 Diabetes Mellitus" visible |
| A-7 | Master Data tab shows program name | Click "Master Data" → "Comprehensive Cardio Plus" visible |

### Physician Role (Access Denied)

| # | Test Name | What It Checks |
|---|---|---|
| A-8 | Physician sees "Access Denied" heading | `<h1>` "Access Denied" rendered |
| A-9 | Access Denied text mentions role | Text contains "physician" and "does not have permission" |
| A-10 | Return to Dashboard link navigates to `/` | Click link → URL becomes `/` |

## Key Selectors

| Element | Selector Strategy |
|---|---|
| Heading | `page.getByRole("heading", { name: /Access Monitoring/i })` |
| Metrics value 142 | `page.getByText("142")` |
| Anomaly description | `page.getByText(/Unusual bulk export/i)` |
| Audit log user ID | `page.getByText("usr-physician-00001")` |
| Role Management tab button | `page.getByRole("button", { name: "Role Management" })` |
| Mapping Tool tab button | `page.getByRole("button", { name: "Mapping Tool" })` |
| Master Data tab button | `page.getByRole("button", { name: "Master Data" })` |
| Role badge | `page.locator("span").filter({ hasText: /^admin$/ })` |
| Access Denied heading | `page.getByRole("heading", { name: "Access Denied" })` |
| Return link | `page.getByRole("link", { name: /Return to Dashboard/i })` |

## Mock Data Dependencies

From `handlers.ts`:
- `MOCK_MONITORING.total_api_calls_today` = 142
- `MOCK_ANOMALIES.alerts[0].description` = "Unusual bulk export from nurse account"
- `MOCK_AUDIT_LOGS.entries[0].user_id` = "usr-physician-00001"
- `MOCK_RBAC.roles` must include `{ label: "Physician" }` and `{ label: "Admin" }`
- `MOCK_MAPPINGS.mappings[0]` = `{ code_id: "ICD-E11", label: "Type 2 Diabetes Mellitus" }`
- `MOCK_PROGRAMS.programs[0].name` = "Comprehensive Cardio Plus"

## Notes

- The access gate is evaluated client-side using `useAuth()` React context — no API call involved. The role in the token injected by `injectAuth()` determines which branch renders.
- Tab labels in the DOM are "Role Management", "Mapping Tool", "Master Data" as mixed-case text (uppercase is applied via CSS `uppercase` class, not by changing the DOM text).
- All 6 data fetches in `loadScreen()` fire in parallel — use `{ timeout: 10_000 }` on assertions for data-dependent content.

## Depends On

E2E-INFRA

## TOR Reference

Security, Privacy & Audit 20% (RBAC gate, audit log display)
