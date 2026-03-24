# Discovery — GAP-F4

**Status:** Complete (pre-implementation analysis)

## Current State

- The recommendation panel shows a qualitative confidence label such as "Optimal",
  "High Confidence", or similar qualitative tier text.
- The `confidence_score` field (float, 0.0–1.0) is already present in the API response
  and in the `RecommendationResponse` TypeScript type.
- The confidence tier thresholds are: High ≥ 0.75, Medium ≥ 0.50, Low < 0.50
  (per `ai-team-onboarding.md` §8).
- The qualitative label may come from a mapped display string rather than the raw float.

## What Needs to Change

- Replace (or demote) the qualitative label with the numeric percentage:
  `Math.round(confidence_score * 100)` → rendered as "87% Confidence".
- Color the numeric display: ≥75 green, ≥50 amber, <50 red.
- The qualitative tier label ("High", "Medium", "Low") can remain as a small secondary
  element or tooltip — it is not removed entirely, just no longer the primary display.

## No Backend Changes Needed

`confidence_score` is already returned in the API response.
This is a pure display change in `RecommendationPanel.tsx`.
