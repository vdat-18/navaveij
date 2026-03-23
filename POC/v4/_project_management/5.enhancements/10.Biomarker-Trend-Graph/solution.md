# Solution & Plan — Biomarker Trend Graph Enhancements

**Date:** 2026-03-23

## Strategy

Update `POC/v4/frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx` utilizing Recharts' custom `dot` render function and dynamic JSX based on threshold validation.

## Changes Implemented

1. **Highlight Abnormal Datapoints (Red Dots)**
   - Replaced static `dot={{ r: 3.5 }}` with a custom render function.
   - Evaluated `payload.value` against `item.reference`. 
   - *Logic Note:* Inversed logic for "HDL" (where lower is worse).
   - If abnormal, rendered `<circle r={5} fill="red">`.

2. **Make the Threshold More Prominent**
   - Increased `strokeWidth` on the `<ReferenceLine>`.
   - Added `label={{ value: "Ref: [x]", fill: "red" }}` directly to the reference line so the user doesn't have to look at the legend.

3. **Highlight the Current Value (Last Point)**
   - Inside the custom `dot` render function, checked `index === item.history.length - 1`.
   - The current/last value always gets a larger `r={6}` dot with a thick white stroke to anchor the eye. The fill color is conditional (red if abnormal, teal if normal).

4. **Prominent Status Annotation**
   - Removed the small grey `Now: X, Ref: Y` footer.
   - Replaced it with a full-width colored background banner (`bg-emerald-50` or `bg-rose-50`).
   - Included emojis (✅, ⚠️) and explicit comparison text (e.g., `All good: Current (109) < Reference (130)`).