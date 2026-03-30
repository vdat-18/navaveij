# Implementation Plan

## Step 1 — Navigation and Route Canonicalization

- Update `src/components/Sidebar.tsx` to keep only the Access Monitoring menu entry.
- Update `src/app/audit/page.tsx` to redirect to `/access-monitoring`.

## Step 2 — Privacy Token Display Improvements

- Update `src/app/page.tsx`:
  - Remove `tok_*_entity` fallback placeholders.
  - Resolve display token from `rehydration_map`, otherwise use backend `patient_token`.
- Update `src/components/dashboard/RecommendationPanel.tsx`:
  - Replace `"Masked"` package/value with `masked_ai_output` values or backend token fallback.
- Update `src/types/recommendation.ts` to type `masked_ai_output.package_name` and `masked_ai_output.price_thb`.

## Step 3 — Verification

- Update `src/components/dashboard/RecommendationPanel.test.tsx` for token-based privacy assertions.
- Add `src/app/page.test.tsx` for dashboard privacy fallback behavior.
- Add `src/app/audit/page.test.tsx` for route canonical redirect behavior.
- Run targeted test suite for changed areas.
