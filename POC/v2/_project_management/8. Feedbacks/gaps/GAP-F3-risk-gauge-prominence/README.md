# GAP-F3 — Risk-o-Meter Prominence

**Title:** Make the risk gauge the visual hero of the recommendation panel with unmistakable color zones
**Status:** Implemented (2026-03-24)
**Phase:** 1 (quick wins)

---

## Objective

Increase the visual prominence of the semi-circular risk gauge so that the risk level (Low /
Moderate / High / Critical) is immediately obvious. The gauge should dominate the upper portion
of `RecommendationPanel.tsx` with clear red/yellow/green zones and a large centered risk label.

## Scope

1. Increase gauge diameter (~200–240px).
2. Increase arc stroke thickness.
3. Clearly delineate three color zones: Low (green), Moderate (yellow), High/Critical (red).
4. Add a bold numeric/label at the center of the gauge.
5. Add a pulsing ring animation when status is Critical.

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` — gauge component lives here

## Design Decisions

- **No new dependency needed:** The gauge is a custom SVG/CSS arc animation. No charting library.
- **Pulsing animation:** CSS `@keyframes` pulse on the outer ring, only activated when
  `overall_risk_level === "Critical"`.
- **Color mapping:** Low → `#22c55e` (green-500), Moderate → `#eab308` (yellow-500),
  High → `#f97316` (orange-500), Critical → `#ef4444` (red-500).

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Risk-o-meter needs to be more prominent: red-yellow-green."
