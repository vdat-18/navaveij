# Discovery

**Verified:** 2026-03-19

| Item | Status |
|---|---|
| G-01: DEFAULT_CRITICAL_ALERTS hardcoded fallback | ❌ Open — RecommendationPanel.tsx lines 119–122 |
| G-04: Package name "Diamond Plus Center" hardcoded | ❌ Open — line 276 |
| G-05: Package price ฿15,000 hardcoded | ❌ Open — line 280 |
| G-06: reasoning_trace.split('\n') crash | 🟡 Partial — line 232 now uses `|| ""` + `.toString()` before split; crash eliminated but empty-trace shows blank section, not a message |
| G-07: ClinicalRiskGauge binary only | ❌ Open — lines 80–117: `isHigh ? 85 : 30`; Medium/Low/Critical all collapse to 30% |

**New observation:** Privacy mode (`privacyMode`) added — toggles which `reasoning_trace` is shown but does not fix the gauge or hardcoded package data.
