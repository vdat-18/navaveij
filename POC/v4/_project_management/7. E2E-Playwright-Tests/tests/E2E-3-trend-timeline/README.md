# E2E-3 — Trend & Timeline Screen

**Title:** E2E tests for the `/trend-timeline` biomarker trend and clinical event timeline screen
**Status:** Not started
**Wave:** 2

---

## Objective

Verify the Trend & Timeline screen loads 6 biomarker chart sections, renders clinical event timeline entries from the mock, shows the empty state when no patient is selected, and that the time range selector and Back link work.

## Spec File

`frontend/e2e/trend-timeline.spec.ts`

## Setup (beforeEach)

```typescript
await injectAuth(page, "physician")
await installMocks(page)
await page.goto("/trend-timeline")
```

## Test Cases

| # | Test Name | What It Checks |
|---|---|---|
| T-1 | Sidebar shows Trend & Timeline as active | `aria-current="page"` on "Trend & Timeline" nav link |
| T-2 | Empty state when no patient selected | Prompt to select a patient is visible |
| T-3 | Selecting a patient loads biomarker section headings | All 6 headings visible: FBS, HbA1c, LDL, BMI, BP Systolic, eGFR |
| T-4 | Time range selector defaults to 5 and can change | Default value "5"; can set to "1" and "10" |
| T-5 | Clinical event timeline shows mocked events | "HbA1c Test" and "Cardiology Consult" visible |
| T-6 | Back to Summary link navigates to `/` | Click link → URL becomes `/` |

## Key Selectors

| Element | Selector Strategy |
|---|---|
| Empty state text | `page.getByText(/Select a patient/i)` |
| Patient name in list | `page.getByText("Somchai Wongsawat")` |
| Biomarker headings | `page.getByText("FBS")`, `page.getByText("HbA1c")`, etc. |
| Time range selector | `page.locator("select")` (time range) |
| Timeline event | `page.getByText("HbA1c Test")` |
| Back link | `page.getByRole("link", { name: /Back to Summary/i })` |

## Mock Data Dependencies

From `handlers.ts`:
- `MOCK_BIOMARKERS` — response for `GET /api/biomarker-trends/{token}`; must trigger display of 6 lab sections
- `MOCK_TIMELINE.events` — must contain `{ label: "HbA1c Test" }` and `{ label: "Cardiology Consult" }`
- Screening gaps endpoint must return a valid (possibly empty) response

## Notes

- Patient selection on this page likely requires the patient list to also be present. If `PatientList` only renders on the dashboard, the test may need to navigate to `/` first, select a patient, then navigate to `/trend-timeline`. Verify the patient selection context persists across navigation.
- The time range selector may be a `<select>` or custom button group — confirm from source before writing selector.
- recharts renders SVG; biomarker chart section headings (labels above each chart) are plain DOM text, not SVG, so `getByText()` should work.

## Depends On

E2E-INFRA

## TOR Reference

UX/Explainability (XAI) 20%
