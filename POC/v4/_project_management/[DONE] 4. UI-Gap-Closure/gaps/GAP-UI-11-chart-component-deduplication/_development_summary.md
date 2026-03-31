## Status: Complete

### Implementation Details
- Created shared chart tooltip component at `src/components/charts/ChartTooltip.tsx` and removed duplicated local tooltip definitions.
- Created shared chart config constants at `src/components/charts/chartConfig.ts` for grid/x-axis/y-axis defaults.
- Centralized `BMI_TARGET` and `BP_SYSTOLIC_NORMAL` under `src/shared/clinicalConstants.ts`.
- Updated `BiomarkerCharts.tsx` to use `useId()` for scoped SVG gradient IDs.
- Corrected the dashboard biomarker chart grid from `md:grid-cols-3` to `md:grid-cols-2`.

### Files Modified
- `POC/v2/frontend/src/components/charts/ChartTooltip.tsx`
- `POC/v2/frontend/src/components/charts/chartConfig.ts`
- `POC/v2/frontend/src/shared/clinicalConstants.ts`
- `POC/v2/frontend/src/components/dashboard/BiomarkerCharts.tsx`
- `POC/v2/frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`
- `POC/v2/frontend/src/components/trend-timeline/TrendTimelineScreen.tsx`
