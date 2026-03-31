# GAP-UI-1 Implementation Plan

## Objective
Address critical bugs in `RecommendationPanel.tsx` by removing hardcoded/fabricated clinical data and properly wiring API-sourced data for packages, pricing, clinical alerts, and risk gauge.

## Target File
`POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

## Execution Steps

### 1. Remove Fabricated Clinical Alerts (G-01)
- **Current State:** `DEFAULT_CRITICAL_ALERTS` is hardcoded as a fallback, displaying fabricated "Hypertensive Crisis" and "High ASCVD Risk" if API response lacks expected data.
- **Action:** 
  - Remove `DEFAULT_CRITICAL_ALERTS` array entirely.
  - Update `normalizeCriticalAlerts` to return `[]` (empty array) instead of the default alerts.
  - Update the rendering block in the UI (around line 408): If `criticalAlerts.length === 0`, render an "Insufficient data" empty state instead of iterating over the alerts.

### 2. Update `ClinicalRiskGauge` Percentages (G-07)
- **Current State:** Only handles `isHigh` (returns 85% for High, 30% for everything else).
- **Action:** Map exact values:
  - `"Critical"` → 95%
  - `"High"` → 85%
  - `"Medium"` → 55%
  - `"Low"` → 25%
  - Provide corresponding color mapping (e.g., Critical/High: `#9D0A31`, Medium: `#F59E0B`, Low: `#10B981`).

### 3. Wire Package Name & Price (G-04 & G-05)
- **Current State:** Hardcoded `"Diamond Plus Center"` and `"฿15,000"`.
- **Action:** 
  - Replace package name with `{data.resolved_package?.name || "Unknown Package"}`.
  - Replace package price with `{data.resolved_package?.price_thb ? \`฿${data.resolved_package.price_thb.toLocaleString()}\` : "Price TBD"}`.

### 4. Improve `reasoning_trace` Empty State (G-06)
- **Current State:** A `|| ""` fallback exists, preventing a crash, but an empty trace results in a blank section.
- **Action:** 
  - Ensure null safety with `?? []` during `.split('\n')`.
  - Render an "Insufficient reasoning trace data" or similar empty state message if the split array is empty or only contains whitespace.

## Verification
- Verify `RecommendationPanel` renders correctly without hardcoded values.
- Verify the gauge visually represents Critical/High/Medium/Low correctly.
- Verify package and price are correctly sourced from `data.resolved_package`.
- Ensure no TypeError occurs when `reasoning_trace` is null/empty.
