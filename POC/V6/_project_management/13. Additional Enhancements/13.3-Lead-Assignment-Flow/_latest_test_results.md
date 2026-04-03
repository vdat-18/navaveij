# Latest Test Results — Lead Assignment Flow

**Workstream:** 13.3
**Last updated:** 2026-04-03

---

## Backend — pytest

**Command:** `cd POC/V6 && python3 -m pytest scripts/tests/test_leads_api.py`

```
============================= test session starts ==============================
platform darwin -- Python 3.13.5, pytest-9.0.2
collected 6 items

scripts/tests/test_leads_api.py ......                                   [100%]

============================== 6 passed in 0.13s ===============================
```

**Status:** Pass

---

## Frontend — Vitest

**Command:** `cd POC/V6/frontend && npm run test`

```
Test Files  22 passed (22)
Tests       93 passed (93)
```

**Status:** Pass

---

## Frontend — Lint

**Command:** `cd POC/V6/frontend && npm run lint`

```
Repository-wide lint remains blocked by pre-existing unrelated errors outside workstream 13.3.
```

**Status:** Partial

**Targeted lint for changed 13.3 files**

**Command:** `cd POC/V6/frontend && npx eslint src/app/page.tsx src/app/page.test.tsx src/components/Sidebar.test.tsx src/components/leads/ReadOnlyRecommendationView.tsx src/components/leads/ReadOnlyRecommendationView.test.tsx src/components/leads/SalesLeadDevelopmentPanel.tsx src/components/leads/SalesLeadDevelopmentPanel.test.tsx src/components/leads/ExecutiveLeadAssignmentScreen.tsx src/app/login/page.tsx src/components/Sidebar.tsx src/services/api.ts`

```
0 errors, 7 warnings
```

**Targeted status:** Pass with warnings only

---

## Frontend — Build

**Command:** `cd POC/V6/frontend && npm run build`

```
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages
Route generated: /lead-assignment
```

**Status:** Pass

---

## Non-Overlap Assertion

**What it checks:** No `patient_id` or `patient_token` in `pre_runned_recommendations.json` exists in `patient_registry.json`.

**Result:** Pass

---

## Notes

- Backend pytest originally failed when importing the full FastAPI app because the environment has a BAML package version mismatch. The test was refactored to mount only `leads.router`, which validates the 13.3 backend contract directly without pulling in unrelated orchestration imports.
- Repository-wide frontend lint still reports pre-existing issues outside the lead-assignment workstream, including files such as `src/app/report/page.tsx`, `src/components/configuration/ConfigurationScreen.tsx`, `src/shared/auth-context.tsx`, `src/shared/patient-context.tsx`, `src/shared/privacy-mode.tsx`, `src/components/dashboard/LabResultsGrid.tsx`, `src/components/management/ManagementDashboard.tsx`, and `src/components/trend-timeline/BiomarkerTrendGrid.tsx`.
