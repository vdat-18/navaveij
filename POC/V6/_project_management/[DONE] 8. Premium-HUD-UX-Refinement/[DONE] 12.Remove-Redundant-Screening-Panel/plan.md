# Plan — Remove Component from Main Dashboard

**Date:** 2026-03-24

---

## Strategy
1. Remove the rendering of `ScreeningGapStatus` and `SummaryBadges` from `app/page.tsx`.
2. Keep the logic in `TrendTimelineScreen.tsx` intact so it remains available in the clinical drawer.
