# Plan — UI Improvements and RBAC for Trend Timeline

**Date:** 2026-03-23

---

## Strategy

1. **RBAC on `/trend-timeline`**: Use `useAuth()` to check role on mount. Redirect `physician` and `nurse` to `/` using `useRouter`. Return `null` before rendering to prevent flash.

2. **`hideCharts` prop**: Add a boolean prop to `RecommendationPanel`. Pass `hideCharts={true}` from the dashboard page for physician/nurse roles to conditionally suppress `BiomarkerCharts` and `LabResultsGrid`.

3. **`PackageSeal` visual component**: Create an animated SVG-based seal component with:
   - Tier-specific gradient rings (cyan/blue for Premium, slate/dark for Advanced, amber for Standard)
   - Central glass-button circle
   - Tiny "ADVANCED"/"PREMIUM" text badge
   - Subtle arc overlays for premium glass effect

4. **`TrendToast` notification**: A slide-in toast (bottom-right) using Framer Motion that appears post-recommendation-load, containing a button linking to the ClinicalDrawer/trend view. Auto-dismissible.

5. **`ClinicalRiskGauge` polish**: Add colored arc background segments (green/yellow/red zones), animated glowing needle path using `motion.path`, and a drop-shadow filter for the active arc.

## Implementation Steps

1. Edit `POC/v4/frontend/src/app/trend-timeline/page.tsx` — add RBAC redirect.
2. Edit `POC/v4/frontend/src/components/dashboard/RecommendationPanel.tsx`:
   - Add `hideCharts` prop.
   - Add `PackageSeal` sub-component.
   - Add `TrendToast` sub-component with `showTrendToast` state.
   - Enhance `ClinicalRiskGauge` with multi-zone arc and glow.
