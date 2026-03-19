# Discovery

**Verified:** 2026-03-19

| Item | Status |
|---|---|
| Duplicate chart tooltips in dashboard + trend screens | ✅ Consolidated into shared `components/charts/ChartTooltip.tsx` |
| Duplicate chart axis/grid defaults | ✅ Extracted into shared `components/charts/chartConfig.ts` |
| Hardcoded BMI/BP reference values | ✅ Extracted to `shared/clinicalConstants.ts` and consumed from timeline logic |
| SVG gradient ID collision risk | ✅ Replaced static id with `useId()`-scoped gradient id |
| Biomarker chart grid mismatch (`md:grid-cols-3`) | ✅ Updated to `md:grid-cols-2` for two-card layout |
