# Problem — UI Improvements and RBAC for Trend Timeline

**Date:** 2026-03-23

---

## Current State

1. **BiomarkerCharts always rendered**: The dashboard hardcoded chart visibility regardless of role or context. For physician/nurse view (single-patient focus via `ClinicalDrawer`), this caused redundant UI and wasted screen real estate.
2. **`/trend-timeline` page open to all roles**: Physicians and nurses were expected to use the `ClinicalDrawer` overlay flow. However, they could navigate directly to `/trend-timeline`, bypassing the intended UX and breaking the single-entry-point design.
3. **Risk Gauge visually weak**: The `ClinicalRiskGauge` lacked a multi-zone arc background and glowing indicator, making risk level hard to immediately parse.
4. **Package Seal plain**: The recommended package (Premium/Advanced/Standard) was represented only as a text label — no visual premium differentiation between tiers.
5. **No transition notification to Trend**: After recommendation loads, physicians had no quick-access path to the related trend timeline without manually navigating.
6. **Add-ons list flat and static**: All add-ons were rendered in a simple list with no collapsibility.

## Pain Points

- A nurse or junior physician could access `/trend-timeline` directly and get confused by the raw data without clinical context.
- The recommendation panel gave no sense of premium differentiation between tier packages.
- The Risk Level label required reading the text label rather than allowing instant color-based scanning.
