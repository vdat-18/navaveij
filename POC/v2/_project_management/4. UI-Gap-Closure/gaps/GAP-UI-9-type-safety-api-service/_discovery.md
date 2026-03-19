# Discovery

**Verified:** 2026-03-19

| Item | Status |
|---|---|
| `useState<any>` in dashboard selected patient | ✅ Replaced with typed `Patient | null` |
| `useState<any>` in recommendation panel data | ✅ Replaced with typed `RecommendationResponse | null` |
| `useState<any>` in trend timeline biomarkers | ✅ Replaced with typed `BiomarkerTrendsResponse | null` |
| `renderBoldText` argument typing | ✅ Replaced with typed string/string[] union |
| Shared chart tooltip props typing | ✅ Added `ChartTooltipProps` in `src/types/chart.ts` |
| Service return type coverage in `api.ts` | ✅ Added explicit return annotations to service methods |
| Axios timeout/interceptor hardening | ✅ Added 30s timeout and centralized response error normalization |
| `apiV1` vs `apiV3` route comment | ✅ Added route-boundary documentation in `api.ts` |
