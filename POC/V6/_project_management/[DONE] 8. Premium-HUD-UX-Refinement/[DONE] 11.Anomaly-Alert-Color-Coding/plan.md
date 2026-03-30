# Plan — Anomaly Alert Color Coding

**Date:** 2026-03-24

---

## Strategy
1. Define `severityStyles` helper to return border and background classes per level (Red/Orange/Yellow/Green).
2. Remove text-based severity labels from the card header.
3. Add a thick 4px left-border accent to each card for stronger visual hierarchy.
4. Update the panel header to show the count of active alerts and add a pulsing status dot.

## Implementation Steps
1. Edit `AnomalyAlertsPanel.tsx` — replace `severityClass` with `severityStyles`.
2. Wrap the card in a `cn` call using the severity classes.
3. Add the indicator bar `div` inside the card.
4. Redesign the card content for better scanning (horizontal layout, smaller badges).
