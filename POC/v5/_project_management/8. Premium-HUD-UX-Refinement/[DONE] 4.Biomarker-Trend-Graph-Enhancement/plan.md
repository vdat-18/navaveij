# Plan — Biomarker Trend Graph Enhancements

**Date:** 2026-03-23

---

## Strategy

Replace the static, uniform chart rendering with a semantically-rich dynamic visualization. All changes are confined to `BiomarkerTrendGrid.tsx` using Recharts' custom `dot` render function.

### 1. Custom Dot Renderer (Abnormal + Current)
Replace `dot={{ r: 3.5 }}` with a custom `dot` render function that:
- Evaluates `payload.value` against `item.reference` threshold.
- Handles HDL inversion: for HDL biomarkers, abnormal means value < reference (not >).
- Renders an abnormal dot as `<circle r={5} fill="red" />`.
- Renders the current (last) data point with `r={6}` and a thick white stroke, colored red if abnormal or teal if normal.
- All other normal dots: `r={3.5}` in the default chart color.

### 2. Prominent Reference Line
- Increase `strokeWidth` on `<ReferenceLine>` to make it visually dominant.
- Add inline `label={{ value: "Ref: X", fill: "red", position: "right" }}` directly on the line so the threshold is always visible without reading the legend.

### 3. Full-width Status Banner (Replace Footer)
- Remove the plain text footer.
- Add a full-width colored banner below the chart:
  - ✅ `bg-emerald-50 text-emerald-700` for normal: `All good: Current (X) < Reference (Y)`
  - ⚠️ `bg-rose-50 text-rose-700` for abnormal: `Alert: Current (X) > Reference (Y)`
- Banner is computed from the last data point's value vs. reference.

## Files to Change
- `frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`
