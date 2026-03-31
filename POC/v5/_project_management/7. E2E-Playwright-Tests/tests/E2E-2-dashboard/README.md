# E2E-2 — Dashboard (Clinical Checkup Advisory Center)

**Title:** E2E tests for the `/` dashboard screen — patient selection, recommendation rendering, toggles, approval
**Status:** Not started
**Wave:** 2

---

## Objective

Verify the main dashboard works end-to-end: patient directory loads, clicking a patient triggers the recommendation fetch, the recommendation panel renders all key data sections (risk gauge, tier, add-ons with priorities, reasoning trace, consultation guide, package name), and interactive controls (privacy mode, AI/Rules toggle, Confirm Strategy) work.

## Spec File

`frontend/e2e/dashboard.spec.ts`

## Setup (beforeEach)

```typescript
await page.addInitScript(...)   // injectAuth(page, "physician")
await installMocks(page)
await page.goto("/")
```

Also clear any persisted state:
```typescript
await page.addInitScript(() => {
  localStorage.removeItem("navavej.privacyMode.v1");
});
```

## Test Cases

| # | Test Name | What It Checks |
|---|---|---|
| D-1 | Sidebar shows Dashboard as active | `aria-current="page"` on "Clinical Dashboard" nav link |
| D-2 | Patient list loads with mocked patients | "Somchai Wongsawat" and "Malee Srisuk" visible |
| D-3 | Clicking a patient loads the recommendation panel | Risk level "High", tier "Premium", package name "Comprehensive Cardio Plus" visible |
| D-4 | Add-on items display with priority badges | ECHO-01 (Red), RENAL-02 (Orange) visible |
| D-5 | Reasoning trace section is visible | "Clinical Logic & Rationale" heading; "elevated HbA1c" text from mock |
| D-6 | Privacy mode toggle hides patient name | After toggle: "Somchai Wongsawat" hidden, "Privacy Mode On" visible |
| D-7 | AI/Rules mode toggle changes button label | Initial: matches `/Hybrid AI/i`; after click: matches `/Rules/i` |
| D-8 | Confirm Strategy button transitions to approved state | Click button → button transitions to "Approved" or confirmed state |

## Key Selectors

| Element | Selector Strategy |
|---|---|
| Patient name in list | `page.getByText("Somchai Wongsawat")` |
| Risk level | `page.getByText("High")` (after patient click) |
| Tier badge | `page.getByText("Premium")` |
| Package name | `page.getByText("Comprehensive Cardio Plus")` |
| Add-on item code | `page.getByText("ECHO-01")` |
| Priority badge | `page.getByText("Red")` |
| Reasoning section heading | `page.getByText("Clinical Logic & Rationale")` |
| Privacy toggle | `page.getByRole("button", { name: /Privacy Mode/ })` |
| AI/Rules toggle | `page.getByRole("button", { name: /Mode.*Hybrid AI/i })` or similar |
| Confirm Strategy | `page.getByRole("button", { name: /Confirm Strategy/i })` |

## Mock Data Dependencies

From `handlers.ts`:
- `MOCK_PATIENTS` — must contain "Somchai Wongsawat"
- `MOCK_RECOMMENDATION.overall_risk_level` = "High"
- `MOCK_RECOMMENDATION.ai_recommended_tier` = "Premium"
- `MOCK_RECOMMENDATION.resolved_package.name` = "Comprehensive Cardio Plus"
- `MOCK_RECOMMENDATION.add_ons[0].item_code` = "ECHO-01", `priority_level` = "Red"
- `MOCK_RECOMMENDATION.add_ons[1].item_code` = "RENAL-02", `priority_level` = "Orange"
- `MOCK_RECOMMENDATION.reasoning_trace` contains "elevated HbA1c"

## Depends On

E2E-INFRA

## TOR Reference

Hybrid Engine + MCP 35% · UX/Explainability (XAI) 20% · Pluggable AI Architecture 25%
