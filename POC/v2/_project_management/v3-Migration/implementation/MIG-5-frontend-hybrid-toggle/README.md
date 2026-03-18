# MIG-5 — Frontend: Hybrid AI/Rules Toggle

**Status:** Not started
**Priority:** P2
**POC Scoring Impact:** XAI 20%
**Depends on:** MIG-4

## Objective

Add a "Mode: Hybrid AI / Fallback: Rules" toggle button in the Screen 1 dashboard header that sends `force_rule_based` to `/api/recommend` and re-fetches the recommendation on toggle.

## Files Changed

- `POC/v2/frontend/src/app/page.tsx`
- `POC/v2/frontend/src/services/api.ts`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

## Acceptance Gate

- Toggle button visible in header utility bar
- Toggling button triggers a new recommendation fetch
- When ON (amber, "Fallback: Rules"): response `recommendation_source` is "RuleBased"
- When OFF (white, "Mode: Hybrid AI"): response `recommendation_source` is "AI"
- All three existing screens remain navigable

## v3 Reference

- `POC/v3/frontend/src/app/page.tsx` — lines 28-31 (state), 88-101 (button)
