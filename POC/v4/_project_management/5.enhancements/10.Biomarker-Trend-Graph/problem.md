# Problem — Biomarker Trend Graph Enhancements

**Date:** 2026-03-23

---

## Current State

The `BiomarkerTrendGrid` component rendered a basic Recharts `LineChart` with:
- All data points as identical small teal dots (no differentiation between normal and abnormal values).
- A thin dashed `ReferenceLine` with only a small legend label for the threshold.
- A plain text footer showing raw numbers (`Now: 109 mg/dL`, `Ref: 130`).
- No visual annotation indicating whether the current value is good or bad.

## Pain Points

1. **Abnormal values invisible at a glance**: A physician scanning multiple biomarker charts had no immediate visual cue to identify which data points were outside the reference range. Every dot looked the same.
2. **Threshold hard to read**: The thin dashed reference line easily blended into the chart. Without reading the legend label carefully, it was easy to miss what the target threshold was.
3. **Current value not highlighted**: The most clinically important data point — the most recent measurement — had no special treatment. Physicians had to trace the line to the last point to find it.
4. **Annotation too weak**: The raw "Now: X, Ref: Y" footer required a mental calculation (`is X < Y? Is that good or bad?`) instead of providing an immediate qualitative verdict.
5. **HDL inversion not handled**: For HDL cholesterol, lower is worse (inverse of most other biomarkers). The chart did not account for this, potentially causing misinterpretation.
