# GAP-F4 — Confidence Score as Numeric %

**Title:** Replace qualitative confidence label with a numeric percentage display
**Status:** Not started
**Phase:** 1 (quick wins)

---

## Objective

Replace qualitative labels such as "Optimal", "High Confidence" with the numeric confidence
percentage (e.g., "87% Confidence") derived from the `confidence_score` field already present
in the API response.

## Scope

1. In `RecommendationPanel.tsx`, find where the confidence qualifier/label is rendered.
2. Replace with `{(confidence_score * 100).toFixed(0)}% Confidence`.
3. Color-code the display: ≥75% green, ≥50% amber, <50% red.
4. Retain a small tooltip or secondary label explaining the score.

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/frontend/src/types/recommendation.ts` — `confidence_score: number` field (already present)

## Design Decisions

- **No backend change:** `confidence_score` (float 0–1) is already returned in the API
  response per the v3 contract. This is a display-only change.
- **Qualifier label removed:** Qualitative tier labels ("High", "Medium", "Low") can remain
  as a small secondary label but should not be the primary display.
- **Color thresholds:** Match the framework definition in `ai-team-onboarding.md` §8:
  High ≥ 0.75, Medium ≥ 0.50, Low < 0.50.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Highlight AI confidence score rather than qualitative statement (optimal …)"
